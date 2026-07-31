import { PipelineType } from "@prisma/client";
import { PrintfulPublicationService } from "./printful-publication.service";

describe("PrintfulPublicationService approved configuration", () => {
  const dto = {
    catalogProductId: 71,
    variantIds: [101, 102],
    storeIds: ["store-1"],
    rashpodProductType: "T-shirt",
    placement: "front",
    technique: "dtg",
    retailPrice: "29.00",
  };

  function setup(mockupAssets: Array<{ mockupType: string; status: string }>, selectedVariantIds: number[] = [101, 102]) {
    const listing = {
      id: "listing-1",
      pipeline: PipelineType.GLOBAL_PRINTFUL,
      designAsset: { commercialRights: { allowProductSales: true, allowMarketplacePublishing: true } },
      designProductSelection: {
        pipeline: PipelineType.GLOBAL_PRINTFUL,
        placement: "FRONT",
        providerPlacement: "front",
        technique: "dtg",
        placementConfigJson: { selectedVariantIds },
        mockupAssets,
        printfulProductTemplate: { id: "template-1", printfulCatalogProductId: "71" },
      },
    };
    const prisma = { commerceListing: { findUnique: jest.fn().mockResolvedValue(listing) } };
    const client = {
      listStores: jest.fn().mockResolvedValue({ result: [], paging: { total: 0, offset: 0, limit: 100 } }),
      getCatalogProduct: jest.fn().mockResolvedValue({ result: { product: { id: 71 }, variants: [] } }),
    };
    const service = new PrintfulPublicationService(prisma as never, client as never, {} as never, {} as never);
    return { service, prisma };
  }

  it("requires the three listing mockups before publishing", async () => {
    const { service, prisma } = setup([{ mockupType: "MAIN", status: "READY" }]);

    await expect(service.publish("moderator-1", "listing-1", dto)).rejects.toThrow("PRINTFUL_MOCKUPS_NOT_READY:LIFESTYLE,DETAIL");
    expect(prisma.commerceListing.findUnique).toHaveBeenCalled();
  });

  it("rejects variants that differ from the moderator-approved mockups", async () => {
    const { service } = setup([
      { mockupType: "MAIN", status: "READY" },
      { mockupType: "LIFESTYLE", status: "READY" },
      { mockupType: "DETAIL", status: "READY" },
    ], [101]);

    await expect(service.publish("moderator-1", "listing-1", dto)).rejects.toThrow("variants differ from the approved mockups");
  });

  it("reads categories from Printful's categories envelope", async () => {
    const client = {
      listCategories: jest.fn().mockResolvedValue({
        result: {
          categories: [
            { id: 24, parent_id: 1, title: "T-Shirts", image_url: "https://example.test/t-shirts.png" },
            { id: 25, title: "Hoodies" },
          ],
        },
      }),
    };
    const service = new PrintfulPublicationService({} as never, client as never, {} as never, {} as never);

    await expect(service.listCategories()).resolves.toEqual([
      { id: 25, parentId: null, title: "Hoodies", imageUrl: null, size: null },
      { id: 24, parentId: 1, title: "T-Shirts", imageUrl: "https://example.test/t-shirts.png", size: null },
    ]);
  });
});
