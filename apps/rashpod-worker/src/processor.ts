import { WorkerDispatcher } from "./dispatcher";
import { WorkerJob } from "./types";
import { WorkerLogger, workerLogger } from "./logger";

export interface QueuePort {
  claimNext(): Promise<WorkerJob | null>;
  complete(jobId: string): Promise<void>;
  fail(jobId: string, errorMessage: string): Promise<void>;
}

export class WorkerProcessor {
  constructor(
    private readonly queue: QueuePort,
    private readonly dispatcher: WorkerDispatcher,
    private readonly logger: WorkerLogger = workerLogger,
  ) {}

  async processOnce(): Promise<{ processed: boolean; jobId?: string; status?: "completed" | "failed" }> {
    const job = await this.queue.claimNext();
    if (!job) return { processed: false };
    this.logger.info(
      JSON.stringify({
        level: "info",
        event: "worker.job.claimed",
        jobId: job.id,
        jobType: job.type,
      }),
    );
    try {
      await this.dispatcher.dispatch(job);
      await this.queue.complete(job.id);
      this.logger.info(
        JSON.stringify({
          level: "info",
          event: "worker.job.completed",
          jobId: job.id,
          jobType: job.type,
        }),
      );
      return { processed: true, jobId: job.id, status: "completed" };
    } catch (error) {
      await this.queue.fail(job.id, error instanceof Error ? error.message : "Unknown worker error");
      this.logger.error(
        JSON.stringify({
          level: "error",
          event: "worker.job.failed",
          jobId: job.id,
          jobType: job.type,
          error: error instanceof Error ? error.message : "Unknown worker error",
        }),
      );
      return { processed: true, jobId: job.id, status: "failed" };
    }
  }
}
