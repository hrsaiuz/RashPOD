import { getPrismaClient } from "./db";
import { WorkerJob } from "./types";
import { WorkerLogger, workerLogger } from "./logger";

export class QueueRepository {
  constructor(
    private readonly db: any = getPrismaClient() as any,
    private readonly logger: WorkerLogger = workerLogger,
  ) {}

  async claimNext(): Promise<WorkerJob | null> {
    const next = await this.db.workerJob.findFirst({
      where: { status: "PENDING", nextRunAt: { lte: new Date() } },
      orderBy: { createdAt: "asc" },
    });
    if (!next) return null;

    const claimed = await this.db.workerJob.updateMany({
      where: { id: next.id, status: "PENDING" },
      data: { status: "PROCESSING", claimedAt: new Date(), attempts: { increment: 1 } },
    });
    if (claimed.count === 0) return null;

    const job = await this.db.workerJob.findUnique({ where: { id: next.id } });
    if (!job) return null;
    this.logger.info(
      JSON.stringify({
        level: "info",
        event: "worker.queue.claimed",
        jobId: job.id,
        jobType: job.type,
        attempts: job.attempts,
      }),
    );
    return {
      id: job.id,
      type: job.type as WorkerJob["type"],
      payload: job.payloadJson as Record<string, unknown>,
      createdAt: job.createdAt.toISOString(),
    };
  }

  async complete(jobId: string) {
    await this.db.workerJob.update({
      where: { id: jobId },
      data: { status: "COMPLETED", completedAt: new Date(), errorMessage: null },
    });
    this.logger.info(
      JSON.stringify({
        level: "info",
        event: "worker.queue.completed",
        jobId,
      }),
    );
  }

  async fail(jobId: string, errorMessage: string) {
    const job = await this.db.workerJob.findUnique({ where: { id: jobId } });
    if (!job) return;
    const shouldRetry = job.attempts < job.maxAttempts;
    const nextRunAt = shouldRetry
      ? new Date(Date.now() + this.computeBackoffMs(job.attempts))
      : job.nextRunAt;
    await this.db.workerJob.update({
      where: { id: jobId },
      data: {
        status: shouldRetry ? "PENDING" : "FAILED",
        errorMessage,
        nextRunAt,
        lastErrorAt: new Date(),
      },
    });
    this.logger.error(
      JSON.stringify({
        level: "error",
        event: "worker.queue.failed",
        jobId,
        status: shouldRetry ? "PENDING" : "FAILED",
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        error: errorMessage,
      }),
    );
  }

  private computeBackoffMs(attempts: number) {
    const base = 2000;
    const max = 5 * 60 * 1000;
    const value = base * Math.pow(2, Math.max(0, attempts));
    return Math.min(value, max);
  }
}
