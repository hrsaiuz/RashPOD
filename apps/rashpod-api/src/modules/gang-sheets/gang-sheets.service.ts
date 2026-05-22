import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AssetLifecycleStatus,
  AssetPurpose,
  FilmOrderKind,
  FilmType,
  GangSheetItemSourceType,
  GangSheetItemValidationStatus,
  GangSheetOwnerType,
  GangSheetPricingMode,
  GangSheetSource,
  GangSheetStatus,
  ListingStatus,
  Prisma,
  UserRole,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { RequestUser } from "../../common/auth/current-user.decorator";
import { autoArrangeGangSheet, rectanglesOverlap, roundCm } from "./gang-sheet-packing";

type JsonRecord = Record<string, unknown>;

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
};

const ADMIN_ROLES = new Set<string>([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATIONS_MANAGER]);
const PRODUCTION_ROLES = new Set<string>([UserRole.PRODUCTION_STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATIONS_MANAGER]);
const GANG_SHEET_SOURCE_PURPOSES: AssetPurpose[] = [AssetPurpose.FILM_SOURCE, AssetPurpose.GANG_SHEET_SOURCE, AssetPurpose.DESIGN_NORMALIZED, AssetPurpose.DESIGN_ORIGINAL];
const EDITABLE_STATUSES: GangSheetStatus[] = [GangSheetStatus.DRAFT, GangSheetStatus.VALIDATING, GangSheetStatus.READY_FOR_CHECKOUT];

