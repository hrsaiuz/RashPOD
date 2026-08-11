import { MarketplacePublicationJobHandler } from "./marketplace-publication-handler";
import { WorkerRepository } from "../repository";

function createRepo(publicationOverrides: any = {}) {
  const publication = {
    id: "pub_1",
    marketplace: "RASHPOD_LOCAL",
    provider: "RASHPOD",
    status: "QUEUED",
    productListing: {
      id: "listing_1",
      status: "READY_TO_PUBLISH",
      title: "Demo tee",
      pipeline: "LOCAL",
      mockupAssetIds: ["mockup_1"],
      designProductSelectionId: "selection_1",
    },
    ...publicationOverrides,
  };
  const repo: WorkerRepository & { publication: any; logs: any[]; listingStatus: string } = {
    publication,
    logs: [],
    listingStatus: "READY_TO_PUBLISH",
    async getGeneratedAsset() {
      return null;
    },
    async updateGeneratedAsset() {
      throw new Error("not used");
    },
    async getMarketplacePublication() {
      return repo.publication;
    },
    async updateMarketplacePublication(_id, data) {
      repo.publication = { ...repo.publication, ...data };
      return repo.publication;
    },
    async markListingPublishedIfComplete(listingId) {
      repo.listingStatus = "PUBLISHED";
      return { id: listingId, status: repo.listingStatus };
    },
    async createIntegrationLog(data) {
      repo.logs.push(data);
    },
    async getPrintfulSettings() {
      return { enabled: false, catalogAllowlist: [] };
    },
  };
  return repo;
}

