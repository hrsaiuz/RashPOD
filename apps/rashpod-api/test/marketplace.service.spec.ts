import { ListingStatus, ListingType, ManualMarketplaceKey, MarketplaceExportBatchStatus, MarketplaceExportFormat, MarketplaceExportItemStatus } from "@prisma/client";
import { MarketplaceService } from "../src/modules/marketplace/marketplace.service";

function createService(prisma: any) {
  const audit: any = { log: jest.fn().mockResolvedValue(undefined) };
  const storage: any = {
    createSignedReadUrl: jest.fn().mockResolvedValue("https://storage.local/read/export.csv"),
    writePrivateObject: jest.fn().mockResolvedValue({ bucket: "private", sizeBytes: 120, storageProvider: "LOCAL_DEV" }),
  };
  return { service: new MarketplaceService(prisma, audit, storage), audit, storage };
}

const marketplaceConfig = {
  id: "market-1",
  key: ManualMarketplaceKey.UZUM,
  marketplaceType: "MANUAL_EXPORT",
  name: "Uzum manual export",
  isEnabled: true,
  countryCode: "UZ",
  currency: "UZS",
  defaultLanguage: "uz-Latn",
  supportedLanguages: ["uz-Latn", "ru"],
  supportedListingTypes: ["PRODUCT"],
  exportFormats: ["CSV_WITH_IMAGE_URLS", "XLSX"],
  imageRequirementsJson: { requiredTypes: ["MAIN"], minimumImages: 1 },
  pricingRulesJson: { markupPercent: 10, fixedMarkup: 5000, rounding: 1000 },
  skuPrefix: "RPD-UZUM",
  statusMappingJson: {},
  notes: null,
  metadataJson: null,
  createdAt: new Date("2026-05-01T00:00:00.000Z"),
  updatedAt: new Date("2026-05-01T00:00:00.000Z"),
};

const publishedListing = {
  id: "listing-1",
  type: ListingType.PRODUCT,
  status: ListingStatus.PUBLISHED,
  designerId: "designer-1",
  designAssetId: "design-1",
  title: "Graphic Tee",
  description: "Soft tee",
  slug: "graphic-tee",
  price: 100000,
  currency: "UZS",
  imagesJson: [],
  tags: ["tee"],
  productType: null,
  localBaseProductId: "base-1",
  metadataJson: {},
  publishedAt: new Date("2026-05-01T00:00:00.000Z"),
  localBaseProduct: {
    id: "base-1",
    skuPrefix: "TEE",
    description: "Base tee",
    productTypeId: "pt-1",
    productType: { id: "pt-1", slug: "t-shirt", name: "T-shirt" },
  },
  designProductSelection: {
    mockupAssets: [
      {
        id: "mockup-1",
        mockupType: "MAIN",
        status: "READY",
        imageUrl: "https://cdn.example/main.jpg",
        objectKey: "mockups/main.jpg",
        format: "jpg",
        widthPx: 1200,
        heightPx: 1200,
      },
    ],
  },
};

