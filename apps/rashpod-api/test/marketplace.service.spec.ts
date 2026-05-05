import { ListingStatus, ListingType } from "@prisma/client";
import { MarketplaceService } from "../src/modules/marketplace/marketplace.service";

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
    const audit: any = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new MarketplaceService(prisma, audit);

    const result = await service.exportListings("admin-1", { type: "PRODUCT" });
    expect(result.total).toBe(1);
    expect(result.type).toBe("PRODUCT");
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        listingId: "l1",
        type: "PRODUCT",
        imageCount: 3,
      }),
    );
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
    const audit: any = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new MarketplaceService(prisma, audit);

    const result = await service.exportListingsCsv("admin-1", { type: "FILM" });
    expect(result.total).toBe(1);
    expect(result.csv).toContain("listingId,type,title");
    expect(result.csv).toContain('"Film ""A"""');
    expect(result.csv).toContain('"desc, with comma"');
  });
});
