import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ListWorkerJobsDto } from "./dto/list-worker-jobs.dto";

export type JobType =
  | "GENERATE_PRODUCT_MOCKUPS"
  | "GENERATE_LOCAL_MOCKUPS"
  | "GENERATE_PRINTFUL_MOCKUPS"
  | "POLL_PRINTFUL_MOCKUP_TASK"
  | "CREATE_PRODUCT_LISTING_DRAFT"
  | "PUBLISH_MARKETPLACE_LISTING"
  | "SYNC_PRINTFUL_CATALOG"
  | "SYNC_POD_CATALOG"
  | "UPLOAD_POD_PROVIDER_FILE"
  | "SYNC_POD_PRODUCT_DRAFT"
  | "RETRY_FAILED_INTEGRATION"
  | "GENERATE_LISTING_IMAGE_PACK"
  | "GENERATE_FILM_PREVIEW"
  | "GENERATE_PRODUCTION_FILE"
  | "SEND_EMAIL";

@Injectable()
export class JobDispatcherService {
  private static lastHealthAlertAtMs = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async enqueue(jobType: JobType, payload: Record<string, unknown>) {
    const idempotencyKey = this.idempotencyKeyFor(jobType, payload);
    if (idempotencyKey) {
      const existing = await this.prisma.workerJob.findUnique({ where: { idempotencyKey } });
      if (existing) {
        return { accepted: true, jobId: existing.id, jobType: existing.type, status: existing.status, idempotent: true };
      }
    }
    const job = await this.prisma.workerJob.create({
      data: {
        type: jobType,
        idempotencyKey,
        payloadJson: payload as Prisma.InputJsonValue,
        nextRunAt: new Date(),
      },
    });
    return { accepted: true, jobId: job.id, jobType: job.type, status: job.status };
  }

  private idempotencyKeyFor(jobType: JobType, payload: Record<string, unknown>) {
    if (jobType === "GENERATE_LOCAL_MOCKUPS" || jobType === "GENERATE_PRINTFUL_MOCKUPS") {
      const selectionId = payload.designProductSelectionId;
      if (typeof selectionId === "string" && selectionId.length > 0) return `${jobType}:${selectionId}`;
    }
    if (jobType === "GENERATE_LISTING_IMAGE_PACK" || jobType === "GENERATE_FILM_PREVIEW" || jobType === "GENERATE_PRODUCTION_FILE") {
      const generatedAssetId = payload.generatedAssetId;
      if (typeof generatedAssetId === "string" && generatedAssetId.length > 0) return `${jobType}:${generatedAssetId}`;
      const productionJobId = payload.productionJobId;
      if (jobType === "GENERATE_PRODUCTION_FILE" && typeof productionJobId === "string" && productionJobId.length > 0) return `${jobType}:production-job:${productionJobId}`;
    }
    if (jobType === "SYNC_POD_CATALOG") {
      const providerConfigId = payload.providerConfigId;
      if (typeof providerConfigId === "string" && providerConfigId.length > 0) return `${jobType}:${providerConfigId}`;
    }
    if (jobType === "UPLOAD_POD_PROVIDER_FILE") {
      const providerConfigId = payload.providerConfigId;
      const sourceAssetId = payload.sourceAssetId;
      if (typeof providerConfigId === "string" && typeof sourceAssetId === "string") return `${jobType}:${providerConfigId}:${sourceAssetId}`;
    }
    if (jobType === "SYNC_POD_PRODUCT_DRAFT") {
      const syncRecordId = payload.syncRecordId;
      if (typeof syncRecordId === "string" && syncRecordId.length > 0) return `${jobType}:${syncRecordId}`;
    }
    return undefined;
  }

