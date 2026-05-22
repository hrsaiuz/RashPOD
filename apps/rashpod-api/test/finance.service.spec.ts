import { OrderStatus, PaymentReconciliationStatus, PaymentStatus, PayoutMethod, PayoutStatus, Prisma, RoyaltyEntryType, RoyaltyLedgerStatus } from "@prisma/client";
import { AuditService } from "../src/modules/audit/audit.service";
import { FinanceService } from "../src/modules/finance/finance.service";

const decimal = (value: number) => new Prisma.Decimal(value);

function paidOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    customerId: "customer-1",
    status: OrderStatus.IN_PRODUCTION,
    currency: "UZS",
    discountTotal: decimal(0),
    deliveryFee: decimal(10000),
    items: [
      {
        id: "item-1",
        orderId: "order-1",
        listingId: "listing-1",
        listingTitle: "Snapshot Tee",
        designerId: "designer-1",
        designAssetId: "design-1",
        designVersionId: "version-1",
        quantity: 2,
        unitPrice: decimal(100000),
        totalPrice: decimal(200000),
        designerRoyaltyAmount: decimal(20000),
        productionCostEstimate: decimal(50000),
        deliveryFeeAllocation: decimal(10000),
        pricingSnapshotJson: { baseProductCost: 40000, productionCostEstimate: 50000, deliveryFeeAllocation: 10000 },
        royaltySnapshotJson: { royaltyRuleId: "rule-1", basis: "PERCENT_OF_SALE", value: "10", amount: 20000 },
      },
    ],
    ...overrides,
  };
}

function makeService(order = paidOrder()) {
  const prisma: any = {
    order: {
      findUnique: jest.fn().mockResolvedValue(order),
      update: jest.fn().mockResolvedValue({ id: order.id }),
    },
    orderFinanceSnapshot: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockImplementation(({ create }: any) => Promise.resolve({ id: "snapshot-1", ...create })),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    royaltyLedgerEntry: {
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: `royalty-${prisma.royaltyLedgerEntry.create.mock.calls.length + 1}`, ...data })),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation(({ where, data }: any) => Promise.resolve({ id: where.id, ...data })),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    ledgerEntry: { create: jest.fn().mockResolvedValue({ id: "ledger-1" }) },
    payout: {
      create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: "payout-1", ...data, royaltyEntries: [] })),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: "payout-1", ...data, royaltyEntries: [] })),
    },
    paymentReconciliation: {
      upsert: jest.fn().mockImplementation(({ create, update }: any) => Promise.resolve({ id: "recon-1", ...(create ?? update) })),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    paymentTransaction: { findUnique: jest.fn() },
    $transaction: jest.fn((cb: any) => cb(prisma)),
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
  return { service: new FinanceService(prisma, audit), prisma, audit };
}

