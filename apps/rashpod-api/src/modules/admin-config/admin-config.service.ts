import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { BaseProduct, PipelineType, PlacementAlignment, PlacementKind, PlacementUnits, Prisma, ProviderType } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateProductTypeDto } from "./dto/create-product-type.dto";
import { CreateRoyaltyRuleDto } from "./dto/create-royalty-rule.dto";
import { UpdateRoyaltyRuleDto } from "./dto/update-royalty-rule.dto";
import { CreateBaseProductDto } from "./dto/create-base-product.dto";
import { CreateMockupTemplateDto } from "./dto/create-mockup-template.dto";
import { CreateMockupViewDto } from "./dto/create-mockup-view.dto";
import { CreateMockupGalleryAssetDto } from "./dto/create-mockup-gallery-asset.dto";
import { CreatePrintAreaDto } from "./dto/create-print-area.dto";
import { UpsertFilmSaleSettingsDto } from "./dto/upsert-film-sale-settings.dto";
import { CreateDeliverySettingDto } from "./dto/create-delivery-setting.dto";
import { UpdateDeliverySettingDto } from "./dto/update-delivery-setting.dto";
import { UpdateProductTypeDto } from "./dto/update-product-type.dto";
import { UpdateBaseProductDto } from "./dto/update-base-product.dto";
import { UpdateMockupTemplateDto } from "./dto/update-mockup-template.dto";
import { UpdateMockupViewDto } from "./dto/update-mockup-view.dto";
import { UpdateMockupGalleryAssetDto } from "./dto/update-mockup-gallery-asset.dto";
import { UpdatePrintAreaDto } from "./dto/update-print-area.dto";
import { CreatePlacementPresetDto } from "./dto/create-placement-preset.dto";
import { UpdatePlacementPresetDto } from "./dto/update-placement-preset.dto";
import { CreatePrintfulProductTemplateDto } from "./dto/create-printful-product-template.dto";
import { UpdatePrintfulProductTemplateDto } from "./dto/update-printful-product-template.dto";
import { UpdatePrintfulSettingsDto } from "./dto/update-printful-settings.dto";
import { JobDispatcherService } from "../worker-jobs/job-dispatcher.service";
import { parseVariantRenderRegion } from "@rashpod/mockup";

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

  private decimalString(value: Prisma.Decimal | null | undefined) {
    return value == null ? null : value.toString();
  }

  private serializeBaseProduct<T extends BaseProduct & { productType?: unknown }>(item: T) {
    return {
      ...item,
      baseCost: this.decimalString(item.baseCost),
      defaultPrice: this.decimalString(item.defaultPrice),
      availableColors: this.jsonStringArray(item.availableColors),
      availableSizes: this.jsonStringArray(item.availableSizes),
    };
  }

  private serializePrintfulTemplate(item: {
    id: string;
    rashpodProductType: string;
    displayName: string;
    provider: ProviderType;
    printfulCatalogProductId: string;
    printfulProductName: string;
    printfulVariantIds: Prisma.JsonValue;
    allowedColorVariantIds?: Prisma.JsonValue | null;
    allowedSizeVariantIds?: Prisma.JsonValue | null;
    allowedPlacements: Prisma.JsonValue;
    allowedTechniques: Prisma.JsonValue;
    defaultTechnique: string;
    defaultPlacement: string;
    printfulStoreId?: string | null;
    defaultRetailPrice?: Prisma.Decimal | null;
    estimatedBaseCost?: Prisma.Decimal | null;
    currency: string;
    previewImageUrl?: string | null;
    active: boolean;
    metadataJson?: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      ...item,
      printfulVariantIds: this.jsonStringArray(item.printfulVariantIds),
      allowedColorVariantIds: this.jsonStringArray(item.allowedColorVariantIds),
      allowedSizeVariantIds: this.jsonStringArray(item.allowedSizeVariantIds),
      allowedPlacements: this.jsonStringArray(item.allowedPlacements),
      allowedTechniques: this.jsonStringArray(item.allowedTechniques),
      defaultRetailPrice: this.decimalString(item.defaultRetailPrice),
      estimatedBaseCost: this.decimalString(item.estimatedBaseCost),
    };
  }

  private serializePlacementPreset(item: {
    id: string;
    name: string;
    pipeline: PipelineType;
    productTemplateId?: string | null;
    localBaseProductId?: string | null;
    placement: PlacementKind;
    defaultWidthCm?: number | null;
    defaultHeightCm?: number | null;
    defaultWidthIn?: number | null;
    defaultHeightIn?: number | null;
    defaultX?: number | null;
    defaultY?: number | null;
    defaultScale: number;
    alignment: PlacementAlignment;
    units: PlacementUnits;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    localBaseProduct?: { id: string; name: string } | null;
    printfulProductTemplate?: { id: string; displayName: string } | null;
  }) {
    return {
      ...item,
      localBaseProduct: item.localBaseProduct ? { id: item.localBaseProduct.id, name: item.localBaseProduct.name } : null,
      printfulProductTemplate: item.printfulProductTemplate
        ? { id: item.printfulProductTemplate.id, displayName: item.printfulProductTemplate.displayName }
        : null,
    };
  }

  private automaticPrintAreaPresetData(input: {
    name: string;
    baseProductId: string;
    placement?: PlacementKind | null;
    isActive: boolean;
  }) {
    return {
      name: `${input.name} default`,
      pipeline: PipelineType.LOCAL,
      localBaseProductId: input.baseProductId,
      productTemplateId: null,
      placement: input.placement ?? PlacementKind.OTHER,
      defaultWidthCm: null,
      defaultHeightCm: null,
      defaultWidthIn: null,
      defaultHeightIn: null,
      defaultX: null,
      defaultY: null,
      defaultScale: 1,
      alignment: PlacementAlignment.CENTER,
      units: PlacementUnits.PX,
      active: input.isActive,
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
    const [baseProducts, marketplaceMappings, providerMappings, intakeItems] = await Promise.all([
      this.prisma.baseProduct.count({ where: { productTypeId: id } }),
      this.prisma.marketplaceCategoryMapping.count({ where: { productTypeId: id } }),
      this.prisma.podProductMapping.count({ where: { productTypeId: id } }),
      this.prisma.externalOrderIntakeItem.count({ where: { productTypeId: id } }),
    ]);
    if (baseProducts + marketplaceMappings + providerMappings + intakeItems > 0) {
      throw new ConflictException("Product type is in use and cannot be deleted. Remove its unused catalog mappings or deactivate it instead.");
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
    const ledgerEntries = await this.prisma.royaltyLedgerEntry.count({ where: { royaltyRuleId: id } });
    if (ledgerEntries > 0) {
      throw new ConflictException("Royalty rule has payment history and cannot be deleted. Deactivate it instead.");
    }
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
    const [selections, presetSelections, listings, marketplaceMappings, providerMappings, intakeItems] = await Promise.all([
      this.prisma.designProductSelection.count({ where: { localBaseProductId: id } }),
      this.prisma.designProductSelection.count({ where: { placementPreset: { localBaseProductId: id } } }),
      this.prisma.commerceListing.count({ where: { localBaseProductId: id } }),
      this.prisma.marketplaceCategoryMapping.count({ where: { baseProductId: id } }),
      this.prisma.podProductMapping.count({ where: { baseProductId: id } }),
      this.prisma.externalOrderIntakeItem.count({ where: { baseProductId: id } }),
    ]);
    if (selections + presetSelections + listings + marketplaceMappings + providerMappings + intakeItems > 0) {
      throw new ConflictException("Base product is used by workflow history and cannot be deleted. Deactivate it instead.");
    }

    const item = await this.prisma.$transaction(async (tx) => {
      const templateIds = (await tx.mockupTemplate.findMany({
        where: { baseProductId: id },
        select: { id: true },
      })).map((template) => template.id);

      if (templateIds.length) {
        const [placements, printAreaMappings] = await Promise.all([
          tx.mockupPlacement.count({ where: { mockupTemplateId: { in: templateIds } } }),
          tx.podPrintAreaMapping.count({ where: { printArea: { mockupTemplateId: { in: templateIds } } } }),
        ]);
        if (placements + printAreaMappings > 0) {
          throw new ConflictException("Base product mockups are used by workflow history and cannot be deleted. Deactivate it instead.");
        }
        await tx.printArea.deleteMany({ where: { mockupTemplateId: { in: templateIds } } });
        await tx.mockupTemplate.deleteMany({ where: { id: { in: templateIds } } });
      }
      await tx.placementPreset.deleteMany({ where: { localBaseProductId: id } });
      return tx.baseProduct.delete({ where: { id } });
    });
    await this.audit.log({ actorId, action: "base-product.delete", entityType: "BaseProduct", entityId: item.id });
    return item;
  }

  listMockupTemplates() {
    return this.prisma.mockupTemplate.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        views: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        galleryAssets: { orderBy: [{ role: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }] },
      },
    });
  }

  async createMockupTemplate(actorId: string, dto: CreateMockupTemplateDto) {
    const item = await this.prisma.$transaction(async (tx) => {
      const template = await tx.mockupTemplate.create({
        data: {
          baseProductId: dto.baseProductId.trim(),
          name: dto.name.trim(),
          baseImageKey: dto.baseImageKey.trim(),
          lifestyleImageKey: dto.lifestyleImageKey?.trim(),
          closeupImageKey: dto.closeupImageKey?.trim(),
          configurationVersion: "MULTI_VIEW_V2",
          isActive: dto.isActive ?? true,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
      const primaryView = await tx.mockupView.create({
        data: {
          mockupTemplateId: template.id,
          viewKey: "primary",
          placementCode: "front",
          name: "Front",
          blankImageKey: dto.baseImageKey.trim(),
          sortOrder: 0,
          isPrimary: true,
          isActive: true,
        },
      });
      const galleryAssets = [
        dto.lifestyleImageKey
          ? {
              mockupTemplateId: template.id,
              mockupViewId: primaryView.id,
              role: "LIFESTYLE" as const,
              imageKey: dto.lifestyleImageKey.trim(),
              sortOrder: 0,
              isActive: true,
            }
          : null,
        dto.closeupImageKey
          ? {
              mockupTemplateId: template.id,
              mockupViewId: primaryView.id,
              role: "DETAIL" as const,
              imageKey: dto.closeupImageKey.trim(),
              sortOrder: 0,
              isActive: true,
            }
          : null,
      ].filter((asset): asset is NonNullable<typeof asset> => Boolean(asset));
      if (galleryAssets.length) await tx.mockupGalleryAsset.createMany({ data: galleryAssets });
      return template;
    });
    await this.audit.log({ actorId, action: "mockup-template.create", entityType: "MockupTemplate", entityId: item.id });
    return item;
  }

  async getMockupTemplate(id: string) {
    const item = await this.prisma.mockupTemplate.findUnique({
      where: { id },
      include: {
        views: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: { _count: { select: { printAreas: true, galleryAssets: true } } },
        },
        galleryAssets: { orderBy: [{ role: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }] },
      },
    });
    if (!item) throw new NotFoundException("Mockup template not found");
    return item;
  }

  async updateMockupTemplate(actorId: string, id: string, dto: UpdateMockupTemplateDto) {
    const existing = await this.prisma.mockupTemplate.findUnique({
      where: { id },
      select: { id: true, configurationVersion: true },
    });
    if (!existing) throw new NotFoundException("Mockup template not found");
    if (
      existing.configurationVersion === "MULTI_VIEW_V2"
      && (dto.lifestyleImageKey !== undefined || dto.closeupImageKey !== undefined)
    ) {
      throw new BadRequestException("Use mockup gallery asset endpoints to update multi-view lifestyle and detail images");
    }
    const item = await this.prisma.$transaction(async (tx) => {
      if (dto.isActive === true && existing.configurationVersion === "MULTI_VIEW_V2") {
        const primary = await tx.mockupView.findFirst({
          where: { mockupTemplateId: id, isPrimary: true, isActive: true },
          select: { id: true },
        });
        if (!primary) {
          throw new BadRequestException("A multi-view template requires an active primary view before activation");
        }
      }
      const updated = await tx.mockupTemplate.update({
        where: { id },
        data: {
          baseProductId: dto.baseProductId?.trim(),
          name: dto.name?.trim(),
          baseImageKey: dto.baseImageKey?.trim(),
          lifestyleImageKey: dto.lifestyleImageKey?.trim(),
          closeupImageKey: dto.closeupImageKey?.trim(),
          isActive: dto.isActive,
          sortOrder: dto.sortOrder,
        },
      });
      if (existing.configurationVersion === "MULTI_VIEW_V2" && dto.baseImageKey) {
        const primary = await tx.mockupView.findFirst({
          where: { mockupTemplateId: id, isPrimary: true },
          select: { id: true },
        });
        if (primary) {
          await tx.mockupView.update({
            where: { id: primary.id },
            data: { blankImageKey: dto.baseImageKey.trim() },
          });
        }
      }
      return updated;
    });
    await this.audit.log({ actorId, action: "mockup-template.update", entityType: "MockupTemplate", entityId: item.id });
    return item;
  }

  async deleteMockupTemplate(actorId: string, id: string) {
    const [placements, printAreaMappings] = await Promise.all([
      this.prisma.mockupPlacement.count({ where: { mockupTemplateId: id } }),
      this.prisma.podPrintAreaMapping.count({ where: { printArea: { mockupTemplateId: id } } }),
    ]);
    if (placements + printAreaMappings > 0) {
      throw new ConflictException("Mockup template is used by workflow history and cannot be deleted. Deactivate it instead.");
    }
    const item = await this.prisma.$transaction(async (tx) => {
      await tx.printArea.deleteMany({ where: { mockupTemplateId: id } });
      return tx.mockupTemplate.delete({ where: { id } });
    });
    await this.audit.log({ actorId, action: "mockup-template.delete", entityType: "MockupTemplate", entityId: item.id });
    return item;
  }

  listMockupViews(mockupTemplateId: string) {
    return this.prisma.mockupView.findMany({
      where: { mockupTemplateId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { printAreas: true, galleryAssets: true } } },
    });
  }

  async getMockupView(id: string) {
    const item = await this.prisma.mockupView.findUnique({
      where: { id },
      include: {
        printAreas: { orderBy: { createdAt: "asc" } },
        galleryAssets: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      },
    });
    if (!item) throw new NotFoundException("Mockup view not found");
    return item;
  }

  async createMockupView(actorId: string, mockupTemplateId: string, dto: CreateMockupViewDto) {
    await this.assertMockupTemplateExists(mockupTemplateId);
    const viewKey = this.normalizeMockupKey(dto.viewKey, "view key");
    const placementCode = this.normalizeMockupKey(dto.placementCode, "placement code");
    const duplicate = await this.prisma.mockupView.findFirst({ where: { mockupTemplateId, viewKey }, select: { id: true } });
    if (duplicate) throw new ConflictException("A mockup view with this key already exists for the template");

    const item = await this.prisma.$transaction(async (tx) => {
      const viewCount = await tx.mockupView.count({ where: { mockupTemplateId } });
      const isPrimary = dto.isPrimary ?? viewCount === 0;
      const isActive = dto.isActive ?? true;
      if (isPrimary && !isActive) {
        throw new BadRequestException("The primary mockup view must be active");
      }
      if (isPrimary) {
        await tx.mockupView.updateMany({ where: { mockupTemplateId, isPrimary: true }, data: { isPrimary: false } });
      }
      const view = await tx.mockupView.create({
        data: {
          mockupTemplateId,
          viewKey,
          placementCode,
          name: dto.name.trim(),
          blankImageKey: dto.blankImageKey.trim(),
          mockupStyle: dto.mockupStyle?.trim(),
          sortOrder: dto.sortOrder ?? 0,
          isPrimary,
          isActive,
          metadataJson: dto.metadataJson as Prisma.InputJsonValue | undefined,
        },
      });
      await tx.mockupTemplate.update({
        where: { id: mockupTemplateId },
        data: {
          configurationVersion: "MULTI_VIEW_V2",
          ...(isPrimary ? { baseImageKey: dto.blankImageKey.trim() } : {}),
        },
      });
      if (isPrimary) {
        await this.syncLegacyGalleryRole(tx, mockupTemplateId, "LIFESTYLE");
        await this.syncLegacyGalleryRole(tx, mockupTemplateId, "DETAIL");
      }
      return view;
    });

    await this.audit.log({
      actorId,
      action: "mockup-view.create",
      entityType: "MockupView",
      entityId: item.id,
      metadata: { mockupTemplateId, viewKey, placementCode },
    });
    return item;
  }

  async updateMockupView(actorId: string, id: string, dto: UpdateMockupViewDto) {
    const existing = await this.prisma.mockupView.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Mockup view not found");
    const viewKey = dto.viewKey === undefined ? undefined : this.normalizeMockupKey(dto.viewKey, "view key");
    const placementCode = dto.placementCode === undefined ? undefined : this.normalizeMockupKey(dto.placementCode, "placement code");
    if (viewKey && viewKey !== existing.viewKey) {
      const duplicate = await this.prisma.mockupView.findFirst({
        where: { mockupTemplateId: existing.mockupTemplateId, viewKey, NOT: { id } },
        select: { id: true },
      });
      if (duplicate) throw new ConflictException("A mockup view with this key already exists for the template");
    }
    if (existing.isPrimary && dto.isPrimary === false) {
      throw new BadRequestException("Promote another view instead of removing the current primary flag");
    }
    if ((existing.isPrimary || dto.isPrimary === true) && dto.isActive === false) {
      throw new BadRequestException("The primary mockup view must be active");
    }

    const item = await this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary === true) {
        await tx.mockupView.updateMany({
          where: { mockupTemplateId: existing.mockupTemplateId, isPrimary: true, NOT: { id } },
          data: { isPrimary: false },
        });
      }
      const updated = await tx.mockupView.update({
        where: { id },
        data: {
          viewKey,
          placementCode,
          name: dto.name?.trim(),
          blankImageKey: dto.blankImageKey?.trim(),
          mockupStyle: dto.mockupStyle?.trim(),
          sortOrder: dto.sortOrder,
          isPrimary: dto.isPrimary,
          isActive: dto.isActive,
          metadataJson: dto.metadataJson as Prisma.InputJsonValue | undefined,
        },
      });
      if (updated.isPrimary) {
        await tx.mockupTemplate.update({
          where: { id: existing.mockupTemplateId },
          data: {
            configurationVersion: "MULTI_VIEW_V2",
            baseImageKey: updated.blankImageKey,
          },
        });
        await this.syncLegacyGalleryRole(tx, existing.mockupTemplateId, "LIFESTYLE");
        await this.syncLegacyGalleryRole(tx, existing.mockupTemplateId, "DETAIL");
      }
      return updated;
    });

    await this.audit.log({
      actorId,
      action: "mockup-view.update",
      entityType: "MockupView",
      entityId: item.id,
      metadata: { mockupTemplateId: existing.mockupTemplateId },
    });
    return item;
  }

  async deleteMockupView(actorId: string, id: string) {
    const existing = await this.prisma.mockupView.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Mockup view not found");
    const printAreas = await this.prisma.printArea.count({ where: { mockupViewId: id } });
    if (printAreas > 0) {
      throw new ConflictException("Mockup view has print areas and cannot be deleted. Reassign or remove those areas first.");
    }

    const item = await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.mockupView.delete({ where: { id } });
      if (existing.isPrimary) {
        const replacement = await tx.mockupView.findFirst({
          where: { mockupTemplateId: existing.mockupTemplateId, isActive: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: { id: true },
        });
        if (replacement) {
          const promoted = await tx.mockupView.update({
            where: { id: replacement.id },
            data: { isPrimary: true },
          });
          await tx.mockupTemplate.update({
            where: { id: existing.mockupTemplateId },
            data: { baseImageKey: promoted.blankImageKey },
          });
          await this.syncLegacyGalleryRole(tx, existing.mockupTemplateId, "LIFESTYLE");
          await this.syncLegacyGalleryRole(tx, existing.mockupTemplateId, "DETAIL");
        } else {
          const template = await tx.mockupTemplate.findUnique({
            where: { id: existing.mockupTemplateId },
            select: { isActive: true },
          });
          if (template?.isActive) {
            throw new ConflictException("An active mockup template must keep an active primary view");
          }
        }
      }
      return deleted;
    });

    await this.audit.log({ actorId, action: "mockup-view.delete", entityType: "MockupView", entityId: item.id });
    return item;
  }

  listMockupGalleryAssets(mockupTemplateId: string) {
    return this.prisma.mockupGalleryAsset.findMany({
      where: { mockupTemplateId },
      orderBy: [{ role: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  private validateGalleryRenderRegion(metadata: Record<string, unknown> | undefined) {
    if (!metadata || !("renderRegion" in metadata)) return;
    if (!parseVariantRenderRegion(metadata)) {
      throw new BadRequestException("Gallery artwork region must be inside the uploaded image canvas");
    }
  }

  async createMockupGalleryAsset(actorId: string, mockupTemplateId: string, dto: CreateMockupGalleryAssetDto) {
    await this.assertMockupTemplateExists(mockupTemplateId);
    if (dto.mockupViewId) await this.assertMockupViewForTemplate(dto.mockupViewId, mockupTemplateId);
    this.validateGalleryRenderRegion(dto.metadataJson);
    const item = await this.prisma.$transaction(async (tx) => {
      const created = await tx.mockupGalleryAsset.create({
        data: {
          mockupTemplateId,
          mockupViewId: dto.mockupViewId,
          role: dto.role,
          imageKey: dto.imageKey.trim(),
          altText: dto.altText?.trim(),
          sortOrder: dto.sortOrder ?? 0,
          isActive: dto.isActive ?? true,
          metadataJson: dto.metadataJson as Prisma.InputJsonValue | undefined,
        },
      });
      await this.syncLegacyGalleryRole(tx, mockupTemplateId, dto.role);
      return created;
    });
    await this.audit.log({
      actorId,
      action: "mockup-gallery-asset.create",
      entityType: "MockupGalleryAsset",
      entityId: item.id,
      metadata: { mockupTemplateId, role: item.role },
    });
    return item;
  }

  async updateMockupGalleryAsset(actorId: string, id: string, dto: UpdateMockupGalleryAssetDto) {
    const existing = await this.prisma.mockupGalleryAsset.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Mockup gallery asset not found");
    if (dto.mockupViewId) await this.assertMockupViewForTemplate(dto.mockupViewId, existing.mockupTemplateId);
    this.validateGalleryRenderRegion(dto.metadataJson);
    const item = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.mockupGalleryAsset.update({
        where: { id },
        data: {
          mockupViewId: dto.mockupViewId,
          role: dto.role,
          imageKey: dto.imageKey?.trim(),
          altText: dto.altText?.trim(),
          sortOrder: dto.sortOrder,
          isActive: dto.isActive,
          metadataJson: dto.metadataJson as Prisma.InputJsonValue | undefined,
        },
      });
      await this.syncLegacyGalleryRole(tx, existing.mockupTemplateId, existing.role);
      if (updated.role !== existing.role) {
        await this.syncLegacyGalleryRole(tx, existing.mockupTemplateId, updated.role);
      }
      return updated;
    });
    await this.audit.log({
      actorId,
      action: "mockup-gallery-asset.update",
      entityType: "MockupGalleryAsset",
      entityId: item.id,
      metadata: { mockupTemplateId: existing.mockupTemplateId },
    });
    return item;
  }

  async deleteMockupGalleryAsset(actorId: string, id: string) {
    const existing = await this.prisma.mockupGalleryAsset.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Mockup gallery asset not found");
    const item = await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.mockupGalleryAsset.delete({ where: { id } });
      await this.syncLegacyGalleryRole(tx, existing.mockupTemplateId, existing.role);
      return deleted;
    });
    await this.audit.log({ actorId, action: "mockup-gallery-asset.delete", entityType: "MockupGalleryAsset", entityId: item.id });
    return item;
  }

  listPrintAreas() {
    return this.prisma.printArea.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        mockupView: {
          select: {
            id: true,
            name: true,
            viewKey: true,
            placementCode: true,
            blankImageKey: true,
            isPrimary: true,
            isActive: true,
          },
        },
      },
    });
  }

  async createPrintArea(actorId: string, dto: CreatePrintAreaDto) {
    const template = await this.prisma.mockupTemplate.findUnique({
      where: { id: dto.mockupTemplateId },
      select: { id: true, baseProductId: true, configurationVersion: true },
    });
    if (!template) throw new NotFoundException("Mockup template not found");
    if (template.configurationVersion === "MULTI_VIEW_V2" && !dto.mockupViewId) {
      throw new BadRequestException("A product view is required for multi-view print areas");
    }
    if (dto.mockupViewId) await this.assertActiveMockupViewForTemplate(dto.mockupViewId, dto.mockupTemplateId);
    this.validatePrintAreaGeometry(dto);
    const isActive = dto.isActive ?? true;
    const item = await this.prisma.$transaction(async (tx) => {
      const preset = await tx.placementPreset.create({
        data: this.automaticPrintAreaPresetData({
          name: dto.name,
          baseProductId: template.baseProductId,
          placement: dto.placement,
          isActive,
        }),
      });
      return tx.printArea.create({
        data: {
          mockupTemplateId: dto.mockupTemplateId,
          mockupViewId: dto.mockupViewId,
          name: dto.name,
          placement: dto.placement,
          defaultPresetId: preset.id,
          x: dto.x,
          y: dto.y,
          width: dto.width,
          height: dto.height,
          safeX: dto.safeX,
          safeY: dto.safeY,
          safeWidth: dto.safeWidth,
          safeHeight: dto.safeHeight,
          widthCm: dto.widthCm,
          heightCm: dto.heightCm,
          minimumDpi: dto.minimumDpi ?? 150,
          allowMove: dto.allowMove ?? true,
          allowResize: dto.allowResize ?? true,
          allowRotate: dto.allowRotate ?? false,
          minScale: dto.minScale ?? 0.1,
          maxScale: dto.maxScale ?? 2,
          isActive,
        },
      });
    });
    await this.audit.log({ actorId, action: "print-area.create", entityType: "PrintArea", entityId: item.id });
    await this.audit.log({
      actorId,
      action: "placement-preset.auto-create",
      entityType: "PlacementPreset",
      entityId: item.defaultPresetId!,
      metadata: { printAreaId: item.id },
    });
    return item;
  }

  async getPrintArea(id: string) {
    const item = await this.prisma.printArea.findUnique({ where: { id } });
    if (!item) throw new NotFoundException("Print area not found");
    return item;
  }

  async updatePrintArea(actorId: string, id: string, dto: UpdatePrintAreaDto) {
    const existing = await this.prisma.printArea.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Print area not found");
    const targetTemplateId = dto.mockupTemplateId ?? existing?.mockupTemplateId;
    const targetViewId = dto.mockupViewId === undefined ? existing?.mockupViewId : dto.mockupViewId;
    const template = await this.prisma.mockupTemplate.findUnique({
      where: { id: targetTemplateId },
      select: { id: true, baseProductId: true, configurationVersion: true },
    });
    if (!template) throw new NotFoundException("Mockup template not found");
    if (template.configurationVersion === "MULTI_VIEW_V2" && !targetViewId) {
      throw new BadRequestException("A product view is required for multi-view print areas");
    }
    if (targetViewId) await this.assertActiveMockupViewForTemplate(targetViewId, targetTemplateId);
    this.validatePrintAreaGeometry({
      x: dto.x ?? existing.x,
      y: dto.y ?? existing.y,
      width: dto.width ?? existing.width,
      height: dto.height ?? existing.height,
      safeX: dto.safeX ?? existing.safeX,
      safeY: dto.safeY ?? existing.safeY,
      safeWidth: dto.safeWidth ?? existing.safeWidth,
      safeHeight: dto.safeHeight ?? existing.safeHeight,
      minScale: dto.minScale ?? existing.minScale,
      maxScale: dto.maxScale ?? existing.maxScale,
    });
    const presetData = this.automaticPrintAreaPresetData({
      name: dto.name ?? existing.name,
      baseProductId: template.baseProductId,
      placement: dto.placement ?? existing.placement,
      isActive: dto.isActive ?? existing.isActive,
    });
    const item = await this.prisma.$transaction(async (tx) => {
      let defaultPresetId = existing.defaultPresetId;
      if (defaultPresetId) {
        const preset = await tx.placementPreset.findUnique({ where: { id: defaultPresetId }, select: { id: true } });
        if (preset) {
          await tx.placementPreset.update({ where: { id: defaultPresetId }, data: presetData });
        } else {
          const created = await tx.placementPreset.create({ data: presetData });
          defaultPresetId = created.id;
        }
      } else {
        const created = await tx.placementPreset.create({ data: presetData });
        defaultPresetId = created.id;
      }
      return tx.printArea.update({
        where: { id },
        data: {
          mockupTemplateId: dto.mockupTemplateId,
          mockupViewId: dto.mockupViewId,
          name: dto.name,
          placement: dto.placement,
          defaultPresetId,
          x: dto.x,
          y: dto.y,
          width: dto.width,
          height: dto.height,
          safeX: dto.safeX,
          safeY: dto.safeY,
          safeWidth: dto.safeWidth,
          safeHeight: dto.safeHeight,
          widthCm: dto.widthCm,
          heightCm: dto.heightCm,
          minimumDpi: dto.minimumDpi,
          allowMove: dto.allowMove,
          allowResize: dto.allowResize,
          allowRotate: dto.allowRotate,
          minScale: dto.minScale,
          maxScale: dto.maxScale,
          isActive: dto.isActive,
        },
      });
    });
    await this.audit.log({ actorId, action: "print-area.update", entityType: "PrintArea", entityId: item.id });
    return item;
  }

  async deletePrintArea(actorId: string, id: string) {
    const [placements, providerMappings] = await Promise.all([
      this.prisma.mockupPlacement.count({ where: { printAreaId: id } }),
      this.prisma.podPrintAreaMapping.count({ where: { printAreaId: id } }),
    ]);
    if (placements + providerMappings > 0) {
      throw new ConflictException("Print area is used by workflow history and cannot be deleted. Deactivate its template instead.");
    }
    const existing = await this.prisma.printArea.findUnique({ where: { id }, select: { defaultPresetId: true } });
    if (!existing) throw new NotFoundException("Print area not found");
    const item = await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.printArea.delete({ where: { id } });
      if (existing.defaultPresetId) {
        await tx.placementPreset.updateMany({ where: { id: existing.defaultPresetId }, data: { active: false } });
      }
      return deleted;
    });
    await this.audit.log({ actorId, action: "print-area.delete", entityType: "PrintArea", entityId: item.id });
    return item;
  }

  private async assertMockupTemplateExists(id: string) {
    const template = await this.prisma.mockupTemplate.findUnique({ where: { id }, select: { id: true } });
    if (!template) throw new NotFoundException("Mockup template not found");
  }

  private async assertMockupViewForTemplate(id: string, mockupTemplateId: string) {
    const view = await this.prisma.mockupView.findUnique({
      where: { id },
      select: { id: true, mockupTemplateId: true },
    });
    if (!view) throw new NotFoundException("Mockup view not found");
    if (view.mockupTemplateId !== mockupTemplateId) {
      throw new BadRequestException("Mockup view does not belong to the selected mockup template");
    }
    return view;
  }

  private async assertActiveMockupViewForTemplate(id: string, mockupTemplateId: string) {
    const view = await this.prisma.mockupView.findUnique({
      where: { id },
      select: { id: true, mockupTemplateId: true, isActive: true },
    });
    if (!view) throw new NotFoundException("Mockup view not found");
    if (view.mockupTemplateId !== mockupTemplateId) {
      throw new BadRequestException("Mockup view does not belong to the selected mockup template");
    }
    if (!view.isActive) throw new BadRequestException("Print areas require an active mockup view");
    return view;
  }

  private validatePrintAreaGeometry(area: {
    x: number;
    y: number;
    width: number;
    height: number;
    safeX: number;
    safeY: number;
    safeWidth: number;
    safeHeight: number;
    minScale?: number;
    maxScale?: number;
  }) {
    if (area.width <= 0 || area.height <= 0 || area.safeWidth <= 0 || area.safeHeight <= 0) {
      throw new BadRequestException("Print and safe-zone dimensions must be positive");
    }
    if (
      area.safeX < area.x
      || area.safeY < area.y
      || area.safeX + area.safeWidth > area.x + area.width
      || area.safeY + area.safeHeight > area.y + area.height
    ) {
      throw new BadRequestException("Safe zone must stay inside the print area");
    }
    const minScale = area.minScale ?? 0.1;
    const maxScale = area.maxScale ?? 2;
    if (minScale > maxScale) {
      throw new BadRequestException("Minimum scale cannot exceed maximum scale");
    }
  }

  private async syncLegacyGalleryRole(
    tx: Prisma.TransactionClient,
    mockupTemplateId: string,
    role: "LIFESTYLE" | "DETAIL",
  ) {
    const primary = await tx.mockupView.findFirst({
      where: { mockupTemplateId, isPrimary: true, isActive: true },
      select: { id: true },
    });
    const ordered = { sortOrder: "asc" as const };
    const selected = (
      primary
        ? await tx.mockupGalleryAsset.findFirst({
            where: { mockupTemplateId, mockupViewId: primary.id, role, isActive: true },
            orderBy: [ordered, { createdAt: "asc" }],
            select: { imageKey: true },
          })
        : null
    ) ?? await tx.mockupGalleryAsset.findFirst({
      where: { mockupTemplateId, mockupViewId: null, role, isActive: true },
      orderBy: [ordered, { createdAt: "asc" }],
      select: { imageKey: true },
    }) ?? await tx.mockupGalleryAsset.findFirst({
      where: { mockupTemplateId, role, isActive: true },
      orderBy: [ordered, { createdAt: "asc" }],
      select: { imageKey: true },
    });
    await tx.mockupTemplate.update({
      where: { id: mockupTemplateId },
      data: role === "LIFESTYLE"
        ? { lifestyleImageKey: selected?.imageKey ?? null }
        : { closeupImageKey: selected?.imageKey ?? null },
    });
  }

  private normalizeMockupKey(value: string, label: string) {
    const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    if (!normalized) throw new BadRequestException(`${label} must contain letters or numbers`);
    return normalized;
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
      currency: dto.currency ?? "UZS",
      dtfPricingJson: dto.dtfPricingJson == null ? undefined : (dto.dtfPricingJson as Prisma.InputJsonObject),
      uvDtfPricingJson: dto.uvDtfPricingJson == null ? undefined : (dto.uvDtfPricingJson as Prisma.InputJsonObject),
      consentPolicyJson: dto.consentPolicyJson == null ? undefined : (dto.consentPolicyJson as Prisma.InputJsonObject),
      royaltyPolicyJson: dto.royaltyPolicyJson == null ? undefined : (dto.royaltyPolicyJson as Prisma.InputJsonObject),
      productionConstraintsJson: dto.productionConstraintsJson == null ? undefined : (dto.productionConstraintsJson as Prisma.InputJsonObject),
      settingsVersion: dto.settingsVersion,
      taxRatePercent: dto.taxRatePercent == null ? null : new Prisma.Decimal(dto.taxRatePercent),
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
            currency: data.currency,
            dtfPricingJson: data.dtfPricingJson,
            uvDtfPricingJson: data.uvDtfPricingJson,
            consentPolicyJson: data.consentPolicyJson,
            royaltyPolicyJson: data.royaltyPolicyJson,
            productionConstraintsJson: data.productionConstraintsJson,
            settingsVersion: data.settingsVersion == null ? { increment: 1 } : data.settingsVersion,
            taxRatePercent: data.taxRatePercent,
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
            currency: data.currency,
            dtfPricingJson: data.dtfPricingJson ?? Prisma.JsonNull,
            uvDtfPricingJson: data.uvDtfPricingJson ?? Prisma.JsonNull,
            consentPolicyJson: data.consentPolicyJson ?? Prisma.JsonNull,
            royaltyPolicyJson: data.royaltyPolicyJson ?? Prisma.JsonNull,
            productionConstraintsJson: data.productionConstraintsJson ?? Prisma.JsonNull,
            settingsVersion: data.settingsVersion ?? 1,
            taxRatePercent: data.taxRatePercent,
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
    return this.prisma.placementPreset
      .findMany({
        orderBy: { createdAt: "desc" },
        include: {
          localBaseProduct: { select: { id: true, name: true } },
          printfulProductTemplate: { select: { id: true, displayName: true } },
        },
      })
      .then((items) => items.map((item) => this.serializePlacementPreset(item)));
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
    return this.prisma.printfulProductTemplate
      .findMany({ orderBy: { createdAt: "desc" } })
      .then((items) => items.map((item) => this.serializePrintfulTemplate(item)));
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
      catalogAllowlist: Array.isArray(value.catalogAllowlist) ? value.catalogAllowlist : [],
      tokenConfigured: Boolean(process.env.PRINTFUL_API_TOKEN),
      apiBaseUrl: process.env.PRINTFUL_API_BASE_URL || "https://api.printful.com",
    };
  }

  async updatePrintfulSettings(actorId: string, dto: UpdatePrintfulSettingsDto) {
    const existing = await this.prisma.platformSetting.findUnique({ where: { key: "integrations.printful" } });
    const current = this.objectValue(existing?.value);
    const value = {
      enabled: dto.enabled ?? Boolean(current.enabled),
      defaultStoreId: dto.defaultStoreId ?? current.defaultStoreId,
      connectedMarketplaces: dto.connectedMarketplaces ?? (Array.isArray(current.connectedMarketplaces) ? current.connectedMarketplaces : []),
      autoPublishTrusted: dto.autoPublishTrusted ?? Boolean(current.autoPublishTrusted),
      allowGlobalWithoutLocal: dto.allowGlobalWithoutLocal ?? Boolean(current.allowGlobalWithoutLocal),
      catalogAllowlist: dto.catalogAllowlist ?? (Array.isArray(current.catalogAllowlist) ? current.catalogAllowlist : []),
    };
    const item = await this.prisma.platformSetting.upsert({
      where: { key: "integrations.printful" },
      create: { key: "integrations.printful", value: value as Prisma.InputJsonValue },
      update: { value: value as Prisma.InputJsonValue },
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
      previewImageUrl: dto.previewImageUrl,
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
      previewImageUrl: dto.previewImageUrl,
      active: dto.active,
      metadataJson: dto.metadataJson as Prisma.InputJsonValue | undefined,
    };
  }

  private objectValue(value: Prisma.JsonValue | undefined) {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }
}
