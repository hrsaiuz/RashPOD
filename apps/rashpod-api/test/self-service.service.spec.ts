import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { DesignStatus, ListingStatus, OrderStatus, PaymentStatus, Prisma, ProductionJobStatus, UserRole } from "@prisma/client";
import { SelfServiceService } from "../src/modules/self-service/self-service.service";

const decimal = (value: number) => new Prisma.Decimal(value);

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    customerId: "customer-1",
    status: OrderStatus.PENDING_PAYMENT,
    customerName: "Customer One",
    customerPhone: "+998",
    customerEmail: "customer@rashpod.local",
    deliveryType: "DELIVERY",
    deliveryAddress: "Tashkent",
    pickupLocation: null,
    deliveryZone: "city",
    customerNote: "Please call",
    total: decimal(120000),
    currency: "UZS",
    createdAt: new Date("2026-05-20T10:00:00Z"),
    updatedAt: new Date("2026-05-20T11:00:00Z"),
    items: [{ id: "item-1", listingId: "listing-1", listingTitle: "Tee", selectedSize: "M", selectedColor: "Blue", quantity: 1, unitPrice: decimal(120000), totalPrice: decimal(120000), mockupImageUrl: "https://cdn.example/mockup.webp", productionFileAssetId: "private-file-1", pricingSnapshotJson: { cost: 1 }, royaltySnapshotJson: { royalty: 1 } }],
    payments: [{ id: "payment-1", provider: "CLICK", status: PaymentStatus.FAILED, amount: decimal(120000), currency: "UZS", attemptNumber: 1, checkoutUrl: "https://click.example", createdAt: new Date("2026-05-20T10:01:00Z"), updatedAt: new Date("2026-05-20T10:02:00Z") }],
    productionJobs: [{ id: "job-1", orderItemId: "item-1", status: ProductionJobStatus.BLOCKED, blockerReason: "operator note", productionFileAssetId: "private-file-1", createdAt: new Date("2026-05-20T10:03:00Z") }],
    ...overrides,
  };
}

function makeService() {
  const prisma: any = {
    order: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), count: jest.fn() },
    user: { findUnique: jest.fn(), update: jest.fn() },
    supportRequest: { create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: "support-1", ...data })) },
    designAsset: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), groupBy: jest.fn().mockResolvedValue([]), update: jest.fn() },
    commerceListing: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), groupBy: jest.fn().mockResolvedValue([]) },
    orderItem: { aggregate: jest.fn().mockResolvedValue({ _sum: { totalPrice: decimal(0), quantity: 0 } }) },
    royaltyLedgerEntry: { groupBy: jest.fn().mockResolvedValue([]) },
    payout: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: decimal(0) } }) },
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const payments = { createClickPayment: jest.fn().mockResolvedValue({ paymentId: "payment-2", checkoutUrl: "https://click.example/2" }) };
  return { service: new SelfServiceService(prisma, audit as any, payments as any), prisma, audit, payments };
}

describe("SelfServiceService", () => {
  it("lists only the current customer's orders", async () => {
    const { service, prisma } = makeService();
    await service.customerOrders("customer-1");
    expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { customerId: "customer-1" } }));
  });

  it("blocks customer access to another customer's order", async () => {
    const { service, prisma } = makeService();
    prisma.order.findUnique.mockResolvedValue(makeOrder({ customerId: "customer-2" }));
    await expect(service.customerOrder("customer-1", "order-1")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("returns customer-safe order detail without internal files or snapshots", async () => {
    const { service, prisma } = makeService();
    prisma.order.findUnique.mockResolvedValue(makeOrder());
    const detail = await service.customerOrder("customer-1", "order-1");
    expect(JSON.stringify(detail)).not.toContain("productionFileAssetId");
    expect(JSON.stringify(detail)).not.toContain("private-file-1");
    expect(JSON.stringify(detail)).not.toContain("pricingSnapshotJson");
    expect(JSON.stringify(detail)).not.toContain("operator note");
    expect(detail.items[0].productionStatus).toBe("REVIEWING");
  });

  it("allows payment retry for an owned payable failed order", async () => {
    const { service, prisma, payments } = makeService();
    prisma.order.findUnique.mockResolvedValue(makeOrder());
    const result = await service.retryCustomerPayment("customer-1", "order-1");
    expect(payments.createClickPayment).toHaveBeenCalledWith("order-1", "customer-1");
    expect(result.paymentId).toBe("payment-2");
  });

  it("blocks payment retry for paid or closed orders", async () => {
    const { service, prisma, payments } = makeService();
    prisma.order.findUnique.mockResolvedValue(makeOrder({ status: OrderStatus.PAID, payments: [{ status: PaymentStatus.PAID }] }));
    await expect(service.retryCustomerPayment("customer-1", "order-1")).rejects.toBeInstanceOf(BadRequestException);
    expect(payments.createClickPayment).not.toHaveBeenCalled();
  });

  it("creates a customer support request only for owned orders", async () => {
    const { service, prisma, audit } = makeService();
    prisma.order.findUnique.mockResolvedValue(makeOrder());
    const request = await service.createCustomerSupportRequest("customer-1", "order-1", { category: "payment", message: "Please help" });
    expect(request).toMatchObject({ requesterId: "customer-1", requesterRole: UserRole.CUSTOMER, orderId: "order-1", category: "payment" });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "support.request.created" }));
  });

  it("blocks customer support requests for another customer's order", async () => {
    const { service, prisma } = makeService();
    prisma.order.findUnique.mockResolvedValue(makeOrder({ customerId: "customer-2" }));
    await expect(service.createCustomerSupportRequest("customer-1", "order-1", { category: "payment", message: "Please help" })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("lists only the current designer's designs", async () => {
    const { service, prisma } = makeService();
    await service.designerDesigns("designer-1", DesignStatus.DRAFT);
    expect(prisma.designAsset.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { designerId: "designer-1", status: DesignStatus.DRAFT } }));
  });

  it("returns designer-safe design moderation detail", async () => {
    const { service, prisma } = makeService();
    prisma.designAsset.findUnique.mockResolvedValue({ id: "design-1", designerId: "designer-1", title: "Art", description: null, status: DesignStatus.REJECTED, previewUrl: "https://cdn.example/preview.webp", customRejectionReason: "Text too small", rejectionReasons: ["quality"], moderatedAt: new Date("2026-05-21T10:00:00Z"), moderatedById: "moderator-1", versions: [], moderationCases: [], moderationAudits: [{ notes: "internal note" }], commercialRights: null, productSelections: [], listings: [], createdAt: new Date(), updatedAt: new Date() });
    const detail = await service.designerDesign("designer-1", "design-1");
    expect(detail.moderation.reviewedBy).toBe("RashPOD moderation team");
    expect(detail.moderation.rejectionReason).toBe("Text too small");
    expect(JSON.stringify(detail)).not.toContain("internal note");
  });

  it("blocks designer support requests for another designer's listing", async () => {
    const { service, prisma } = makeService();
    prisma.commerceListing.findUnique.mockResolvedValue({ id: "listing-1", designerId: "designer-2", status: ListingStatus.PUBLISHED });
    await expect(service.createDesignerSupportRequest("designer-1", { category: "listing", listingId: "listing-1", message: "Help" })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