@Injectable()
export class GangSheetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listSheetPresets(filters: { filmType?: string; includeDisabled?: boolean } = {}) {
    return this.prisma.filmSheetPreset.findMany({
      where: {
        ...(filters.filmType ? { filmType: filters.filmType as FilmType } : {}),
        ...(filters.includeDisabled ? {} : { enabled: true }),
      },
      orderBy: [{ filmType: "asc" }, { widthCm: "asc" }, { heightCm: "asc" }],
    });
  }

  async createSheetPreset(actorId: string, input: JsonRecord) {
    const filmType = this.enumValue(FilmType, input.filmType, "Film type") ?? FilmType.DTF;
    await this.assertFilmTypeEnabled(filmType);
    const widthCm = this.requiredPositive(input.widthCm, "Width");
    const heightCm = this.requiredPositive(input.heightCm, "Height");
    const marginCm = this.positiveOrZero(input.marginCm, 0);
    const printableWidthCm = this.positiveOrZero(input.printableWidthCm, widthCm - marginCm * 2);
    const printableHeightCm = this.positiveOrZero(input.printableHeightCm, heightCm - marginCm * 2);
    if (printableWidthCm <= 0 || printableWidthCm > widthCm) throw new BadRequestException("Printable width is invalid");
    if (printableHeightCm <= 0 || printableHeightCm > heightCm) throw new BadRequestException("Printable height is invalid");
    const preset = await this.prisma.filmSheetPreset.create({
      data: {
        filmType,
        name: this.requiredString(input.name, "Name"),
        widthCm,
        heightCm,
        rollWidthCm: this.optionalNumber(input.rollWidthCm),
        maxLengthCm: this.optionalNumber(input.maxLengthCm),
        printableWidthCm,
        printableHeightCm,
        marginCm,
        gapCm: this.positiveOrZero(input.gapCm, 0),
        bleedCm: this.optionalNumber(input.bleedCm),
        minimumDpi: this.optionalInteger(input.minimumDpi),
        enabled: this.booleanValue(input.enabled, true),
        pricingMode: this.enumValue(GangSheetPricingMode, input.pricingMode, "Pricing mode") ?? GangSheetPricingMode.AREA_BASED,
        pricingConfigJson: this.json(input.pricingConfigJson ?? input.pricingConfig ?? null),
        productionNotes: this.optionalString(input.productionNotes),
        metadataJson: this.json(input.metadataJson ?? null),
        createdById: actorId,
        updatedById: actorId,
      },
    });
    await this.audit.log({ actorId, action: "gang_sheet.preset.created", entityType: "FilmSheetPreset", entityId: preset.id, metadata: { filmType, widthCm, heightCm } });
    return preset;
  }

  async updateSheetPreset(actorId: string, id: string, input: JsonRecord) {
    await this.ensureSheetPreset(id, true);
    const data: Prisma.FilmSheetPresetUpdateInput = { updatedBy: { connect: { id: actorId } } };
    if (input.name !== undefined) data.name = this.requiredString(input.name, "Name");
    if (input.widthCm !== undefined) data.widthCm = this.requiredPositive(input.widthCm, "Width");
    if (input.heightCm !== undefined) data.heightCm = this.requiredPositive(input.heightCm, "Height");
    if (input.printableWidthCm !== undefined) data.printableWidthCm = this.requiredPositive(input.printableWidthCm, "Printable width");
    if (input.printableHeightCm !== undefined) data.printableHeightCm = this.requiredPositive(input.printableHeightCm, "Printable height");
    if (input.marginCm !== undefined) data.marginCm = this.positiveOrZero(input.marginCm, 0);
    if (input.gapCm !== undefined) data.gapCm = this.positiveOrZero(input.gapCm, 0);
    if (input.bleedCm !== undefined) data.bleedCm = this.optionalNumber(input.bleedCm);
    if (input.minimumDpi !== undefined) data.minimumDpi = this.optionalInteger(input.minimumDpi);
    if (input.pricingMode !== undefined) data.pricingMode = this.enumValue(GangSheetPricingMode, input.pricingMode, "Pricing mode")!;
    if (input.pricingConfigJson !== undefined || input.pricingConfig !== undefined) data.pricingConfigJson = this.json(input.pricingConfigJson ?? input.pricingConfig ?? null);
    if (input.productionNotes !== undefined) data.productionNotes = this.optionalString(input.productionNotes);
    if (input.metadataJson !== undefined) data.metadataJson = this.json(input.metadataJson);
    const updated = await this.prisma.filmSheetPreset.update({ where: { id }, data });
    await this.audit.log({ actorId, action: "gang_sheet.preset.updated", entityType: "FilmSheetPreset", entityId: id, metadata: { changed: Object.keys(input) } });
    return updated;
  }

  async setSheetPresetEnabled(actorId: string, id: string, enabled: boolean) {
    const updated = await this.prisma.filmSheetPreset.update({ where: { id }, data: { enabled, updatedById: actorId } });
    await this.audit.log({ actorId, action: enabled ? "gang_sheet.preset.enabled" : "gang_sheet.preset.disabled", entityType: "FilmSheetPreset", entityId: id, metadata: { enabled } });
    return updated;
  }

  async createGangSheet(user: RequestUser, input: JsonRecord) {
    const filmType = this.enumValue(FilmType, input.filmType, "Film type") ?? FilmType.DTF;
    await this.assertFilmTypeEnabled(filmType);
    const preset = input.sheetPresetId ? await this.ensureSheetPreset(this.requiredString(input.sheetPresetId, "Sheet preset"), false) : null;
    if (preset && preset.filmType !== filmType) throw new BadRequestException("Sheet preset film type does not match gang sheet film type");
    const ownerType = this.ownerTypeFor(user, input.ownerType);
    const ownerId = ownerType === GangSheetOwnerType.SYSTEM ? null : this.optionalString(input.ownerId) ?? user.sub;
    if (!this.isAdmin(user) && ownerId !== user.sub) throw new ForbiddenException("You can only create your own gang sheets");
    const widthCm = this.numberFrom(input.widthCm) ?? preset?.widthCm ?? 30;
    const heightCm = this.numberFrom(input.heightCm) ?? preset?.heightCm ?? 40;
    const sheet = await this.prisma.gangSheet.create({
      data: {
        ownerType,
        ownerId,
        filmType,
        sheetPresetId: preset?.id,
        sheetPresetSnapshotJson: this.json(preset ? this.presetSnapshot(preset) : null),
        widthCm,
        heightCm,
        dpi: this.optionalInteger(input.dpi) ?? preset?.minimumDpi ?? 300,
        source: this.enumValue(GangSheetSource, input.source, "Source") ?? this.defaultSourceFor(ownerType),
        internalBatch: this.booleanValue(input.internalBatch, false),
        createdById: user.sub,
        updatedById: user.sub,
      },
      include: this.gangSheetInclude(),
    });
    await this.audit.log({ actorId: user.sub, action: "gang_sheet.created", entityType: "GangSheet", entityId: sheet.id, metadata: { filmType, ownerType, source: sheet.source } });
    return sheet;
  }

  listOwn(user: RequestUser) {
    if (this.isAdmin(user)) return this.listAdmin({});
    return this.prisma.gangSheet.findMany({ where: { ownerId: user.sub, archivedAt: null }, include: this.gangSheetInclude(), orderBy: { updatedAt: "desc" }, take: 100 });
  }

  listAdmin(filters: { status?: string; filmType?: string; source?: string }) {
    return this.prisma.gangSheet.findMany({
      where: {
        ...(filters.status ? { status: filters.status as GangSheetStatus } : {}),
        ...(filters.filmType ? { filmType: filters.filmType as FilmType } : {}),
        ...(filters.source ? { source: filters.source as GangSheetSource } : {}),
      },
      include: this.gangSheetInclude(),
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
  }

  async getGangSheet(user: RequestUser, id: string, productionAccess = false) {
    const sheet = await this.prisma.gangSheet.findUnique({ where: { id }, include: this.gangSheetInclude() });
    if (!sheet) throw new NotFoundException("Gang sheet not found");
    if (!this.canAccess(user, sheet, productionAccess)) throw new ForbiddenException("Not your gang sheet");
    return sheet;
  }

  async updateGangSheet(user: RequestUser, id: string, input: JsonRecord) {
    const sheet = await this.getGangSheet(user, id);
    this.assertDraftEditable(sheet);
    const data: Prisma.GangSheetUpdateInput = { updatedBy: { connect: { id: user.sub } } };
    if (input.sheetPresetId !== undefined) {
      const preset = input.sheetPresetId ? await this.ensureSheetPreset(String(input.sheetPresetId), false) : null;
      if (preset && preset.filmType !== sheet.filmType) throw new BadRequestException("Sheet preset film type does not match gang sheet film type");
      data.sheetPreset = preset ? { connect: { id: preset.id } } : { disconnect: true };
      data.sheetPresetSnapshotJson = this.json(preset ? this.presetSnapshot(preset) : null);
      if (preset) {
        data.widthCm = preset.widthCm;
        data.heightCm = preset.heightCm;
        data.dpi = preset.minimumDpi ?? sheet.dpi;
      }
    }
    if (input.widthCm !== undefined) data.widthCm = this.requiredPositive(input.widthCm, "Width");
    if (input.heightCm !== undefined) data.heightCm = this.requiredPositive(input.heightCm, "Height");
    if (input.dpi !== undefined) data.dpi = this.optionalInteger(input.dpi) ?? 300;
    const updated = await this.prisma.gangSheet.update({ where: { id }, data, include: this.gangSheetInclude() });
    await this.audit.log({ actorId: user.sub, action: "gang_sheet.updated", entityType: "GangSheet", entityId: id, metadata: { changed: Object.keys(input) } });
    return updated;
  }

  async addItem(user: RequestUser, sheetId: string, input: JsonRecord) {
    const sheet = await this.getGangSheet(user, sheetId);
    this.assertDraftEditable(sheet);
    const prepared = await this.prepareItem(user, sheet, input);
    const item = await this.prisma.gangSheetItem.create({ data: prepared as any });
    await this.audit.log({ actorId: user.sub, action: "gang_sheet.item.added", entityType: "GangSheetItem", entityId: item.id, metadata: { gangSheetId: sheetId, sourceType: item.sourceType, designId: item.designId, sourceAssetId: item.sourceAssetId } });
    return this.validateGangSheet(user, sheetId, { silent: true });
  }

  async updateItem(user: RequestUser, sheetId: string, itemId: string, input: JsonRecord) {
    const sheet = await this.getGangSheet(user, sheetId);
    this.assertDraftEditable(sheet);
    const existing = sheet.items.find((item) => item.id === itemId);
    if (!existing) throw new NotFoundException("Gang sheet item not found");
    const data: Prisma.GangSheetItemUpdateInput = {};
    if (input.xCm !== undefined) data.xCm = this.positiveOrZero(input.xCm, 0);
    if (input.yCm !== undefined) data.yCm = this.positiveOrZero(input.yCm, 0);
    if (input.widthCm !== undefined) data.widthCm = this.requiredPositive(input.widthCm, "Width");
    if (input.heightCm !== undefined) data.heightCm = this.requiredPositive(input.heightCm, "Height");
    if (input.rotation !== undefined) data.rotation = this.numberFrom(input.rotation) ?? 0;
    if (input.zIndex !== undefined) data.zIndex = this.optionalInteger(input.zIndex) ?? existing.zIndex;
    if (input.quantity !== undefined) data.quantity = Math.max(1, this.optionalInteger(input.quantity) ?? 1);
    if (input.locked !== undefined) data.locked = this.booleanValue(input.locked, existing.locked);
    if (input.mirrored !== undefined) data.mirrored = this.booleanValue(input.mirrored, existing.mirrored);
    if (input.cutLineEnabled !== undefined) data.cutLineEnabled = this.booleanValue(input.cutLineEnabled, existing.cutLineEnabled);
    const item = await this.prisma.gangSheetItem.update({ where: { id: itemId }, data });
    await this.audit.log({ actorId: user.sub, action: "gang_sheet.item.updated", entityType: "GangSheetItem", entityId: itemId, metadata: { gangSheetId: sheetId, changed: Object.keys(input) } });
    return item;
  }

  async duplicateItem(user: RequestUser, sheetId: string, itemId: string) {
    const sheet = await this.getGangSheet(user, sheetId);
    this.assertDraftEditable(sheet);
    const source = sheet.items.find((item) => item.id === itemId);
    if (!source) throw new NotFoundException("Gang sheet item not found");
    const item = await this.prisma.gangSheetItem.create({
      data: {
        gangSheetId: sheetId,
        sourceType: source.sourceType,
        sourceAssetId: source.sourceAssetId,
        designId: source.designId,
        designVersionId: source.designVersionId,
        designerId: source.designerId,
        orderItemId: source.orderItemId,
        sourceConsentSnapshotJson: source.sourceConsentSnapshotJson ?? undefined,
        sourceAssetSnapshotJson: source.sourceAssetSnapshotJson ?? undefined,
        xCm: roundCm(source.xCm + 1),
        yCm: roundCm(source.yCm + 1),
        widthCm: source.widthCm,
        heightCm: source.heightCm,
        rotation: source.rotation,
        zIndex: source.zIndex + 1,
        quantity: source.quantity,
        locked: false,
        mirrored: source.mirrored,
        cutLineEnabled: source.cutLineEnabled,
        itemPricingSnapshotJson: source.itemPricingSnapshotJson ?? undefined,
        royaltySnapshotJson: source.royaltySnapshotJson ?? undefined,
        validationStatus: GangSheetItemValidationStatus.PENDING,
        metadataJson: source.metadataJson ?? undefined,
      } as any,
    });
    await this.audit.log({ actorId: user.sub, action: "gang_sheet.item.added", entityType: "GangSheetItem", entityId: item.id, metadata: { gangSheetId: sheetId, duplicatedFrom: itemId } });
    return item;
  }

  async removeItem(user: RequestUser, sheetId: string, itemId: string) {
    const sheet = await this.getGangSheet(user, sheetId);
    this.assertDraftEditable(sheet);
    if (!sheet.items.some((item) => item.id === itemId)) throw new NotFoundException("Gang sheet item not found");
    await this.prisma.gangSheetItem.delete({ where: { id: itemId } });
    await this.audit.log({ actorId: user.sub, action: "gang_sheet.item.removed", entityType: "GangSheetItem", entityId: itemId, metadata: { gangSheetId: sheetId } });
    return { ok: true };
  }

  async autoArrange(user: RequestUser, sheetId: string, input: JsonRecord = {}) {
    const sheet = await this.getGangSheet(user, sheetId);
    this.assertDraftEditable(sheet);
    const preset = this.presetFromSheet(sheet);
    const result = autoArrangeGangSheet({
      widthCm: sheet.widthCm,
      heightCm: sheet.heightCm,
      marginCm: preset.marginCm,
      gapCm: preset.gapCm,
      allowRotate: this.booleanValue(input.allowRotate, true),
      items: sheet.items.map((item) => ({ id: item.id, widthCm: item.widthCm, heightCm: item.heightCm, quantity: item.quantity, locked: item.locked, xCm: item.xCm, yCm: item.yCm, rotation: item.rotation })),
    });
    for (const placed of result.placed) {
      if (placed.copyIndex !== 0) continue;
      await this.prisma.gangSheetItem.update({ where: { id: placed.id }, data: { xCm: placed.xCm, yCm: placed.yCm, rotation: placed.rotation } });
    }
    await this.prisma.gangSheet.update({ where: { id: sheetId }, data: { layoutMetricsJson: this.json(result), updatedById: user.sub } });
    await this.audit.log({ actorId: user.sub, action: "gang_sheet.auto_arranged", entityType: "GangSheet", entityId: sheetId, metadata: { unplaced: result.unplaced.length, utilizationPercent: result.utilizationPercent } });
    return this.validateGangSheet(user, sheetId, { silent: true });
  }

  async validateGangSheet(user: RequestUser, sheetId: string, input: JsonRecord = {}) {
    const sheet = await this.getGangSheet(user, sheetId, PRODUCTION_ROLES.has(user.role));
    const errors: string[] = [];
    const warnings: string[] = [];
    const preset = this.presetFromSheet(sheet);
    try {
      await this.assertFilmTypeEnabled(sheet.filmType);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "FILM_TYPE_DISABLED");
    }
    if (sheet.sheetPresetId && !preset.enabled) errors.push("SHEET_PRESET_DISABLED");
    if (!sheet.items.length) errors.push("ITEM_REQUIRED");
    const strictOverlap = this.booleanFrom(preset.strictOverlap, false);
    for (const item of sheet.items) {
      const itemErrors = this.itemValidationErrors(sheet, item, preset);
      const itemWarnings = this.itemValidationWarnings(item, preset);
      await this.prisma.gangSheetItem.update({ where: { id: item.id }, data: { validationStatus: itemErrors.length ? GangSheetItemValidationStatus.INVALID : itemWarnings.length ? GangSheetItemValidationStatus.WARNING : GangSheetItemValidationStatus.VALID, validationErrorsJson: this.json(itemErrors), validationWarningsJson: this.json(itemWarnings) } });
      errors.push(...itemErrors.map((error) => `ITEM_${item.id}_${error}`));
      warnings.push(...itemWarnings.map((warning) => `ITEM_${item.id}_${warning}`));
    }
    for (let leftIndex = 0; leftIndex < sheet.items.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < sheet.items.length; rightIndex += 1) {
        if (rectanglesOverlap(sheet.items[leftIndex], sheet.items[rightIndex])) {
          const code = `ITEMS_${sheet.items[leftIndex].id}_${sheet.items[rightIndex].id}_OVERLAP`;
          if (strictOverlap) errors.push(code);
          else warnings.push(code);
        }
      }
    }
    const quote = errors.length ? null : await this.quoteGangSheet(user, sheetId, { silent: true });
    const status = errors.length ? GangSheetStatus.DRAFT : GangSheetStatus.READY_FOR_CHECKOUT;
    const updated = await this.prisma.gangSheet.update({ where: { id: sheetId }, data: { status, validationErrorsJson: this.json(errors), validationWarningsJson: this.json(warnings), pricingSnapshotJson: quote ? this.json(quote.pricingSnapshot) : sheet.pricingSnapshotJson ?? undefined }, include: this.gangSheetInclude() });
    if (!input.silent) await this.audit.log({ actorId: user.sub, action: errors.length ? "gang_sheet.validation_failed" : "gang_sheet.validation_passed", entityType: "GangSheet", entityId: sheetId, metadata: { errors, warnings } });
    return updated;
  }

  async quoteGangSheet(user: RequestUser, sheetId: string, input: JsonRecord = {}) {
    const sheet = await this.getGangSheet(user, sheetId, PRODUCTION_ROLES.has(user.role));
    const settings = await this.getEnabledSettings(sheet.filmType);
    const filmConfig = this.pricingConfig(settings, sheet.filmType);
    const preset = this.presetFromSheet(sheet);
    const usedAreaCm2 = roundCm(sheet.items.reduce((sum, item) => sum + item.widthCm * item.heightCm * item.quantity, 0));
    const sheetAreaCm2 = roundCm(sheet.widthCm * sheet.heightCm);
    const wasteMarginPercent = this.numberFrom(preset.pricingConfig.wasteMarginPercent) ?? filmConfig.wasteMarginPercent;
    const billableAreaCm2 = roundCm(usedAreaCm2 * (1 + wasteMarginPercent / 100));
    const pricingMode = preset.pricingMode;
    const setupFee = this.numberFrom(preset.pricingConfig.setupFee) ?? filmConfig.setupFee;
    const minimumOrderPrice = Math.max(this.numberFrom(preset.pricingConfig.minimumOrderPrice) ?? 0, filmConfig.minimumOrderPrice, settings.minimumOrderPrice ? Number(settings.minimumOrderPrice) : 0);
    const pricePerCm2 = this.numberFrom(preset.pricingConfig.pricePerCm2) ?? filmConfig.pricePerCm2;
    const sheetPrice = pricingMode === GangSheetPricingMode.SHEET_BASED
      ? this.numberFrom(preset.pricingConfig.pricePerSheet) ?? roundCm(sheetAreaCm2 * pricePerCm2)
      : pricingMode === GangSheetPricingMode.LINEAR_METER_BASED
        ? roundCm((sheet.heightCm / 100) * (this.numberFrom(preset.pricingConfig.pricePerLinearMeter) ?? pricePerCm2 * sheet.widthCm * 100))
        : roundCm(billableAreaCm2 * pricePerCm2);
    const subtotalBeforeMinimum = roundCm(sheetPrice + setupFee);
    const minimumOrderAdjustment = Math.max(0, roundCm(minimumOrderPrice - subtotalBeforeMinimum));
    const subtotal = roundCm(subtotalBeforeMinimum + minimumOrderAdjustment);
    const taxRatePercent = settings.taxRatePercent ? Number(settings.taxRatePercent) : 0;
    const taxAmount = roundCm(subtotal * (taxRatePercent / 100));
    const total = roundCm(subtotal + taxAmount);
    const royaltySnapshots = this.royaltySnapshots(sheet.items, total, usedAreaCm2, settings);
    const pricingSnapshot = {
      settingsId: settings.id,
      settingsVersion: settings.settingsVersion,
      filmType: sheet.filmType,
      gangSheetId: sheet.id,
      sheetPresetId: sheet.sheetPresetId,
      sheetPresetSnapshot: sheet.sheetPresetSnapshotJson,
      pricingMode,
      widthCm: sheet.widthCm,
      heightCm: sheet.heightCm,
      usedAreaCm2,
      sheetAreaCm2,
      billableAreaCm2,
      wasteMarginPercent,
      pricePerCm2,
      sheetPrice,
      setupFee,
      minimumOrderPrice,
      minimumOrderAdjustment,
      subtotal,
      taxRatePercent,
      taxAmount,
      total,
      currency: settings.currency,
      royaltySnapshots,
      quotedAt: new Date().toISOString(),
    };
    if (!input.silent) await this.audit.log({ actorId: user.sub, action: "gang_sheet.quoted", entityType: "GangSheet", entityId: sheetId, metadata: { total, currency: settings.currency, usedAreaCm2 } });
    return { ...pricingSnapshot, pricingSnapshot };
  }

  async addToCart(user: RequestUser, sheetId: string) {
    const sheet = await this.validateGangSheet(user, sheetId, { silent: true });
    if (sheet.status !== GangSheetStatus.READY_FOR_CHECKOUT) throw new BadRequestException("Gang sheet is not ready for checkout");
    const quote = await this.quoteGangSheet(user, sheetId, { silent: true });
    const cart = await this.ensureCart(user.sub);
    const snapshot = this.checkoutSnapshot(sheet, quote.pricingSnapshot);
    const item = await this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        listingId: null,
        quantity: 1,
        unitPrice: new Prisma.Decimal(quote.total),
        currency: quote.currency,
        itemKind: FilmOrderKind.GANG_SHEET_FILM,
        filmType: sheet.filmType,
        filmWidthCm: sheet.widthCm,
        filmHeightCm: sheet.heightCm,
        filmAreaCm2: quote.usedAreaCm2,
        gangSheetId: sheet.id,
        gangSheetSnapshotJson: this.json(snapshot),
        filmPricingSnapshotJson: this.json(quote.pricingSnapshot),
        filmOptionsJson: this.json({ source: sheet.source, itemCount: sheet.items.length, preset: sheet.sheetPresetSnapshotJson }),
        metadataJson: this.json({ gangSheet: true, quote: quote.pricingSnapshot }),
      },
    });
    await this.audit.log({ actorId: user.sub, action: "gang_sheet.added_to_cart", entityType: "CartItem", entityId: item.id, metadata: { gangSheetId: sheet.id, total: quote.total, filmType: sheet.filmType } });
    return { item, quote, gangSheet: sheet };
  }

  async requestPreview(user: RequestUser, sheetId: string) {
    const sheet = await this.getGangSheet(user, sheetId, PRODUCTION_ROLES.has(user.role));
    await this.audit.log({ actorId: user.sub, action: "gang_sheet.preview_generated", entityType: "GangSheet", entityId: sheetId, metadata: { pendingWorkerIntegration: true, itemCount: sheet.items.length } });
    return { accepted: true, gangSheetId: sheetId, previewAssetId: sheet.previewAssetId, note: "Preview rendering is queued through the worker integration path." };
  }

  async batchFromProductionItems(user: RequestUser, input: JsonRecord) {
    if (!this.isAdmin(user)) throw new ForbiddenException("Admin access required");
    const orderItemIds = Array.isArray(input.orderItemIds) ? input.orderItemIds.map(String) : [];
    if (!orderItemIds.length) throw new BadRequestException("At least one order item is required");
    const orderItems = await this.prisma.orderItem.findMany({ where: { id: { in: orderItemIds }, itemKind: { in: [FilmOrderKind.DESIGN_FILM, FilmOrderKind.CUSTOM_FILM, FilmOrderKind.GANG_SHEET_FILM] } }, include: { order: true } });
    if (orderItems.length !== orderItemIds.length) throw new BadRequestException("Some order items are not eligible film items");
    const filmType = orderItems[0].filmType;
    if (!filmType || orderItems.some((item) => item.filmType !== filmType)) throw new BadRequestException("Production batch requires one film type");
    const sheet = await this.createGangSheet(user, { filmType, sheetPresetId: input.sheetPresetId, ownerType: GangSheetOwnerType.ADMIN, source: GangSheetSource.ADMIN_BATCH, internalBatch: true });
    for (const [index, orderItem] of orderItems.entries()) {
      await this.prisma.gangSheetItem.create({
        data: {
          gangSheetId: sheet.id,
          sourceType: GangSheetItemSourceType.ORDER_ITEM,
          orderItemId: orderItem.id,
          sourceAssetId: orderItem.filmSourceAssetId,
          designId: orderItem.designAssetId,
          designVersionId: orderItem.designVersionId,
          designerId: orderItem.designerId,
          sourceConsentSnapshotJson: orderItem.filmConsentSnapshotJson ?? undefined,
          sourceAssetSnapshotJson: this.json({ orderId: orderItem.orderId, orderItemId: orderItem.id, productionFileAssetId: orderItem.productionFileAssetId }),
          xCm: 0,
          yCm: 0,
          widthCm: orderItem.filmWidthCm ?? 5,
          heightCm: orderItem.filmHeightCm ?? 5,
          zIndex: index,
          quantity: orderItem.quantity,
          itemPricingSnapshotJson: orderItem.pricingSnapshotJson ?? orderItem.filmPricingSnapshotJson ?? undefined,
          royaltySnapshotJson: orderItem.royaltySnapshotJson ?? undefined,
        } as any,
      });
    }
    await this.audit.log({ actorId: user.sub, action: "gang_sheet.batched_from_orders", entityType: "GangSheet", entityId: sheet.id, metadata: { orderItemIds, filmType } });
    return this.autoArrange(user, sheet.id, { allowRotate: true });
  }

  private async prepareItem(user: RequestUser, sheet: any, input: JsonRecord) {
    const sourceType = this.enumValue(GangSheetItemSourceType, input.sourceType, "Source type") ?? GangSheetItemSourceType.CUSTOM_UPLOAD;
    const base = {
      gangSheetId: sheet.id,
      sourceType,
      xCm: this.positiveOrZero(input.xCm, 0),
      yCm: this.positiveOrZero(input.yCm, 0),
      widthCm: this.requiredPositive(input.widthCm, "Item width"),
      heightCm: this.requiredPositive(input.heightCm, "Item height"),
      rotation: this.numberFrom(input.rotation) ?? 0,
      zIndex: this.optionalInteger(input.zIndex) ?? sheet.items.length,
      quantity: Math.max(1, this.optionalInteger(input.quantity) ?? 1),
      locked: this.booleanValue(input.locked, false),
      mirrored: this.booleanValue(input.mirrored, false),
      cutLineEnabled: this.booleanValue(input.cutLineEnabled, false),
      metadataJson: this.json(input.metadataJson ?? null),
    };
    if (sourceType === GangSheetItemSourceType.CUSTOM_UPLOAD || sourceType === GangSheetItemSourceType.ASSET) {
      const sourceAssetId = this.requiredString(input.sourceAssetId, "Source asset");
      const asset = await this.prisma.fileAsset.findUnique({ where: { id: sourceAssetId } });
      if (!asset) throw new NotFoundException("Source asset not found");
      if (!this.isAdmin(user) && asset.ownerId !== user.sub) throw new ForbiddenException("Not your source asset");
      if (!GANG_SHEET_SOURCE_PURPOSES.includes(asset.purpose)) throw new BadRequestException("Asset purpose is not valid for gang sheets");
      if (asset.status !== AssetLifecycleStatus.READY || asset.uploadStatus !== "READY") throw new BadRequestException("Source asset is not ready");
      return { ...base, sourceAssetId, sourceAssetSnapshotJson: this.json(this.assetSnapshot(asset)), validationStatus: GangSheetItemValidationStatus.PENDING };
    }
    if (sourceType === GangSheetItemSourceType.DESIGN || sourceType === GangSheetItemSourceType.DESIGN_VERSION) {
      const designId = this.requiredString(input.designId, "Design");
      const design = await this.prisma.designAsset.findUnique({ where: { id: designId }, include: { versions: { orderBy: { createdAt: "desc" }, take: 1 }, commercialRights: true } });
      if (!design) throw new NotFoundException("Design not found");
      if (!this.isAdmin(user) && design.designerId !== user.sub && sheet.ownerId !== user.sub) throw new ForbiddenException("Design is not available to this gang sheet");
      if (!this.isApprovedDesignStatus(design.status)) throw new BadRequestException("Design is not approved for film sales");
      if (!design.commercialRights?.allowFilmSales || design.commercialRights.filmConsentRevokedAt) throw new BadRequestException("Film-sale consent is not active");
      const version = input.designVersionId ? design.versions.find((candidate) => candidate.id === input.designVersionId) : design.versions[0];
      if (!version) throw new BadRequestException("Design has no source version");
      return { ...base, designId: design.id, designVersionId: version.id, designerId: design.designerId, sourceConsentSnapshotJson: this.json(this.consentSnapshot(design.commercialRights, version.id)), sourceAssetSnapshotJson: this.json({ designId: design.id, designVersionId: version.id, widthPx: version.widthPx, heightPx: version.heightPx, dpi: version.dpi, hasTransparency: version.hasTransparency, fileKey: version.fileKey }), validationStatus: GangSheetItemValidationStatus.PENDING };
    }
    throw new BadRequestException("Unsupported gang sheet item source type");
  }

  private itemValidationErrors(sheet: any, item: any, preset: any) {
    const errors: string[] = [];
    const margin = preset.marginCm;
    const maxX = sheet.widthCm - margin;
    const maxY = sheet.heightCm - margin;
    if (item.widthCm <= 0 || item.heightCm <= 0) errors.push("SIZE_INVALID");
    if (item.xCm < margin || item.yCm < margin || item.xCm + item.widthCm > maxX || item.yCm + item.heightCm > maxY) errors.push("OUT_OF_BOUNDS");
    if (item.sourceType === GangSheetItemSourceType.DESIGN || item.sourceType === GangSheetItemSourceType.DESIGN_VERSION) {
      const consent = this.objectJson(item.sourceConsentSnapshotJson);
      if (!consent.allowFilmSales || consent.filmConsentRevokedAt) errors.push("CONSENT_INVALID");
    }
    return errors;
  }

  private itemValidationWarnings(item: any, preset: any) {
    const warnings: string[] = [];
    const asset = this.objectJson(item.sourceAssetSnapshotJson);
    const minDpi = preset.minimumDpi;
    const dpi = this.numberFrom(asset.dpi);
    if (minDpi && dpi && dpi < minDpi) warnings.push("LOW_DPI");
    if (!asset.hasTransparency && (item.sourceType === GangSheetItemSourceType.DESIGN || item.sourceType === GangSheetItemSourceType.DESIGN_VERSION)) warnings.push("TRANSPARENCY_REVIEW");
    return warnings;
  }

  private royaltySnapshots(items: any[], total: number, usedAreaCm2: number, settings: any) {
    return items.filter((item) => item.designerId).map((item) => {
      const areaShare = usedAreaCm2 > 0 ? (item.widthCm * item.heightCm * item.quantity) / usedAreaCm2 : 0;
      const consent = this.objectJson(item.sourceConsentSnapshotJson);
      const rate = this.numberFrom(consent.filmRoyaltyRate) ?? Number(settings.defaultRoyaltyValue ?? 0);
      const normalizedRate = rate > 1 ? rate / 100 : rate;
      const allocatedRevenue = roundCm(total * areaShare);
      const amount = roundCm(allocatedRevenue * normalizedRate);
      return { itemId: item.id, designerId: item.designerId, designId: item.designId, designVersionId: item.designVersionId, areaShare, allocatedRevenue, basis: settings.defaultRoyaltyBasis, rate, amount, currency: settings.currency };
    });
  }

  private checkoutSnapshot(sheet: any, pricingSnapshot: JsonRecord) {
    return { id: sheet.id, filmType: sheet.filmType, sheetPresetId: sheet.sheetPresetId, sheetPresetSnapshot: sheet.sheetPresetSnapshotJson, widthCm: sheet.widthCm, heightCm: sheet.heightCm, dpi: sheet.dpi, source: sheet.source, pricingSnapshot, previewAssetId: sheet.previewAssetId, productionFileAssetId: sheet.productionFileAssetId, items: sheet.items.map((item: any) => ({ id: item.id, sourceType: item.sourceType, sourceAssetId: item.sourceAssetId, designId: item.designId, designVersionId: item.designVersionId, designerId: item.designerId, orderItemId: item.orderItemId, sourceConsentSnapshot: item.sourceConsentSnapshotJson, sourceAssetSnapshot: item.sourceAssetSnapshotJson, xCm: item.xCm, yCm: item.yCm, widthCm: item.widthCm, heightCm: item.heightCm, rotation: item.rotation, zIndex: item.zIndex, quantity: item.quantity, mirrored: item.mirrored, cutLineEnabled: item.cutLineEnabled, royaltySnapshot: item.royaltySnapshotJson })) };
  }

  private presetFromSheet(sheet: any) {
    const snapshot = this.objectJson(sheet.sheetPresetSnapshotJson);
    return { enabled: snapshot.enabled !== false, marginCm: this.numberFrom(snapshot.marginCm) ?? 0, gapCm: this.numberFrom(snapshot.gapCm) ?? 0, minimumDpi: this.optionalInteger(snapshot.minimumDpi), pricingMode: (snapshot.pricingMode as GangSheetPricingMode) ?? GangSheetPricingMode.AREA_BASED, pricingConfig: this.objectJson(snapshot.pricingConfigJson ?? snapshot.pricingConfig), strictOverlap: this.objectJson(snapshot.productionRulesJson).strictOverlap };
  }

  private async getEnabledSettings(filmType: FilmType) {
    const settings = await this.prisma.filmSaleSettings.findFirst({ orderBy: { updatedAt: "desc" } });
    if (!settings?.enableFilmSalesGlobally) throw new ForbiddenException("Film sales are currently disabled");
    if (filmType === FilmType.DTF && !settings.enableDTF) throw new ForbiddenException("DTF film sales are disabled");
    if (filmType === FilmType.UV_DTF && !settings.enableUvDtf) throw new ForbiddenException("UV-DTF film sales are disabled");
    return settings;
  }

  private async assertFilmTypeEnabled(filmType: FilmType) {
    await this.getEnabledSettings(filmType);
  }

  private pricingConfig(settings: Awaited<ReturnType<GangSheetsService["getEnabledSettings"]>>, filmType: FilmType): FilmPricingConfig {
    const raw = this.objectJson(filmType === FilmType.DTF ? settings.dtfPricingJson : settings.uvDtfPricingJson);
    return { pricePerCm2: this.numberFrom(raw.pricePerCm2) ?? (filmType === FilmType.DTF ? 45 : 55), setupFee: this.numberFrom(raw.setupFee) ?? (settings.rushOrderFee ? Number(settings.rushOrderFee) : 0), minimumOrderPrice: this.numberFrom(raw.minimumOrderPrice) ?? (settings.minimumOrderPrice ? Number(settings.minimumOrderPrice) : 0), wasteMarginPercent: this.numberFrom(raw.wasteMarginPercent) ?? 8, minWidthCm: this.numberFrom(raw.minWidthCm) ?? 2, minHeightCm: this.numberFrom(raw.minHeightCm) ?? 2, maxWidthCm: this.numberFrom(raw.maxWidthCm) ?? 60, maxHeightCm: this.numberFrom(raw.maxHeightCm) ?? 500, minDpi: this.optionalInteger(raw.minDpi) };
  }

  private async ensureSheetPreset(id: string, includeDisabled: boolean) {
    const preset = await this.prisma.filmSheetPreset.findUnique({ where: { id } });
    if (!preset) throw new NotFoundException("Sheet preset not found");
    if (!includeDisabled && !preset.enabled) throw new BadRequestException("Sheet preset is disabled");
    return preset;
  }

  private ensureCart(customerId: string) {
    return this.prisma.cart.upsert({ where: { customerId }, update: {}, create: { customerId } });
  }

  private gangSheetInclude() {
    return { sheetPreset: true, items: { orderBy: { zIndex: "asc" as const } } };
  }

  private canAccess(user: RequestUser, sheet: { ownerId: string | null }, productionAccess = false) {
    return this.isAdmin(user) || (productionAccess && PRODUCTION_ROLES.has(user.role)) || sheet.ownerId === user.sub;
  }

  private isAdmin(user: RequestUser) {
    return ADMIN_ROLES.has(user.role);
  }

  private assertDraftEditable(sheet: { status: GangSheetStatus }) {
    if (!EDITABLE_STATUSES.includes(sheet.status)) throw new BadRequestException("Gang sheet can no longer be edited");
  }

  private ownerTypeFor(user: RequestUser, raw: unknown) {
    const requested = this.enumValue(GangSheetOwnerType, raw, "Owner type");
    if (requested && requested !== GangSheetOwnerType.CUSTOMER && !this.isAdmin(user) && user.role !== UserRole.DESIGNER) throw new ForbiddenException("Owner type is not allowed");
    if (requested) return requested;
    if (user.role === UserRole.DESIGNER) return GangSheetOwnerType.DESIGNER;
    if (this.isAdmin(user)) return GangSheetOwnerType.ADMIN;
    return GangSheetOwnerType.CUSTOMER;
  }

  private defaultSourceFor(ownerType: GangSheetOwnerType) {
    if (ownerType === GangSheetOwnerType.DESIGNER) return GangSheetSource.DESIGNER_DESIGNS;
    if (ownerType === GangSheetOwnerType.ADMIN) return GangSheetSource.ADMIN_BATCH;
    if (ownerType === GangSheetOwnerType.SYSTEM) return GangSheetSource.SYSTEM_OPTIMIZATION;
    return GangSheetSource.CUSTOMER_BUILDER;
  }

  private presetSnapshot(preset: any) {
    return { id: preset.id, filmType: preset.filmType, name: preset.name, widthCm: preset.widthCm, heightCm: preset.heightCm, rollWidthCm: preset.rollWidthCm, maxLengthCm: preset.maxLengthCm, printableWidthCm: preset.printableWidthCm, printableHeightCm: preset.printableHeightCm, marginCm: preset.marginCm, gapCm: preset.gapCm, bleedCm: preset.bleedCm, minimumDpi: preset.minimumDpi, enabled: preset.enabled, pricingMode: preset.pricingMode, pricingConfigJson: preset.pricingConfigJson, productionNotes: preset.productionNotes, capturedAt: new Date().toISOString() };
  }

  private assetSnapshot(asset: any) {
    return { id: asset.id, purpose: asset.purpose, mimeType: asset.mimeType, widthPx: asset.widthPx, heightPx: asset.heightPx, dpi: asset.dpi, checksum: asset.checksum, hashSha256: asset.hashSha256, objectKey: asset.objectKey, capturedAt: new Date().toISOString() };
  }

  private consentSnapshot(rights: any, currentVersionId?: string) {
    return { rightsId: rights.id, designAssetId: rights.designAssetId, allowFilmSales: rights.allowFilmSales, filmConsentGrantedAt: rights.filmConsentGrantedAt?.toISOString() ?? null, filmConsentRevokedAt: rights.filmConsentRevokedAt?.toISOString() ?? null, filmConsentVersionId: rights.filmConsentVersionId ?? currentVersionId ?? null, filmRoyaltyRate: rights.filmRoyaltyRate, capturedAt: new Date().toISOString() };
  }

  private isApprovedDesignStatus(status: string) {
    return status === "APPROVED" || status === "APPROVED_LOCAL" || status === "APPROVED_GLOBAL" || status === "PUBLISHED";
  }

  private objectJson(value: unknown): JsonRecord {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
  }

  private json(value: unknown) {
    if (value == null) return Prisma.JsonNull;
    return value as Prisma.InputJsonValue;
  }

  private enumValue<T extends Record<string, string>>(values: T, raw: unknown, label: string): T[keyof T] | undefined {
    if (raw == null || raw === "") return undefined;
    const value = String(raw);
    if (!Object.values(values).includes(value)) throw new BadRequestException(`${label} is invalid`);
    return value as T[keyof T];
  }

  private requiredString(value: unknown, label: string) {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) throw new BadRequestException(`${label} is required`);
    return text;
  }

  private optionalString(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  private numberFrom(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
    return undefined;
  }

  private requiredPositive(value: unknown, label: string) {
    const number = this.numberFrom(value);
    if (!number || number <= 0) throw new BadRequestException(`${label} must be greater than zero`);
    return number;
  }

  private positiveOrZero(value: unknown, fallback: number) {
    const number = this.numberFrom(value);
    if (number == null) return fallback;
    return Math.max(0, number);
  }

  private optionalInteger(value: unknown) {
    const number = this.numberFrom(value);
    return number == null ? undefined : Math.trunc(number);
  }

  private optionalNumber(value: unknown) {
    return this.numberFrom(value);
  }

  private booleanValue(value: unknown, fallback: boolean) {
    return typeof value === "boolean" ? value : fallback;
  }

  private booleanFrom(value: unknown, fallback: boolean) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() === "true";
    return fallback;
  }
}
