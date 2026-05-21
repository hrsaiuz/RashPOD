import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BaseProduct, PipelineType, PlacementAlignment, PlacementKind, PlacementUnits, Prisma, ProviderType } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateProductTypeDto } from "./dto/create-product-type.dto";
import { CreateRoyaltyRuleDto } from "./dto/create-royalty-rule.dto";
import { UpdateRoyaltyRuleDto } from "./dto/update-royalty-rule.dto";
import { CreateBaseProductDto } from "./dto/create-base-product.dto";
import { CreateMockupTemplateDto } from "./dto/create-mockup-template.dto";
import { CreatePrintAreaDto } from "./dto/create-print-area.dto";
import { UpsertFilmSaleSettingsDto } from "./dto/upsert-film-sale-settings.dto";
import { CreateDeliverySettingDto } from "./dto/create-delivery-setting.dto";
import { UpdateDeliverySettingDto } from "./dto/update-delivery-setting.dto";
import { UpdateProductTypeDto } from "./dto/update-product-type.dto";
import { UpdateBaseProductDto } from "./dto/update-base-product.dto";
import { UpdateMockupTemplateDto } from "./dto/update-mockup-template.dto";
import { UpdatePrintAreaDto } from "./dto/update-print-area.dto";
import { CreatePlacementPresetDto } from "./dto/create-placement-preset.dto";
import { UpdatePlacementPresetDto } from "./dto/update-placement-preset.dto";
import { CreatePrintfulProductTemplateDto } from "./dto/create-printful-product-template.dto";
import { UpdatePrintfulProductTemplateDto } from "./dto/update-printful-product-template.dto";
import { UpdatePrintfulSettingsDto } from "./dto/update-printful-settings.dto";
import { JobDispatcherService } from "../worker-jobs/job-dispatcher.service";

