import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateProductTypeDto } from "./dto/create-product-type.dto";
import { CreateRoyaltyRuleDto } from "./dto/create-royalty-rule.dto";
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

@Injectable()
export class AdminConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listProductTypes() {
    return this.prisma.productType.findMany({ orderBy: { createdAt: "desc" } });
  }

  async createProductType(actorId: string, dto: CreateProductTypeDto) {
    const productType = await this.prisma.productType.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        category: dto.category,
        productionMethod: dto.productionMethod,
        supportsFilmSale: dto.supportsFilmSale ?? false,
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
      },
    });
    await this.audit.log({ actorId, action: "product-type.update", entityType: "ProductType", entityId: item.id });
    return item;
  }

  async deleteProductType(actorId: string, id: string) {
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

  listBaseProducts() {
    return this.prisma.baseProduct.findMany({ orderBy: { createdAt: "desc" } });
  }

  async createBaseProduct(actorId: string, dto: CreateBaseProductDto) {
    const item = await this.prisma.baseProduct.create({
      data: {
        productTypeId: dto.productTypeId,
        name: dto.name,
        skuPrefix: dto.skuPrefix,
        isActive: dto.isActive ?? true,
        availableColors: dto.availableColors ?? [],
        availableSizes: dto.availableSizes ?? [],
      },
    });
    await this.audit.log({ actorId, action: "base-product.create", entityType: "BaseProduct", entityId: item.id });
    return item;
  }

  async getBaseProduct(id: string) {
    const item = await this.prisma.baseProduct.findUnique({ where: { id } });
    if (!item) throw new NotFoundException("Base product not found");
    return item;
  }

  async updateBaseProduct(actorId: string, id: string, dto: UpdateBaseProductDto) {
    const item = await this.prisma.baseProduct.update({
      where: { id },
      data: {
        productTypeId: dto.productTypeId,
        name: dto.name,
        skuPrefix: dto.skuPrefix,
        isActive: dto.isActive,
        availableColors: dto.availableColors,
        availableSizes: dto.availableSizes,
      },
    });
    await this.audit.log({ actorId, action: "base-product.update", entityType: "BaseProduct", entityId: item.id });
    return item;
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
}
