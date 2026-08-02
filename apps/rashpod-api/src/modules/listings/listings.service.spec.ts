import { ListingStatus, ListingType, PipelineType, UserRole } from "@prisma/client";
import { ListingsService, toPublicListingImageUrl } from "./listings.service";

describe("ListingsService moderation audit", () => {
  it("records the moderator rejection reason with the status transition", async () => {
    const listing = {
      id: "listing-1",
      designerId: "designer-1",
      type: ListingType.PRODUCT,
      status: ListingStatus.READY_FOR_REVIEW,
      price: 100_000,
      cost: 40_000,
      publishedAt: null,
      metadataJson: null,
    };
    const prisma = {
      commerceListing: {
        findUnique: jest.fn().mockResolvedValue(listing),
        update: jest.fn().mockResolvedValue({ ...listing, status: ListingStatus.REJECTED }),
      },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new ListingsService(prisma as never, audit as never);

    await service.adminSetStatus(
      { sub: "moderator-1", role: UserRole.MODERATOR } as never,
      listing.id,
      ListingStatus.REJECTED,
      { reason: "  Missing required product details.  " },
    );

    expect(prisma.commerceListing.update).toHaveBeenCalledWith({
      where: { id: listing.id },
      data: {
        status: ListingStatus.REJECTED,
        publishedAt: null,
      },
    });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      actorId: "moderator-1",
      action: "listing.admin-status.update",
      metadata: {
        beforeStatus: ListingStatus.READY_FOR_REVIEW,
        afterStatus: ListingStatus.REJECTED,
        reason: "Missing required product details.",
        notes: null,
      },
    }));
  });

  it("blocks direct publication of a global Printful listing", async () => {
    const listing = {
      id: "listing-printful",
      designerId: "designer-1",
      type: ListingType.PRODUCT,
      pipeline: PipelineType.GLOBAL_PRINTFUL,
      status: ListingStatus.DRAFT,
      price: 30,
      cost: 12,
      publishedAt: null,
      metadataJson: null,
    };
    const prisma = {
      commerceListing: {
        findUnique: jest.fn().mockResolvedValue(listing),
        update: jest.fn(),
      },
    };
    const audit = { log: jest.fn() };
    const service = new ListingsService(prisma as never, audit as never);

    await expect(service.adminSetStatus(
      { sub: "moderator-1", role: UserRole.MODERATOR } as never,
      listing.id,
      ListingStatus.PUBLISHED,
    )).rejects.toThrow("tracked Printful store publications");

    expect(prisma.commerceListing.update).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });
});

describe("ListingsService storefront payload", () => {
  it("turns generated mockup keys into public URLs", () => {
    expect(toPublicListingImageUrl("pipeline-mockups/selection/main image.png", "rashpod-assets")).toBe(
      "https://storage.googleapis.com/rashpod-assets/pipeline-mockups/selection/main%20image.png",
    );
    expect(toPublicListingImageUrl("https://cdn.example/main.png", "rashpod-assets")).toBe("https://cdn.example/main.png");
  });

  it("exposes moderator-configured local colors and sizes", async () => {
    const row = {
      id: "listing-local",
      slug: "local-shirt",
      title: "Local shirt",
      description: null,
      price: 100_000,
      currency: "UZS",
      type: ListingType.PRODUCT,
      publishedAt: new Date(),
      imagesJson: ["pipeline-mockups/selection/main.png"],
      metadataJson: {
        translations: {
          fr: { title: "T-shirt local", description: "Description française", tags: ["local"] },
        },
        variants: [
          { id: "black-m", color: "Black", size: "M", price: "100000", enabled: true },
          { id: "white-l", color: "White", size: "L", price: "100000", enabled: true },
          { id: "disabled", color: "Red", size: "XL", price: "100000", enabled: false },
        ],
      },
      designerId: "designer-1",
      designer: { id: "designer-1", displayName: "Designer", handle: "designer" },
      localBaseProduct: null,
      marketplacePublications: [],
    };
    const prisma = { commerceListing: { findUnique: jest.fn().mockResolvedValue(row) } };
    const service = new ListingsService(prisma as never, { log: jest.fn() } as never);

    const result = await service.shopBySlug(row.slug);

    expect(result).toEqual(expect.objectContaining({
      imageUrl: expect.stringContaining("/pipeline-mockups/selection/main.png"),
      images: [expect.stringContaining("/pipeline-mockups/selection/main.png")],
      variants: {
        colors: ["Black", "White"],
        sizes: ["M", "L"],
        combinations: [
          expect.objectContaining({ id: "black-m", color: "Black", size: "M", inStock: true }),
          expect.objectContaining({ id: "white-l", color: "White", size: "L", inStock: true }),
        ],
      },
    }));

    const frenchResult = await service.shopBySlug(row.slug, "fr");
    expect(frenchResult).toEqual(expect.objectContaining({
      title: "T-shirt local",
      description: "Description française",
    }));
  });
});