  async list(filters: ListWorkerJobsDto) {
    if (filters.deadLetter === "true") {
      const failed = await this.prisma.workerJob.findMany({
        where: { status: "FAILED", type: filters.type },
        orderBy: { createdAt: "desc" },
        take: 400,
      });
      return failed.filter((j) => j.attempts >= j.maxAttempts).slice(0, 200);
    }

    return this.prisma.workerJob.findMany({
      where: { type: filters.type, status: filters.status },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async deadLetterList() {
    const failed = await this.prisma.workerJob.findMany({
      where: { status: "FAILED" },
      orderBy: { createdAt: "desc" },
      take: 400,
    });
    return failed.filter((j) => j.attempts >= j.maxAttempts).slice(0, 200);
  }

  async metrics() {
    const jobs = await this.prisma.workerJob.findMany({
      orderBy: { createdAt: "asc" },
      take: 1000,
    });
    const now = Date.now();
    const pending = jobs.filter((j) => j.status === "PENDING");
    const processing = jobs.filter((j) => j.status === "PROCESSING");
    const failed = jobs.filter((j) => j.status === "FAILED");
    const retrySaturated = failed.filter((j) => j.attempts >= j.maxAttempts);
    const oldestPending = pending[0];
    const oldestPendingAgeSeconds = oldestPending ? Math.max(0, Math.floor((now - oldestPending.createdAt.getTime()) / 1000)) : 0;

    return {
      totals: {
        pending: pending.length,
        processing: processing.length,
        failed: failed.length,
      },
      retry: {
        saturatedFailed: retrySaturated.length,
      },
      lag: {
        oldestPendingAgeSeconds,
      },
    };
  }

  async health(thresholds: { oldestPendingAgeSeconds: number; failedRatePercent: number }) {
    const metrics = await this.metrics();
    const totalJobs = metrics.totals.pending + metrics.totals.processing + metrics.totals.failed;
    const failedRatePercent = totalJobs > 0 ? (metrics.totals.failed / totalJobs) * 100 : 0;
    const lagBreached = metrics.lag.oldestPendingAgeSeconds > thresholds.oldestPendingAgeSeconds;
    const failedRateBreached = failedRatePercent > thresholds.failedRatePercent;
    const ok = !lagBreached && !failedRateBreached;
    return {
      ok,
      thresholds,
      metrics: {
        ...metrics,
        rates: {
          failedRatePercent: Number(failedRatePercent.toFixed(2)),
        },
      },
      breaches: {
        lagBreached,
        failedRateBreached,
      },
    };
  }

  async checkHealthAndAlert(
    actorId: string,
    thresholds: {
      oldestPendingAgeSeconds: number;
      failedRatePercent: number;
      alertCooldownSeconds: number;
      alertRecipients: string[];
    },
  ) {
    const health = await this.health(thresholds);
    if (health.ok) {
      return { ...health, alert: { emitted: false, reason: "healthy" as const } };
    }

    const nowMs = Date.now();
    const cooldownMs = Math.max(0, thresholds.alertCooldownSeconds) * 1000;
    if (nowMs - JobDispatcherService.lastHealthAlertAtMs < cooldownMs) {
      return { ...health, alert: { emitted: false, reason: "cooldown" as const } };
    }

    JobDispatcherService.lastHealthAlertAtMs = nowMs;
    await this.audit.log({
      actorId,
      action: "worker-job.health.breach",
      entityType: "WorkerQueue",
      entityId: "global",
      metadata: health,
    });
    const alertJobs = [];
    for (const to of thresholds.alertRecipients) {
      const alertJob = await this.enqueue("SEND_EMAIL", {
        to,
        templateKey: "worker_queue_alert",
        subject: "RashPOD Queue Alert",
        variables: {
          breaches: health.breaches,
          metrics: health.metrics,
          thresholds: health.thresholds,
        },
        idempotencyKey: `worker-queue-alert:${to}:${Math.floor(nowMs / Math.max(1, cooldownMs || 1))}`,
        triggeredAt: new Date(nowMs).toISOString(),
      });
      alertJobs.push(alertJob.jobId);
    }
    return { ...health, alert: { emitted: true, reason: "breach" as const, jobIds: alertJobs } };
  }

  getById(id: string) {
    return this.prisma.workerJob.findUnique({ where: { id } });
  }

  async retry(actorId: string, id: string) {
    const job = await this.prisma.workerJob.findUnique({ where: { id } });
    if (!job) return null;
    if (job.status !== "FAILED") return job;
    const updated = await this.prisma.workerJob.update({
      where: { id },
      data: {
        status: "PENDING",
        errorMessage: null,
        claimedAt: null,
        completedAt: null,
        attempts: 0,
        nextRunAt: new Date(),
        lastErrorAt: null,
      },
    });
    await this.audit.log({
      actorId,
      action: "worker-job.retry",
      entityType: "WorkerJob",
      entityId: id,
      metadata: { previousStatus: job.status, previousAttempts: job.attempts },
    });
    return updated;
  }

  async retryDeadLetter(actorId: string, ids: string[]) {
    const uniqueIds = [...new Set(ids)];
    const jobs = await this.prisma.workerJob.findMany({
      where: { id: { in: uniqueIds } },
    });
    const candidates = jobs.filter((j) => j.status === "FAILED" && j.attempts >= j.maxAttempts);
    const retried: string[] = [];
    for (const job of candidates) {
      await this.prisma.workerJob.update({
        where: { id: job.id },
        data: {
          status: "PENDING",
          errorMessage: null,
          claimedAt: null,
          completedAt: null,
          attempts: 0,
          nextRunAt: new Date(),
          lastErrorAt: null,
        },
      });
      retried.push(job.id);
    }
    await this.audit.log({
      actorId,
      action: "worker-job.dead-letter.retry",
      entityType: "WorkerQueue",
      entityId: "dead-letter",
      metadata: {
        requestedIds: uniqueIds,
        retriedIds: retried,
        skippedIds: uniqueIds.filter((id) => !retried.includes(id)),
      },
    });
    return { requested: uniqueIds.length, retriedCount: retried.length, retriedIds: retried };
  }

  async cancel(actorId: string, id: string) {
    const job = await this.prisma.workerJob.findUnique({ where: { id } });
    if (!job) return null;
    const updated = await this.prisma.workerJob.update({
      where: { id },
      data: {
        status: "FAILED",
        errorMessage: "Cancelled by admin",
        completedAt: new Date(),
        claimedAt: null,
        nextRunAt: new Date("2999-01-01T00:00:00.000Z"),
      },
    });
    await this.audit.log({
      actorId,
      action: "worker-job.cancel",
      entityType: "WorkerJob",
      entityId: id,
      metadata: { previousStatus: job.status, previousAttempts: job.attempts },
    });
    return updated;
  }
}