describe("MarketplacePublicationJobHandler", () => {
  beforeEach(() => {
    delete process.env.PRINTFUL_ENABLED;
    delete process.env.PRINTFUL_API_TOKEN;
  });

  it("publishes RashPOD local publications", async () => {
    const repo = createRepo();
    const handler = new MarketplacePublicationJobHandler(repo);

    const result = await handler.handlePublish({ marketplacePublicationId: "pub_1" });

    expect(result).toMatchObject({ published: true, marketplacePublicationId: "pub_1" });
    expect(repo.publication.status).toBe("PUBLISHED");
    expect(repo.publication.providerExternalListingId).toBe("rashpod_rashpod_local_pub_1");
    expect(repo.listingStatus).toBe("PUBLISHED");
    expect(repo.logs.map((log) => log.status)).toEqual(["PENDING", "SUCCESS"]);
  });

  it("fails Printful publications when Printful is not configured", async () => {
    process.env.PRINTFUL_ENABLED = "true";
    process.env.PRINTFUL_API_TOKEN = "test-token";
    const repo = createRepo({ marketplace: "ETSY", provider: "PRINTFUL" });
    const handler = new MarketplacePublicationJobHandler(repo);

    const result = await handler.handlePublish({ marketplacePublicationId: "pub_1" });

    expect(result).toEqual({ failed: true, errorCode: "PRINTFUL_NOT_CONFIGURED" });
    expect(repo.publication.status).toBe("FAILED");
    expect(repo.logs[0]).toMatchObject({ status: "FAILED", errorCode: "PRINTFUL_NOT_CONFIGURED" });
  });

  it("publishes selected variants to the selected Printful store", async () => {
    process.env.PRINTFUL_API_TOKEN = "test-token";
    const repo = createRepo({
      marketplace: "PRINTFUL",
      provider: "PRINTFUL",
      providerStoreId: "store-22",
      metadataJson: {
        variantIds: ["401", "402"],
        retailPrice: "31.50",
        placement: "front",
        targetStore: { id: "store-22", name: "RashPOD EU" },
      },
      productListing: {
        id: "listing_1",
        status: "READY_TO_PUBLISH",
        title: "Demo tee",
        price: "29.99",
        pipeline: "GLOBAL_PRINTFUL",
        mockupAssetIds: ["mockup_1"],
        designProductSelectionId: "selection_1",
      },
    });
    repo.getPrintfulSettings = async () => ({ enabled: true, catalogAllowlist: [] });
    repo.getMarketplacePublicationPublishContext = async () => ({
      ...repo.publication,
      printfulFileId: "file-1",
      printfulProductTemplate: {
        id: "template-1",
        displayName: "Premium tee",
        printfulCatalogProductId: "71",
        printfulVariantIds: ["999"],
        allowedPlacements: ["front"],
        allowedTechniques: ["dtg"],
        defaultPlacement: "front",
        defaultTechnique: "dtg",
        defaultRetailPrice: "29.99",
        estimatedBaseCost: null,
        currency: "USD",
      },
      mockupAssets: [{ id: "mockup_1", mockupType: "MAIN", status: "GENERATED", imageUrl: "https://example.test/mockup.jpg" }],
    });
    const client = {
      getSyncProduct: jest.fn()
        .mockRejectedValueOnce(new Error("PRINTFUL_REQUEST_FAILED:404"))
        .mockResolvedValueOnce({
          result: {
            sync_product: { id: 808 },
            sync_variants: [{ id: 9001, variant_id: 401 }, { id: 9002, variant_id: 402 }],
          },
        }),
      createSyncProduct: jest.fn().mockResolvedValue({ result: { id: 808 } }),
    };
    const handler = new MarketplacePublicationJobHandler(repo, client as any);

    const result = await handler.handlePublish({ marketplacePublicationId: "pub_1" });

    expect(result).toMatchObject({ published: true, providerExternalListingId: "808" });
    expect(client.createSyncProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        sync_variants: [
          expect.objectContaining({ variant_id: 401, retail_price: "31.50" }),
          expect.objectContaining({ variant_id: 402, retail_price: "31.50" }),
        ],
      }),
      "store-22",
    );
    expect(repo.publication.metadataJson).toMatchObject({
      targetStoreId: "store-22",
      printfulSyncProductId: "808",
    });
  });

  it("uploads the approved design file when its Printful mapping is missing", async () => {
    process.env.PRINTFUL_API_TOKEN = "test-token";
    const repo = createRepo({
      marketplace: "PRINTFUL",
      provider: "PRINTFUL",
      providerStoreId: "store-22",
      metadataJson: { variantIds: ["401"], retailPrice: "31.50", placement: "front" },
    });
    repo.getPrintfulSettings = async () => ({ enabled: true, catalogAllowlist: [] });
    repo.getMarketplacePublicationPublishContext = async () => ({
      ...repo.publication,
      selection: { designId: "design-1" } as any,
      printfulFileId: null,
      printfulProductTemplate: {
        id: "template-1",
        displayName: "Premium tee",
        printfulCatalogProductId: "71",
        printfulVariantIds: ["401"],
        allowedPlacements: ["front"],
        allowedTechniques: ["dtg"],
        defaultPlacement: "front",
        defaultTechnique: "dtg",
        defaultRetailPrice: "29.99",
        estimatedBaseCost: null,
        currency: "USD",
      },
      mockupAssets: [{ id: "mockup_1", mockupType: "MAIN", status: "GENERATED", imageUrl: "https://example.test/mockup.jpg" }],
    });
    repo.ensurePrintfulFileForDesign = jest.fn(async (_designId, upload) => {
      const uploaded = await upload("https://signed.example.test/design.png");
      return { printfulFileId: uploaded.fileId };
    });
    const client = {
      uploadFileFromUrl: jest.fn().mockResolvedValue({ result: { id: 777, url: "https://printful.test/file.png" } }),
      getSyncProduct: jest.fn()
        .mockRejectedValueOnce(new Error("PRINTFUL_REQUEST_FAILED:404"))
        .mockResolvedValueOnce({
          result: { sync_product: { id: 808 }, sync_variants: [{ id: 9001, variant_id: 401 }] },
        }),
      createSyncProduct: jest.fn().mockResolvedValue({ result: { id: 808 } }),
    };

    const result = await new MarketplacePublicationJobHandler(repo, client as any)
      .handlePublish({ marketplacePublicationId: "pub_1" });

    expect(result).toMatchObject({ published: true });
    expect(repo.ensurePrintfulFileForDesign).toHaveBeenCalledWith("design-1", expect.any(Function), null);
    expect(client.uploadFileFromUrl).toHaveBeenCalledWith("https://signed.example.test/design.png");
    expect(client.createSyncProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        sync_variants: [expect.objectContaining({ files: [expect.objectContaining({ id: "777" })] })],
      }),
      "store-22",
    );
  });

  it("publishes all artwork placements from one product composition", async () => {
    process.env.PRINTFUL_API_TOKEN = "test-token";
    const repo = createRepo({ marketplace: "PRINTFUL", provider: "PRINTFUL", providerStoreId: "store-22" });
    repo.getPrintfulSettings = async () => ({ enabled: true, catalogAllowlist: [] });
    const template = {
      id: "template-1",
      displayName: "Premium tee",
      printfulCatalogProductId: "71",
      printfulVariantIds: ["401"],
      allowedPlacements: ["front", "sleeve_left"],
      allowedTechniques: ["dtg"],
      defaultPlacement: "front",
      defaultTechnique: "dtg",
      defaultRetailPrice: "29.99",
      estimatedBaseCost: null,
      currency: "USD",
    };
    repo.getMarketplacePublicationPublishContext = async () => ({
      ...repo.publication,
      productListing: { ...repo.publication.productListing, productCompositionId: "composition-1" },
      selection: { designId: "design-1", placement: "FRONT", providerPlacement: "front", printfulProductTemplate: template } as any,
      compositionSelections: [
        { designId: "design-1", placement: "FRONT", providerPlacement: "front", latestDesignVersion: { id: "front-version", fileKey: "front.png" }, printfulProductTemplate: template },
        { designId: "design-1", placement: "LEFT_SLEEVE", providerPlacement: "sleeve_left", latestDesignVersion: { id: "sleeve-version", fileKey: "sleeve.png" }, printfulProductTemplate: template },
      ] as any,
      printfulProductTemplate: template,
      mockupAssets: [{ id: "mockup_1", mockupType: "MAIN", status: "GENERATED", imageUrl: "https://example.test/mockup.jpg" }],
    });
    repo.ensurePrintfulFileForDesign = jest.fn(async (_designId, _upload, sourceVersion) => ({ printfulFileId: `file-${sourceVersion?.id}` }));
    const client = {
      getSyncProduct: jest.fn()
        .mockRejectedValueOnce(new Error("PRINTFUL_REQUEST_FAILED:404"))
        .mockResolvedValueOnce({ result: { sync_product: { id: 808 }, sync_variants: [{ id: 9001, variant_id: 401 }] } }),
      createSyncProduct: jest.fn().mockResolvedValue({ result: { id: 808 } }),
    };

    const result = await new MarketplacePublicationJobHandler(repo, client as any).handlePublish({ marketplacePublicationId: "pub_1" });

    expect(result).toMatchObject({ published: true });
    expect(client.createSyncProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        sync_variants: [expect.objectContaining({
          files: [
            { type: "front", id: "file-front-version" },
            { type: "sleeve_left", id: "file-sleeve-version" },
          ],
        })],
      }),
      "store-22",
    );
  });

  it("updates an existing Printful sync product on retry instead of duplicating it", async () => {
    process.env.PRINTFUL_API_TOKEN = "test-token";
    const repo = createRepo({
      marketplace: "PRINTFUL",
      provider: "PRINTFUL",
      providerStoreId: "store-22",
      providerSyncProductId: "808",
      metadataJson: { variantIds: ["401"], retailPrice: "31.50", placement: "front" },
      productListing: {
        id: "listing_1",
        status: "READY_TO_PUBLISH",
        title: "Updated tee",
        pipeline: "GLOBAL_PRINTFUL",
        mockupAssetIds: ["mockup_1"],
        designProductSelectionId: "selection_1",
      },
    });
    repo.getPrintfulSettings = async () => ({ enabled: true, catalogAllowlist: [] });
    repo.getMarketplacePublicationPublishContext = async () => ({
      ...repo.publication,
      printfulFileId: "file-1",
      printfulProductTemplate: {
        id: "template-1",
        displayName: "Premium tee",
        printfulCatalogProductId: "71",
        printfulVariantIds: ["401"],
        allowedPlacements: ["front"],
        allowedTechniques: ["dtg"],
        defaultPlacement: "front",
        defaultTechnique: "dtg",
        defaultRetailPrice: "29.99",
        estimatedBaseCost: null,
        currency: "USD",
      },
      mockupAssets: [{ id: "mockup_1", mockupType: "MAIN", status: "GENERATED", imageUrl: "https://example.test/mockup.jpg" }],
    });
    const client = {
      getSyncProduct: jest.fn()
        .mockResolvedValueOnce({
          result: { sync_product: { id: 808 }, sync_variants: [{ id: 9001, variant_id: 401 }] },
        })
        .mockResolvedValueOnce({
          result: { sync_product: { id: 808 }, sync_variants: [{ id: 9001, variant_id: 401 }] },
        }),
      createSyncProduct: jest.fn(),
      updateSyncProduct: jest.fn().mockResolvedValue({
        result: { sync_product: { id: 808 }, sync_variants: [{ id: 9001, variant_id: 401 }] },
      }),
    };

    const result = await new MarketplacePublicationJobHandler(repo, client as any)
      .handlePublish({ marketplacePublicationId: "pub_1" });

    expect(result).toMatchObject({ published: true, providerExternalListingId: "808" });
    expect(client.createSyncProduct).not.toHaveBeenCalled();
    expect(client.updateSyncProduct).toHaveBeenCalledWith(
      "808",
      expect.objectContaining({
        sync_variants: [expect.objectContaining({ id: 9001, variant_id: 401 })],
      }),
      "store-22",
    );
  });

  it("skips a stale publish job after the moderator submits a newer version", async () => {
    const repo = createRepo({
      metadataJson: { publicationVersion: "new-version" },
    });
    const handler = new MarketplacePublicationJobHandler(repo);

    const result = await handler.handlePublish({
      marketplacePublicationId: "pub_1",
      publicationVersion: "old-version",
    });

    expect(result).toEqual({ skipped: true, reason: "STALE_PUBLICATION_VERSION" });
    expect(repo.publication.status).toBe("QUEUED");
    expect(repo.logs[0]).toMatchObject({ status: "SKIPPED", errorCode: "STALE_PUBLICATION_VERSION" });
  });

  it("skips marketplaces that require manual review", async () => {
    const repo = createRepo({ marketplace: "AMAZON", status: "NEEDS_REVIEW" });
    const handler = new MarketplacePublicationJobHandler(repo);

    const result = await handler.handlePublish({ marketplacePublicationId: "pub_1" });

    expect(result).toEqual({ skipped: true, reason: "MARKETPLACE_NEEDS_REVIEW" });
    expect(repo.publication.status).toBe("NEEDS_REVIEW");
    expect(repo.logs[0]).toMatchObject({ status: "SKIPPED", errorCode: "MARKETPLACE_NEEDS_REVIEW" });
  });
});
