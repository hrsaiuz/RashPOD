import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { GeneratedAssetStatus, OrderStatus, Prisma, ProductionJobStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { StorageService } from "../files/storage.service";
import { FinanceService } from "../finance/finance.service";
import { JobDispatcherService } from "../worker-jobs/job-dispatcher.service";
import { ListProductionItemsDto } from "./dto/list-production-items.dto";
import { ProductionFileRequestDto, ProductionFulfillmentDto, ProductionNoteDto, ProductionQcDecisionDto, ProductionReasonDto } from "./dto/production-action.dto";
import { UpdateProductionStatusDto } from "./dto/update-production-status.dto";

type ProductionJobWithRelations = Prisma.ProductionJobGetPayload<{
  include: {
    order: { include: { customer: { select: { id: true; email: true; displayName: true } }; payments: true } };
    orderItem: true;
  };
}>;

type ProductionStatusHistoryEntry = {
  at: string;
  actorId?: string;
  from?: string;
  to: string;
  note?: string;
  reason?: string;
};

const TERMINAL_STATUSES = new Set<ProductionJobStatus>([
  ProductionJobStatus.DELIVERED,
  ProductionJobStatus.COMPLETED,
  ProductionJobStatus.CANCELED,
]);

@Injectable()
export class ProductionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage?: StorageService,
    private readonly jobs?: JobDispatcherService,
    private readonly finance?: FinanceService,
  ) {}

  async overview() {
    const [jobs, failedFiles] = await Promise.all([
      this.prisma.productionJob.findMany({ select: { status: true, productionFileStatus: true, priority: true, dueAt: true, blockerReason: true } }),
      this.prisma.productionJob.count({ where: { productionFileStatus: { in: ["FAILED", "MISSING_SOURCE"] } } }),
    ]);
    const now = Date.now();
    const byStatus: Record<string, number> = {};
    for (const job of jobs) byStatus[job.status] = (byStatus[job.status] ?? 0) + 1;
    return {
      total: jobs.length,
      byStatus,
      queued: this.countStatuses(jobs, [ProductionJobStatus.ORDERED, ProductionJobStatus.WAITING_FOR_FILE, ProductionJobStatus.FILE_GENERATING]),
      blocked: jobs.filter((job) => job.status === ProductionJobStatus.BLOCKED || Boolean(job.blockerReason)).length,
      fileFailures: failedFiles,
      highPriority: jobs.filter((job) => job.priority > 0).length,
      overdue: jobs.filter((job) => job.dueAt && job.dueAt.getTime() < now && !TERMINAL_STATUSES.has(job.status)).length,
      readyForPickup: jobs.filter((job) => job.status === ProductionJobStatus.READY_FOR_PICKUP).length,
      readyForDelivery: jobs.filter((job) => job.status === ProductionJobStatus.READY_FOR_DELIVERY).length,
    };
  }

  async list(filters: ListProductionItemsDto = {}) {
    const where: Prisma.ProductionJobWhereInput = {
      ...(filters.queueType ? { queueType: filters.queueType } : {}),
      ...this.whereForFilter(filters.filter),
    };
    const jobs = await this.prisma.productionJob.findMany({
      where,
      include: this.productionInclude(),
      orderBy: this.orderByForSort(filters.sort),
      take: 200,
    });
    return this.withGeneratedAssetReadiness(jobs);
  }

  async get(jobId: string) {
    const job = await this.getJobRecord(jobId);
    if (!job) throw new NotFoundException("Production item not found");
    const [withFile] = await this.withGeneratedAssetReadiness([job]);
    return withFile;
  }

  async updateStatus(actorId: string, jobId: string, dto: ProductionJobStatus | UpdateProductionStatusDto) {
    const target = typeof dto === "string" ? dto : dto.status;
    const note = typeof dto === "string" ? undefined : dto.note;
    const reason = typeof dto === "string" ? undefined : dto.reason;
    const producedQuantity = typeof dto === "string" ? undefined : dto.producedQuantity;
    const existing = await this.requireJob(jobId);
    const data: Prisma.ProductionJobUpdateInput = { status: target };

    switch (target) {
      case ProductionJobStatus.READY_FOR_PRINT:
        this.assertReadyForPrint(existing);
        data.productionFileStatus = "READY";
        break;
      case ProductionJobStatus.IN_PRODUCTION:
      case ProductionJobStatus.PRINTING:
        this.assertCanStartProduction(existing);
        data.status = ProductionJobStatus.IN_PRODUCTION;
        data.assignedOperatorId = existing.assignedOperatorId ?? actorId;
        data.startedAt = existing.startedAt ?? new Date();
        break;
      case ProductionJobStatus.QUALITY_CHECK:
      case ProductionJobStatus.QC:
        this.assertCanSendToQc(existing, producedQuantity);
        data.status = ProductionJobStatus.QUALITY_CHECK;
        data.producedQuantity = producedQuantity ?? existing.producedQuantity;
        data.qcStatus = "PENDING";
        data.qcAt = new Date();
        break;
      case ProductionJobStatus.READY_FOR_PICKUP:
        this.assertCanReadyForPickup(existing);
        data.readyAt = existing.readyAt ?? new Date();
        data.pickupNote = note;
        break;
      case ProductionJobStatus.READY_FOR_DELIVERY:
        this.assertCanReadyForDelivery(existing);
        data.readyAt = existing.readyAt ?? new Date();
        data.deliveryNote = note;
        break;
      case ProductionJobStatus.OUT_FOR_DELIVERY:
        if (existing.status !== ProductionJobStatus.READY_FOR_DELIVERY) throw new BadRequestException("Item must be ready for delivery before it can go out for delivery");
        data.deliveryNote = note;
        break;
      case ProductionJobStatus.DELIVERED:
        if (!this.statusIn(existing.status, [ProductionJobStatus.OUT_FOR_DELIVERY, ProductionJobStatus.READY_FOR_DELIVERY])) throw new BadRequestException("Item must be ready/out for delivery before marking delivered");
        data.completedAt = existing.completedAt ?? new Date();
        data.deliveryNote = note;
        break;
      case ProductionJobStatus.COMPLETED:
        if (!this.statusIn(existing.status, [ProductionJobStatus.READY_FOR_PICKUP, ProductionJobStatus.DELIVERED, ProductionJobStatus.READY_FOR_DELIVERY, ProductionJobStatus.OUT_FOR_DELIVERY])) {
          throw new BadRequestException("Item must be picked up, delivered, or fulfillment-ready before completion");
        }
        data.completedAt = existing.completedAt ?? new Date();
        break;
      case ProductionJobStatus.BLOCKED:
        if (!reason?.trim()) throw new BadRequestException("Blocked production items require a reason");
        data.blockerReason = reason.trim();
        break;
      case ProductionJobStatus.CANCELED:
        if (!reason?.trim()) throw new BadRequestException("Canceled production items require a reason");
        data.blockerReason = reason.trim();
        data.canceledAt = new Date();
        break;
      default:
        break;
    }

    const updated = await this.updateJobWithHistory(actorId, existing, data, target, { note, reason });
    await this.aggregateOrderStatus(updated.orderId);
    if (updated.orderItemId && this.statusIn(target, [ProductionJobStatus.DELIVERED, ProductionJobStatus.COMPLETED])) {
      await this.finance?.markOrderItemEligible(updated.orderItemId, actorId);
    }
    await this.audit.log({
      actorId,
      action: this.auditActionForStatus(target),
      entityType: "ProductionJob",
      entityId: jobId,
      metadata: { from: existing.status, to: target, note: note ?? null, reason: reason ?? null },
    });
    return this.get(jobId);
  }

  async assign(actorId: string, jobId: string, assigneeId?: string, note?: string) {
    const existing = await this.requireJob(jobId);
    const nextAssignee = assigneeId || actorId;
    const updated = await this.updateJobWithHistory(
      actorId,
      existing,
      {
        assignedOperatorId: nextAssignee,
        notes: note ? this.appendNote(existing.notes, `[ASSIGN] assignee=${nextAssignee} note=${note}`) : existing.notes,
      },
      existing.status,
      { note },
    );
    await this.audit.log({
      actorId,
      action: "production.item.assigned",
      entityType: "ProductionJob",
      entityId: jobId,
      metadata: { assigneeId: nextAssignee, note: note ?? null },
    });
    return updated;
  }

  async block(actorId: string, jobId: string, dto: ProductionReasonDto) {
    return this.updateStatus(actorId, jobId, { status: ProductionJobStatus.BLOCKED, reason: dto.reason });
  }

  async cancel(actorId: string, jobId: string, dto: ProductionReasonDto) {
    return this.updateStatus(actorId, jobId, { status: ProductionJobStatus.CANCELED, reason: dto.reason });
  }

  async addNote(actorId: string, jobId: string, dto: ProductionNoteDto) {
    const existing = await this.requireJob(jobId);
    const updated = await this.prisma.productionJob.update({
      where: { id: jobId },
      data: { notes: this.appendNote(existing.notes, `[NOTE] ${dto.note}`) },
    });
    await this.audit.log({ actorId, action: "production.item.note_added", entityType: "ProductionJob", entityId: jobId, metadata: { note: dto.note } });
    return updated;
  }

  async requestFile(actorId: string, jobId: string, dto: ProductionFileRequestDto = {}, retry = false) {
    const existing = await this.requireJob(jobId);
    if (existing.queueType === "DTF" || existing.queueType === "UV_DTF") {
      if (!this.jobs) throw new BadRequestException("Worker job dispatcher is not available");
      if (existing.productionFileStatus === "READY" && !retry) return this.get(jobId);
      const enqueued = await this.jobs.enqueue("GENERATE_PRODUCTION_FILE", { productionJobId: existing.id, orderItemId: existing.orderItemId, filmType: existing.queueType });
      const updated = await this.updateJobWithHistory(
        actorId,
        existing,
        {
          productionFileJobId: enqueued.jobId,
          productionFileStatus: "QUEUED",
          status: ProductionJobStatus.FILE_GENERATING,
          failureReason: null,
        },
        ProductionJobStatus.FILE_GENERATING,
        { note: dto.reason },
      );
      await this.audit.log({
        actorId,
        action: retry ? "film-production.file.retry_requested" : "film-production.file.requested",
        entityType: "ProductionJob",
        entityId: jobId,
        metadata: { workerJobId: enqueued.jobId, reason: dto.reason ?? null, queueType: existing.queueType },
      });
      return updated;
    }
    const sourcePlacementId = this.sourcePlacementIdFrom(existing.placementSnapshotJson);
    if (!sourcePlacementId) throw new BadRequestException("Cannot generate production file: placement snapshot is missing source placement id");
    if (!existing.printAreaSnapshotJson) throw new BadRequestException("Cannot generate production file: print area snapshot is missing");
    if (!existing.assetSnapshotJson) throw new BadRequestException("Cannot generate production file: design asset snapshot is missing");
    if (!this.jobs) throw new BadRequestException("Worker job dispatcher is not available");

    let generatedAssetId = existing.productionFileAssetId;
    if (generatedAssetId) {
      const existingAsset = await this.prisma.generatedAsset.findUnique({ where: { id: generatedAssetId } });
      if (existingAsset && !retry && this.generatedStatusIn(existingAsset.status, [GeneratedAssetStatus.PENDING, GeneratedAssetStatus.PROCESSING, GeneratedAssetStatus.READY])) {
        return this.get(jobId);
      }
      if (existingAsset && retry) {
        await this.prisma.generatedAsset.update({ where: { id: existingAsset.id }, data: { status: GeneratedAssetStatus.REPLACED, archivedAt: new Date() } });
      }
    }

    if (!generatedAssetId || retry) {
      const generated = await this.prisma.generatedAsset.create({
        data: {
          sourcePlacementId,
          type: "PRODUCTION_FILE",
          status: GeneratedAssetStatus.PENDING,
          placementSnapshot: existing.placementSnapshotJson ?? undefined,
        },
      });
      generatedAssetId = generated.id;
    }

    const enqueued = await this.jobs.enqueue("GENERATE_PRODUCTION_FILE", { placementId: sourcePlacementId, generatedAssetId });
    const updated = await this.updateJobWithHistory(
      actorId,
      existing,
      {
        productionFileAssetId: generatedAssetId,
        productionFileJobId: enqueued.jobId,
        productionFileStatus: "QUEUED",
        status: ProductionJobStatus.FILE_GENERATING,
        failureReason: null,
      },
      ProductionJobStatus.FILE_GENERATING,
      { note: dto.reason },
    );
    await this.audit.log({
      actorId,
      action: retry ? "production.file.retry_requested" : "production.file.requested",
      entityType: "ProductionJob",
      entityId: jobId,
      metadata: { generatedAssetId, workerJobId: enqueued.jobId, reason: dto.reason ?? null },
    });
    return updated;
  }

  async downloadFile(actorId: string, jobId: string) {
    const existing = await this.requireJob(jobId);
    if (!existing.productionFileAssetId) throw new BadRequestException("Production file is missing");
    const generated = await this.prisma.generatedAsset.findUnique({ where: { id: existing.productionFileAssetId } });
    if (!generated || generated.status !== GeneratedAssetStatus.READY || !generated.objectKey) throw new BadRequestException("Production file is not ready for download");
    if (!this.storage) throw new BadRequestException("Storage service is not available");
    const expiresSeconds = Number(process.env.GCS_SIGNED_URL_EXPIRES_SECONDS || 900);
    const safeExpires = Number.isFinite(expiresSeconds) ? Math.max(60, Math.min(86400, expiresSeconds)) : 900;
    const url = await this.storage.createSignedReadUrl({ objectKey: generated.objectKey, expiresSeconds: safeExpires });
    await this.audit.log({ actorId, action: "production.file.downloaded", entityType: "ProductionJob", entityId: jobId, metadata: { generatedAssetId: generated.id, objectKey: generated.objectKey } });
    return { productionJobId: jobId, generatedAssetId: generated.id, url, expiresSeconds: safeExpires };
  }

  async submitQc(actorId: string, jobId: string, passed: boolean, note?: string, checklist?: { printQuality?: boolean; sizeAccuracy?: boolean; placementAccuracy?: boolean; packagingReady?: boolean }) {
    const job = await this.requireJob(jobId);
    const dto: ProductionQcDecisionDto = {
      producedQuantity: job.producedQuantity ?? job.orderItem?.quantity ?? undefined,
      acceptedQuantity: passed ? (job.orderItem?.quantity ?? job.producedQuantity ?? undefined) : 0,
      rejectedQuantity: passed ? 0 : (job.producedQuantity ?? job.orderItem?.quantity ?? 1),
      defectReason: passed ? undefined : note,
      note,
    };
    return passed ? this.passQc(actorId, jobId, dto) : this.failQc(actorId, jobId, dto);
  }

  async passQc(actorId: string, jobId: string, dto: ProductionQcDecisionDto) {
    const existing = await this.requireJob(jobId);
    this.assertCanQc(existing);
    const quantities = this.resolveQcQuantities(existing, dto, true);
    const deliveryType = this.deliveryType(existing);
    const nextStatus = deliveryType === "PICKUP" || existing.order.pickupLocation ? ProductionJobStatus.READY_FOR_PICKUP : ProductionJobStatus.READY_FOR_DELIVERY;
    const updated = await this.updateJobWithHistory(actorId, existing, {
      status: nextStatus,
      qcStatus: "PASSED",
      qcNote: dto.note,
      qcCheckedById: actorId,
      qcCheckedAt: new Date(),
      qcAt: new Date(),
      readyAt: new Date(),
      producedQuantity: quantities.producedQuantity,
      acceptedQuantity: quantities.acceptedQuantity,
      rejectedQuantity: quantities.rejectedQuantity,
      defectReason: null,
    }, nextStatus, { note: dto.note });
    await this.aggregateOrderStatus(existing.orderId);
    await this.audit.log({ actorId, action: "production.qc.passed", entityType: "ProductionJob", entityId: jobId, metadata: quantities });
    return updated;
  }

  async failQc(actorId: string, jobId: string, dto: ProductionQcDecisionDto) {
    const existing = await this.requireJob(jobId);
    this.assertCanQc(existing);
    if (!dto.defectReason?.trim() && !dto.note?.trim()) throw new BadRequestException("QC failure requires a defect reason or note");
    const quantities = this.resolveQcQuantities(existing, dto, false);
    const nextStatus = dto.reprintRequired ? ProductionJobStatus.REPRINT_REQUIRED : ProductionJobStatus.QC_FAILED;
    const updated = await this.updateJobWithHistory(actorId, existing, {
      status: nextStatus,
      qcStatus: dto.reprintRequired ? "REPRINT_REQUIRED" : "FAILED",
      qcNote: dto.note,
      qcFailedReason: dto.defectReason ?? dto.note,
      qcCheckedById: actorId,
      qcCheckedAt: new Date(),
      qcAt: new Date(),
      producedQuantity: quantities.producedQuantity,
      acceptedQuantity: quantities.acceptedQuantity,
      rejectedQuantity: quantities.rejectedQuantity,
      defectReason: dto.defectReason ?? dto.note,
      blockerReason: dto.defectReason ?? dto.note,
    }, nextStatus, { note: dto.note, reason: dto.defectReason });
    await this.audit.log({ actorId, action: dto.reprintRequired ? "production.reprint.requested" : "production.qc.failed", entityType: "ProductionJob", entityId: jobId, metadata: quantities });
    return updated;
  }

  async requestReprint(actorId: string, jobId: string, dto: ProductionReasonDto) {
    const existing = await this.requireJob(jobId);
    const updated = await this.updateJobWithHistory(actorId, existing, {
      status: ProductionJobStatus.REPRINT_REQUIRED,
      qcStatus: "REPRINT_REQUIRED",
      defectReason: dto.reason,
      blockerReason: dto.reason,
    }, ProductionJobStatus.REPRINT_REQUIRED, { reason: dto.reason });
    await this.audit.log({ actorId, action: "production.reprint.requested", entityType: "ProductionJob", entityId: jobId, metadata: { reason: dto.reason } });
    return updated;
  }

  readyForPickup(actorId: string, jobId: string, dto: ProductionFulfillmentDto) {
    return this.updateStatus(actorId, jobId, { status: ProductionJobStatus.READY_FOR_PICKUP, note: dto.note });
  }

  readyForDelivery(actorId: string, jobId: string, dto: ProductionFulfillmentDto) {
    return this.updateStatus(actorId, jobId, { status: ProductionJobStatus.READY_FOR_DELIVERY, note: dto.note });
  }

  async outForDelivery(actorId: string, jobId: string, dto: ProductionFulfillmentDto) {
    const existing = await this.requireJob(jobId);
    if (existing.status !== ProductionJobStatus.READY_FOR_DELIVERY) throw new BadRequestException("Item must be ready for delivery first");
    await this.prisma.productionJob.update({ where: { id: jobId }, data: { deliveryProvider: dto.provider, deliveryTrackingRef: dto.trackingRef, deliveryNote: dto.note } });
    return this.updateStatus(actorId, jobId, { status: ProductionJobStatus.OUT_FOR_DELIVERY, note: dto.note });
  }

  delivered(actorId: string, jobId: string, dto: ProductionFulfillmentDto) {
    return this.updateStatus(actorId, jobId, { status: ProductionJobStatus.DELIVERED, note: dto.note });
  }

  complete(actorId: string, jobId: string, dto: ProductionFulfillmentDto) {
    return this.updateStatus(actorId, jobId, { status: ProductionJobStatus.COMPLETED, note: dto.note });
  }

  private async getJobRecord(jobId: string) {
    return this.prisma.productionJob.findUnique({
      where: { id: jobId },
      include: {
        order: { include: { customer: { select: { id: true, email: true, displayName: true } }, payments: { orderBy: { createdAt: "desc" } } } },
        orderItem: true,
      },
    });
  }

  private async requireJob(jobId: string) {
    const job = await this.getJobRecord(jobId);
    if (!job) throw new NotFoundException("Production item not found");
    return job;
  }

  private productionInclude() {
    return {
      order: { include: { customer: { select: { id: true, email: true, displayName: true } }, payments: { orderBy: { createdAt: "desc" as const }, take: 1 } } },
      orderItem: true,
    } satisfies Prisma.ProductionJobInclude;
  }

  private whereForFilter(filter?: string): Prisma.ProductionJobWhereInput {
    switch (filter) {
      case "queued": return { status: { in: [ProductionJobStatus.ORDERED, ProductionJobStatus.WAITING_FOR_FILE, ProductionJobStatus.FILE_GENERATING] } };
      case "blocked": return { OR: [{ status: ProductionJobStatus.BLOCKED }, { blockerReason: { not: null } }] };
      case "file-missing": return { OR: [{ productionFileAssetId: null }, { productionFileStatus: { in: ["MISSING_SOURCE", "MISSING", "FAILED"] } }] };
      case "file-generating": return { OR: [{ status: ProductionJobStatus.FILE_GENERATING }, { productionFileStatus: { in: ["QUEUED", "PROCESSING", "GENERATING"] } }] };
      case "ready-for-print": return { status: ProductionJobStatus.READY_FOR_PRINT };
      case "in-production": return { status: { in: [ProductionJobStatus.IN_PRODUCTION, ProductionJobStatus.PRINTING] } };
      case "qc": return { status: { in: [ProductionJobStatus.QUALITY_CHECK, ProductionJobStatus.QC] } };
      case "qc-failed": return { status: { in: [ProductionJobStatus.QC_FAILED, ProductionJobStatus.REPRINT_REQUIRED] } };
      case "ready": return { status: { in: [ProductionJobStatus.READY_FOR_PICKUP, ProductionJobStatus.READY_FOR_DELIVERY] } };
      case "completed": return { status: { in: [ProductionJobStatus.DELIVERED, ProductionJobStatus.COMPLETED] } };
      case "canceled": return { status: ProductionJobStatus.CANCELED };
      default: return {};
    }
  }

  private orderByForSort(sort?: ListProductionItemsDto["sort"]): Prisma.ProductionJobOrderByWithRelationInput[] {
    if (sort === "newest") return [{ createdAt: "desc" }];
    if (sort === "oldest") return [{ createdAt: "asc" }];
    if (sort === "priority") return [{ priority: "desc" }, { dueAt: "asc" }, { createdAt: "asc" }];
    if (sort === "dueDate") return [{ dueAt: "asc" }, { priority: "desc" }, { createdAt: "asc" }];
    if (sort === "status") return [{ status: "asc" }, { priority: "desc" }, { createdAt: "asc" }];
    return [{ createdAt: "desc" }];
  }

  private async withGeneratedAssetReadiness<T extends ProductionJobWithRelations>(jobs: T[]) {
    const ids = [...new Set(jobs.map((job) => job.productionFileAssetId).filter((id): id is string => Boolean(id)))];
    const assets = ids.length ? await this.prisma.generatedAsset.findMany({ where: { id: { in: ids } } }) : [];
    const byId = new Map(assets.map((asset) => [asset.id, asset]));
    return jobs.map((job) => {
      const asset = job.productionFileAssetId ? byId.get(job.productionFileAssetId) : undefined;
      const payment = job.order.payments?.[0];
      return {
        ...job,
        productionFileStatus: this.fileStatus(job.productionFileStatus, asset?.status),
        productionFileObjectKey: job.productionFileObjectKey ?? asset?.objectKey ?? null,
        paymentStatus: payment?.status ?? null,
        isPaid: job.order.status === OrderStatus.PAID || job.order.status === OrderStatus.IN_PRODUCTION || Boolean(payment?.status === "PAID"),
      };
    });
  }

  private fileStatus(current?: string | null, generated?: GeneratedAssetStatus) {
    if (generated === GeneratedAssetStatus.READY) return "READY";
    if (generated === GeneratedAssetStatus.PROCESSING) return "GENERATING";
    if (generated === GeneratedAssetStatus.PENDING) return current ?? "QUEUED";
    if (generated === GeneratedAssetStatus.FAILED) return "FAILED";
    if (generated === GeneratedAssetStatus.REPLACED) return "REPLACED";
    return current ?? "MISSING";
  }

  private assertReadyForPrint(job: ProductionJobWithRelations) {
    if (!this.orderStatusIn(job.order.status, [OrderStatus.PAID, OrderStatus.IN_PRODUCTION])) throw new ForbiddenException("Order must be paid before production can start");
    if (job.productionFileStatus !== "READY") throw new BadRequestException("Production file must be READY before marking ready for print");
    if (!job.placementSnapshotJson) throw new BadRequestException("Placement snapshot is required before printing");
    if (!job.productSnapshotJson || !job.selectedOptionsJson) throw new BadRequestException("Product and selected option snapshots are required before printing");
    if (!job.orderItem || job.orderItem.quantity < 1) throw new BadRequestException("Order item quantity is invalid");
  }

  private assertCanStartProduction(job: ProductionJobWithRelations) {
    if (job.status !== ProductionJobStatus.READY_FOR_PRINT) throw new BadRequestException("Item must be READY_FOR_PRINT before production can start");
    if (job.productionFileStatus !== "READY") throw new BadRequestException("Production file must be READY before production can start");
  }

  private assertCanSendToQc(job: ProductionJobWithRelations, producedQuantity?: number) {
    if (!this.statusIn(job.status, [ProductionJobStatus.IN_PRODUCTION, ProductionJobStatus.PRINTING])) throw new BadRequestException("Item must be in production before QC");
    const produced = producedQuantity ?? job.producedQuantity;
    if (!Number.isInteger(produced) || (produced ?? 0) <= 0) throw new BadRequestException("Produced quantity is required before QC");
  }

  private assertCanQc(job: ProductionJobWithRelations) {
    if (!this.statusIn(job.status, [ProductionJobStatus.QUALITY_CHECK, ProductionJobStatus.QC])) throw new BadRequestException("Item must be in QUALITY_CHECK before QC decision");
  }

  private assertCanReadyForPickup(job: ProductionJobWithRelations) {
    if (job.qcStatus !== "PASSED") throw new BadRequestException("QC must pass before pickup handoff");
    if (!job.order.pickupLocation && this.deliveryType(job) !== "PICKUP") throw new BadRequestException("Pickup method or pickup location is required");
  }

  private assertCanReadyForDelivery(job: ProductionJobWithRelations) {
    if (job.qcStatus !== "PASSED") throw new BadRequestException("QC must pass before delivery handoff");
    if (!this.deliveryType(job)) throw new BadRequestException("Delivery method is required");
  }

  private resolveQcQuantities(job: ProductionJobWithRelations, dto: ProductionQcDecisionDto, passing: boolean) {
    const ordered = job.orderItem?.quantity ?? 0;
    const producedQuantity = dto.producedQuantity ?? job.producedQuantity ?? ordered;
    const acceptedQuantity = dto.acceptedQuantity ?? (passing ? ordered : 0);
    const rejectedQuantity = dto.rejectedQuantity ?? Math.max(0, producedQuantity - acceptedQuantity);
    if (acceptedQuantity + rejectedQuantity > producedQuantity) throw new BadRequestException("Accepted plus rejected quantity cannot exceed produced quantity");
    if (passing && acceptedQuantity < ordered) throw new BadRequestException("QC pass requires accepted quantity to meet ordered quantity");
    return { producedQuantity, acceptedQuantity, rejectedQuantity, orderedQuantity: ordered };
  }

  private async updateJobWithHistory(actorId: string | undefined, existing: ProductionJobWithRelations, data: Prisma.ProductionJobUpdateInput, target: ProductionJobStatus, details: { note?: string; reason?: string }) {
    const history = this.history(existing.statusHistoryJson);
    history.push({ at: new Date().toISOString(), actorId, from: existing.status, to: target, note: details.note, reason: details.reason });
    return this.prisma.productionJob.update({
      where: { id: existing.id },
      data: { ...data, statusHistoryJson: this.cleanJson(history) },
    });
  }

  private async aggregateOrderStatus(orderId: string) {
    const jobs = await this.prisma.productionJob.findMany({ where: { orderId } });
    if (!jobs.length) return;
    const active = jobs.filter((job) => job.status !== ProductionJobStatus.CANCELED);
    if (!active.length) {
      await this.prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.CANCELLED } });
      return;
    }
    if (active.every((job) => this.statusIn(job.status, [ProductionJobStatus.DELIVERED, ProductionJobStatus.COMPLETED]))) {
      await this.prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.DELIVERED } });
      return;
    }
    if (active.some((job) => job.status === ProductionJobStatus.READY_FOR_PICKUP)) {
      await this.prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.READY_FOR_PICKUP } });
      return;
    }
    if (active.some((job) => this.statusIn(job.status, [ProductionJobStatus.READY_FOR_DELIVERY, ProductionJobStatus.OUT_FOR_DELIVERY]))) {
      await this.prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.SHIPPED } });
      return;
    }
    if (active.some((job) => !TERMINAL_STATUSES.has(job.status))) {
      await this.prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.IN_PRODUCTION } });
    }
  }

  private auditActionForStatus(status: ProductionJobStatus) {
    if (status === ProductionJobStatus.BLOCKED) return "production.item.blocked";
    if (status === ProductionJobStatus.READY_FOR_PICKUP) return "production.ready_for_pickup";
    if (status === ProductionJobStatus.READY_FOR_DELIVERY) return "production.ready_for_delivery";
    if (status === ProductionJobStatus.OUT_FOR_DELIVERY) return "production.out_for_delivery";
    if (status === ProductionJobStatus.DELIVERED) return "production.delivered";
    if (status === ProductionJobStatus.COMPLETED) return "production.completed";
    if (status === ProductionJobStatus.CANCELED) return "production.canceled";
    return "production.status.changed";
  }

  private statusIn(status: ProductionJobStatus, statuses: ProductionJobStatus[]) {
    return statuses.includes(status);
  }

  private generatedStatusIn(status: GeneratedAssetStatus, statuses: GeneratedAssetStatus[]) {
    return statuses.includes(status);
  }

  private orderStatusIn(status: OrderStatus, statuses: OrderStatus[]) {
    return statuses.includes(status);
  }

  private countStatuses(jobs: Array<{ status: ProductionJobStatus }>, statuses: ProductionJobStatus[]) {
    const set = new Set(statuses);
    return jobs.filter((job) => set.has(job.status)).length;
  }

  private deliveryType(job: ProductionJobWithRelations) {
    return job.order.deliveryType ?? this.objectJson(job.customerSnapshotJson).deliveryType as string | undefined;
  }

  private sourcePlacementIdFrom(value: Prisma.JsonValue | null) {
    const snapshot = this.objectJson(value);
    return this.stringFrom(snapshot.sourcePlacementId) ?? this.stringFrom(snapshot.placementId) ?? this.stringFrom(snapshot.mockupPlacementId);
  }

  private objectJson(value: Prisma.JsonValue | null): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private stringFrom(value: unknown) {
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }

  private history(value: Prisma.JsonValue | null): ProductionStatusHistoryEntry[] {
    return Array.isArray(value) ? value.filter((item): item is ProductionStatusHistoryEntry => Boolean(item && typeof item === "object")) : [];
  }

  private appendNote(existing: string | null | undefined, line: string) {
    return existing ? `${existing}\n${line}` : line;
  }

  private cleanJson<T>(value: T): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
  }
}
