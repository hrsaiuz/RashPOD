import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ListingStatus, ListingType, UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { RequestUser } from "../../common/auth/current-user.decorator";
import { CreateListingDto } from "./dto/create-listing.dto";
import { UpdateListingDto } from "./dto/update-listing.dto";

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(user: RequestUser, dto: CreateListingDto) {
    const design = await this.prisma.designAsset.findUnique({ where: { id: dto.designAssetId } });
    if (!design) throw new NotFoundException("Design not found");
    const isAdmin =
      user.role === UserRole.ADMIN ||
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.OPERATIONS_MANAGER;
    if (!isAdmin && design.designerId !== user.sub) throw new ForbiddenException("Not your design");
    if (dto.type === "FILM") {
      const [rights, filmSettings] = await Promise.all([
        this.prisma.commercialRights.findUnique({ where: { designAssetId: dto.designAssetId } }),
        this.prisma.filmSaleSettings.findFirst(),
      ]);
      if (!filmSettings?.enableFilmSalesGlobally) {
        throw new ForbiddenException("Film sales are currently disabled");
      }
      if (!rights?.allowFilmSales || rights.filmConsentRevokedAt) {
        throw new ForbiddenException("Film-sale rights are not enabled for this design");
      }
      if (filmSettings.minimumOrderPrice && dto.price < Number(filmSettings.minimumOrderPrice)) {
        throw new ForbiddenException(`Film listing price must be at least ${Number(filmSettings.minimumOrderPrice)}`);
      }
    }

    const baseSlug = dto.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const slug = `${baseSlug}-${Date.now()}`;
    const listing = await this.prisma.commerceListing.create({
      data: {
        type: dto.type,
        designerId: design.designerId,
        designAssetId: dto.designAssetId,
        title: dto.title,
        description: dto.description,
        slug,
        price: dto.price,
      },
    });
    await this.audit.log({
      actorId: user.sub,
      action: "listing.create",
      entityType: "CommerceListing",
      entityId: listing.id,
    });
    return listing;
  }

  listOwn(userId: string) {
    return this.prisma.commerceListing.findMany({ where: { designerId: userId }, orderBy: { createdAt: "desc" } });
  }

  async byId(user: RequestUser, id: string) {
    const listing = await this.prisma.commerceListing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException("Listing not found");
    this.assertOwnershipOrAdmin(user, listing.designerId);
    return listing;
  }

  async patch(user: RequestUser, id: string, dto: UpdateListingDto, expectedType?: ListingType) {
    const listing = await this.prisma.commerceListing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException("Listing not found");
    this.assertOwnershipOrAdmin(user, listing.designerId);
    if (expectedType && listing.type !== expectedType) {
      throw new ForbiddenException("Listing type mismatch");
    }
    if (dto.price != null && listing.type === ListingType.FILM) {
      await this.assertFilmPriceFloor(dto.price);
    }

    const updated = await this.prisma.commerceListing.update({
      where: { id },
      data: {
        title: dto.title ?? undefined,
        description: dto.description ?? undefined,
        price: dto.price ?? undefined,
      },
    });
    await this.audit.log({
      actorId: user.sub,
      action: "listing.update",
      entityType: "CommerceListing",
      entityId: id,
      metadata: { expectedType: expectedType ?? null },
    });
    return updated;
  }

  async publish(user: RequestUser, id: string) {
    const listing = await this.prisma.commerceListing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException("Listing not found");
    const isAdmin =
      user.role === UserRole.ADMIN ||
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.OPERATIONS_MANAGER;
    if (!isAdmin && listing.designerId !== user.sub) throw new ForbiddenException("Not allowed");
    const updated = await this.prisma.commerceListing.update({
      where: { id },
      data: { status: ListingStatus.PUBLISHED, publishedAt: new Date() },
    });
    await this.audit.log({
      actorId: user.sub,
      action: "listing.publish",
      entityType: "CommerceListing",
      entityId: id,
    });
    return updated;
  }

  async archive(user: RequestUser, id: string) {
    const listing = await this.prisma.commerceListing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException("Listing not found");
    this.assertOwnershipOrAdmin(user, listing.designerId);
    const updated = await this.prisma.commerceListing.update({
      where: { id },
      data: { status: ListingStatus.ARCHIVED },
    });
    await this.audit.log({
      actorId: user.sub,
      action: "listing.archive",
      entityType: "CommerceListing",
      entityId: id,
    });
    return updated;
  }

  async shopList(type?: string, q?: string, limit?: number) {
    const take = Math.min(Math.max(limit ?? 100, 1), 100);
    const rows = await this.prisma.commerceListing.findMany({
      where: {
        status: ListingStatus.PUBLISHED,
        ...(type ? { type: type as any } : {}),
        ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
      },
      orderBy: { publishedAt: "desc" },
      take,
      include: { designer: { select: { id: true, displayName: true } } },
    });
    return rows.map((row) => this.toShopListingDto(row));
  }

  async shopDesignersList(limit?: number) {
    const take = Math.min(Math.max(limit ?? 24, 1), 100);
    const designers = await this.prisma.user.findMany({
      where: {
        role: UserRole.DESIGNER,
        listings: { some: { status: ListingStatus.PUBLISHED } },
      },
      select: {
        id: true,
        displayName: true,
        createdAt: true,
        listings: {
          where: { status: ListingStatus.PUBLISHED },
          orderBy: { publishedAt: "desc" },
          take: 3,
          select: { id: true, imagesJson: true },
        },
        _count: { select: { listings: { where: { status: ListingStatus.PUBLISHED } } } },
      },
      take,
    });
    return designers
      .map((d) => ({
        id: d.id,
        handle: this.toHandle(d.displayName, d.id),
        displayName: d.displayName,
        bio: null,
        avatarUrl: null,
        joinedAt: d.createdAt,
        listingsCount: d._count.listings,
        topListings: d.listings.map((l) => ({
          id: l.id,
          imageUrl:
            Array.isArray(l.imagesJson) && typeof (l.imagesJson as any)[0] === "string"
              ? ((l.imagesJson as any)[0] as string)
              : null,
        })),
      }))
      .sort((a, b) => b.listingsCount - a.listingsCount);
  }

  async shopBySlug(slug: string) {
    const row = await this.prisma.commerceListing.findUnique({
      where: { slug },
      include: { designer: { select: { id: true, displayName: true } } },
    });
    return row ? this.toShopListingDto(row) : null;
  }

  private toShopListingDto(row: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    price: any;
    currency: string;
    type: ListingType;
    publishedAt: Date | null;
    imagesJson: any;
    designerId: string;
    designer: { id: string; displayName: string };
  }) {
    const images = Array.isArray(row.imagesJson)
      ? (row.imagesJson as unknown[]).filter((v): v is string => typeof v === "string")
      : [];
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      price: Number(row.price),
      currency: row.currency,
      type: row.type,
      publishedAt: row.publishedAt,
      imageUrl: images[0] ?? null,
      images,
      designer: {
        id: row.designer.id,
        displayName: row.designer.displayName,
        handle: this.toHandle(row.designer.displayName, row.designer.id),
      },
    };
  }

  async shopByDesigner(handle: string) {
    const normalized = handle.trim().toLowerCase();
    let designer = await this.prisma.user.findFirst({
      where: {
        role: UserRole.DESIGNER,
        OR: [
          { id: handle },
          { displayName: { equals: handle, mode: "insensitive" } },
          { email: { startsWith: `${normalized}@`, mode: "insensitive" } },
        ],
      },
      select: { id: true, displayName: true, createdAt: true },
    });
    if (!designer) {
      const all = await this.prisma.user.findMany({
        where: { role: UserRole.DESIGNER },
        select: { id: true, displayName: true, createdAt: true },
      });
      designer =
        all.find((d) => this.toHandle(d.displayName, d.id) === normalized) ?? null;
    }
    if (!designer) return null;

    const [listings, listingsCount] = await Promise.all([
      this.prisma.commerceListing.findMany({
        where: { designerId: designer.id, status: ListingStatus.PUBLISHED },
        orderBy: { publishedAt: "desc" },
        take: 100,
        include: { designer: { select: { id: true, displayName: true } } },
      }),
      this.prisma.commerceListing.count({
        where: { designerId: designer.id, status: ListingStatus.PUBLISHED },
      }),
    ]);

    return {
      designer: {
        id: designer.id,
        displayName: designer.displayName,
        handle: this.toHandle(designer.displayName, designer.id),
        bio: null,
        avatarUrl: null,
        coverUrl: null,
        joinedAt: designer.createdAt,
        stats: {
          listingsCount,
        },
      },
      listings: listings.map((l) => this.toShopListingDto(l)),
    };
  }

  private isAdminRole(role: string) {
    return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN || role === UserRole.OPERATIONS_MANAGER;
  }

  private assertOwnershipOrAdmin(user: RequestUser, designerId: string) {
    if (!this.isAdminRole(user.role) && user.sub !== designerId) {
      throw new ForbiddenException("Not allowed");
    }
  }

  private async assertFilmPriceFloor(price: number) {
    const filmSettings = await this.prisma.filmSaleSettings.findFirst();
    if (filmSettings?.minimumOrderPrice && price < Number(filmSettings.minimumOrderPrice)) {
      throw new ForbiddenException(`Film listing price must be at least ${Number(filmSettings.minimumOrderPrice)}`);
    }
  }

  private toHandle(displayName: string, fallbackId: string) {
    const slug = displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    return slug || fallbackId;
  }
}
