import { OrderStatus, PaymentStatus, Prisma, ProductionJobStatus, RoyaltyLedgerStatus } from "@prisma/client";
import { AnalyticsService } from "../src/modules/analytics/analytics.service";

const money = (value: number) => new Prisma.Decimal(value.toFixed(2));
const now = new Date("2026-05-22T10:00:00.000Z");
const old = new Date("2026-05-01T10:00:00.000Z");

function createPrismaMock() {
  const orders: any[] = [
    {
      id: "paid-direct",
      status: OrderStatus.PAID,
      total: money(120),
      currency: "UZS",
      source: "RASHPOD",
      channel: null,
      createdAt: now,
      payments: [{ status: PaymentStatus.PAID, amount: money(120) }],
      financeSnapshots: [{ orderId: "paid-direct", designerId: "designer-1", currency: "UZS", netRevenue: money(100), platformMarginEstimate: money(30), marginIncomplete: false }],
      items: [{ id: "item-1", orderId: "paid-direct", listingId: "listing-1", listingTitle: "Blue Tee", designerId: "designer-1", productTypeId: "shirt", productTypeName: "T-shirt", baseProductId: "base-1", baseProductName: "Classic Tee", quantity: 2, totalPrice: money(120), designerRoyaltyAmount: money(18) }],
    },
    {
      id: "unpaid",
      status: OrderStatus.PENDING_PAYMENT,
      total: money(90),
      currency: "UZS",
      source: "RASHPOD",
      channel: null,
      createdAt: now,
      payments: [{ status: PaymentStatus.PENDING, amount: money(90) }],
      financeSnapshots: [],
      items: [{ id: "item-2", orderId: "unpaid", listingId: "listing-2", listingTitle: "Unpaid Mug", designerId: "designer-2", productTypeId: "mug", productTypeName: "Mug", baseProductId: "base-2", baseProductName: "Mug", quantity: 1, totalPrice: money(90) }],
    },
    {
      id: "film-order",
      status: OrderStatus.DELIVERED,
      total: money(60),
      currency: "UZS",
      source: "RASHPOD",
      channel: null,
      createdAt: now,
      payments: [{ status: PaymentStatus.PAID, amount: money(60) }],
      financeSnapshots: [{ orderId: "film-order", designerId: "designer-1", currency: "UZS", netRevenue: money(55), platformMarginEstimate: money(22), marginIncomplete: false }],
      items: [{ id: "item-3", orderId: "film-order", listingId: "film-1", listingTitle: "Sticker Film", designerId: "designer-1", quantity: 1, totalPrice: money(60), designerRoyaltyAmount: money(9), itemKind: "DESIGN_FILM", filmType: "DTF" }],
    },
    {
      id: "external",
      status: OrderStatus.PAID,
      total: money(200),
      currency: "UZS",
      source: "MARKETPLACE",
      externalSourceType: "MANUAL_MARKETPLACE",
      channel: "UZUM",
      createdAt: now,
      payments: [{ status: PaymentStatus.PAID, amount: money(200) }],
      financeSnapshots: [{ orderId: "external", designerId: "designer-2", currency: "UZS", netRevenue: money(180), platformMarginEstimate: money(40), marginIncomplete: true }],
      items: [{ id: "item-4", orderId: "external", listingId: "listing-3", listingTitle: "External Hoodie", designerId: "designer-2", productTypeId: "hoodie", productTypeName: "Hoodie", baseProductId: "base-3", baseProductName: "Hoodie", quantity: 1, totalPrice: money(200), externalSourceType: "MANUAL_MARKETPLACE" }],
    },
    {
      id: "refunded",
      status: OrderStatus.REFUNDED,
      total: money(50),
      currency: "UZS",
      source: "RASHPOD",
      channel: null,
      createdAt: now,
      payments: [{ status: PaymentStatus.REFUNDED, amount: money(50) }],
      financeSnapshots: [],
      items: [],
    },
  ];
  const royaltyEntries: any[] = [
    { designerId: "designer-1", status: RoyaltyLedgerStatus.PAYABLE, amount: money(27), currency: "UZS", createdAt: now },
    { designerId: "designer-2", status: RoyaltyLedgerStatus.PAYABLE, amount: money(99), currency: "UZS", createdAt: now },
  ];
  const payouts: any[] = [{ id: "payout-1", designerId: "designer-1", status: "PAID", amount: money(10), currency: "UZS", paidAt: now, createdAt: now }];
  return {
    order: { findMany: jest.fn().mockResolvedValue(orders) },
    orderFinanceSnapshot: { findMany: jest.fn().mockResolvedValue(orders.flatMap((order) => order.financeSnapshots)), count: jest.fn().mockResolvedValue(1) },
    paymentTransaction: { findMany: jest.fn().mockResolvedValue(orders.flatMap((order) => order.payments).map((payment, index) => ({ id: `p-${index}`, createdAt: now, currency: "UZS", ...payment }))) },
    royaltyLedgerEntry: { findMany: jest.fn().mockImplementation(async ({ where }: any = {}) => royaltyEntries.filter((entry) => !where?.designerId || entry.designerId === where.designerId)) },
    payout: { findMany: jest.fn().mockImplementation(async ({ where }: any = {}) => payouts.filter((payout) => !where?.designerId || payout.designerId === where.designerId)) },
    paymentReconciliation: { findMany: jest.fn().mockResolvedValue([{ status: "MISMATCHED", currency: "UZS", createdAt: now }]), count: jest.fn().mockResolvedValue(1) },
    productionJob: { findMany: jest.fn().mockResolvedValue([
      { id: "prod-1", status: ProductionJobStatus.COMPLETED, queueType: "POD", queuedAt: old, startedAt: new Date("2026-05-02T10:00:00.000Z"), qcAt: new Date("2026-05-03T10:00:00.000Z"), readyAt: new Date("2026-05-04T10:00:00.000Z"), completedAt: new Date("2026-05-05T10:00:00.000Z"), dueAt: new Date("2026-05-06T10:00:00.000Z"), qcStatus: "PASSED", rejectedQuantity: 0, productSnapshotJson: { productTypeName: "T-shirt" }, order: { createdAt: old }, createdAt: old },
      { id: "prod-2", status: ProductionJobStatus.BLOCKED, queueType: "DTF", queuedAt: old, startedAt: null, qcAt: null, readyAt: null, completedAt: null, dueAt: old, blockerReason: "Missing file", productionFileStatus: "FAILED", qcStatus: "FAILED", rejectedQuantity: 1, productSnapshotJson: {}, order: { createdAt: old }, createdAt: old },
    ]) },
    marketplaceConfig: { count: jest.fn().mockResolvedValue(1) },
    marketplaceExportBatch: { findMany: jest.fn().mockResolvedValue([{ id: "batch-1", status: "FAILED", marketplaceConfig: { name: "Uzum" }, createdAt: now }]) },
    marketplaceExportItem: { findMany: jest.fn().mockResolvedValue([{ id: "mi-1", eligible: false, status: "BLOCKED", createdAt: now }]), count: jest.fn().mockResolvedValue(1) },
    exportedListing: { findMany: jest.fn().mockResolvedValue([{ id: "el-1", marketplaceConfigId: "mc-1", marketplaceConfig: { name: "Uzum" }, manuallyListedAt: now, createdAt: now }]) },
    marketplaceExternalSale: { findMany: jest.fn().mockResolvedValue([{ id: "sale-1", salePrice: money(75), quantity: 2, source: "MANUAL", marketplaceConfig: { name: "Uzum" }, createdAt: now }]) },
    externalOrderIntake: { findMany: jest.fn().mockResolvedValue([{ id: "intake-1", paymentStatus: "PAID", totalAmount: money(125), status: "NEEDS_REVIEW", createdAt: now }]) },
    externalOrderIntakeItem: { count: jest.fn().mockResolvedValue(1) },
    gangSheet: { findMany: jest.fn().mockResolvedValue([{ id: "gs-1", status: "FAILED", filmType: "DTF", failureReason: "render", layoutMetricsJson: { utilizationPercent: 80 }, items: [], createdAt: now }]) },
    aiJob: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    aiSuggestion: { findMany: jest.fn().mockResolvedValue([]) },
    workerJob: { count: jest.fn().mockResolvedValue(0) },
    generatedAsset: { count: jest.fn().mockResolvedValue(0) },
    designAsset: { groupBy: jest.fn().mockResolvedValue([{ status: "APPROVED", _count: { _all: 1 } }]) },
    commerceListing: { groupBy: jest.fn().mockResolvedValue([{ status: "PUBLISHED", _count: { _all: 1 } }]) },
    user: { findMany: jest.fn().mockResolvedValue([{ id: "designer-1", email: "d1@example.test", displayName: "D1" }]) },
    reportExport: {
      create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: "export-1", ...data })),
      findUnique: jest.fn().mockResolvedValue({ id: "export-1", reportType: "sales", status: "GENERATED", filename: "sales.csv", contentType: "text/csv", contentText: "a,b", rowCount: 1, createdAt: now, updatedAt: now }),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}

