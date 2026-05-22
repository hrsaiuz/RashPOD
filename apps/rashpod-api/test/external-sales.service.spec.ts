import { BadRequestException } from "@nestjs/common";
import {
  ExternalOrderDuplicateStatus,
  ExternalOrderIntakeStatus,
  ExternalOrderItemMappingStatus,
  ExternalOrderPaymentStatus,
  ExternalOrderSourceType,
  ListingStatus,
  OrderStatus,
  PaymentReconciliationStatus,
  PaymentStatus,
} from "@prisma/client";
import { ExternalSalesService } from "../src/modules/external-sales/external-sales.service";

function createService(prisma: any) {
  const audit: any = { log: jest.fn().mockResolvedValue(undefined) };
  const finance: any = { createOrderFinance: jest.fn().mockResolvedValue(undefined), trackRefund: jest.fn().mockResolvedValue(undefined) };
  const orders: any = { confirmPaid: jest.fn().mockResolvedValue(undefined), createProductionJobsForPaidOrder: jest.fn().mockResolvedValue(undefined) };
  return { service: new ExternalSalesService(prisma, audit, finance, orders), audit, finance, orders };
}

const mappedItem = {
  id: "ext-item-1",
  intakeId: "ext-1",
  marketplaceConfigId: "market-1",
  externalSku: "RPD-UZUM-TEE",
  externalListingId: "uzum-tee",
  externalListingUrl: null,
  exportedListingId: "exported-1",
  listingId: "listing-1",
  baseProductId: "base-1",
  productTypeId: "ptype-1",
  designId: "design-1",
  designVersionId: "version-1",
  providerSyncRecordId: null,
  title: "Graphic tee",
  selectedSize: "M",
  selectedColor: "Black",
  selectedMaterial: null,
  selectedPrintSide: "FRONT",
  quantity: 2,
  unitPrice: 120000,
  currency: "UZS",
  imageUrl: "https://cdn.example/tee.png",
  mappingStatus: ExternalOrderItemMappingStatus.MAPPED,
  matchedSnapshotJson: {
    productionReady: true,
    designerId: "designer-1",
    productTypeName: "T-shirt",
    baseProductName: "Classic tee",
    baseProductSku: "TEE",
    mockupAssetIds: ["mockup-1"],
    mockupImageUrl: "https://cdn.example/tee.png",
    placementSnapshotJson: { area: "front" },
    royaltySnapshotJson: { amount: 20000 },
    pricingSnapshotJson: { listingPrice: 120000, currency: "UZS" },
    designerRoyaltyAmount: 20000,
    productionCostEstimate: 60000,
  },
  rawItemJson: { externalSku: "RPD-UZUM-TEE" },
};

const readyIntake = {
  id: "ext-1",
  sourceType: ExternalOrderSourceType.MARKETPLACE_MANUAL,
  marketplaceConfigId: "market-1",
  importId: null,
  externalOrderId: "UZ-1001",
  externalOrderUrl: "https://market.local/order/UZ-1001",
  customerName: "External Customer",
  customerPhone: "+998901112233",
  customerEmail: "buyer@example.com",
  deliveryMethod: "courier",
  deliveryAddress: "Tashkent",
  pickupLocation: null,
  paymentStatus: ExternalOrderPaymentStatus.PAID_EXTERNALLY,
  currency: "UZS",
  totalAmount: 240000,
  notes: "Imported order",
  rawPayloadHash: "payload-hash",
  duplicateStatus: ExternalOrderDuplicateStatus.UNIQUE,
  status: ExternalOrderIntakeStatus.READY_TO_CONVERT,
  internalOrderId: null,
  items: [mappedItem],
  duplicateCandidates: [],
  internalOrder: null,
};

