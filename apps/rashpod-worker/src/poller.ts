import { WorkerLogger, workerLogger } from "./logger";

export interface PollingProcessor {
  processOnce(): Promise<unknown>;
}

export class WorkerPoller {
  private timer: NodeJS.Timeout | null = null;
  private inFlight: Promise<void> | null = null;
  private stopped = true;

  constructor(
    private readonly processor: PollingProcessor,
    pollIntervalMs: number,
    private readonly logger: WorkerLogger = workerLogger,
  ) {
    this.pollIntervalMs = Number.isFinite(pollIntervalMs) && pollIntervalMs > 0 ? pollIntervalMs : 1500;
  }

  private readonly pollIntervalMs: number;

  start() {
    if (!this.stopped) return;
    this.stopped = false;
    this.schedule(0);
  }

  async stop() {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.inFlight;
  }

  private schedule(delayMs: number) {
    if (this.stopped) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.inFlight = this.poll().finally(() => {
        this.inFlight = null;
        this.schedule(this.pollIntervalMs);
      });
    }, delayMs);
    this.timer.unref();
  }

  private async poll() {
    try {
      await this.processor.processOnce();
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          level: "error",
          event: "worker.poll.failed",
          error: error instanceof Error ? error.message : "Unknown worker polling error",
        }),
      );
    }
  }
}
