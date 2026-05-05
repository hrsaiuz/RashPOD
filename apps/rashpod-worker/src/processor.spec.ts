import { WorkerDispatcher } from "./dispatcher";
import { WorkerRepository } from "./repository";
import { WorkerProcessor, QueuePort } from "./processor";
import { WorkerJob } from "./types";
import { WorkerLogger } from "./logger";

class FakeRepo implements WorkerRepository {
  async getGeneratedAsset(id: string) {
    return { id, status: "PENDING" as const };
  }
  async updateGeneratedAsset(id: string, data: any) {
    return { id, status: data.status ?? "PENDING", fileKey: data.fileKey, errorMessage: data.errorMessage };
  }
}

class FakeQueue implements QueuePort {
  constructor(private readonly jobs: WorkerJob[]) {}
  public completed: string[] = [];
  public failed: Array<{ id: string; message: string }> = [];

  async claimNext(): Promise<WorkerJob | null> {
    return this.jobs.shift() ?? null;
  }
  async complete(jobId: string): Promise<void> {
    this.completed.push(jobId);
  }
  async fail(jobId: string, errorMessage: string): Promise<void> {
    this.failed.push({ id: jobId, message: errorMessage });
  }
}

class ThrowingDispatcher {
  async dispatch() {
    throw new Error("boom");
  }
}

describe("WorkerProcessor", () => {
  const logger: WorkerLogger = { info: jest.fn(), error: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("marks job completed when dispatch succeeds", async () => {
    const queue = new FakeQueue([
      {
        id: "j1",
        type: "GENERATE_PRODUCT_MOCKUPS",
        payload: { placementId: "p1", generatedAssetId: "g1" },
        createdAt: new Date().toISOString(),
      },
    ]);
    const processor = new WorkerProcessor(queue, new WorkerDispatcher(new FakeRepo(), undefined, logger), logger);

    const result = await processor.processOnce();
    expect(result.processed).toBe(true);
    expect(result.status).toBe("completed");
    expect(queue.completed).toEqual(["j1"]);
    expect(queue.failed).toHaveLength(0);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('"event":"worker.job.completed"'));
  });

  it("marks job failed when dispatch throws", async () => {
    const queue = new FakeQueue([
      {
        id: "j2",
        type: "GENERATE_PRODUCT_MOCKUPS",
        payload: { placementId: "p2" }, // missing generatedAssetId triggers downstream failure
        createdAt: new Date().toISOString(),
      },
    ]);
    const processor = new WorkerProcessor(queue, new ThrowingDispatcher() as unknown as WorkerDispatcher, logger);

    const result = await processor.processOnce();
    expect(result.processed).toBe(true);
    expect(result.status).toBe("failed");
    expect(queue.completed).toHaveLength(0);
    expect(queue.failed[0]?.id).toBe("j2");
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('"event":"worker.job.failed"'));
  });

  it("processes SEND_EMAIL job and marks completed", async () => {
    const queue = new FakeQueue([
      {
        id: "j3",
        type: "SEND_EMAIL",
        payload: {
          to: "ops@test.local",
          templateKey: "worker_queue_alert",
          variables: {
            breaches: { lagBreached: true, failedRateBreached: true },
            metrics: {
              totals: { pending: 1, processing: 0, failed: 1 },
              rates: { failedRatePercent: 50 },
              lag: { oldestPendingAgeSeconds: 1200 },
            },
            thresholds: { oldestPendingAgeSeconds: 900, failedRatePercent: 10 },
          },
          idempotencyKey: "k-send-email-j3",
        },
        createdAt: new Date().toISOString(),
      },
    ]);
    const sender = {
      send: jest.fn().mockResolvedValue({ accepted: true, providerRef: "send-ref-j3" }),
    };
    const processor = new WorkerProcessor(
      queue,
      new WorkerDispatcher(new FakeRepo(), sender as any, logger),
      logger,
    );

    const result = await processor.processOnce();
    expect(result.processed).toBe(true);
    expect(result.status).toBe("completed");
    expect(queue.completed).toEqual(["j3"]);
    expect(queue.failed).toHaveLength(0);
    expect(sender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ops@test.local",
        templateKey: "worker_queue_alert",
        subject: expect.stringContaining("RashPOD Queue Alert"),
        text: expect.stringContaining("Failed rate: 50%"),
      }),
    );
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('"event":"worker.job.completed"'));
  });
});