describe("MarketplaceService", () => {
  it("exports published listings with normalized payload", async () => {
    const prisma: any = {
      commerceListing: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "l1",
            type: ListingType.PRODUCT,
            title: "Tee",
            description: "desc",
            slug: "tee-1",
            price: 100000,
            currency: "UZS",
            imagesJson: ["a", "b", "c"],
            publishedAt: new Date("2026-05-01T00:00:00.000Z"),
            status: ListingStatus.PUBLISHED,
          },
        ]),
      },
    };
    const { service, audit } = createService(prisma);

    const result = await service.exportListings("admin-1", { type: "PRODUCT" });
    expect(result.total).toBe(1);
    expect(result.type).toBe("PRODUCT");
    expect(result.items[0]).toEqual(expect.objectContaining({ listingId: "l1", type: "PRODUCT", imageCount: 3 }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "marketplace.export.generate" }));
  });

  it("exports CSV payload for published listings", async () => {
    const prisma: any = {
      commerceListing: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "l2",
            type: ListingType.FILM,
            title: "Film \"A\"",
            description: "desc, with comma",
            slug: "film-a",
            price: 50000,
            currency: "UZS",
            imagesJson: [],
            publishedAt: new Date("2026-05-02T00:00:00.000Z"),
            status: ListingStatus.PUBLISHED,
          },
        ]),
      },
    };
    const { service } = createService(prisma);

    const result = await service.exportListingsCsv("admin-1", { type: "FILM" });
    expect(result.total).toBe(1);
    expect(result.csv).toContain("listingId,type,title");
    expect(result.csv).toContain('"Film ""A"""');
    expect(result.csv).toContain('"desc, with comma"');
  });

  it("creates manual marketplace config with default export rules", async () => {
    const prisma: any = {
      marketplaceConfig: {
        create: jest.fn().mockResolvedValue(marketplaceConfig),
      },
    };
    const { service, audit } = createService(prisma);

    const result = await service.createConfig("admin-1", { key: "UZUM", name: "Uzum", skuPrefix: "RPD-UZUM" });

    expect(prisma.marketplaceConfig.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ key: "UZUM", marketplaceType: "MANUAL_EXPORT" }) }));
    expect(result.name).toBe("Uzum manual export");
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "marketplace.config.created" }));
  });

  it("validates export candidates with SKU, price, category, and image snapshots", async () => {
    const prisma: any = {
      marketplaceConfig: { findUnique: jest.fn().mockResolvedValue(marketplaceConfig) },
      commerceListing: { findMany: jest.fn().mockResolvedValue([publishedListing]) },
      marketplaceCategoryMapping: {
        findFirst: jest.fn().mockResolvedValue({
          id: "mapping-1",
          marketplaceCategoryId: "cat-1",
          marketplaceCategoryName: "Apparel",
          requiredAttributesJson: { brand: "RashPOD" },
          valueMappingsJson: {},
        }),
      },
    };
    const { service } = createService(prisma);

    const result = await service.listCandidates("market-1", { type: "PRODUCT" });

    expect(result.eligible).toBe(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        eligible: true,
        exportSku: expect.stringContaining("RPD-UZUM"),
        row: expect.objectContaining({ price: 115000, categoryName: "Apparel" }),
      }),
    );
  });

  it("blocks candidates without category mappings", async () => {
    const prisma: any = {
      marketplaceConfig: { findUnique: jest.fn().mockResolvedValue(marketplaceConfig) },
      commerceListing: { findMany: jest.fn().mockResolvedValue([publishedListing]) },
      marketplaceCategoryMapping: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const { service } = createService(prisma);

    const result = await service.listCandidates("market-1", {});

    expect(result.blocked).toBe(1);
    expect(result.items[0].blockers).toContain("MISSING_CATEGORY_MAPPING");
  });

  it("generates CSV export file assets for eligible batches", async () => {
    const batch = {
      id: "batch-1",
      marketplaceConfigId: "market-1",
      marketplaceConfig,
      status: MarketplaceExportBatchStatus.READY,
      exportFormat: MarketplaceExportFormat.CSV_WITH_IMAGE_URLS,
      exportFileAssetId: null,
      zipFileAssetId: null,
      generatedAt: null,
      exportedAt: null,
      failureReason: null,
      notes: null,
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
      updatedAt: new Date("2026-05-01T00:00:00.000Z"),
      items: [
        {
          id: "item-1",
          listingId: "listing-1",
          listing: publishedListing,
          status: MarketplaceExportItemStatus.READY,
          eligible: true,
          exportSku: "RPD-UZUM-LISTING-TEE",
          blockersJson: [],
          warningsJson: [],
          rowJson: { sku: "RPD-UZUM-LISTING-TEE", listingId: "listing-1", title: "Graphic Tee", price: 115000, currency: "UZS", imageUrls: "https://cdn.example/main.jpg" },
          imageSnapshotJson: { images: [{ url: "https://cdn.example/main.jpg" }] },
          contentSnapshotJson: {},
          priceSnapshotJson: { exportPrice: 115000, currency: "UZS" },
          categorySnapshotJson: {},
        },
      ],
    };
    const prisma: any = {
      marketplaceExportBatch: {
        findUnique: jest.fn().mockResolvedValue(batch),
        update: jest.fn().mockResolvedValue({ ...batch, exportFileAssetId: "file-1", generatedAt: new Date(), exportedAt: new Date() }),
      },
      marketplaceExportItem: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      fileAsset: { create: jest.fn().mockResolvedValue({ id: "file-1" }) },
    };
    const { service, storage, audit } = createService(prisma);

    const result = await service.generateBatch("admin-1", "batch-1");

    expect(storage.writePrivateObject).toHaveBeenCalledWith(expect.objectContaining({ mimeType: "text/csv" }));
    expect(prisma.fileAsset.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ purpose: "MARKETPLACE_EXPORT", accessPolicy: "PRIVATE_SIGNED_URL" }) }));
    expect(result.exportFileAssetId).toBe("file-1");
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "marketplace.export_batch.generated" }));
  });

  it("records manual external sales with conversion-ready snapshots", async () => {
    const sale = { id: "sale-1", status: "RECORDED", conversionSnapshotJson: { conversionReady: true, conversionImplemented: false } };
    const prisma: any = {
      marketplaceConfig: { findUnique: jest.fn().mockResolvedValue(marketplaceConfig) },
      exportedListing: { findUnique: jest.fn().mockResolvedValue(null) },
      commerceListing: { findUnique: jest.fn().mockResolvedValue({ id: "listing-1", title: "Graphic Tee", price: 100000, currency: "UZS" }) },
      marketplaceExternalSale: { create: jest.fn().mockResolvedValue(sale) },
    };
    const { service, audit } = createService(prisma);

    const result = await service.recordExternalSale("admin-1", { marketplaceConfigId: "market-1", listingId: "listing-1", exportSku: "RPD-UZUM-LISTING-TEE", salePrice: 125000 });

    expect(result).toBe(sale);
    expect(prisma.marketplaceExternalSale.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "RECORDED", conversionSnapshotJson: expect.objectContaining({ conversionImplemented: false }) }) }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "marketplace.external_sale.recorded" }));
  });
});
