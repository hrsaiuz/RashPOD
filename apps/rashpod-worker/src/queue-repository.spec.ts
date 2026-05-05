import { QueueRepository } from "./queue-repository";
import { WorkerLogger } from "./logger";

type JobRow = {
  id: string;
  type: string;
  status: string;
  payloadJson: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  errorMessage: string | null;
  nextRunAt: Date;
  lastErrorAt: Date | null;
  claimedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function createFakeDb(seed: JobRow[]) {
  const rows = [...seed];
  return {
    workerJob: {
      findFirst: async ({ where }: any) =>
        rows.find((r) => r.status === where.status && r.nextRunAt <= where.nextRunAt.lte) ?? null,
      updateMany: async ({ where, data }: any) => {
        const row = rows.find((r) => r.id === where.id && r.status === where.status);
        if (!row) return { count: 0 };
        row.status = data.status;
        row.claimedAt = data.claimedAt;
        row.attempts += data?.attempts?.increment ?? 0;
        row.updatedAt = new Date();
        return { count: 1 };
      },
      findUnique: async ({ where }: any) => rows.find((r) => r.id === where.id) ?? null,
      update: async ({ where, data }: any) => {
        const row = rows.find((r) => r.id === where.id)!;
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
    },
  };
}

describe("QueueRepository", () => {
  const logger: WorkerLogger = { info: jest.fn(), error: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("claims pending job and marks processing with incremented attempts", async () => {
    const db = createFakeDb([
      {
        id: "j1",
        type: "GENERATE_PRODUCT_MOCKUPS",
        status: "PENDING",
        payloadJson: { generatedAssetId: "a1", placementId: "p1" },
        attempts: 0,
        maxAttempts: 3,
        errorMessage: null,
        nextRunAt: new Date(Date.now() - 1000),
        lastErrorAt: null,
        claimedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const repo = new QueueRepository(db, logger);
    const job = await repo.claimNext();
    expect(job?.id).toBe("j1");

    const state = await db.workerJob.findUnique({ where: { id: "j1" } });
    expect(state?.status).toBe("PROCESSING");
    expect(state?.attempts).toBe(1);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('"event":"worker.queue.claimed"'));
  });

  it("requeues when attempts are below max, fails at max attempts", async () => {
    const db = createFakeDb([
      {
        id: "j2",
        type: "GENERATE_LISTING_IMAGE_PACK",
        status: "PROCESSING",
        payloadJson: { generatedAssetIds: ["g1"], placementId: "p2" },
        attempts: 1,
        maxAttempts: 3,
        errorMessage: null,
        nextRunAt: new Date(Date.now() - 1000),
        lastErrorAt: null,
        claimedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "j3",
        type: "GENERATE_LISTING_IMAGE_PACK",
        status: "PROCESSING",
        payloadJson: { generatedAssetIds: ["g2"], placementId: "p3" },
        attempts: 3,
        maxAttempts: 3,
        errorMessage: null,
        nextRunAt: new Date(Date.now() - 1000),
        lastErrorAt: null,
        claimedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const repo = new QueueRepository(db, logger);

    await repo.fail("j2", "temp fail");
    const row2 = await db.workerJob.findUnique({ where: { id: "j2" } });
    expect(row2?.status).toBe("PENDING");
    expect(row2?.lastErrorAt).toBeTruthy();
    expect(row2?.nextRunAt.getTime()).toBeGreaterThan(Date.now());
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('"event":"worker.queue.failed"'));

    await repo.fail("j3", "hard fail");
    const row3 = await db.workerJob.findUnique({ where: { id: "j3" } });
    expect(row3?.status).toBe("FAILED");
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('"status":"FAILED"'));
  });
});
