import { ForbiddenException } from "@nestjs/common";
import { AssetLifecycleStatus, AssetPurpose, FilmOrderKind, FilmType, ListingStatus, ListingType, Prisma } from "@prisma/client";
import { FilmService } from "../src/modules/film/film.service";

describe("FilmService", () => {
  const settings = {
    id: "film-settings-1",
    enableFilmSalesGlobally: true,
    enableDTF: true,
    enableUvDtf: true,
    defaultRoyaltyBasis: "GROSS_PERCENT",
    defaultRoyaltyValue: new Prisma.Decimal(10),
    minimumOrderPrice: new Prisma.Decimal(10000),
    rushOrderFee: null,
    revocationPolicy: "new orders blocked after revocation",
    currency: "UZS",
    dtfPricingJson: { pricePerCm2: 10, setupFee: 1000, minimumOrderPrice: 10000, wasteMarginPercent: 0, maxWidthCm: 60, maxHeightCm: 500 },
    uvDtfPricingJson: { pricePerCm2: 12, setupFee: 1500, minimumOrderPrice: 12000, wasteMarginPercent: 0, maxWidthCm: 50, maxHeightCm: 300 },
    consentPolicyJson: null,
    royaltyPolicyJson: null,
    productionConstraintsJson: null,
    settingsVersion: 3,
    taxRatePercent: null,
    updatedAt: new Date(),
  };

  function service(prismaOverrides: Record<string, unknown> = {}) {
    const prisma: any = {
      filmSaleSettings: { findFirst: jest.fn().mockResolvedValue(settings) },
      cart: { findUnique: jest.fn().mockResolvedValue({ id: "cart-1", customerId: "customer-1" }), create: jest.fn() },
      cartItem: { create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: "cart-item-1", ...data })) },
      fileAsset: { findUnique: jest.fn() },
      commerceListing: { findUnique: jest.fn() },
      ...prismaOverrides,
    };
    return { prisma, film: new FilmService(prisma, { log: jest.fn().mockResolvedValue(undefined) } as any) };
  }

  it("quotes film from deterministic settings and preserves minimum adjustment", async () => {
    const { film } = service();

    const quote = await film.quote({ filmType: "DTF", widthCm: 10, heightCm: 10, quantity: 2, itemKind: "CUSTOM_FILM" });

    expect(quote.areaCm2).toBe(100);
    expect(quote.billableAreaCm2).toBe(200);
    expect(quote.subtotal).toBe(10000);
    expect(quote.minimumOrderAdjustment).toBe(7000);
    expect(quote.pricingSnapshot).toMatchObject({ settingsVersion: 3, filmType: "DTF", currency: "UZS" });
  });

  it("blocks disabled film types", async () => {
    const { film } = service({ filmSaleSettings: { findFirst: jest.fn().mockResolvedValue({ ...settings, enableDTF: false }) } });

    await expect(film.quote({ filmType: "DTF", widthCm: 10, heightCm: 10, quantity: 1 })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("adds a ready custom film source to cart with immutable quote snapshot", async () => {
    const { film, prisma } = service({
      fileAsset: {
        findUnique: jest.fn().mockResolvedValue({
          id: "asset-1",
          ownerId: "customer-1",
          purpose: AssetPurpose.FILM_SOURCE,
          status: AssetLifecycleStatus.READY,
          uploadStatus: "READY",
        }),
      },
    });

    const result = await film.addCustomFilmToCart("customer-1", { sourceAssetId: "asset-1", filmType: "UV_DTF", widthCm: 12, heightCm: 20, quantity: 1 });

    expect(result.item.itemKind).toBe(FilmOrderKind.CUSTOM_FILM);
    expect(result.item.filmType).toBe(FilmType.UV_DTF);
    expect(prisma.cartItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        listingId: null,
        filmSourceAssetId: "asset-1",
        filmPricingSnapshotJson: expect.objectContaining({ filmType: "UV_DTF", settingsVersion: 3 }),
      }),
    });
  });

  it("adds a design film listing only when consent is active", async () => {
    const { film, prisma } = service({
      commerceListing: {
        findUnique: jest.fn().mockResolvedValue({
          id: "listing-1",
          type: ListingType.FILM,
          status: ListingStatus.PUBLISHED,
          slug: "film-one",
          designer: { id: "designer-1", displayName: "Designer", handle: "designer" },
          designAsset: {
            versions: [{ id: "version-1" }],
            commercialRights: { id: "rights-1", designAssetId: "design-1", allowFilmSales: true, filmConsentGrantedAt: new Date(), filmConsentRevokedAt: null, filmConsentVersionId: "version-1", filmRoyaltyRate: 10 },
          },
        }),
      },
    });

    await film.addDesignFilmToCart("customer-1", { listingId: "listing-1", filmType: "DTF", widthCm: 10, heightCm: 20, quantity: 1 });

    expect(prisma.cartItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ listingId: "listing-1", itemKind: FilmOrderKind.DESIGN_FILM, filmConsentSnapshotJson: expect.objectContaining({ allowFilmSales: true }) }),
    });
  });
});
