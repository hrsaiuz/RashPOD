import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AssetPurpose, OrderStatus, Prisma, ProductionJobStatus } from "@prisma/client";
import { createHash } from "crypto";
import * as QRCode from "qrcode";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../communications/notifications.service";
import { FilesService } from "../files/files.service";
import { ProductionService } from "../production/production.service";
import {
  WorkshopActionDto,
  WorkshopEvidenceCompleteDto,
  WorkshopEvidenceSignUploadDto,
  WorkshopFulfillmentDto,
  WorkshopIssueDto,
  WorkshopPackItemDto,
  WorkshopQcDto,
  WorkshopQueueDto,
  WorkshopResolveIssueDto,
  WorkshopStatusDto,
} from "./dto/workshop.dto";

type RequestMeta = { userAgent?: string; ip?: string; request?: any };

type ProductionJobRecord = Prisma.ProductionJobGetPayload<{
  include: { order: { include: { customer: { select: { id: true; email: true; displayName: true } }; payments: { orderBy: { createdAt: "desc" }; take: 1 } } }; orderItem: true; qcEvidence: true; workshopIssues: true };
}>;

const TERMINAL_STATUSES = new Set<ProductionJobStatus>([ProductionJobStatus.DELIVERED, ProductionJobStatus.COMPLETED, ProductionJobStatus.CANCELED]);
const READY_FOR_PACKING = new Set<ProductionJobStatus>([ProductionJobStatus.READY_FOR_PICKUP, ProductionJobStatus.READY_FOR_DELIVERY, ProductionJobStatus.PACKING]);