@Injectable()
export class AdminConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly jobs?: JobDispatcherService,
  ) {}

  listProductTypes() {
    return this.prisma.productType.findMany({ orderBy: { createdAt: "desc" } });
  }

  private jsonStringArray(value: Prisma.JsonValue | null | undefined): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === "string");
  }

  private serializeBaseProduct<T extends BaseProduct & { productType?: unknown }>(item: T) {
    return {
      ...item,
      availableColors: this.jsonStringArray(item.availableColors),
      availableSizes: this.jsonStringArray(item.availableSizes),
    };
  }

  private async assertProductTypeExists(productTypeId: string) {
    const exists = await this.prisma.productType.findUnique({ where: { id: productTypeId }, select: { id: true } });
    if (!exists) throw new BadRequestException("Product type not found for base product");
  }

  async createProductType(actorId: string, dto: CreateProductTypeDto) {
    const productType = await this.prisma.productType.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        category: dto.category,
        productionMethod: dto.productionMethod,
        supportsFilmSale: dto.supportsFilmSale ?? false,
        isActive: dto.isActive ?? true,
        availableForDesigners: dto.availableForDesigners ?? true,
        availableInShop: dto.availableInShop ?? true,
        availableForCorporate: dto.availableForCorporate ?? true,
        availableForMarketplace: dto.availableForMarketplace ?? false,
        requiresMockup: dto.requiresMockup ?? true,
        baseCost: dto.baseCost == null ? null : new Prisma.Decimal(dto.baseCost),
        defaultMargin: dto.defaultMargin == null ? null : new Prisma.Decimal(dto.defaultMargin),
      },
    });
    await this.audit.log({
      actorId,
      action: "product-type.create",
      entityType: "ProductType",
      entityId: productType.id,
      metadata: productType as unknown as Record<string, unknown>,
    });
    return productType;
  }

  async getProductType(id: string) {
    const item = await this.prisma.productType.findUnique({ where: { id } });
    if (!item) throw new NotFoundException("Product type not found");
    return item;
  }

  async updateProductType(actorId: string, id: string, dto: UpdateProductTypeDto) {
    const item = await this.prisma.productType.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        category: dto.category,
        productionMethod: dto.productionMethod,
        supportsFilmSale: dto.supportsFilmSale,
        isActive: dto.isActive,
        availableForDesigners: dto.availableForDesigners,
        availableInShop: dto.availableInShop,
        availableForCorporate: dto.availableForCorporate,
        availableForMarketplace: dto.availableForMarketplace,
        requiresMockup: dto.requiresMockup,
        baseCost: dto.baseCost == null ? undefined : new Prisma.Decimal(dto.baseCost),
        defaultMargin: dto.defaultMargin == null ? undefined : new Prisma.Decimal(dto.defaultMargin),
      },
    });
    await this.audit.log({ actorId, action: "product-type.update", entityType: "ProductType", entityId: item.id });
    return item;
  }

  async deleteProductType(actorId: string, id: string) {
    const baseProducts = await this.prisma.baseProduct.count({ where: { productTypeId: id } });
    if (baseProducts > 0) {
      throw new BadRequestException("Product type is used by base products and cannot be deleted");
    }
    const item = await this.prisma.productType.delete({ where: { id } });
    await this.audit.log({ actorId, action: "product-type.delete", entityType: "ProductType", entityId: item.id });
    return item;
  }

  listRoyaltyRules() {
    return this.prisma.royaltyRule.findMany({ orderBy: { effectiveAt: "desc" } });
  }

  async createRoyaltyRule(actorId: string, dto: CreateRoyaltyRuleDto) {
    const rule = await this.prisma.royaltyRule.create({
      data: {
        scope: dto.scope,
        basis: dto.basis,
        value: new Prisma.Decimal(dto.value),
        effectiveAt: new Date(dto.effectiveAt),
      },
    });
    await this.audit.log({
      actorId,
      action: "royalty-rule.create",
      entityType: "RoyaltyRule",
      entityId: rule.id,
    });
    return rule;
  }

  async updateRoyaltyRule(actorId: string, id: string, dto: UpdateRoyaltyRuleDto) {
    const rule = await this.prisma.royaltyRule.update({
      where: { id },
      data: {
        scope: dto.scope,
        basis: dto.basis,
        value: dto.value == null ? undefined : new Prisma.Decimal(dto.value),
        isActive: dto.isActive,
        effectiveAt: dto.effectiveAt ? new Date(dto.effectiveAt) : undefined,
      },
    });
    await this.audit.log({ actorId, action: "royalty-rule.update", entityType: "RoyaltyRule", entityId: rule.id });
    return rule;
  }

  async deleteRoyaltyRule(actorId: string, id: string) {
    const rule = await this.prisma.royaltyRule.delete({ where: { id } });
    await this.audit.log({ actorId, action: "royalty-rule.delete", entityType: "RoyaltyRule", entityId: rule.id });
    return rule;
  }

  async listBaseProducts() {
    const items = await this.prisma.baseProduct.findMany({
      orderBy: { createdAt: "desc" },
      include: { productType: { select: { id: true, name: true, slug: true, category: true } } },
    });
    return items.map((item) => this.serializeBaseProduct(item));
  }

  async createBaseProduct(actorId: string, dto: CreateBaseProductDto) {
    await this.assertProductTypeExists(dto.productTypeId);
    const item = await this.prisma.baseProduct.create({
      data: {
        productTypeId: dto.productTypeId,
        name: dto.name,
        skuPrefix: dto.skuPrefix,
        isActive: dto.isActive ?? true,
        imageUrl: dto.imageUrl,
        description: dto.description,
        availableColors: dto.availableColors ?? [],
        availableSizes: dto.availableSizes ?? [],
      },
    });
    await this.audit.log({ actorId, action: "base-product.create", entityType: "BaseProduct", entityId: item.id });
    return this.serializeBaseProduct(item);
  }

  async getBaseProduct(id: string) {
    const item = await this.prisma.baseProduct.findUnique({
      where: { id },
      include: {
        productType: true,
        mockupTemplates: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!item) throw new NotFoundException("Base product not found");
    return this.serializeBaseProduct(item);
  }

  async updateBaseProduct(actorId: string, id: string, dto: UpdateBaseProductDto) {
    if (dto.productTypeId) await this.assertProductTypeExists(dto.productTypeId);
    const item = await this.prisma.baseProduct.update({
      where: { id },
      data: {
        productTypeId: dto.productTypeId,
        name: dto.name,
        skuPrefix: dto.skuPrefix,
        isActive: dto.isActive,
        imageUrl: dto.imageUrl,
        description: dto.description,
        availableColors: dto.availableColors,
        availableSizes: dto.availableSizes,
      },
    });
    await this.audit.log({ actorId, action: "base-product.update", entityType: "BaseProduct", entityId: item.id });
    return this.serializeBaseProduct(item);
  }

  async deleteBaseProduct(actorId: string, id: string) {
    const item = await this.prisma.baseProduct.delete({ where: { id } });
    await this.audit.log({ actorId, action: "base-product.delete", entityType: "BaseProduct", entityId: item.id });
    return item;
  }

  listMockupTemplates() {
    return this.prisma.mockupTemplate.findMany({ orderBy: { createdAt: "desc" } });
  }

  async createMockupTemplate(actorId: string, dto: CreateMockupTemplateDto) {
    const item = await this.prisma.mockupTemplate.create({
      data: {
        baseProductId: dto.baseProductId,
        name: dto.name,
        baseImageKey: dto.baseImageKey,
        lifestyleImageKey: dto.lifestyleImageKey,
        closeupImageKey: dto.closeupImageKey,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.audit.log({ actorId, action: "mockup-template.create", entityType: "MockupTemplate", entityId: item.id });
    return item;
  }

  async getMockupTemplate(id: string) {
    const item = await this.prisma.mockupTemplate.findUnique({ where: { id } });
    if (!item) throw new NotFoundException("Mockup template not found");
    return item;
  }

  async updateMockupTemplate(actorId: string, id: string, dto: UpdateMockupTemplateDto) {
    const item = await this.prisma.mockupTemplate.update({
      where: { id },
      data: {
        baseProductId: dto.baseProductId,
        name: dto.name,
        baseImageKey: dto.baseImageKey,
        lifestyleImageKey: dto.lifestyleImageKey,
        closeupImageKey: dto.closeupImageKey,
        isActive: dto.isActive,
        sortOrder: dto.sortOrder,
      },
    });
    await this.audit.log({ actorId, action: "mockup-template.update", entityType: "MockupTemplate", entityId: item.id });
    return item;
  }

  async deleteMockupTemplate(actorId: string, id: string) {
    const item = await this.prisma.mockupTemplate.delete({ where: { id } });
    await this.audit.log({ actorId, action: "mockup-template.delete", entityType: "MockupTemplate", entityId: item.id });
    return item;
  }

  listPrintAreas() {
    return this.prisma.printArea.findMany({ orderBy: { createdAt: "desc" } });
  }

  async createPrintArea(actorId: string, dto: CreatePrintAreaDto) {
    const item = await this.prisma.printArea.create({
      data: {
        mockupTemplateId: dto.mockupTemplateId,
        name: dto.name,
        x: dto.x,
        y: dto.y,
        width: dto.width,
        height: dto.height,
        safeX: dto.safeX,
        safeY: dto.safeY,
        safeWidth: dto.safeWidth,
        safeHeight: dto.safeHeight,
        allowMove: dto.allowMove ?? true,
        allowResize: dto.allowResize ?? true,
        allowRotate: dto.allowRotate ?? false,
        minScale: dto.minScale ?? 0.1,
        maxScale: dto.maxScale ?? 2,
      },
    });
    await this.audit.log({ actorId, action: "print-area.create", entityType: "PrintArea", entityId: item.id });
    return item;
  }

  async getPrintArea(id: string) {
    const item = await this.prisma.printArea.findUnique({ where: { id } });
    if (!item) throw new NotFoundException("Print area not found");
    return item;
  }

  async updatePrintArea(actorId: string, id: string, dto: UpdatePrintAreaDto) {
    const item = await this.prisma.printArea.update({
      where: { id },
      data: {
        mockupTemplateId: dto.mockupTemplateId,
        name: dto.name,
        x: dto.x,
        y: dto.y,
        width: dto.width,
        height: dto.height,
        safeX: dto.safeX,
        safeY: dto.safeY,
        safeWidth: dto.safeWidth,
        safeHeight: dto.safeHeight,
        allowMove: dto.allowMove,
        allowResize: dto.allowResize,
        allowRotate: dto.allowRotate,
        minScale: dto.minScale,
        maxScale: dto.maxScale,
      },
    });
    await this.audit.log({ actorId, action: "print-area.update", entityType: "PrintArea", entityId: item.id });
    return item;
  }

  async deletePrintArea(actorId: string, id: string) {
    const item = await this.prisma.printArea.delete({ where: { id } });
    await this.audit.log({ actorId, action: "print-area.delete", entityType: "PrintArea", entityId: item.id });
    return item;
  }

  getFilmSaleSettings() {
    return this.prisma.filmSaleSettings.findFirst({ orderBy: { updatedAt: "desc" } });
  }

  async upsertFilmSaleSettings(actorId: string, dto: UpsertFilmSaleSettingsDto) {
    const existing = await this.prisma.filmSaleSettings.findFirst();
    const data = {
      enableFilmSalesGlobally: dto.enableFilmSalesGlobally,
      enableDTF: dto.enableDTF,
      enableUvDtf: dto.enableUvDtf,
      defaultRoyaltyBasis: dto.defaultRoyaltyBasis,
      value: new Prisma.Decimal(dto.defaultRoyaltyValue),
      minimumOrderPrice: dto.minimumOrderPrice == null ? null : new Prisma.Decimal(dto.minimumOrderPrice),
      rushOrderFee: dto.rushOrderFee == null ? null : new Prisma.Decimal(dto.rushOrderFee),
      revocationPolicy: dto.revocationPolicy,
    };
    const item = existing
      ? await this.prisma.filmSaleSettings.update({
          where: { id: existing.id },
          data: {
            enableFilmSalesGlobally: data.enableFilmSalesGlobally,
            enableDTF: data.enableDTF,
            enableUvDtf: data.enableUvDtf,
            defaultRoyaltyBasis: data.defaultRoyaltyBasis,
            defaultRoyaltyValue: data.value,
            minimumOrderPrice: data.minimumOrderPrice,
            rushOrderFee: data.rushOrderFee,
            revocationPolicy: data.revocationPolicy,
          },
        })
      : await this.prisma.filmSaleSettings.create({
          data: {
            enableFilmSalesGlobally: data.enableFilmSalesGlobally,
            enableDTF: data.enableDTF,
            enableUvDtf: data.enableUvDtf,
            defaultRoyaltyBasis: data.defaultRoyaltyBasis,
            defaultRoyaltyValue: data.value,
            minimumOrderPrice: data.minimumOrderPrice,
            rushOrderFee: data.rushOrderFee,
            revocationPolicy: data.revocationPolicy,
          },
        });
    await this.audit.log({ actorId, action: "film-settings.upsert", entityType: "FilmSaleSettings", entityId: item.id });
    return item;
  }

  listDeliverySettings() {
    return this.prisma.deliverySetting.findMany({ orderBy: { updatedAt: "desc" } });
  }

  async createDeliverySetting(actorId: string, dto: CreateDeliverySettingDto) {
    if (dto.price != null && dto.price < 0) throw new BadRequestException("price must be non-negative");
    if (dto.freeDeliveryThreshold != null && dto.freeDeliveryThreshold < 0) {
      throw new BadRequestException("freeDeliveryThreshold must be non-negative");
    }
    const item = await this.prisma.deliverySetting.create({
      data: {
        providerType: dto.providerType,
        displayName: dto.displayName,
        isActive: dto.isActive ?? true,
        zone: dto.zone,
        price: dto.price == null ? null : new Prisma.Decimal(dto.price),
        freeDeliveryThreshold: dto.freeDeliveryThreshold == null ? null : new Prisma.Decimal(dto.freeDeliveryThreshold),
        etaText: dto.etaText,
      },
    });
    await this.audit.log({ actorId, action: "delivery-setting.create", entityType: "DeliverySetting", entityId: item.id });
    return item;
  }

  async updateDeliverySetting(actorId: string, id: string, dto: UpdateDeliverySettingDto) {
    if (dto.price != null && dto.price < 0) throw new BadRequestException("price must be non-negative");
    if (dto.freeDeliveryThreshold != null && dto.freeDeliveryThreshold < 0) {
      throw new BadRequestException("freeDeliveryThreshold must be non-negative");
    }
    const item = await this.prisma.deliverySetting.update({
      where: { id },
      data: {
        providerType: dto.providerType,
        displayName: dto.displayName,
        isActive: dto.isActive,
        zone: dto.zone,
        price: dto.price == null ? undefined : new Prisma.Decimal(dto.price),
        freeDeliveryThreshold: dto.freeDeliveryThreshold == null ? undefined : new Prisma.Decimal(dto.freeDeliveryThreshold),
        etaText: dto.etaText,
      },
    });
    await this.audit.log({ actorId, action: "delivery-setting.update", entityType: "DeliverySetting", entityId: item.id });
    return item;
  }

  listPlacementPresets() {
    return this.prisma.placementPreset.findMany({
      orderBy: { createdAt: "desc" },
      include: { localBaseProduct: true, printfulProductTemplate: true },
    });
  }

  async createPlacementPreset(actorId: string, dto: CreatePlacementPresetDto) {
    this.assertPresetTarget(dto.pipeline, dto.localBaseProductId, dto.productTemplateId);
    const item = await this.prisma.placementPreset.create({
      data: {
        name: dto.name,
        pipeline: dto.pipeline as PipelineType,
        productTemplateId: dto.productTemplateId,
        localBaseProductId: dto.localBaseProductId,
        placement: this.normalizeEnum(dto.placement, PlacementKind, "placement") as PlacementKind,
        defaultWidthCm: dto.defaultWidthCm,
        defaultHeightCm: dto.defaultHeightCm,
        defaultWidthIn: dto.defaultWidthIn,
        defaultHeightIn: dto.defaultHeightIn,
        defaultX: dto.defaultX,
        defaultY: dto.defaultY,
        defaultScale: dto.defaultScale ?? 1,
        alignment: this.normalizeEnum(dto.alignment ?? "CENTER", PlacementAlignment, "alignment") as PlacementAlignment,
        units: this.normalizeEnum(dto.units ?? "CM", PlacementUnits, "units") as PlacementUnits,
        active: dto.active ?? true,
      },
    });
    await this.audit.log({ actorId, action: "placement-preset.create", entityType: "PlacementPreset", entityId: item.id });
    return item;
  }

  async updatePlacementPreset(actorId: string, id: string, dto: UpdatePlacementPresetDto) {
    const item = await this.prisma.placementPreset.update({
      where: { id },
      data: {
        name: dto.name,
        productTemplateId: dto.productTemplateId,
        localBaseProductId: dto.localBaseProductId,
        placement: dto.placement ? (this.normalizeEnum(dto.placement, PlacementKind, "placement") as PlacementKind) : undefined,
        defaultWidthCm: dto.defaultWidthCm,
        defaultHeightCm: dto.defaultHeightCm,
        defaultWidthIn: dto.defaultWidthIn,
        defaultHeightIn: dto.defaultHeightIn,
        defaultX: dto.defaultX,
        defaultY: dto.defaultY,
        defaultScale: dto.defaultScale,
        alignment: dto.alignment ? (this.normalizeEnum(dto.alignment, PlacementAlignment, "alignment") as PlacementAlignment) : undefined,
        units: dto.units ? (this.normalizeEnum(dto.units, PlacementUnits, "units") as PlacementUnits) : undefined,
        active: dto.active,
      },
    });
    await this.audit.log({ actorId, action: "placement-preset.update", entityType: "PlacementPreset", entityId: item.id });
    return item;
  }

  listPrintfulProductTemplates() {
    return this.prisma.printfulProductTemplate.findMany({ orderBy: { createdAt: "desc" } });
  }

  async createPrintfulProductTemplate(actorId: string, dto: CreatePrintfulProductTemplateDto) {
    const item = await this.prisma.printfulProductTemplate.create({ data: this.createPrintfulTemplateData(dto) });
    await this.audit.log({ actorId, action: "printful-template.create", entityType: "PrintfulProductTemplate", entityId: item.id });
    return item;
  }

  async updatePrintfulProductTemplate(actorId: string, id: string, dto: UpdatePrintfulProductTemplateDto) {
    const item = await this.prisma.printfulProductTemplate.update({ where: { id }, data: this.updatePrintfulTemplateData(dto) });
    await this.audit.log({ actorId, action: "printful-template.update", entityType: "PrintfulProductTemplate", entityId: item.id });
    return item;
  }

  async syncPrintfulCatalog(actorId: string) {
    if (!this.jobs) throw new BadRequestException("Worker job dispatcher is not configured");
    const job = await this.jobs.enqueue("SYNC_PRINTFUL_CATALOG", { requestedBy: actorId });
    await this.audit.log({ actorId, action: "printful-catalog.sync", entityType: "PrintfulProductTemplate", entityId: job.jobId });
    return job;
  }

  async getPrintfulSettings() {
    const setting = await this.prisma.platformSetting.findUnique({ where: { key: "integrations.printful" } });
    const value = this.objectValue(setting?.value);
    return {
      enabled: Boolean(value.enabled),
      defaultStoreId: value.defaultStoreId ?? process.env.PRINTFUL_STORE_ID ?? null,
      connectedMarketplaces: Array.isArray(value.connectedMarketplaces) ? value.connectedMarketplaces : [],
      autoPublishTrusted: Boolean(value.autoPublishTrusted),
      allowGlobalWithoutLocal: Boolean(value.allowGlobalWithoutLocal),
      tokenConfigured: Boolean(process.env.PRINTFUL_API_TOKEN),
      apiBaseUrl: process.env.PRINTFUL_API_BASE_URL || "https://api.printful.com",
    };
  }

  async updatePrintfulSettings(actorId: string, dto: UpdatePrintfulSettingsDto) {
    const value = {
      enabled: dto.enabled ?? false,
      defaultStoreId: dto.defaultStoreId,
      connectedMarketplaces: dto.connectedMarketplaces ?? [],
      autoPublishTrusted: dto.autoPublishTrusted ?? false,
      allowGlobalWithoutLocal: dto.allowGlobalWithoutLocal ?? false,
    };
    const item = await this.prisma.platformSetting.upsert({
      where: { key: "integrations.printful" },
      create: { key: "integrations.printful", value },
      update: { value },
    });
    await this.prisma.platformSetting.upsert({
      where: { key: "pipeline.allowGlobalWithoutLocal" },
      create: { key: "pipeline.allowGlobalWithoutLocal", value: value.allowGlobalWithoutLocal },
      update: { value: value.allowGlobalWithoutLocal },
    });
    await this.audit.log({ actorId, action: "printful-settings.update", entityType: "PlatformSetting", entityId: item.key });
    return this.getPrintfulSettings();
  }

  private assertPresetTarget(pipeline: string, localBaseProductId?: string, productTemplateId?: string) {
    if (pipeline === PipelineType.LOCAL && !localBaseProductId) throw new BadRequestException("Local placement preset requires localBaseProductId");
    if (pipeline === PipelineType.GLOBAL_PRINTFUL && !productTemplateId) throw new BadRequestException("Printful placement preset requires productTemplateId");
  }

  private normalizeEnum(value: string, enumObject: Record<string, string>, field: string) {
    const normalized = value.trim().toUpperCase().replace(/[-\s]+/g, "_");
    if (!(normalized in enumObject)) throw new BadRequestException(`Invalid ${field}`);
    return normalized;
  }

  private createPrintfulTemplateData(dto: CreatePrintfulProductTemplateDto): Prisma.PrintfulProductTemplateCreateInput {
    return {
      rashpodProductType: dto.rashpodProductType,
      displayName: dto.displayName,
      provider: ProviderType.PRINTFUL,
      printfulCatalogProductId: dto.printfulCatalogProductId,
      printfulProductName: dto.printfulProductName,
      printfulVariantIds: dto.printfulVariantIds as Prisma.InputJsonValue,
      allowedColorVariantIds: dto.allowedColorVariantIds as Prisma.InputJsonValue | undefined,
      allowedSizeVariantIds: dto.allowedSizeVariantIds as Prisma.InputJsonValue | undefined,
      allowedPlacements: dto.allowedPlacements as Prisma.InputJsonValue,
      allowedTechniques: dto.allowedTechniques as Prisma.InputJsonValue,
      defaultTechnique: dto.defaultTechnique,
      defaultPlacement: dto.defaultPlacement,
      printfulStoreId: dto.printfulStoreId,
      defaultRetailPrice: dto.defaultRetailPrice == null ? null : new Prisma.Decimal(dto.defaultRetailPrice),
      estimatedBaseCost: dto.estimatedBaseCost == null ? null : new Prisma.Decimal(dto.estimatedBaseCost),
      currency: dto.currency ?? "USD",
      active: dto.active,
      metadataJson: dto.metadataJson as Prisma.InputJsonValue | undefined,
    };
  }

  private updatePrintfulTemplateData(dto: UpdatePrintfulProductTemplateDto): Prisma.PrintfulProductTemplateUpdateInput {
    return {
      rashpodProductType: dto.rashpodProductType,
      displayName: dto.displayName,
      printfulCatalogProductId: dto.printfulCatalogProductId,
      printfulProductName: dto.printfulProductName,
      printfulVariantIds: dto.printfulVariantIds as Prisma.InputJsonValue | undefined,
      allowedColorVariantIds: dto.allowedColorVariantIds as Prisma.InputJsonValue | undefined,
      allowedSizeVariantIds: dto.allowedSizeVariantIds as Prisma.InputJsonValue | undefined,
      allowedPlacements: dto.allowedPlacements as Prisma.InputJsonValue | undefined,
      allowedTechniques: dto.allowedTechniques as Prisma.InputJsonValue | undefined,
      defaultTechnique: dto.defaultTechnique,
      defaultPlacement: dto.defaultPlacement,
      printfulStoreId: dto.printfulStoreId,
      defaultRetailPrice: dto.defaultRetailPrice == null ? undefined : new Prisma.Decimal(dto.defaultRetailPrice),
      estimatedBaseCost: dto.estimatedBaseCost == null ? undefined : new Prisma.Decimal(dto.estimatedBaseCost),
      currency: dto.currency,
      active: dto.active,
      metadataJson: dto.metadataJson as Prisma.InputJsonValue | undefined,
    };
  }

  private objectValue(value: Prisma.JsonValue | undefined) {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }
}
