import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AssetLifecycleStatus, AssetPurpose, FilmOrderKind, FilmType, ListingStatus, ListingType, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AddCustomFilmCartDto } from "./dto/add-custom-film-cart.dto";
import { AddDesignFilmCartDto } from "./dto/add-design-film-cart.dto";
import { FilmQuoteDto } from "./dto/film-quote.dto";

type FilmPricingConfig = {
  pricePerCm2: number;
  setupFee: number;
  minimumOrderPrice: number;
  wasteMarginPercent: number;
  minWidthCm: number;
  minHeightCm: number;
  maxWidthCm: number;
  maxHeightCm: number;
  minDpi?: number;
  turnaroundDays?: number;
};

@Injectable()
export class FilmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async quote(dto: FilmQuoteDto) {
    const settings = await this.getEnabledSettings(dto.filmType as FilmType);
    const config = this.pricingConfig(settings, dto.filmType as FilmType);
    this.assertDimensions(dto.widthCm, dto.heightCm, config);
    const areaCm2 = this.round(dto.widthCm * dto.heightCm, 2);
    const billableAreaCm2 = this.round(areaCm2 * dto.quantity * (1 + config.wasteMarginPercent / 100), 2);
    const filmPrice = this.round(billableAreaCm2 * config.pricePerCm2, 2);
    const setupFee = this.round(config.setupFee, 2);
    const subtotalBeforeMinimum = this.round(filmPrice + setupFee, 2);
    const minimumOrderPrice = Math.max(config.minimumOrderPrice, settings.minimumOrderPrice ? Number(settings.minimumOrderPrice) : 0);
    const minimumOrderAdjustment = Math.max(0, this.round(minimumOrderPrice - subtotalBeforeMinimum, 2));
    const subtotal = this.round(subtotalBeforeMinimum + minimumOrderAdjustment, 2);
    const taxRatePercent = settings.taxRatePercent ? Number(settings.taxRatePercent) : 0;
    const taxAmount = this.round(subtotal * (taxRatePercent / 100), 2);
    const total = this.round(subtotal + taxAmount, 2);
    const unitPrice = this.round(total / dto.quantity, 2);
    const snapshot = {
      settingsId: settings.id,
      settingsVersion: settings.settingsVersion,
      filmType: dto.filmType,
      itemKind: dto.itemKind ?? null,
      widthCm: dto.widthCm,
      heightCm: dto.heightCm,
      quantity: dto.quantity,
      areaCm2,
      billableAreaCm2,
      pricePerCm2: config.pricePerCm2,
      wasteMarginPercent: config.wasteMarginPercent,
      setupFee,
      minimumOrderPrice,
      minimumOrderAdjustment,
      taxRatePercent,
      taxAmount,
      subtotal,
      total,
      unitPrice,
      currency: settings.currency,
      quotedAt: new Date().toISOString(),
      turnaroundDays: config.turnaroundDays ?? null,
    };
    return { ...snapshot, pricingSnapshot: snapshot };
  }

  async designEligibility(designId: string) {
    const design = await this.prisma.designAsset.findUnique({
      where: { id: designId },
      include: { versions: { orderBy: { createdAt: "desc" }, take: 1 }, commercialRights: true },
    });
    if (!design) throw new NotFoundException("Design not found");
    const blockers: string[] = [];
    if (!this.isApprovedDesignStatus(design.status)) blockers.push("Design is not approved for sales");
    if (!design.commercialRights?.allowFilmSales || design.commercialRights.filmConsentRevokedAt) blockers.push("Film-sale consent is not active");
    if (!design.versions[0]) blockers.push("Design has no source version");
    const settings = await this.prisma.filmSaleSettings.findFirst({ orderBy: { updatedAt: "desc" } });
    if (!settings?.enableFilmSalesGlobally) blockers.push("Film sales are disabled globally");
    return {
      designId,
      eligible: blockers.length === 0,
      blockers,
      rights: design.commercialRights ? this.consentSnapshot(design.commercialRights, design.versions[0]?.id) : null,
      latestVersion: design.versions[0]
        ? { id: design.versions[0].id, widthPx: design.versions[0].widthPx, heightPx: design.versions[0].heightPx, dpi: design.versions[0].dpi, hasTransparency: design.versions[0].hasTransparency }
        : null,
      settings: settings ? { id: settings.id, settingsVersion: settings.settingsVersion, enableDTF: settings.enableDTF, enableUvDtf: settings.enableUvDtf } : null,
    };
  }

  async addDesignFilmToCart(customerId: string, dto: AddDesignFilmCartDto) {
    const listing = await this.prisma.commerceListing.findUnique({
      where: { id: dto.listingId },
      include: {
        designAsset: { include: { versions: { orderBy: { createdAt: "desc" }, take: 1 }, commercialRights: true } },
        designer: { select: { id: true, displayName: true, handle: true } },
      },
    });
    if (!listing) throw new NotFoundException("Film listing not found");
    if (listing.type !== ListingType.FILM || listing.status !== ListingStatus.PUBLISHED) throw new ForbiddenException("Film listing is not purchasable");
    const rights = listing.designAsset.commercialRights;
    if (!rights?.allowFilmSales || rights.filmConsentRevokedAt) throw new ForbiddenException("Film-sale consent is not active for this design");
    const quote = await this.quote({ ...dto, itemKind: "DESIGN_FILM" });
    const cart = await this.ensureCart(customerId);
    const areaCm2 = this.round(dto.widthCm * dto.heightCm, 2);
    const item = await this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        listingId: listing.id,
        quantity: dto.quantity,
        unitPrice: new Prisma.Decimal(quote.unitPrice),
        currency: quote.currency,
        itemKind: FilmOrderKind.DESIGN_FILM,
        filmType: dto.filmType as FilmType,
        filmWidthCm: dto.widthCm,
        filmHeightCm: dto.heightCm,
        filmAreaCm2: areaCm2,
        filmPricingSnapshotJson: this.cleanJson(quote.pricingSnapshot),
        filmConsentSnapshotJson: this.cleanJson(this.consentSnapshot(rights, listing.designAsset.versions[0]?.id)),
        filmOptionsJson: this.cleanJson({ source: "DESIGN", listingSlug: listing.slug, designer: listing.designer }),
        metadataJson: this.cleanJson({ film: true, itemKind: "DESIGN_FILM", quote: quote.pricingSnapshot }),
      },
    });
    await this.audit.log({ actorId: customerId, action: "film.cart.design-added", entityType: "CartItem", entityId: item.id, metadata: { listingId: listing.id, total: quote.total, filmType: dto.filmType } });
    return { item, quote };
  }

  async addCustomFilmToCart(customerId: string, dto: AddCustomFilmCartDto) {
    const source = await this.prisma.fileAsset.findUnique({ where: { id: dto.sourceAssetId } });
    if (!source) throw new NotFoundException("Film source asset not found");
    if (source.ownerId !== customerId) throw new ForbiddenException("Not your film source asset");
    if (source.purpose !== AssetPurpose.FILM_SOURCE) throw new BadRequestException("Asset must be uploaded with FILM_SOURCE purpose");
    if (source.status !== AssetLifecycleStatus.READY || source.uploadStatus !== "READY") throw new ForbiddenException("Film source asset is not ready yet");
    const quote = await this.quote({ ...dto, itemKind: "CUSTOM_FILM" });
    const cart = await this.ensureCart(customerId);
    const areaCm2 = this.round(dto.widthCm * dto.heightCm, 2);
    const item = await this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        listingId: null,
        quantity: dto.quantity,
        unitPrice: new Prisma.Decimal(quote.unitPrice),
        currency: quote.currency,
        itemKind: FilmOrderKind.CUSTOM_FILM,
        filmType: dto.filmType as FilmType,
        filmWidthCm: dto.widthCm,
        filmHeightCm: dto.heightCm,
        filmAreaCm2: areaCm2,
        filmSourceAssetId: source.id,
        filmPricingSnapshotJson: this.cleanJson(quote.pricingSnapshot),
        filmOptionsJson: this.cleanJson({ source: "CUSTOM_UPLOAD", sourceAssetId: source.id, note: dto.note }),
        metadataJson: this.cleanJson({ film: true, itemKind: "CUSTOM_FILM", quote: quote.pricingSnapshot, note: dto.note }),
      },
    });
    await this.audit.log({ actorId: customerId, action: "film.cart.custom-added", entityType: "CartItem", entityId: item.id, metadata: { sourceAssetId: source.id, total: quote.total, filmType: dto.filmType } });
    return { item, quote };
  }

  listCustomerFilmOrders(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId, items: { some: { itemKind: { in: [FilmOrderKind.DESIGN_FILM, FilmOrderKind.CUSTOM_FILM] } } } },
      include: { items: { where: { itemKind: { in: [FilmOrderKind.DESIGN_FILM, FilmOrderKind.CUSTOM_FILM] } } }, productionJobs: true, payments: { orderBy: { createdAt: "desc" }, take: 3 } },
      orderBy: { createdAt: "desc" },
    });
  }

  async getCustomerFilmOrder(customerId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId, items: { some: { itemKind: { in: [FilmOrderKind.DESIGN_FILM, FilmOrderKind.CUSTOM_FILM] } } } },
      include: { items: { where: { itemKind: { in: [FilmOrderKind.DESIGN_FILM, FilmOrderKind.CUSTOM_FILM] } } }, productionJobs: true, payments: { orderBy: { createdAt: "desc" } } },
    });
    if (!order) throw new NotFoundException("Film order not found");
    return order;
  }

  listDesignerFilmSales(designerId: string) {
    return this.prisma.orderItem.findMany({
      where: { designerId, itemKind: FilmOrderKind.DESIGN_FILM },
      include: { order: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  listAdminFilmOrders() {
    return this.prisma.order.findMany({
      where: { items: { some: { itemKind: { in: [FilmOrderKind.DESIGN_FILM, FilmOrderKind.CUSTOM_FILM] } } } },
      include: { customer: { select: { id: true, email: true, displayName: true } }, items: { where: { itemKind: { in: [FilmOrderKind.DESIGN_FILM, FilmOrderKind.CUSTOM_FILM] } } }, productionJobs: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  private async getEnabledSettings(filmType: FilmType) {
    const settings = await this.prisma.filmSaleSettings.findFirst({ orderBy: { updatedAt: "desc" } });
    if (!settings?.enableFilmSalesGlobally) throw new ForbiddenException("Film sales are currently disabled");
    if (filmType === FilmType.DTF && !settings.enableDTF) throw new ForbiddenException("DTF film sales are disabled");
    if (filmType === FilmType.UV_DTF && !settings.enableUvDtf) throw new ForbiddenException("UV-DTF film sales are disabled");
    return settings;
  }

  private pricingConfig(settings: Awaited<ReturnType<FilmService["getEnabledSettings"]>>, filmType: FilmType): FilmPricingConfig {
    const raw = this.objectJson(filmType === FilmType.DTF ? settings.dtfPricingJson : settings.uvDtfPricingJson);
    return {
      pricePerCm2: this.numberFrom(raw.pricePerCm2, filmType === FilmType.DTF ? 45 : 55),
      setupFee: this.numberFrom(raw.setupFee, settings.rushOrderFee ? Number(settings.rushOrderFee) : 0),
      minimumOrderPrice: this.numberFrom(raw.minimumOrderPrice, settings.minimumOrderPrice ? Number(settings.minimumOrderPrice) : 0),
      wasteMarginPercent: this.numberFrom(raw.wasteMarginPercent, 8),
      minWidthCm: this.numberFrom(raw.minWidthCm, 2),
      minHeightCm: this.numberFrom(raw.minHeightCm, 2),
      maxWidthCm: this.numberFrom(raw.maxWidthCm, 60),
      maxHeightCm: this.numberFrom(raw.maxHeightCm, 500),
      minDpi: this.optionalNumber(raw.minDpi),
      turnaroundDays: this.optionalNumber(raw.turnaroundDays),
    };
  }

  private assertDimensions(widthCm: number, heightCm: number, config: FilmPricingConfig) {
    if (!Number.isFinite(widthCm) || !Number.isFinite(heightCm)) throw new BadRequestException("Film dimensions are invalid");
    if (widthCm < config.minWidthCm || heightCm < config.minHeightCm) throw new BadRequestException("Film dimensions are below the minimum");
    if (widthCm > config.maxWidthCm || heightCm > config.maxHeightCm) throw new BadRequestException("Film dimensions exceed production constraints");
  }

  private async ensureCart(customerId: string) {
    const existing = await this.prisma.cart.findUnique({ where: { customerId } });
    if (existing) return existing;
    return this.prisma.cart.create({ data: { customerId } });
  }

  private consentSnapshot(rights: { id: string; designAssetId: string; allowFilmSales: boolean; filmConsentGrantedAt: Date | null; filmConsentRevokedAt: Date | null; filmConsentVersionId: string | null; filmRoyaltyRate: number | null }, currentVersionId?: string) {
    return {
      rightsId: rights.id,
      designAssetId: rights.designAssetId,
      allowFilmSales: rights.allowFilmSales,
      filmConsentGrantedAt: rights.filmConsentGrantedAt?.toISOString() ?? null,
      filmConsentRevokedAt: rights.filmConsentRevokedAt?.toISOString() ?? null,
      filmConsentVersionId: rights.filmConsentVersionId ?? currentVersionId ?? null,
      filmRoyaltyRate: rights.filmRoyaltyRate,
      capturedAt: new Date().toISOString(),
    };
  }

  private isApprovedDesignStatus(status: string) {
    return status === "APPROVED" || status === "APPROVED_LOCAL" || status === "APPROVED_GLOBAL" || status === "PUBLISHED";
  }

  private objectJson(value: Prisma.JsonValue | null): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private numberFrom(value: unknown, fallback: number) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
  }

  private optionalNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  }

  private round(value: number, decimals: number) {
    const scale = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * scale) / scale;
  }

  private cleanJson<T>(value: T): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
  }
}
