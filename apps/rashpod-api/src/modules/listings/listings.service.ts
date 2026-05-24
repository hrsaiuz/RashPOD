import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ListingStatus, ListingType, Prisma, UserRole } from "@prisma/client";
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
    const royalty = await this.calculateRoyalty(dto.price, null);
    const listing = await this.prisma.commerceListing.create({
      data: {
        type: dto.type,
        designerId: design.designerId,
        designAssetId: dto.designAssetId,
        title: dto.title,
        description: dto.description,
        slug,
        price: dto.price,
        designerRoyalty: royalty.amount,
        metadataJson: royalty.rule ? { royaltyRuleId: royalty.rule.id, royaltyBasis: royalty.rule.basis, royaltyValue: royalty.rule.value.toString() } : undefined,
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

  adminList(filters: { status?: ListingStatus; type?: ListingType; q?: string; limit?: number }) {
    const take = Math.min(Math.max(filters.limit ?? 100, 1), 200);
    return this.prisma.commerceListing.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.q ? { title: { contains: filters.q, mode: "insensitive" } } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take,
      include: {
        designer: { select: { id: true, email: true, displayName: true, handle: true } },
        designAsset: { select: { id: true, title: true, status: true } },
        marketplacePublications: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });
  }

  async byId(user: RequestUser, id: string) {
    const listing = await this.prisma.commerceListing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException("Listing not found");
    this.assertOwnershipOrAdmin(user, listing.designerId);
    return listing;
  }

  async adminById(id: string) {
    const listing = await this.prisma.commerceListing.findUnique({
      where: { id },
      include: {
        designer: { select: { id: true, email: true, displayName: true, handle: true } },
        designAsset: { select: { id: true, title: true, status: true } },
        designProductSelection: {
          include: {
            mockupAssets: true,
            localBaseProduct: true,
            printfulProductTemplate: true,
          },
        },
        marketplacePublications: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!listing) throw new NotFoundException("Listing not found");
    return listing;
  }

  async patch(user: RequestUser, id: string, dto: UpdateListingDto, expectedType?: ListingType) {
    const listing = await this.prisma.commerceListing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException("Listing not found");
    this.assertOwnershipOrAdmin(user, listing.designerId);
    this.assertDesignerPipelineListingMutable(user, listing);
    if (expectedType && listing.type !== expectedType) {
      throw new ForbiddenException("Listing type mismatch");
    }
    if (dto.price != null && listing.type === ListingType.FILM) {
      await this.assertFilmPriceFloor(dto.price);
    }

    const metadataJson = dto.metadataJson
      ? this.mergePatchMetadata(listing.metadataJson, dto.metadataJson)
      : undefined;

    const updated = await this.prisma.commerceListing.update({
      where: { id },
      data: {
        title: dto.title ?? undefined,
        description: dto.description ?? undefined,
        price: dto.price ?? undefined,
        tags: dto.tags as Prisma.InputJsonValue | undefined,
        metadataJson,
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
    this.assertDesignerPipelineListingMutable(user, listing);
    await this.assertListingPublishable(id, user.sub, "listing.publish");
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

  async adminSetStatus(user: RequestUser, id: string, status: ListingStatus) {
    const listing = await this.prisma.commerceListing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException("Listing not found");
    if (!this.isAdminRole(user.role)) throw new ForbiddenException("Not allowed");
    if (status === ListingStatus.PUBLISHED) {
      await this.assertListingPublishable(id, user.sub, "listing.admin-status.update");
    }
    const royalty = status === ListingStatus.PUBLISHED ? await this.calculateRoyalty(listing.price, listing.cost) : null;
    const updated = await this.prisma.commerceListing.update({
      where: { id },
      data: {
        status,
        publishedAt: status === ListingStatus.PUBLISHED ? new Date() : listing.publishedAt,
        ...(royalty ? { designerRoyalty: royalty.amount, metadataJson: this.mergeListingMetadata(listing.metadataJson, royalty) } : {}),
      },
    });
    await this.audit.log({
      actorId: user.sub,
      action: "listing.admin-status.update",
      entityType: "CommerceListing",
      entityId: id,
      metadata: { beforeStatus: listing.status, afterStatus: status },
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
          bio: true,
          avatarUrl: true,
          coverUrl: true,
          handle: true,
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
        handle: d.handle ?? this.toHandle(d.displayName, d.id),
        displayName: d.displayName,
        bio: d.bio,
        avatarUrl: d.avatarUrl,
        profileImageUrl: d.coverUrl,
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
      select: { id: true, displayName: true, bio: true, avatarUrl: true, coverUrl: true, handle: true, createdAt: true },
    });
    if (!designer) {
      const all = await this.prisma.user.findMany({
        where: { role: UserRole.DESIGNER },
        select: { id: true, displayName: true, bio: true, avatarUrl: true, coverUrl: true, handle: true, createdAt: true },
      });
      designer =
        all.find((d) => (d.handle ?? this.toHandle(d.displayName, d.id)) === normalized) ?? null;
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
        handle: designer.handle ?? this.toHandle(designer.displayName, designer.id),
        bio: designer.bio,
        avatarUrl: designer.avatarUrl,
        coverUrl: designer.coverUrl,
        joinedAt: designer.createdAt,
        stats: {
          listingsCount,
        },
      },
      listings: listings.map((l) => this.toShopListingDto(l)),
    };
  }

  private isAdminRole(role: string) {
    return role === UserRole.MODERATOR || role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN || role === UserRole.OPERATIONS_MANAGER;
  }

  private assertOwnershipOrAdmin(user: RequestUser, designerId: string) {
    if (!this.isAdminRole(user.role) && user.sub !== designerId) {
      throw new ForbiddenException("Not allowed");
    }
  }

  private assertDesignerPipelineListingMutable(
    user: RequestUser,
    listing: { designerId: string; designProductSelectionId: string | null; status: ListingStatus },
  ) {
    if (this.isAdminRole(user.role)) return;
    if (user.sub !== listing.designerId) return;
    if (!listing.designProductSelectionId) return;
    if (listing.status === ListingStatus.PUBLISHED) return;
    throw new ForbiddenException("Pipeline listings are managed by moderators until published");
  }

  private mergePatchMetadata(
    existing: Prisma.JsonValue | null,
    patch: Record<string, unknown>,
  ): Prisma.InputJsonValue {
    const base = existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};
    return { ...base, ...patch } as Prisma.InputJsonValue;
  }

  private async assertFilmPriceFloor(price: number) {
    const filmSettings = await this.prisma.filmSaleSettings.findFirst();
    if (filmSettings?.minimumOrderPrice && price < Number(filmSettings.minimumOrderPrice)) {
      throw new ForbiddenException(`Film listing price must be at least ${Number(filmSettings.minimumOrderPrice)}`);
    }
  }

  private async assertListingPublishable(listingId: string, actorId: string, sourceAction: string) {
    const listing = await this.prisma.commerceListing.findUnique({
      where: { id: listingId },
      include: { designProductSelection: { include: { mockupAssets: true } } },
    });
    if (!listing) throw new NotFoundException("Listing not found");

    const imageUrls = Array.isArray(listing.imagesJson)
      ? (listing.imagesJson as unknown[]).filter((item): item is string => typeof item === "string" && item.length > 0)
      : [];
    const readyMockups = listing.designProductSelection?.mockupAssets.filter(
      (asset) =>
        (asset.status === "GENERATED" || asset.status === "READY") &&
        !asset.archivedAt &&
        Boolean(asset.imageUrl || asset.objectKey),
    ) ?? [];
    const readyTypes = new Set(readyMockups.map((asset) => asset.mockupType));

    const reasons: string[] = [];
    if (imageUrls.length === 0 && readyMockups.length === 0) {
      reasons.push("Listing has no ready public images");
    }
    if (listing.type === ListingType.PRODUCT && listing.designProductSelectionId) {
      if (!readyTypes.has("MAIN")) {
        reasons.push("Product listing requires a ready main image");
      }
      if (!(readyTypes.has("LIFESTYLE") || readyTypes.has("SECONDARY"))) {
        reasons.push("Product listing requires a ready secondary or lifestyle image");
      }
      if (!readyTypes.has("DETAIL")) {
        reasons.push("Product listing requires a ready detail image");
      }
      const missingMetadata = readyMockups.filter(
        (asset) => !asset.placementSnapshotJson || !asset.contentType || !asset.format || !asset.widthPx || !asset.heightPx,
      );
      if (missingMetadata.length > 0) {
        reasons.push("Product listing images require placement snapshot and render metadata");
      }
    }

    if (reasons.length > 0) {
      await this.audit.log({
        actorId,
        action: "listing.publication.blocked",
        entityType: "CommerceListing",
        entityId: listing.id,
        metadata: {
          sourceAction,
          reasons,
          imageCount: imageUrls.length,
          readyMockupCount: readyMockups.length,
          designProductSelectionId: listing.designProductSelectionId,
        },
      });
      throw new ForbiddenException(reasons.join("; "));
    }
  }

  private toHandle(displayName: string, fallbackId: string) {
    const slug = displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    return slug || fallbackId;
  }

  private async calculateRoyalty(price: Prisma.Decimal | number, cost: Prisma.Decimal | number | null) {
    const rule = await this.prisma.royaltyRule.findFirst({
      where: { isActive: true, effectiveAt: { lte: new Date() } },
      orderBy: [{ scope: "asc" }, { effectiveAt: "desc" }],
    });
    if (!rule) return { amount: undefined, rule: null };

    const priceDecimal = new Prisma.Decimal(price);
    const costDecimal = cost == null ? new Prisma.Decimal(0) : new Prisma.Decimal(cost);
    const rate = new Prisma.Decimal(rule.value);
    const amount = rule.basis === "FIXED_AMOUNT"
      ? rate
      : rule.basis === "NET_PROFIT_PERCENT"
        ? Prisma.Decimal.max(priceDecimal.minus(costDecimal), 0).mul(rate).div(100)
        : priceDecimal.mul(rate).div(100);

    return { amount: amount.toDecimalPlaces(2), rule };
  }

  private mergeListingMetadata(metadata: Prisma.JsonValue | null, royalty: Awaited<ReturnType<ListingsService["calculateRoyalty"]>>) {
    const base = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
    return {
      ...base,
      royaltyRuleId: royalty.rule?.id,
      royaltyBasis: royalty.rule?.basis,
      royaltyValue: royalty.rule?.value.toString(),
    } as Prisma.InputJsonValue;
  }
}
