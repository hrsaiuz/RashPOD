import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ListingStatus, ListingType, Prisma, UserRole } from "@prisma/client";
import { ListingsService } from "../src/modules/listings/listings.service";

describe("ListingsService lifecycle", () => {
  const user = { sub: "designer-1", email: "d@rashpod.uz", role: UserRole.DESIGNER };
  const admin = { sub: "admin-1", email: "a@rashpod.uz", role: UserRole.ADMIN };

  it("gets own listing by id", async () => {
    const listing = { id: "lst-1", designerId: "designer-1" };
    const prisma: any = {
      commerceListing: { findUnique: jest.fn().mockResolvedValue(listing) },
    };
    const audit: any = { log: jest.fn() };
    const service = new ListingsService(prisma, audit);

    const result = await service.byId(user as any, "lst-1");

    expect(result).toBe(listing);
  });

  it("blocks listing read for non-owner non-admin", async () => {
    const prisma: any = {
      commerceListing: { findUnique: jest.fn().mockResolvedValue({ id: "lst-1", designerId: "designer-2" }) },
    };
    const service = new ListingsService(prisma, { log: jest.fn() } as any);

    await expect(service.byId(user as any, "lst-1")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("archives listing and logs audit", async () => {
    const prisma: any = {
      commerceListing: {
        findUnique: jest.fn().mockResolvedValue({ id: "lst-2", designerId: "designer-1" }),
        update: jest.fn().mockResolvedValue({ id: "lst-2", status: ListingStatus.ARCHIVED }),
      },
    };
    const audit: any = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new ListingsService(prisma, audit);

    const result = await service.archive(user as any, "lst-2");

    expect(result.status).toBe(ListingStatus.ARCHIVED);
    expect(prisma.commerceListing.update).toHaveBeenCalledWith({
      where: { id: "lst-2" },
      data: { status: ListingStatus.ARCHIVED },
    });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "listing.archive", entityId: "lst-2" }));
  });

  it("patches film listing only through film endpoint type constraint", async () => {
    const prisma: any = {
      commerceListing: {
        findUnique: jest.fn().mockResolvedValue({
          id: "lst-3",
          type: ListingType.PRODUCT,
          designerId: "designer-1",
        }),
      },
      filmSaleSettings: {
        findFirst: jest.fn().mockResolvedValue({ minimumOrderPrice: 100 }),
      },
    };
    const service = new ListingsService(prisma, { log: jest.fn() } as any);

    await expect(service.patch(user as any, "lst-3", { price: 120 }, ListingType.FILM)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("allows admin to update another designer listing", async () => {
    const prisma: any = {
      commerceListing: {
        findUnique: jest.fn().mockResolvedValue({
          id: "lst-4",
          type: ListingType.PRODUCT,
          designerId: "designer-2",
        }),
        update: jest.fn().mockResolvedValue({
          id: "lst-4",
          title: "Updated",
        }),
      },
      filmSaleSettings: { findFirst: jest.fn() },
    };
    const audit: any = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new ListingsService(prisma, audit);

    await service.patch(admin as any, "lst-4", { title: "Updated" });

    expect(prisma.commerceListing.update).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "listing.update" }));
  });

  it("applies active royalty rules when a moderator publishes a listing", async () => {
    const listing = {
      id: "lst-royalty",
      type: ListingType.PRODUCT,
      status: ListingStatus.DRAFT,
      designerId: "designer-2",
      price: new Prisma.Decimal(100000),
      cost: new Prisma.Decimal(60000),
      publishedAt: null,
      metadataJson: null,
    };
    const prisma: any = {
      commerceListing: {
        findUnique: jest.fn().mockResolvedValue(listing),
        update: jest.fn().mockResolvedValue({ ...listing, status: ListingStatus.PUBLISHED }),
      },
      royaltyRule: {
        findFirst: jest.fn().mockResolvedValue({ id: "rule-1", basis: "NET_PROFIT_PERCENT", value: new Prisma.Decimal(25), scope: "DEFAULT" }),
      },
    };
    const audit: any = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new ListingsService(prisma, audit);

    await service.adminSetStatus({ sub: "mod-1", email: "m@rashpod.uz", role: UserRole.MODERATOR } as any, "lst-royalty", ListingStatus.PUBLISHED);

    expect(prisma.commerceListing.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "lst-royalty" },
      data: expect.objectContaining({ designerRoyalty: new Prisma.Decimal(10000) }),
    }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "listing.admin-status.update" }));
  });

  it("throws not found when listing is missing", async () => {
    const prisma: any = {
      commerceListing: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const service = new ListingsService(prisma, { log: jest.fn() } as any);

    await expect(service.archive(user as any, "missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("returns published shop listings by designer handle", async () => {
    const prisma: any = {
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: "designer-7", displayName: "Alice Art" }),
      },
      commerceListing: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "l1",
            slug: "listing-1",
            title: "Listing 1",
            description: null,
            price: 100,
            currency: "UZS",
            type: ListingType.PRODUCT,
            publishedAt: new Date(),
            imagesJson: [],
            designerId: "designer-7",
            designer: { id: "designer-7", displayName: "Alice Art" },
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    const service = new ListingsService(prisma, { log: jest.fn() } as any);

    const result = await service.shopByDesigner("alice-art");
    expect(result?.designer.id).toBe("designer-7");
    expect(result?.designer.handle).toBe("alice-art");
    expect(result?.listings).toHaveLength(1);
    expect(prisma.commerceListing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ designerId: "designer-7", status: ListingStatus.PUBLISHED }),
      }),
    );
  });
});
