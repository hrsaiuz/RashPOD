import { GeneratedAssetStatus, OrderStatus, ProductionJobStatus } from "@prisma/client";
import { AuditService } from "../src/modules/audit/audit.service";
import { ProductionService } from "../src/modules/production/production.service";

const baseJob = (overrides: Record<string, unknown> = {}) => ({
  id: "pj1",
  orderId: "order-1",
  orderItemId: "item-1",
  status: ProductionJobStatus.QUALITY_CHECK,
  queueType: "POD",
  priority: 0,
  assignedOperatorId: null,
  blockerReason: null,
  failureReason: null,
  customerSnapshotJson: { deliveryType: "PICKUP" },
  productSnapshotJson: { baseProductName: "T-shirt" },
  placementSnapshotJson: { sourcePlacementId: "placement-1" },
  printAreaSnapshotJson: { widthMm: 200, heightMm: 280 },
  assetSnapshotJson: { designAssetId: "asset-1" },
  selectedOptionsJson: { size: "M", color: "Blue" },
  productionFileStatus: "READY",
  productionFileAssetId: "generated-1",
  productionFileObjectKey: null,
  productionFileUrl: null,
  productionFileJobId: null,
  mockupPreviewUrl: null,
  dueAt: null,
  queuedAt: new Date("2026-05-21T00:00:00.000Z"),
  startedAt: null,
  qcAt: null,
  readyAt: null,
  completedAt: null,
  canceledAt: null,
  qcStatus: null,
  qcNote: null,
  qcFailedReason: null,
  qcCheckedById: null,
  qcCheckedAt: null,
  producedQuantity: 2,
  acceptedQuantity: null,
  rejectedQuantity: null,
  defectReason: null,
  reprintOfProductionItemId: null,
  deliveryProvider: null,
  deliveryTrackingRef: null,
  deliveryNote: null,
  pickupNote: null,
  statusHistoryJson: null,
  notes: null,
  createdAt: new Date("2026-05-21T00:00:00.000Z"),
  updatedAt: new Date("2026-05-21T00:00:00.000Z"),
  order: {
    id: "order-1",
    status: OrderStatus.IN_PRODUCTION,
    deliveryType: "PICKUP",
    pickupLocation: "Tashkent studio",
    payments: [{ status: "PAID" }],
    customer: { id: "customer-1", email: "customer@example.com", displayName: "Customer" },
  },
  orderItem: { id: "item-1", quantity: 2 },
  ...overrides,
});

const makeService = (job = baseJob()) => {
  const prisma: any = {
    productionJob: {
      findUnique: jest.fn().mockResolvedValue(job),
      findMany: jest.fn().mockResolvedValue([{ id: job.id, orderId: job.orderId, status: ProductionJobStatus.COMPLETED }]),
      update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ ...job, ...data })),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn().mockResolvedValue(0),
    },
    order: { update: jest.fn().mockResolvedValue({ id: "order-1" }) },
    generatedAsset: {
      findUnique: jest.fn().mockResolvedValue({ id: "generated-1", status: GeneratedAssetStatus.FAILED, objectKey: null }),
      create: jest.fn().mockResolvedValue({ id: "generated-new" }),
      update: jest.fn().mockResolvedValue({ id: "generated-1" }),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
  const storage = { createSignedReadUrl: jest.fn().mockResolvedValue("https://signed.example/file.pdf") } as any;
  const jobs = { enqueue: jest.fn().mockResolvedValue({ jobId: "worker-job-1" }) } as any;
  return { service: new ProductionService(prisma, audit, storage, jobs), prisma, audit, storage, jobs };
};

describe("ProductionService", () => {
  it("assigns an operator and audits the assignment", async () => {
    const { service, prisma, audit } = makeService(baseJob({ status: ProductionJobStatus.ORDERED, assignedOperatorId: null }));

    await service.assign("admin-1", "pj1", "staff-1", "Urgent job");

    expect(prisma.productionJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pj1" },
        data: expect.objectContaining({ assignedOperatorId: "staff-1", notes: expect.stringContaining("assignee=staff-1") }),
      }),
    );
    expect((audit.log as any)).toHaveBeenCalledWith(expect.objectContaining({ action: "production.item.assigned", entityId: "pj1" }));
  });

  it("passes QC with accepted quantities and advances to pickup handoff", async () => {
    const { service, prisma, audit } = makeService();

    const result: any = await service.passQc("staff-2", "pj1", { producedQuantity: 2, acceptedQuantity: 2, rejectedQuantity: 0, note: "Looks good" });

    expect(result.status).toBe(ProductionJobStatus.READY_FOR_PICKUP);
    expect(result.qcStatus).toBe("PASSED");
    expect(prisma.order.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "order-1" } }));
    expect((audit.log as any)).toHaveBeenCalledWith(expect.objectContaining({ action: "production.qc.passed", entityId: "pj1" }));
  });

  it("rejects QC pass when accepted quantity is below ordered quantity", async () => {
    const { service } = makeService();

    await expect(service.passQc("staff-2", "pj1", { producedQuantity: 2, acceptedQuantity: 1, rejectedQuantity: 1 })).rejects.toThrow(
      "QC pass requires accepted quantity to meet ordered quantity",
    );
  });

  it("retries failed production file generation and replaces the failed asset", async () => {
    const { service, prisma, jobs, audit } = makeService(baseJob({ status: ProductionJobStatus.WAITING_FOR_FILE, productionFileStatus: "FAILED" }));

    await service.requestFile("staff-3", "pj1", { reason: "Regenerate after renderer fix" }, true);

    expect(prisma.generatedAsset.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "generated-1" }, data: expect.objectContaining({ status: GeneratedAssetStatus.REPLACED }) }));
    expect(prisma.generatedAsset.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ sourcePlacementId: "placement-1", type: "PRODUCTION_FILE" }) }));
    expect(jobs.enqueue).toHaveBeenCalledWith("GENERATE_PRODUCTION_FILE", { placementId: "placement-1", generatedAssetId: "generated-new" });
    expect((audit.log as any)).toHaveBeenCalledWith(expect.objectContaining({ action: "production.file.retry_requested", entityId: "pj1" }));
  });

  it("returns signed download URLs only for ready generated production files", async () => {
    const { service, prisma, storage, audit } = makeService(baseJob({ productionFileAssetId: "generated-ready" }));
    prisma.generatedAsset.findUnique.mockResolvedValue({ id: "generated-ready", status: GeneratedAssetStatus.READY, objectKey: "private/production/file.pdf" });

    const result = await service.downloadFile("staff-4", "pj1");

    expect(storage.createSignedReadUrl).toHaveBeenCalledWith(expect.objectContaining({ objectKey: "private/production/file.pdf" }));
    expect(result.url).toBe("https://signed.example/file.pdf");
    expect((audit.log as any)).toHaveBeenCalledWith(expect.objectContaining({ action: "production.file.downloaded", entityId: "pj1" }));
  });
});