function createListing() {
  return {
    id: "listing-1",
    status: ListingStatus.PUBLISHED,
    title: "Graphic tee",
    price: 120000,
    cost: 60000,
    currency: "UZS",
    designerId: "designer-1",
    designerRoyalty: 10000,
    designAssetId: "design-1",
    imagesJson: ["https://cdn.example/tee.png"],
    metadataJson: { productionFileAssetId: "file-1" },
    localBaseProductId: "base-1",
    designer: { id: "designer-1", email: "designer@example.com", displayName: "Designer", handle: "designer" },
    designAsset: { versions: [{ id: "version-1", createdAt: new Date("2026-05-01T00:00:00.000Z") }] },
    localBaseProduct: { id: "base-1", name: "Classic tee", skuPrefix: "TEE", baseCost: 60000, productTypeId: "ptype-1", productType: { id: "ptype-1", name: "T-shirt" }, mockupTemplates: [{ printAreas: [{ id: "area-1" }] }] },
    designProductSelection: { placementConfigJson: { area: "front" }, mockupAssets: [{ id: "mockup-1", status: "READY", archivedAt: null, imageUrl: "https://cdn.example/tee.png", placementSnapshotJson: { area: "front" } }] },
    podSyncRecords: [],
  };
}

describe("ExternalSalesService", () => {
  it("validates mapped external sales and prepares a conversion preview", async () => {
    const prisma: any = {
      externalOrderIntake: {
        findUnique: jest.fn().mockResolvedValue(readyIntake),
        update: jest.fn().mockResolvedValue({ ...readyIntake, validationErrorsJson: [], status: ExternalOrderIntakeStatus.READY_TO_CONVERT }),
      },
    };
    const { service, audit } = createService(prisma);

    const result = await service.validateIntake("admin-1", "ext-1");

    expect(result.status).toBe(ExternalOrderIntakeStatus.READY_TO_CONVERT);
    expect(prisma.externalOrderIntake.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "ext-1" },
      data: expect.objectContaining({ status: ExternalOrderIntakeStatus.READY_TO_CONVERT, validationErrorsJson: [] }),
    }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "external_sale.validated", entityId: "ext-1" }));
  });

  it("blocks validation when mapping or duplicate review is still unresolved", async () => {
    const intake = {
      ...readyIntake,
      duplicateStatus: ExternalOrderDuplicateStatus.POSSIBLE_DUPLICATE,
      items: [{ ...mappedItem, id: "ext-item-unmapped", listingId: null, mappingStatus: ExternalOrderItemMappingStatus.NEEDS_MAPPING, matchedSnapshotJson: {} }],
    };
    const prisma: any = {
      externalOrderIntake: {
        findUnique: jest.fn().mockResolvedValue(intake),
        update: jest.fn().mockResolvedValue({ ...intake, status: ExternalOrderIntakeStatus.NEEDS_REVIEW }),
      },
    };
    const { service } = createService(prisma);

    await service.validateIntake("admin-1", "ext-1");

    expect(prisma.externalOrderIntake.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: ExternalOrderIntakeStatus.NEEDS_REVIEW,
        validationErrorsJson: expect.arrayContaining(["ITEM_ext-item-unmapped_NEEDS_MAPPING", "POSSIBLE_DUPLICATE_REQUIRES_REVIEW"]),
      }),
    }));
  });

  it("creates a manual intake with auto-mapped exported SKU and duplicate detection", async () => {
    const createdIntake = { ...readyIntake, status: ExternalOrderIntakeStatus.DRAFT };
    const prisma: any = {
      exportedListing: { findFirst: jest.fn().mockResolvedValue({ id: "exported-1", listingId: "listing-1", exportSku: "RPD-UZUM-TEE", exportPrice: 120000, currency: "UZS", exportTitle: "Graphic tee" }) },
      commerceListing: { findUnique: jest.fn().mockResolvedValue(createListing()) },
      externalOrderIntake: {
        create: jest.fn().mockResolvedValue(createdIntake),
        findUnique: jest.fn().mockResolvedValueOnce({ ...createdIntake, items: [mappedItem] }).mockResolvedValueOnce({ ...createdIntake, items: [mappedItem] }),
        findFirst: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(null),
        update: jest.fn().mockResolvedValue({ ...readyIntake, status: ExternalOrderIntakeStatus.READY_TO_CONVERT }),
      },
      externalOrderDuplicateCandidate: { createMany: jest.fn() },
    };
    const { service } = createService(prisma);

    const result = await service.createIntake("admin-1", {
      sourceType: "MARKETPLACE_MANUAL",
      paymentStatus: "PAID_EXTERNALLY",
      externalOrderId: "UZ-1001",
      customerName: "External Customer",
      customerPhone: "+998901112233",
      items: [{ externalSku: "RPD-UZUM-TEE", quantity: 2 }],
    });

    expect(result.status).toBe(ExternalOrderIntakeStatus.READY_TO_CONVERT);
    expect(prisma.externalOrderIntake.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ items: expect.objectContaining({ create: expect.arrayContaining([expect.objectContaining({ mappingStatus: ExternalOrderItemMappingStatus.AUTO_MAPPED, listingId: "listing-1" })]) }) }),
    }));
  });

  it("requires duplicate review before conversion", async () => {
    const prisma: any = {};
    const { service } = createService(prisma);
    jest.spyOn(service, "getIntake").mockResolvedValue({ ...readyIntake, duplicateStatus: ExternalOrderDuplicateStatus.POSSIBLE_DUPLICATE } as any);

    await expect(service.convertToOrder("admin-1", "ext-1")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("converts paid external sales into internal orders and confirms payment", async () => {
    const createdOrder = { id: "order-1", status: OrderStatus.PENDING_PAYMENT };
    const tx: any = {
      user: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: "customer-1" }) },
      order: { create: jest.fn().mockResolvedValue(createdOrder) },
      orderItem: { create: jest.fn().mockResolvedValue({ id: "order-item-1" }) },
      paymentTransaction: { create: jest.fn().mockResolvedValue({ id: "pay-1", orderId: "order-1", provider: "EXTERNAL_PAID", providerRef: "UZ-1001", amount: 240000, currency: "UZS", status: PaymentStatus.PAID }) },
      paymentReconciliation: { create: jest.fn().mockResolvedValue({ id: "rec-1", status: PaymentReconciliationStatus.MATCHED }) },
      externalOrderIntake: { update: jest.fn().mockResolvedValue({ ...readyIntake, internalOrderId: "order-1" }) },
    };
    const prisma: any = { $transaction: jest.fn((callback) => callback(tx)) };
    const { service, orders, audit } = createService(prisma);
    jest.spyOn(service, "getIntake")
      .mockResolvedValueOnce(readyIntake as any)
      .mockResolvedValueOnce(readyIntake as any)
      .mockResolvedValueOnce({ ...readyIntake, internalOrderId: "order-1", internalOrder: createdOrder } as any);
    jest.spyOn(service, "validateIntake").mockResolvedValue({ ...readyIntake, status: ExternalOrderIntakeStatus.READY_TO_CONVERT } as any);

    const result = await service.convertToOrder("admin-1", "ext-1") as any;

    expect(tx.order.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ source: "EXTERNAL", channel: ExternalOrderSourceType.MARKETPLACE_MANUAL, externalOrderId: "UZ-1001" }) }));
    expect(tx.orderItem.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ externalSourceType: ExternalOrderSourceType.MARKETPLACE_MANUAL, externalOrderId: "UZ-1001", externalSku: "RPD-UZUM-TEE" }) }));
    expect(tx.paymentReconciliation.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: PaymentReconciliationStatus.MATCHED }) }));
    expect(orders.confirmPaid).toHaveBeenCalledWith("admin-1", "order-1", "UZ-1001");
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "external_sale.converted_to_order", entityId: "ext-1" }));
    expect(result.internalOrderId).toBe("order-1");
  });

  it("validates imported CSV rows before creating intakes", async () => {
    const prisma: any = {
      externalOrderImport: {
        findUnique: jest.fn().mockResolvedValue({ id: "import-1", parsedRowsJson: [{ SKU: "RPD-UZUM-TEE", phone: "+99890", qty: "2", price: "120000" }, { SKU: "", phone: "", qty: "0", price: "100" }], columnMappingJson: { externalSku: "SKU", customerPhone: "phone", quantity: "qty", unitPrice: "price" }, strictMode: false }),
        update: jest.fn().mockResolvedValue({ id: "import-1", status: "VALIDATED" }),
      },
    };
    const { service } = createService(prisma);

    const result = await service.validateImport("admin-1", "import-1");

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].errors).toEqual([]);
    expect(result.rows[1].errors).toEqual(expect.arrayContaining(["CUSTOMER_PHONE_REQUIRED", "SKU_OR_EXTERNAL_LISTING_REQUIRED", "QUANTITY_INVALID"]));
    expect(prisma.externalOrderImport.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "VALIDATED", failedCount: 3 }) }));
  });
});