describe("FinanceService", () => {
  it("creates finance snapshots and pending royalty entries from immutable order snapshots", async () => {
    const { service, prisma, audit } = makeService();

    await service.createOrderFinance("order-1", "payment-1", "system");

    expect(prisma.orderFinanceSnapshot.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { orderItemId: "item-1" } }));
    expect(prisma.royaltyLedgerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          designerId: "designer-1",
          orderItemId: "item-1",
          amount: decimal(20000),
          entryType: RoyaltyEntryType.PENDING,
          status: RoyaltyLedgerStatus.PENDING,
          royaltyRuleSnapshot: expect.objectContaining({ basis: "PERCENT_OF_SALE" }),
        }),
      }),
    );
    expect((audit.log as any)).toHaveBeenCalledWith(expect.objectContaining({ action: "royalty.entry.created" }));
  });

  it("does not duplicate pending royalty entries for the same paid order", async () => {
    const { service, prisma } = makeService();
    prisma.royaltyLedgerEntry.count.mockResolvedValue(1);
    prisma.orderFinanceSnapshot.findMany.mockResolvedValue([{ id: "snapshot-existing" }]);

    const result = await service.createOrderFinance("order-1", "payment-1", "system");

    expect(result).toEqual([{ id: "snapshot-existing" }]);
    expect(prisma.royaltyLedgerEntry.create).not.toHaveBeenCalled();
  });

  it("marks completed production item royalties payable", async () => {
    const { service, prisma, audit } = makeService();
    prisma.royaltyLedgerEntry.findMany.mockResolvedValue([{ id: "royalty-1", orderItemId: "item-1", status: RoyaltyLedgerStatus.PENDING }]);

    await service.markOrderItemEligible("item-1", "prod-1");

    expect(prisma.royaltyLedgerEntry.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "royalty-1" }, data: expect.objectContaining({ status: RoyaltyLedgerStatus.PAYABLE, entryType: RoyaltyEntryType.PAYABLE }) }));
    expect((audit.log as any)).toHaveBeenCalledWith(expect.objectContaining({ action: "royalty.status.changed" }));
  });

  it("creates draft payout from payable entries and prevents empty payout", async () => {
    const { service, prisma, audit } = makeService();
    prisma.royaltyLedgerEntry.findMany.mockResolvedValue([{ id: "royalty-1", designerId: "designer-1", amount: decimal(25000), currency: "UZS", status: RoyaltyLedgerStatus.PAYABLE }]);

    const payout: any = await service.createPayout("finance-1", { designerId: "designer-1", currency: "UZS" });

    expect(payout.status).toBe(PayoutStatus.DRAFT);
    expect(prisma.payout.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ amount: decimal(25000), royaltyEntries: { connect: [{ id: "royalty-1" }] } }) }));
    expect((audit.log as any)).toHaveBeenCalledWith(expect.objectContaining({ action: "payout.batch.created" }));
  });

  it("marks approved payout paid and marks included entries paid", async () => {
    const { service, prisma, audit } = makeService();
    prisma.payout.findUnique.mockResolvedValue({ id: "payout-1", designerId: "designer-1", amount: decimal(25000), currency: "UZS", status: PayoutStatus.APPROVED, royaltyEntries: [] });

    await service.markPayoutPaid("finance-1", "payout-1", { method: PayoutMethod.MANUAL, reference: "cash-001" });

    expect(prisma.royaltyLedgerEntry.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { payoutId: "payout-1" }, data: expect.objectContaining({ status: RoyaltyLedgerStatus.PAID, entryType: RoyaltyEntryType.PAID }) }));
    expect((audit.log as any)).toHaveBeenCalledWith(expect.objectContaining({ action: "payout.batch.marked_paid" }));
  });

  it("creates manual adjustment with required reason", async () => {
    const { service, prisma, audit } = makeService();

    await service.createAdjustment("finance-1", { designerId: "designer-1", amount: -5000, currency: "UZS", reason: "Refund offset" });

    expect(prisma.royaltyLedgerEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ entryType: RoyaltyEntryType.ADJUSTMENT, status: RoyaltyLedgerStatus.PAYABLE, reason: "Refund offset" }) }));
    expect((audit.log as any)).toHaveBeenCalledWith(expect.objectContaining({ action: "royalty.adjustment.created" }));
  });

  it("tracks refund before payout with an append-only reversal audit", async () => {
    const order = paidOrder({
      royaltyLedgerEntries: [{ id: "royalty-1", designerId: "designer-1", orderId: "order-1", orderItemId: "item-1", listingId: "listing-1", designId: "design-1", designVersionId: "version-1", amount: decimal(20000), amountUzs: decimal(20000), currency: "UZS", status: RoyaltyLedgerStatus.PAYABLE }],
    });
    const { service, prisma, audit } = makeService(order);

    await service.trackRefund("finance-1", "order-1", { amount: 200000, currency: "UZS", reason: "Customer refund" });

    expect(prisma.royaltyLedgerEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ entryType: RoyaltyEntryType.REVERSED, status: RoyaltyLedgerStatus.REVERSED, reversalOfEntryId: "royalty-1" }) }));
    expect((audit.log as any)).toHaveBeenCalledWith(expect.objectContaining({ action: "royalty.entry.reversed", entityId: "royalty-1" }));
    expect((audit.log as any)).toHaveBeenCalledWith(expect.objectContaining({ action: "refund.tracked" }));
  });

  it("tracks refund after payout as a negative payable adjustment", async () => {
    const order = paidOrder({
      royaltyLedgerEntries: [{ id: "royalty-1", designerId: "designer-1", orderId: "order-1", orderItemId: "item-1", listingId: "listing-1", amount: decimal(20000), amountUzs: decimal(20000), currency: "UZS", status: RoyaltyLedgerStatus.PAID }],
    });
    const { service, prisma } = makeService(order);

    await service.trackRefund("finance-1", "order-1", { amount: 200000, currency: "UZS", reason: "Paid refund" });

    expect(prisma.royaltyLedgerEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ entryType: RoyaltyEntryType.ADJUSTMENT, status: RoyaltyLedgerStatus.PAYABLE, amount: decimal(-20000), reason: "Paid refund" }) }));
  });

  it("reconciles matching and mismatched payment amounts", async () => {
    const { service, prisma } = makeService();
    const payment = { id: "payment-1", orderId: "order-1", provider: "CLICK", providerRef: "click-ref", amount: decimal(100000), currency: "UZS", status: PaymentStatus.PAID };

    await service.reconcilePayment(payment, 100000);
    await service.reconcilePayment(payment, 90000);

    expect(prisma.paymentReconciliation.upsert).toHaveBeenNthCalledWith(1, expect.objectContaining({ create: expect.objectContaining({ status: PaymentReconciliationStatus.MATCHED, discrepancyAmount: decimal(0) }) }));
    expect(prisma.paymentReconciliation.upsert).toHaveBeenNthCalledWith(2, expect.objectContaining({ create: expect.objectContaining({ status: PaymentReconciliationStatus.MANUAL_REVIEW, discrepancyAmount: decimal(-10000) }) }));
  });

  it("marks margin incomplete when cost data is missing without blocking order flow", async () => {
    const order = paidOrder({ items: [{ ...paidOrder().items[0], productionCostEstimate: null, pricingSnapshotJson: {}, designerRoyaltyAmount: decimal(20000) }] });
    const { service, prisma } = makeService(order);

    await service.createOrderFinance("order-1", "payment-1", "system");

    expect(prisma.orderFinanceSnapshot.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ marginIncomplete: true, incompleteReason: expect.stringContaining("base product cost") }) }));
  });
});