@Injectable()
export class WorkshopService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly production: ProductionService,
    private readonly files: FilesService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async overview(actorId: string) {
    const [queue, assignedToMe, blocked, urgentIssues, pickup, delivery] = await Promise.all([
      this.prisma.productionJob.count({ where: { status: { notIn: [...TERMINAL_STATUSES] } } }),
      this.prisma.productionJob.count({ where: { assignedOperatorId: actorId, status: { notIn: [...TERMINAL_STATUSES] } } }),
      this.prisma.productionJob.count({ where: { OR: [{ status: ProductionJobStatus.BLOCKED }, { blockerReason: { not: null } }] } }),
      this.prisma.workshopIssue.count({ where: { status: "OPEN", severity: { in: ["HIGH", "URGENT"] } } }),
      this.prisma.productionJob.count({ where: { status: ProductionJobStatus.READY_FOR_PICKUP } }),
      this.prisma.productionJob.count({ where: { status: { in: [ProductionJobStatus.READY_FOR_DELIVERY, ProductionJobStatus.OUT_FOR_DELIVERY] } } }),
    ]);
    return { queue, assignedToMe, blocked, urgentIssues, pickup, delivery };
  }

  async queue(actorId: string, dto: WorkshopQueueDto = {}) {
    const take = Math.min(Math.max(Number(dto.limit) || 30, 1), 100);
    const jobs = await this.prisma.productionJob.findMany({
      where: this.whereForFilter(actorId, dto.filter),
      include: this.include(),
      orderBy: this.orderBy(dto.sort),
      take: take + 1,
      ...(dto.cursor ? { cursor: { id: dto.cursor }, skip: 1 } : {}),
    });
    const filtered = this.search(jobs, dto.q).slice(0, take);
    const items = await Promise.all(filtered.map((job) => this.toQueueItem(job)));
    return { items, nextCursor: jobs.length > take ? jobs[take]?.id ?? null : null };
  }

  async getItem(id: string) {
    const job = await this.requireJob(id);
    await this.ensureJobCode(job);
    await this.ensureOrderCode(job.orderId);
    return this.toDetail(job);
  }

  async lookupByCode(actorId: string, code: string, meta: RequestMeta = {}) {
    const normalized = this.normalizeCode(code);
    const job = await this.prisma.productionJob.findFirst({ where: { OR: [{ workshopCode: normalized }, { packageCode: normalized }, { id: normalized }] }, include: this.include() });
    if (job) return this.scanned(actorId, normalized, "ProductionJob", job.id, `/dashboard/production/items/${job.id}/mobile`, meta, await this.toDetail(job));
    const order = await this.prisma.order.findFirst({ where: { OR: [{ workshopCode: normalized }, { id: normalized }] }, include: { productionJobs: { take: 1 } } });
    if (order) {
      const firstJob = order.productionJobs[0];
      const targetUrl = firstJob ? `/dashboard/production/items/${firstJob.id}/mobile` : `/dashboard/production/packing?order=${order.id}`;
      return this.scanned(actorId, normalized, "Order", order.id, targetUrl, meta, { orderId: order.id, orderNumber: this.orderNumber(order.id) });
    }
    throw new NotFoundException("Workshop code not found");
  }

  scan(actorId: string, code: string, meta: RequestMeta = {}) {
    return this.lookupByCode(actorId, code, meta);
  }

  async label(actorId: string, entityType: "order" | "production-item" | "package", id: string, meta: RequestMeta = {}) {
    const data = entityType === "order" ? await this.orderLabel(id) : await this.productionLabel(id, entityType === "package");
    const qrSvg = await QRCode.toString(data.code, { type: "svg", margin: 1, width: 220, errorCorrectionLevel: "M" });
    await this.audit.log({ actorId, action: "workshop.label.generated", entityType: data.entityType, entityId: data.entityId, request: meta.request, metadata: { code: data.code, labelType: entityType } });
    return { ...data, qrSvg, printHtml: this.labelHtml(data.title, data.subtitle, data.code, qrSvg) };
  }

  assignToMe(actorId: string, id: string, dto: WorkshopActionDto = {}, meta: RequestMeta = {}) {
    return this.idempotent(actorId, dto.idempotencyKey, "workshop.item.assigned_self", "ProductionJob", id, async () => {
      const result = await this.production.assign(actorId, id, actorId, dto.note);
      await this.audit.log({ actorId, action: "workshop.item.assigned_self", entityType: "ProductionJob", entityId: id, request: meta.request, metadata: { note: dto.note ?? null } });
      return result;
    });
  }

  updateStatus(actorId: string, id: string, dto: WorkshopStatusDto, meta: RequestMeta = {}) {
    return this.idempotent(actorId, dto.idempotencyKey, "workshop.status.changed", "ProductionJob", id, async () => {
      const before = await this.requireJob(id);
      const result = await this.production.updateStatus(actorId, id, { status: dto.status, note: dto.note, reason: dto.reason, producedQuantity: dto.producedQuantity });
      await this.audit.log({ actorId, action: "workshop.status.changed", entityType: "ProductionJob", entityId: id, request: meta.request, metadata: { orderId: before.orderId, from: before.status, to: dto.status, note: dto.note ?? null, reason: dto.reason ?? null } });
      await this.notifyForStatus(before, dto.status, dto.reason || dto.note);
      return result;
    });
  }

  block(actorId: string, id: string, dto: WorkshopActionDto, meta: RequestMeta = {}) {
    if (!dto.reason?.trim()) throw new BadRequestException("Blocked production items require a reason");
    return this.idempotent(actorId, dto.idempotencyKey, "workshop.item.blocked", "ProductionJob", id, async () => {
      const job = await this.requireJob(id);
      const result = await this.production.block(actorId, id, { reason: dto.reason! });
      await this.audit.log({ actorId, action: "workshop.item.blocked", entityType: "ProductionJob", entityId: id, request: meta.request, metadata: { orderId: job.orderId, reason: dto.reason } });
      await this.notifyProductionManagers("Production blocked", `Production item ${this.short(id)} was blocked.`, "workshop.production_blocked", id);
      return result;
    });
  }

  requestFile(actorId: string, id: string, dto: WorkshopActionDto = {}, retry = false, meta: RequestMeta = {}) {
    return this.idempotent(actorId, dto.idempotencyKey, "workshop.production_file.requested", "ProductionJob", id, async () => {
      const result = await this.production.requestFile(actorId, id, { reason: dto.reason || dto.note }, retry);
      await this.audit.log({ actorId, action: "workshop.production_file.requested", entityType: "ProductionJob", entityId: id, request: meta.request, metadata: { retry, reason: dto.reason || dto.note || null } });
      return result;
    });
  }

  async downloadFile(actorId: string, id: string, meta: RequestMeta = {}) {
    const job = await this.requireJob(id);
    const result = await this.production.downloadFile(actorId, id);
    await this.audit.log({ actorId, action: "workshop.production_file.downloaded", entityType: "ProductionJob", entityId: id, request: meta.request, metadata: { orderId: job.orderId, generatedAssetId: result.generatedAssetId } });
    return result;
  }

  qcPass(actorId: string, id: string, dto: WorkshopQcDto, meta: RequestMeta = {}) {
    return this.idempotent(actorId, dto.idempotencyKey, "workshop.qc.passed", "ProductionJob", id, async () => {
      const job = await this.requireJob(id);
      const result = await this.production.passQc(actorId, id, dto);
      await this.audit.log({ actorId, action: "workshop.qc.passed", entityType: "ProductionJob", entityId: id, request: meta.request, metadata: { orderId: job.orderId, acceptedQuantity: dto.acceptedQuantity, rejectedQuantity: dto.rejectedQuantity, note: dto.note ?? null } });
      return result;
    });
  }

  qcFail(actorId: string, id: string, dto: WorkshopQcDto, meta: RequestMeta = {}) {
    return this.idempotent(actorId, dto.idempotencyKey, "workshop.qc.failed", "ProductionJob", id, async () => {
      if (!dto.defectReason?.trim() && !dto.note?.trim() && !dto.reason?.trim()) throw new BadRequestException("QC failure requires a reason or note");
      const job = await this.requireJob(id);
      const result = await this.production.failQc(actorId, id, { ...dto, defectReason: dto.defectReason || dto.reason || dto.note, reprintRequired: dto.reprintRequired ?? true });
      await this.audit.log({ actorId, action: dto.reprintRequired === false ? "workshop.qc.failed" : "workshop.reprint.requested", entityType: "ProductionJob", entityId: id, request: meta.request, metadata: { orderId: job.orderId, defectReason: dto.defectReason || dto.reason || dto.note, acceptedQuantity: dto.acceptedQuantity, rejectedQuantity: dto.rejectedQuantity } });
      await this.notifyProductionManagers("QC failed", `Production item ${this.short(id)} failed QC.`, "workshop.qc_failed", id);
      return result;
    });
  }

  signEvidenceUpload(actorId: string, id: string, dto: WorkshopEvidenceSignUploadDto) {
    return this.files.createUploadUrl(actorId, { ...dto, purpose: AssetPurpose.WORKSHOP_QC_EVIDENCE });
  }

  async completeEvidence(actorId: string, id: string, assetId: string, dto: WorkshopEvidenceCompleteDto, meta: RequestMeta = {}) {
    await this.requireJob(id);
    await this.files.completeUpload(actorId, { fileId: assetId, uploadedSizeBytes: dto.uploadedSizeBytes, uploadedMimeType: dto.uploadedMimeType, uploadedChecksum: dto.uploadedChecksum });
    const evidence = await this.prisma.workshopQcEvidence.create({
      data: {
        productionJobId: id,
        assetId,
        note: dto.note,
        defectReason: dto.defectReason || dto.reason,
        acceptedQuantity: dto.acceptedQuantity,
        rejectedQuantity: dto.rejectedQuantity,
        customerVisible: dto.customerVisible === true,
        createdById: actorId,
      },
    });
    await this.audit.log({ actorId, action: "workshop.qc.evidence_added", entityType: "ProductionJob", entityId: id, request: meta.request, metadata: { evidenceId: evidence.id, assetId, customerVisible: evidence.customerVisible } });
    return evidence;
  }

  async packing(dto: WorkshopQueueDto = {}) {
    const rows = await this.prisma.productionJob.findMany({ where: { status: { in: [ProductionJobStatus.PACKING, ProductionJobStatus.READY_FOR_PICKUP, ProductionJobStatus.READY_FOR_DELIVERY] } }, include: this.include(), orderBy: this.orderBy(dto.sort), take: Math.min(Number(dto.limit) || 50, 100) });
    return { items: rows.map((job) => this.toPackingItem(job)) };
  }

  packItem(actorId: string, orderId: string, dto: WorkshopPackItemDto, meta: RequestMeta = {}) {
    return this.idempotent(actorId, dto.idempotencyKey, "workshop.item.packed", "ProductionJob", dto.productionJobId, async () => {
      const job = await this.requireJob(dto.productionJobId);
      if (job.orderId !== orderId) throw new BadRequestException("Production item does not belong to this order");
      if (!READY_FOR_PACKING.has(job.status)) throw new BadRequestException("Item must pass QC before packing");
      const updated = await this.prisma.productionJob.update({ where: { id: job.id }, data: { packedAt: new Date(), packedById: actorId, status: ProductionJobStatus.PACKING, notes: this.appendNote(job.notes, `[PACK] ${dto.note ?? "packed"}`) } });
      await this.audit.log({ actorId, action: "workshop.item.packed", entityType: "ProductionJob", entityId: job.id, request: meta.request, metadata: { orderId, note: dto.note ?? null } });
      return updated;
    });
  }

  markOrderPacked(actorId: string, orderId: string, dto: WorkshopActionDto = {}, meta: RequestMeta = {}) {
    return this.idempotent(actorId, dto.idempotencyKey, "workshop.order.packed", "Order", orderId, async () => {
      const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { productionJobs: true } });
      if (!order) throw new NotFoundException("Order not found");
      const required = order.productionJobs.filter((job) => job.status !== ProductionJobStatus.CANCELED);
      if (required.length === 0) throw new BadRequestException("Order has no packable production items");
      if (required.some((job) => !job.packedAt && !TERMINAL_STATUSES.has(job.status))) throw new BadRequestException("All production items must be packed first");
      await this.prisma.order.update({ where: { id: orderId }, data: { packedAt: new Date(), packedById: actorId, packingNote: dto.note } });
      const target = order.deliveryType === "PICKUP" || order.pickupLocation ? ProductionJobStatus.READY_FOR_PICKUP : ProductionJobStatus.READY_FOR_DELIVERY;
      await Promise.all(required.filter((job) => job.status === ProductionJobStatus.PACKING).map((job) => this.production.updateStatus(actorId, job.id, { status: target, note: dto.note })));
      await this.audit.log({ actorId, action: "workshop.order.packed", entityType: "Order", entityId: orderId, request: meta.request, metadata: { itemCount: required.length, nextStatus: target, note: dto.note ?? null } });
      return this.prisma.order.findUnique({ where: { id: orderId }, include: { productionJobs: true } });
    });
  }

  async packingSlip(actorId: string, orderId: string, meta: RequestMeta = {}) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { items: true, productionJobs: true } });
    if (!order) throw new NotFoundException("Order not found");
    const code = await this.ensureOrderCode(order.id);
    const qrSvg = await QRCode.toString(code, { type: "svg", margin: 1, width: 180 });
    await this.audit.log({ actorId, action: "workshop.label.generated", entityType: "Order", entityId: orderId, request: meta.request, metadata: { code, labelType: "packing-slip" } });
    return {
      orderId,
      orderNumber: this.orderNumber(order.id),
      customerName: order.customerName,
      deliveryType: order.deliveryType,
      pickupLocation: order.pickupLocation,
      customerNote: order.customerNote,
      code,
      qrSvg,
      items: order.items.map((item) => ({ id: item.id, title: item.listingTitle || item.baseProductName || "Order item", quantity: item.quantity, options: [item.selectedSize, item.selectedColor, item.selectedMaterial, item.selectedPrintSide].filter(Boolean).join(" / ") })),
    };
  }

  pickupList() {
    return this.queue("system", { filter: "ready-for-pickup", sort: "oldest", limit: 100 });
  }

  deliveryList() {
    return this.queue("system", { filter: "delivery", sort: "oldest", limit: 100 });
  }

  pickedUp(actorId: string, orderId: string, dto: WorkshopActionDto = {}, meta: RequestMeta = {}) {
    return this.completeOrderHandoff(actorId, orderId, "workshop.picked_up", dto, meta, ProductionJobStatus.READY_FOR_PICKUP);
  }

  outForDelivery(actorId: string, orderId: string, dto: WorkshopFulfillmentDto = {}, meta: RequestMeta = {}) {
    return this.handoffStatus(actorId, orderId, "workshop.out_for_delivery", dto, meta, ProductionJobStatus.READY_FOR_DELIVERY, (job) => this.production.outForDelivery(actorId, job.id, dto));
  }

  delivered(actorId: string, orderId: string, dto: WorkshopFulfillmentDto = {}, meta: RequestMeta = {}) {
    return this.handoffStatus(actorId, orderId, "workshop.delivered", dto, meta, ProductionJobStatus.OUT_FOR_DELIVERY, (job) => this.production.delivered(actorId, job.id, dto));
  }

  deliveryFailed(actorId: string, orderId: string, dto: WorkshopActionDto, meta: RequestMeta = {}) {
    if (!dto.reason?.trim()) throw new BadRequestException("Failed delivery requires a reason");
    return this.idempotent(actorId, dto.idempotencyKey, "workshop.delivery_failed", "Order", orderId, async () => {
      await this.prisma.order.update({ where: { id: orderId }, data: { deliveryFailedAt: new Date(), deliveryFailedReason: dto.reason } });
      await this.audit.log({ actorId, action: "workshop.delivery_failed", entityType: "Order", entityId: orderId, request: meta.request, metadata: { reason: dto.reason, note: dto.note ?? null } });
      return this.prisma.order.findUnique({ where: { id: orderId }, include: { productionJobs: true } });
    });
  }

  async createIssue(actorId: string, productionJobId: string, dto: WorkshopIssueDto, meta: RequestMeta = {}) {
    const job = await this.requireJob(productionJobId);
    const issue = await this.prisma.workshopIssue.create({ data: { productionJobId, orderId: job.orderId, type: dto.type, severity: dto.severity, note: dto.note, photoAssetId: dto.photoAssetId, blockedProduction: dto.blockItem === true, createdById: actorId } });
    if (dto.blockItem) await this.production.block(actorId, productionJobId, { reason: dto.reason || dto.note });
    await this.audit.log({ actorId, action: "workshop.issue.created", entityType: "WorkshopIssue", entityId: issue.id, request: meta.request, metadata: { productionJobId, orderId: job.orderId, severity: dto.severity, type: dto.type, blockedProduction: dto.blockItem === true, assetId: dto.photoAssetId ?? null } });
    if (dto.severity === "HIGH" || dto.severity === "URGENT") await this.notifyProductionManagers("Urgent workshop issue", dto.note, "workshop.issue.urgent", issue.id);
    return issue;
  }

  async issues(status = "OPEN") {
    return this.prisma.workshopIssue.findMany({ where: { status }, include: { productionJob: { include: { order: true, orderItem: true } } }, orderBy: [{ severity: "desc" }, { createdAt: "desc" }], take: 100 });
  }

  async resolveIssue(actorId: string, id: string, dto: WorkshopResolveIssueDto = {}, meta: RequestMeta = {}) {
    const issue = await this.prisma.workshopIssue.update({ where: { id }, data: { status: "RESOLVED", resolvedById: actorId, resolvedAt: new Date(), resolutionNote: dto.resolutionNote || dto.note } });
    await this.audit.log({ actorId, action: "workshop.issue.resolved", entityType: "WorkshopIssue", entityId: id, request: meta.request, metadata: { productionJobId: issue.productionJobId, orderId: issue.orderId, note: dto.resolutionNote || dto.note || null } });
    return issue;
  }

  private async scanned(actorId: string, code: string, entityType: string, entityId: string, targetUrl: string, meta: RequestMeta, payload: unknown) {
    await this.audit.log({ actorId, action: "workshop.item.scanned", entityType, entityId, request: meta.request, metadata: { codeScanned: code, targetUrl } });
    return { entityType, entityId, code, targetUrl, payload };
  }

  private async idempotent<T>(actorId: string, key: string | undefined, action: string, entityType: string, entityId: string, work: () => Promise<T>): Promise<T> {
    if (key) {
      const existing = await this.prisma.workshopMobileAction.findUnique({ where: { idempotencyKey: key } });
      if (existing?.responseJson) return existing.responseJson as T;
    }
    const result = await work();
    if (key) {
      const responseJson = JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue;
      await this.prisma.workshopMobileAction.create({ data: { idempotencyKey: key, actorId, action, entityType, entityId, responseJson } }).catch(() => undefined);
    }
    return result;
  }

  private async completeOrderHandoff(actorId: string, orderId: string, action: string, dto: WorkshopActionDto, meta: RequestMeta, requiredStatus: ProductionJobStatus) {
    return this.idempotent(actorId, dto.idempotencyKey, action, "Order", orderId, async () => {
      const order = await this.requireOrderWithJobs(orderId);
      const jobs = order.productionJobs.filter((job) => job.status === requiredStatus);
      if (!jobs.length) throw new BadRequestException("No matching production items are ready for this handoff");
      await Promise.all(jobs.map((job) => this.production.complete(actorId, job.id, { note: dto.note })));
      await this.prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.DELIVERED, pickupCompletedAt: new Date() } });
      await this.audit.log({ actorId, action, entityType: "Order", entityId: orderId, request: meta.request, metadata: { itemCount: jobs.length, note: dto.note ?? null } });
      return this.prisma.order.findUnique({ where: { id: orderId }, include: { productionJobs: true } });
    });
  }

  private async handoffStatus(actorId: string, orderId: string, action: string, dto: WorkshopFulfillmentDto, meta: RequestMeta, requiredStatus: ProductionJobStatus, transition: (job: { id: string }) => Promise<unknown>) {
    return this.idempotent(actorId, dto.idempotencyKey, action, "Order", orderId, async () => {
      const order = await this.requireOrderWithJobs(orderId);
      const jobs = order.productionJobs.filter((job) => job.status === requiredStatus || (action === "workshop.delivered" && job.status === ProductionJobStatus.READY_FOR_DELIVERY));
      if (!jobs.length) throw new BadRequestException("No matching production items are ready for this handoff");
      await Promise.all(jobs.map((job) => transition(job)));
      if (action === "workshop.delivered") await this.prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.DELIVERED } });
      if (action === "workshop.out_for_delivery") await this.prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.SHIPPED } });
      await this.audit.log({ actorId, action, entityType: "Order", entityId: orderId, request: meta.request, metadata: { itemCount: jobs.length, provider: dto.provider ?? null, trackingRef: dto.trackingRef ?? null, note: dto.note ?? null } });
      return this.prisma.order.findUnique({ where: { id: orderId }, include: { productionJobs: true } });
    });
  }

  private async requireOrderWithJobs(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { productionJobs: true } });
    if (!order) throw new NotFoundException("Order not found");
    return order;
  }

  private async requireJob(id: string) {
    const job = await this.prisma.productionJob.findUnique({ where: { id }, include: this.include() });
    if (!job) throw new NotFoundException("Production item not found");
    return job;
  }

  private include() {
    return {
      order: { include: { customer: { select: { id: true, email: true, displayName: true } }, payments: { orderBy: { createdAt: "desc" as const }, take: 1 } } },
      orderItem: true,
      qcEvidence: true,
      workshopIssues: { where: { status: "OPEN" }, take: 5, orderBy: { createdAt: "desc" as const } },
    } satisfies Prisma.ProductionJobInclude;
  }

  private whereForFilter(actorId: string, filter?: string): Prisma.ProductionJobWhereInput {
    switch (filter) {
      case "assigned-to-me": return { assignedOperatorId: actorId, status: { notIn: [...TERMINAL_STATUSES] } };
      case "unassigned": return { assignedOperatorId: null, status: { notIn: [...TERMINAL_STATUSES] } };
      case "queued": return { status: { in: [ProductionJobStatus.ORDERED, ProductionJobStatus.WAITING_FOR_FILE, ProductionJobStatus.FILE_GENERATING] } };
      case "ready-for-print": return { status: ProductionJobStatus.READY_FOR_PRINT };
      case "in-production": return { status: { in: [ProductionJobStatus.IN_PRODUCTION, ProductionJobStatus.PRINTING] } };
      case "qc": return { status: { in: [ProductionJobStatus.QUALITY_CHECK, ProductionJobStatus.QC] } };
      case "qc-failed": return { status: { in: [ProductionJobStatus.QC_FAILED, ProductionJobStatus.REPRINT_REQUIRED] } };
      case "ready-for-pickup": return { status: ProductionJobStatus.READY_FOR_PICKUP };
      case "ready-for-delivery": return { status: ProductionJobStatus.READY_FOR_DELIVERY };
      case "delivery": return { status: { in: [ProductionJobStatus.READY_FOR_DELIVERY, ProductionJobStatus.OUT_FOR_DELIVERY] } };
      case "blocked": return { OR: [{ status: ProductionJobStatus.BLOCKED }, { blockerReason: { not: null } }] };
      case "overdue": return { dueAt: { lt: new Date() }, status: { notIn: [...TERMINAL_STATUSES] } };
      default: return { status: { notIn: [...TERMINAL_STATUSES] } };
    }
  }

  private orderBy(sort?: string): Prisma.ProductionJobOrderByWithRelationInput[] {
    if (sort === "newest") return [{ createdAt: "desc" }];
    if (sort === "oldest") return [{ createdAt: "asc" }];
    if (sort === "dueDate") return [{ dueAt: "asc" }, { priority: "desc" }, { createdAt: "asc" }];
    if (sort === "status") return [{ status: "asc" }, { priority: "desc" }, { createdAt: "asc" }];
    return [{ priority: "desc" }, { dueAt: "asc" }, { createdAt: "asc" }];
  }

  private search(jobs: ProductionJobRecord[], q?: string) {
    const term = q?.trim().toLowerCase();
    if (!term) return jobs;
    return jobs.filter((job) => [job.id, job.workshopCode, job.order.id, job.order.customerName, job.order.customerPhone, job.orderItem?.listingTitle, (job.productSnapshotJson as any)?.listingTitle, (job.productSnapshotJson as any)?.baseProductName].filter(Boolean).some((value) => String(value).toLowerCase().includes(term)));
  }

  private async toQueueItem(job: ProductionJobRecord) {
    const workshopCode = await this.ensureJobCode(job);
    const issues = job.workshopIssues?.length ?? 0;
    const options = (job.selectedOptionsJson ?? {}) as Record<string, unknown>;
    return {
      id: job.id,
      shortCode: workshopCode,
      orderId: job.orderId,
      orderNumber: this.orderNumber(job.orderId),
      status: job.status,
      priority: job.priority,
      dueAt: job.dueAt,
      overdue: Boolean(job.dueAt && job.dueAt.getTime() < Date.now() && !TERMINAL_STATUSES.has(job.status)),
      customerName: job.order.customerName || job.order.customer?.displayName || null,
      customerInitials: this.initials(job.order.customerName || job.order.customer?.displayName || job.order.customerEmail),
      product: job.orderItem?.listingTitle || (job.productSnapshotJson as any)?.listingTitle || "Production item",
      baseProduct: job.orderItem?.baseProductName || (job.productSnapshotJson as any)?.baseProductName || (job.productSnapshotJson as any)?.productTypeName || job.queueType,
      options: { size: options.size, color: options.color, material: options.material, printSide: options.printSide },
      quantity: job.orderItem?.quantity ?? (job.productSnapshotJson as any)?.quantity ?? 1,
      source: this.source(job),
      productionFileStatus: job.productionFileStatus || "MISSING",
      qcStatus: job.qcStatus || null,
      assignedOperatorId: job.assignedOperatorId,
      packedAt: job.packedAt,
      issueCount: issues,
      mockupPreviewUrl: job.mockupPreviewUrl || job.orderItem?.mockupImageUrl || null,
    };
  }

  private async toDetail(job: ProductionJobRecord) {
    const queue = await this.toQueueItem(job);
    return {
      ...queue,
      customerPhoneLast4: job.order.customerPhone ? job.order.customerPhone.slice(-4) : null,
      customerNote: job.order.customerNote || null,
      deliveryType: job.order.deliveryType,
      pickupLocation: job.order.pickupLocation,
      deliveryAddressSummary: job.order.deliveryAddress ? this.safeAddress(job.order.deliveryAddress) : null,
      placementSnapshotJson: job.placementSnapshotJson,
      printAreaSnapshotJson: job.printAreaSnapshotJson,
      productionFileAssetId: job.productionFileAssetId,
      notes: job.notes,
      blockerReason: job.blockerReason,
      failureReason: job.failureReason,
      qcNote: job.qcNote,
      qcFailedReason: job.qcFailedReason,
      producedQuantity: job.producedQuantity,
      acceptedQuantity: job.acceptedQuantity,
      rejectedQuantity: job.rejectedQuantity,
      defectReason: job.defectReason,
      deliveryProvider: job.deliveryProvider,
      deliveryTrackingRef: job.deliveryTrackingRef,
      deliveryNote: job.deliveryNote,
      pickupNote: job.pickupNote,
      statusHistoryJson: job.statusHistoryJson,
      qcEvidence: job.qcEvidence,
      issues: job.workshopIssues,
    };
  }

  private toPackingItem(job: ProductionJobRecord) {
    return { id: job.id, orderId: job.orderId, orderNumber: this.orderNumber(job.orderId), packedAt: job.packedAt, status: job.status, product: job.orderItem?.listingTitle || (job.productSnapshotJson as any)?.listingTitle || "Production item", quantity: job.orderItem?.quantity ?? 1, deliveryType: job.order.deliveryType, customerName: job.order.customerName };
  }

  private async orderLabel(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundException("Order not found");
    const code = await this.ensureOrderCode(id);
    return { entityType: "Order", entityId: id, code, title: `Order ${this.orderNumber(id)}`, subtitle: `${order.customerName || "Customer"} · ${order.items.length} item(s)` };
  }

  private async productionLabel(id: string, packageLabel = false) {
    const job = await this.requireJob(id);
    const code = packageLabel ? await this.ensurePackageCode(job) : await this.ensureJobCode(job);
    return { entityType: "ProductionJob", entityId: id, code, title: packageLabel ? `Package ${this.orderNumber(job.orderId)}` : `Item ${this.short(id)}`, subtitle: job.orderItem?.listingTitle || (job.productSnapshotJson as any)?.listingTitle || job.queueType };
  }

  private async ensureJobCode(job: { id: string; workshopCode?: string | null }) {
    if (job.workshopCode) return job.workshopCode;
    const workshopCode = this.code("WPI", job.id);
    await this.prisma.productionJob.update({ where: { id: job.id }, data: { workshopCode } });
    return workshopCode;
  }

  private async ensurePackageCode(job: { id: string; packageCode?: string | null }) {
    if (job.packageCode) return job.packageCode;
    const packageCode = this.code("PKG", job.id);
    await this.prisma.productionJob.update({ where: { id: job.id }, data: { packageCode } });
    return packageCode;
  }

  private async ensureOrderCode(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { workshopCode: true } });
    if (!order) throw new NotFoundException("Order not found");
    if (order.workshopCode) return order.workshopCode;
    const workshopCode = this.code("ORD", orderId);
    await this.prisma.order.update({ where: { id: orderId }, data: { workshopCode } });
    return workshopCode;
  }

  private code(prefix: string, id: string) {
    const digest = createHash("sha256").update(`${prefix}:${id}`).digest("base64url").slice(0, 10).toUpperCase();
    return `${prefix}-${digest}`;
  }

  private normalizeCode(code: string) {
    return code.trim().replace(/^https?:\/\/[^/]+\/workshop\/scan\?code=/i, "").toUpperCase();
  }

  private labelHtml(title: string, subtitle: string, code: string, qrSvg: string) {
    return `<section style="width:320px;font-family:Inter,Arial,sans-serif;padding:16px;border:1px solid #0B1020"><h1 style="font-size:18px;margin:0 0 4px">${this.escape(title)}</h1><p style="font-size:12px;margin:0 0 12px;color:#475467">${this.escape(subtitle)}</p>${qrSvg}<p style="font-family:monospace;font-size:14px;font-weight:700;margin:10px 0 0">${this.escape(code)}</p></section>`;
  }

  private async notifyForStatus(job: ProductionJobRecord, status: ProductionJobStatus, note?: string) {
    if (status === ProductionJobStatus.BLOCKED) await this.notifyProductionManagers("Production blocked", note || `Production item ${this.short(job.id)} was blocked.`, "workshop.production_blocked", job.id);
    if (status === ProductionJobStatus.READY_FOR_PICKUP && job.order.customerId) await this.safeNotify(job.order.customerId, "Ready for pickup", "Your RashPOD order is ready for pickup.", "workshop.ready_for_pickup", job.orderId, `/dashboard/customer/orders/${job.orderId}`);
    if (status === ProductionJobStatus.OUT_FOR_DELIVERY && job.order.customerId) await this.safeNotify(job.order.customerId, "Out for delivery", "Your RashPOD order is out for delivery.", "workshop.out_for_delivery", job.orderId, `/dashboard/customer/orders/${job.orderId}`);
    if ((status === ProductionJobStatus.DELIVERED || status === ProductionJobStatus.COMPLETED) && job.order.customerId) await this.safeNotify(job.order.customerId, "Order completed", "Your RashPOD order is complete.", "workshop.delivered", job.orderId, `/dashboard/customer/orders/${job.orderId}`);
  }

  private async notifyProductionManagers(title: string, body: string, type: string, entityId: string) {
    const users = await this.prisma.user.findMany({ where: { role: { in: ["ADMIN", "SUPER_ADMIN", "OPERATIONS_MANAGER"] as any } }, select: { id: true }, take: 25 });
    await Promise.all(users.map((user) => this.safeNotify(user.id, title, body, type, entityId, `/dashboard/production/items/${entityId}/mobile`)));
  }

  private async safeNotify(userId: string, title: string, body: string, type: string, entityId: string, actionUrl: string) {
    await this.notifications.notifyUser({ userId, type, title, body, entityType: "Workshop", entityId, actionUrl, idempotencyKey: `${type}:${userId}:${entityId}` }).catch(() => undefined);
  }

  private source(job: ProductionJobRecord) {
    if (job.gangSheetId) return "gang_sheet";
    if (job.queueType === "DTF" || job.queueType === "UV_DTF") return "film";
    if (job.externalSourceType) return "external_marketplace";
    if (job.providerType || job.fulfillmentRoute !== "LOCAL_PRODUCTION") return "global_pod";
    return "direct_order";
  }

  private orderNumber(id: string) { return `#${id.slice(-6).toUpperCase()}`; }
  private short(id: string) { return id.slice(-8).toUpperCase(); }
  private initials(value?: string | null) { return (value || "Customer").split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join(""); }
  private safeAddress(value: string) { return value.length > 32 ? `${value.slice(0, 32)}...` : value; }
  private escape(value: string) { return value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]!)); }
  private appendNote(existing: string | null | undefined, next: string) { return [existing, next].filter(Boolean).join("\n"); }
}
