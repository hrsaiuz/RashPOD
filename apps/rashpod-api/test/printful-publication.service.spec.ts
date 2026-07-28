import { PrintfulPublicationService } from "../src/modules/printful/printful-publication.service";

describe("PrintfulPublicationService", () => {
  it("marks external ecommerce stores as requiring their platform connector", async () => {
    const client: any = {
      listStores: jest.fn().mockResolvedValue({
        result: [
          { id: 11, name: "RashPOD API", type: "native" },
          { id: 22, name: "RashPOD Shopify", type: "shopify" },
        ],
      }),
    };
    const service = new PrintfulPublicationService({} as any, client, {} as any, {} as any);

    await expect(service.listStores()).resolves.toEqual([
      expect.objectContaining({ id: "11", directPublishingSupported: true, publishingMode: "PRINTFUL_PRODUCTS_API" }),
      expect.objectContaining({ id: "22", directPublishingSupported: false, publishingMode: "EXTERNAL_PLATFORM_CONNECTOR_REQUIRED" }),
    ]);
  });

  it("creates an independently tracked publication for every selected Printful store", async () => {
    const prisma: any = {
      commerceListing: {
        findUnique: jest.fn().mockResolvedValue({
          id: "listing-1",
          designAsset: { id: "design-1" },
          designProductSelection: {
            id: "selection-1",
            placementConfigJson: {},
          },
        }),
        update: jest.fn().mockResolvedValue({ id: "listing-1" }),
      },
      designProductSelection: {
        update: jest.fn().mockResolvedValue({ id: "selection-1" }),
      },
      printfulProductTemplate: {
        upsert: jest.fn().mockResolvedValue({ id: "template-1" }),
      },
      marketplacePublication: {
        upsert: jest.fn().mockImplementation(({ where }: any) => {
          const key = where.productListingId_marketplace_publicationKey.publicationKey;
          return Promise.resolve({ id: `publication-${key}`, publicationKey: key });
        }),
      },
      $transaction: jest.fn((callback: (tx: any) => unknown) => callback(prisma)),
    };
    const client: any = {
      listStores: jest.fn().mockResolvedValue({
        result: [
          { id: 11, name: "RashPOD API", type: "native" },
          { id: 22, name: "RashPOD EU", type: "native" },
        ],
      }),
      getCatalogProduct: jest.fn().mockResolvedValue({
        result: {
          product: { id: 71, title: "Premium tee", type: "T-SHIRT", type_name: "T-Shirt", image: "https://example.test/tee.png" },
          variants: [
            { id: 401, color: "Black", size: "M" },
            { id: 402, color: "Black", size: "L" },
          ],
        },
      }),
      getPrintfiles: jest.fn().mockResolvedValue({
        result: {
          available_techniques: { dtg: "DTG" },
          variant_printfiles: [{ variant_id: 401, printfiles: [{ placement: "front", width: 1800, height: 2400, dpi: 150 }] }],
        },
      }),
    };
    const jobs = { enqueue: jest.fn().mockImplementation((_type: string, payload: any) => Promise.resolve({ jobId: `job-${payload.marketplacePublicationId}` })) };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new PrintfulPublicationService(prisma, client, jobs as any, audit as any);

    const result = await service.publish("moderator-1", "listing-1", {
      catalogProductId: 71,
      variantIds: [401, 402],
      storeIds: ["11", "22"],
      rashpodProductType: "T-Shirt",
      placement: "front",
      technique: "dtg",
      retailPrice: "29.99",
    });

    expect(result.publications).toHaveLength(2);
    expect(prisma.marketplacePublication.upsert).toHaveBeenCalledTimes(2);
    expect(jobs.enqueue).toHaveBeenCalledTimes(2);
    expect(prisma.designProductSelection.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "selection-1" },
      data: expect.objectContaining({ printfulProductTemplateId: "template-1" }),
    }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      action: "printful.publication.queued",
      actorId: "moderator-1",
    }));
  });
});
