import { DesignProductSelectionStatus, ListingStatus, PipelineType, PlacementKind } from "@prisma/client";
import { PrismaAssetRepository } from "./prisma-asset-repository";

describe("listing gallery refresh", () => {
  it("refreshes versioned mockup URLs while preserving moderator listing data and publication state", async () => {
    const selection = {
      id: "selection-1",
      status: DesignProductSelectionStatus.MOCKUP_READY,
      productCompositionId: null,
      mockupAssets: [
        {
          id: "main-1",
          status: "GENERATED",
          mockupType: "MAIN",
          imageUrl: "pipeline-mockups/selection-1/sharp-compositor-v2/main.png",
          objectKey: "pipeline-mockups/selection-1/sharp-compositor-v2/main.png",
          contentType: "image/png",
          widthPx: 2000,
          heightPx: 2000,
        },
      ],
    };
    const existing = {
      id: "listing-1",
      status: ListingStatus.PUBLISHED,
      title: "Moderator title",
      price: 125000,
      metadataJson: {
        variants: [{ id: "black-m", price: 125000 }],
        translations: { uz: { title: "Moderator title" } },
        renderAssets: [{ id: "main-1", objectKey: "pipeline-mockups/selection-1/sharp-compositor-v1/main.png" }],
      },
    };
    const updateListing = jest.fn(async ({ data }: any) => ({ ...existing, ...data }));
    const updateSelection = jest.fn(async ({ data }: any) => ({ ...selection, ...data }));
    const prisma = {
      designProductSelection: {
        findUnique: jest.fn().mockResolvedValue(selection),
        update: updateSelection,
      },
      commerceListing: {
        findUnique: jest.fn().mockResolvedValue(existing),
        update: updateListing,
      },
    };
    const repository = new PrismaAssetRepository();
    (repository as any).prisma = prisma;

    await expect(repository.createListingDraftForSelection(selection.id)).resolves.toEqual({
      id: existing.id,
      status: ListingStatus.PUBLISHED,
    });

    const update = updateListing.mock.calls[0][0].data;
    expect(update).not.toHaveProperty("title");
    expect(update).not.toHaveProperty("price");
    expect(update).not.toHaveProperty("status");
    expect(update.imagesJson).toEqual(["pipeline-mockups/selection-1/sharp-compositor-v2/main.png"]);
    expect(update.metadataJson).toEqual(expect.objectContaining({
      variants: existing.metadataJson.variants,
      translations: existing.metadataJson.translations,
      renderAssets: [expect.objectContaining({ objectKey: "pipeline-mockups/selection-1/sharp-compositor-v2/main.png" })],
    }));
    expect(updateSelection).toHaveBeenCalledWith({
      where: { id: selection.id },
      data: { status: DesignProductSelectionStatus.PUBLISHED },
    });
  });

  it("refreshes both placement images for an existing published composition", async () => {
    const asset = (id: string, mockupType: "MAIN" | "DETAIL", imageUrl: string) => ({
      id,
      status: "GENERATED",
      mockupType,
      imageUrl,
      objectKey: imageUrl,
      contentType: "image/png",
      widthPx: 2000,
      heightPx: 2000,
    });
    const composition = {
      id: "composition-1",
      pipeline: PipelineType.LOCAL,
      designId: "design-1",
      design: { title: "Two placements", designerId: "designer-1" },
      localBaseProductId: "base-1",
      localBaseProduct: { name: "T-shirt", defaultPrice: 125000, baseCost: 60000, currency: "UZS" },
      printfulProductTemplateId: null,
      printfulProductTemplate: null,
      selections: [
        {
          id: "front",
          status: DesignProductSelectionStatus.MOCKUP_READY,
          placement: PlacementKind.FRONT,
          providerPlacement: "front",
          sourceDesignVersionId: "version-front",
          placementConfigJson: {},
          pipeline: PipelineType.LOCAL,
          targetMarketplaces: null,
          mockupAssets: [
            asset("front-main", "MAIN", "pipeline-mockups/front/sharp-compositor-v2/main.png"),
            asset("front-detail", "DETAIL", "pipeline-mockups/front/sharp-compositor-v2/closeup.png"),
          ],
        },
        {
          id: "sleeve",
          status: DesignProductSelectionStatus.MOCKUP_READY,
          placement: PlacementKind.LEFT_SLEEVE,
          providerPlacement: "sleeve_left",
          sourceDesignVersionId: "version-sleeve",
          placementConfigJson: {},
          pipeline: PipelineType.LOCAL,
          targetMarketplaces: null,
          mockupAssets: [asset("sleeve-main", "MAIN", "pipeline-mockups/sleeve/sharp-compositor-v2/main.png")],
        },
      ],
    };
    const existing = {
      id: "listing-1",
      status: ListingStatus.PUBLISHED,
      metadataJson: { variants: [{ id: "black-m", price: 125000 }], translations: { en: { title: "Two placements" } } },
    };
    const upsertListing = jest.fn(async ({ update }: any) => ({ ...existing, ...update }));
    const updateMany = jest.fn().mockResolvedValue({ count: 2 });
    const prisma = {
      designProductSelection: {
        findUnique: jest.fn().mockResolvedValue({ id: "front", status: DesignProductSelectionStatus.MOCKUP_READY, productCompositionId: composition.id }),
        updateMany,
      },
      productComposition: { findUnique: jest.fn().mockResolvedValue(composition) },
      commerceListing: {
        findUnique: jest.fn().mockResolvedValue(existing),
        upsert: upsertListing,
      },
      royaltyRule: { findFirst: jest.fn().mockResolvedValue(null) },
      marketplacePublication: { upsert: jest.fn().mockResolvedValue({ id: "publication-1" }) },
    };
    const repository = new PrismaAssetRepository();
    (repository as any).prisma = prisma;

    await expect(repository.createListingDraftForSelection("front")).resolves.toEqual({
      id: existing.id,
      status: ListingStatus.PUBLISHED,
    });

    const update = upsertListing.mock.calls[0][0].update;
    expect(update.imagesJson).toEqual([
      "pipeline-mockups/front/sharp-compositor-v2/main.png",
      "pipeline-mockups/sleeve/sharp-compositor-v2/main.png",
      "pipeline-mockups/front/sharp-compositor-v2/closeup.png",
    ]);
    expect(update.metadataJson).toEqual(expect.objectContaining({
      variants: existing.metadataJson.variants,
      translations: existing.metadataJson.translations,
      renderAssets: expect.arrayContaining([
        expect.objectContaining({ selectionId: "front", objectKey: "pipeline-mockups/front/sharp-compositor-v2/main.png" }),
        expect.objectContaining({ selectionId: "sleeve", objectKey: "pipeline-mockups/sleeve/sharp-compositor-v2/main.png" }),
      ]),
    }));
    expect(updateMany).toHaveBeenCalledWith({
      where: { productCompositionId: composition.id },
      data: { status: DesignProductSelectionStatus.PUBLISHED },
    });
  });
});
