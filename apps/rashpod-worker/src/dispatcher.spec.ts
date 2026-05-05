import { WorkerDispatcher } from "./dispatcher";
import { WorkerRepository } from "./repository";
import { WorkerLogger } from "./logger";

class FakeRepo implements WorkerRepository {
  async getGeneratedAsset(id: string) {
    return { id, status: "PENDING" as const };
  }
  async updateGeneratedAsset(id: string, data: any) {
    return { id, status: data.status ?? "PENDING" };
  }
}

describe("WorkerDispatcher SEND_EMAIL", () => {
  const logger: WorkerLogger = { info: jest.fn(), error: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("routes SEND_EMAIL payload to email sender", async () => {
    const sender = {
      send: jest.fn().mockResolvedValue({ accepted: true, providerRef: "ok-ref" }),
    };
    const dispatcher = new WorkerDispatcher(new FakeRepo(), sender, logger);

    const result = await dispatcher.dispatch({
      id: "email-job-1",
      type: "SEND_EMAIL",
      payload: {
        to: "alerts@test.local",
        templateKey: "worker_queue_alert",
        variables: { foo: "bar" },
        idempotencyKey: "job:email-job-1",
      },
      createdAt: new Date().toISOString(),
    });

    expect(result).toEqual({ ok: true, providerRef: "ok-ref" });
    expect(sender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "alerts@test.local",
        templateKey: "worker_queue_alert",
        idempotencyKey: "job:email-job-1",
      }),
    );
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('"event":"worker.dispatch.start"'));
  });

  it("consumes API health-check alert payload and renders template before send", async () => {
    const sender = {
      send: jest.fn().mockResolvedValue({ accepted: true, providerRef: "ok-ref-2" }),
    };
    const dispatcher = new WorkerDispatcher(new FakeRepo(), sender, logger);

    const result = await dispatcher.dispatch({
      id: "email-job-2",
      type: "SEND_EMAIL",
      payload: {
        to: "ops-alert@test.local",
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
        idempotencyKey: "worker-queue-alert:ops-alert@test.local:123",
        triggeredAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
    });

    expect(result).toEqual({ ok: true, providerRef: "ok-ref-2" });
    expect(sender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ops-alert@test.local",
        templateKey: "worker_queue_alert",
        idempotencyKey: "worker-queue-alert:ops-alert@test.local:123",
        subject: expect.stringContaining("RashPOD Queue Alert"),
        html: expect.stringContaining("Queue health threshold breached"),
        text: expect.stringContaining("Failed rate: 50%"),
      }),
    );
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('"event":"worker.dispatch.start"'));
  });
});
