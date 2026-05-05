import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ProductionJobStatus } from "@prisma/client";

@Injectable()
export class ProductionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(queueType?: string) {
    return this.prisma.productionJob.findMany({
      where: queueType ? { queueType } : {},
      include: { order: true },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
  }

  async updateStatus(actorId: string, jobId: string, status: ProductionJobStatus) {
    const existing = await this.prisma.productionJob.findUnique({ where: { id: jobId } });
    if (!existing) throw new NotFoundException("Production job not found");
    const updated = await this.prisma.productionJob.update({ where: { id: jobId }, data: { status } });
    await this.audit.log({
      actorId,
      action: "production.status.update",
      entityType: "ProductionJob",
      entityId: jobId,
      details: { from: existing.status, to: status },
    });
    return updated;
  }

  async assign(actorId: string, jobId: string, assigneeId: string, note?: string) {
    const existing = await this.prisma.productionJob.findUnique({ where: { id: jobId } });
    if (!existing) throw new NotFoundException("Production job not found");
    const assignmentLine = `[ASSIGN] assignee=${assigneeId}${note ? ` note=${note}` : ""}`;
    const updated = await this.prisma.productionJob.update({
      where: { id: jobId },
      data: {
        notes: this.appendNote(existing.notes, assignmentLine),
      },
    });
    await this.audit.log({
      actorId,
      action: "production.assign",
      entityType: "ProductionJob",
      entityId: jobId,
      details: { assigneeId, note: note ?? null },
    });
    return updated;
  }

  async submitQc(
    actorId: string,
    jobId: string,
    passed: boolean,
    note?: string,
    checklist?: { printQuality?: boolean; sizeAccuracy?: boolean; placementAccuracy?: boolean; packagingReady?: boolean },
  ) {
    const existing = await this.prisma.productionJob.findUnique({ where: { id: jobId } });
    if (!existing) throw new NotFoundException("Production job not found");
    const checklistLine = checklist
      ? ` checklist=${JSON.stringify({
          printQuality: checklist.printQuality ?? null,
          sizeAccuracy: checklist.sizeAccuracy ?? null,
          placementAccuracy: checklist.placementAccuracy ?? null,
          packagingReady: checklist.packagingReady ?? null,
        })}`
      : "";
    const qcLine = `[QC] result=${passed ? "PASS" : "FAIL"}${note ? ` note=${note}` : ""}${checklistLine}`;
    const updated = await this.prisma.productionJob.update({
      where: { id: jobId },
      data: {
        status: passed ? ProductionJobStatus.PACKING : ProductionJobStatus.FILE_CHECK,
        notes: this.appendNote(existing.notes, qcLine),
      },
    });
    await this.audit.log({
      actorId,
      action: "production.qc.submit",
      entityType: "ProductionJob",
      entityId: jobId,
      details: { passed, note: note ?? null, checklist: checklist ?? null, from: existing.status, to: updated.status },
    });
    return updated;
  }

  private appendNote(existing: string | null | undefined, line: string) {
    return existing ? `${existing}\n${line}` : line;
  }
}
