import { ListingStatus, ListingType, Prisma, UserRole } from "@prisma/client";
import { selectPrimaryDesignVersion } from "../src/modules/designs/design-version-selection";
import { ListingsService } from "../src/modules/listings/listings.service";

describe("RashPOD front-and-sleeve acceptance flow", () => {
  it("carries both placement artworks through mockups, publication, and the public storefront", async () => {
    const productType = { id: "type-shirt", name: "T-shirt", isActive: true };
    const baseProduct = {
      id: "base-shirt",
      productTypeId: productType.id,
      name: "Classic T-shirt",
      isActive: true,
      availableColors: ["Black"],
      availableSizes: ["M"],
    };
    const template = {
      id: "template-shirt",
      baseProductId: baseProduct.id,
      isActive: true,
      views: [
        { id: "view-front", placementCode: "FRONT", blankImageKey: "templates/shirt/front.png", isPrimary: true },
        { id: "view-sleeve", placementCode: "LEFT_SLEEVE", blankImageKey: "templates/shirt/left-sleeve.png", isPrimary: false },
      ],
    };
    const printAreas = [
      { id: "area-front", mockupTemplateId: template.id, mockupViewId: "view-front", x: 200, y: 200, width: 1200, height: 1400, safeX: 250, safeY: 250, safeWidth: 1100, safeHeight: 1300 },
      { id: "area-sleeve", mockupTemplateId: template.id, mockupViewId: "view-sleeve", x: 400, y: 400, width: 600, height: 900, safeX: 440, safeY: 440, safeWidth: 520, safeHeight: 820 },
    ];
    for (const area of printAreas) {
      expect(area.safeX).toBeGreaterThanOrEqual(area.x);
      expect(area.safeY).toBeGreaterThanOrEqual(area.y);
      expect(area.safeX + area.safeWidth).toBeLessThanOrEqual(area.x + area.width);
      expect(area.safeY + area.safeHeight).toBeLessThanOrEqual(area.y + area.height);
      expect(template.views.some((view) => view.id === area.mockupViewId)).toBe(true);
    }

    const versions = [
      { id: "version-sleeve", placement: "LEFT_SLEEVE", fileKey: "designs/sleeve.png" },
      { id: "version-front", placement: "FRONT", fileKey: "designs/front.png" },
    ];
    expect(selectPrimaryDesignVersion(versions)?.id).toBe("version-front");
    expect(versions.find((version) => version.placement === "LEFT_SLEEVE")?.fileKey).toBe("designs/sleeve.png");

    const rights = {
      allowProductSales: true,
      allowMarketplacePublishing: false,
      allowFilmSales: false,
      allowCorporateBidding: true,
    };
    const readyAsset = (id: string, selectionId: string, placement: string, mockupType: "MAIN" | "LIFESTYLE" | "DETAIL") => ({
      id,
      selection: { id: selectionId },
      mockupType,
      status: "GENERATED",
      imageUrl: `pipeline-mockups/${selectionId}/${mockupType.toLowerCase()}.png`,
      objectKey: `pipeline-mockups/${selectionId}/${mockupType.toLowerCase()}.png`,
      archivedAt: null,
      placementSnapshotJson: { placement },
      contentType: "image/png",
      format: "png",
      widthPx: 2000,
      heightPx: 2000,
    });
    const frontAssets = [
      readyAsset("front-main", "selection-front", "FRONT", "MAIN"),
      readyAsset("front-life", "selection-front", "FRONT", "LIFESTYLE"),
      readyAsset("front-detail", "selection-front", "FRONT", "DETAIL"),
    ];
    const sleeveAssets = [
      readyAsset("sleeve-main", "selection-sleeve", "LEFT_SLEEVE", "MAIN"),
      readyAsset("sleeve-life", "selection-sleeve", "LEFT_SLEEVE", "LIFESTYLE"),
      readyAsset("sleeve-detail", "selection-sleeve", "LEFT_SLEEVE", "DETAIL"),
    ];
    // Worker gallery selection is independently covered in product-composition.spec.ts.
    // Keep this API acceptance fixture inside the API build boundary.
    const gallery = [frontAssets[0], sleeveAssets[0], frontAssets[2]];
    expect(gallery.map((asset) => asset.id)).toEqual(["front-main", "sleeve-main", "front-detail"]);

    const selections = [
      { id: "selection-front", placement: "FRONT", sourceDesignVersionId: "version-front", mockupAssets: frontAssets },
      { id: "selection-sleeve", placement: "LEFT_SLEEVE", sourceDesignVersionId: "version-sleeve", mockupAssets: sleeveAssets },
    ];
    let listing: any = {
      id: "listing-shirt",
      type: ListingType.PRODUCT,
      status: ListingStatus.DRAFT,
      designerId: "designer-1",
      designAssetId: "design-1",
      pipeline: "LOCAL",
      title: "Front and sleeve tee",
      description: "A placement-complete RashPOD T-shirt.",
      slug: "front-and-sleeve-tee",
      price: new Prisma.Decimal(100000),
      currency: "UZS",
      cost: new Prisma.Decimal(60000),
      publishedAt: null,
      imagesJson: gallery.map((asset) => asset.imageUrl),
      metadataJson: {
        variants: [{ id: "black-m", color: "Black", size: "M", price: 100000, enabled: true }],
        placements: selections.map((selection) => ({ placement: selection.placement, sourceDesignVersionId: selection.sourceDesignVersionId })),
      },
      designProductSelectionId: "selection-front",
      productCompositionId: "composition-shirt",
      designProductSelection: { mockupAssets: frontAssets },
      productComposition: { selections },
      designAsset: { commercialRights: rights },
      designer: { id: "designer-1", displayName: "Rash Designer", handle: "rash-designer" },
    };
    const prisma = {
      commerceListing: {
        findUnique: jest.fn().mockImplementation(async () => listing),
        update: jest.fn().mockImplementation(async ({ data }) => {
          listing = { ...listing, ...data };
          return listing;
        }),
      },
      royaltyRule: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new ListingsService(prisma as never, audit as never);
    const moderator = { sub: "moderator-1", email: "moderator@rashpod.local", role: UserRole.MODERATOR };

    await expect(service.adminSetStatus(moderator, listing.id, ListingStatus.PUBLISHED)).resolves.toEqual(expect.objectContaining({ status: ListingStatus.PUBLISHED }));
    const publicListing = await service.shopBySlug(listing.slug);

    expect(publicListing).toEqual(expect.objectContaining({
      slug: "front-and-sleeve-tee",
      variants: {
        sizes: ["M"],
        colors: ["Black"],
        combinations: [expect.objectContaining({ id: "black-m", color: "Black", size: "M" })],
      },
    }));
    expect(publicListing?.images).toHaveLength(3);
    expect(publicListing?.images[1]).toContain("selection-sleeve/main.png");
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "listing.admin-status.update", entityId: listing.id }));
  });
});