function service(prisma = createPrismaMock()) {
  return { analytics: new AnalyticsService(prisma as any, { log: jest.fn().mockResolvedValue(undefined) } as any), prisma };
}

describe("AnalyticsService", () => {
  it("calculates sales KPIs from paid orders and separates channels", async () => {
    const { analytics } = service();
    const result = await analytics.sales({ from: "2026-05-01", to: "2026-05-22", currency: "UZS" });

    expect(result.kpis.grossSales).toBe(380);
    expect(result.kpis.netSales).toBe(335);
    expect(result.kpis.unpaidOrders).toBe(1);
    expect(result.kpis.refundedCanceledAmount).toBe(50);
    expect(result.breakdowns.byChannel.map((row) => row.key)).toEqual(expect.arrayContaining(["DIRECT", "FILM", "EXTERNAL_MARKETPLACE"]));
  });

  it("keeps designer analytics scoped to the requested designer", async () => {
    const { analytics } = service();
    const result = await analytics.designerAnalytics("designer-1", { from: "2026-05-01", to: "2026-05-22", currency: "UZS" }, true);

    expect(result.summary.revenue).toBe(180);
    expect(result.summary.royaltyGenerated).toBe(27);
    expect(JSON.stringify(result)).not.toContain("99");
  });

  it("calculates production queue health and QC rates safely", async () => {
    const { analytics } = service();
    const result = await analytics.production({ from: "2026-05-01", to: "2026-05-22" });

    expect(result.kpis.blockedItems).toBe(1);
    expect(result.kpis.productionFileFailures).toBe(1);
    expect(result.kpis.qcFailRate).toBe(50);
    expect(result.tables.overdue).toHaveLength(1);
  });

  it("summarizes marketplace, film, and gang sheet performance", async () => {
    const { analytics } = service();
    const marketplace = await analytics.marketplace({ from: "2026-05-01", to: "2026-05-22", currency: "UZS" });
    const film = await analytics.film({ from: "2026-05-01", to: "2026-05-22", currency: "UZS" });
    const gang = await analytics.gangSheets({ from: "2026-05-01", to: "2026-05-22", currency: "UZS" });

    expect(marketplace.kpis.externalSalesRevenue).toBe(275);
    expect(marketplace.kpis.mappingGaps).toBe(1);
    expect(film.kpis.filmRevenue).toBe(60);
    expect(gang.kpis.gangSheetUtilizationAverage).toBe(80);
  });

  it("creates and audits CSV report exports", async () => {
    const prisma = createPrismaMock();
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const analytics = new AnalyticsService(prisma as any, audit as any);

    const created = await analytics.createExport("admin-1", { reportType: "sales", from: "2026-05-01", to: "2026-05-22", currency: "UZS" });
    const downloaded = await analytics.downloadExport("admin-1", created.id);

    expect(created.id).toBe("export-1");
    expect(downloaded.csv).toContain("a,b");
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "analytics.export.generated" }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "analytics.export.downloaded" }));
  });
});
