import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AssetAccessPolicy,
  AssetLifecycleStatus,
  AssetPurpose,
  AssetStorageProvider,
  ExportedListingStatus,
  ListingStatus,
  ListingType,
  ManualMarketplaceKey,
  MarketplaceExportBatchStatus,
  MarketplaceExportFormat,
  MarketplaceExportItemStatus,
  MarketplaceExternalSaleStatus,
  MarketplaceExternalSaleSource,
  MarketplaceType,
  MockupAssetStatus,
  Prisma,
} from "@prisma/client";
import archiver from "archiver";
import ExcelJS from "exceljs";
import { randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { StorageService } from "../files/storage.service";

type JsonRecord = Record<string, unknown>;

type CandidateListing = Prisma.CommerceListingGetPayload<{
  include: {
    localBaseProduct: { include: { productType: true } };
    designProductSelection: { include: { mockupAssets: true } };
  };
}>;

const DEFAULT_MARKETPLACE_FORMATS = [MarketplaceExportFormat.CSV, MarketplaceExportFormat.CSV_WITH_IMAGE_URLS, MarketplaceExportFormat.XLSX, MarketplaceExportFormat.ZIP_IMAGES];
const IMAGE_TYPES = ["MAIN", "LIFESTYLE", "SECONDARY", "DETAIL"];

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  async overview() {
    const [configs, batches, exportedListings, externalSales] = await Promise.all([
      this.prisma.marketplaceConfig.count(),
      this.prisma.marketplaceExportBatch.count(),
      this.prisma.exportedListing.count(),
      this.prisma.marketplaceExternalSale.count(),
    ]);
    const recentBatches = await this.prisma.marketplaceExportBatch.findMany({
      include: { marketplaceConfig: true, items: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    return {
      kpis: { configs, batches, exportedListings, externalSales },
      recentBatches: recentBatches.map((batch) => this.toBatchSummary(batch)),
    };
  }

  async listConfigs() {
    const rows = await this.prisma.marketplaceConfig.findMany({ orderBy: [{ isEnabled: "desc" }, { updatedAt: "desc" }] });
    return rows.map((row) => this.toConfigDto(row));
  }

  async createConfig(actorId: string, input: Record<string, unknown>) {
    const key = this.enumValue(ManualMarketplaceKey, input.key, "Marketplace key") ?? ManualMarketplaceKey.OTHER;
    const name = this.stringValue(input.name, "Marketplace name") ?? key.replace(/_/g, " ");
    const config = await this.prisma.marketplaceConfig.create({
      data: {
        key,
        marketplaceType: MarketplaceType.MANUAL_EXPORT,
        name,
        isEnabled: this.booleanValue(input.isEnabled, true),
        countryCode: this.optionalString(input.countryCode) ?? "UZ",
        currency: this.optionalString(input.currency) ?? "UZS",
        defaultLanguage: this.optionalString(input.defaultLanguage) ?? "uz-Latn",
        supportedLanguages: this.jsonValue(input.supportedLanguages) ?? ["uz-Latn", "uz-Cyrl", "ru", "en"],
        supportedListingTypes: this.jsonValue(input.supportedListingTypes) ?? [ListingType.PRODUCT, ListingType.FILM],
        exportFormats: this.jsonValue(input.exportFormats) ?? DEFAULT_MARKETPLACE_FORMATS,
        imageRequirementsJson: this.jsonValue(input.imageRequirementsJson) ?? { requiredTypes: ["MAIN"], minimumImages: 1 },
        pricingRulesJson: this.jsonValue(input.pricingRulesJson) ?? { markupPercent: 0, fixedMarkup: 0, rounding: 1000, minimumMargin: 0 },
        skuPrefix: this.optionalString(input.skuPrefix) ?? `RPD-${key}`,
        statusMappingJson: this.jsonValue(input.statusMappingJson) ?? { exported: "draft", active: "active", archived: "archived" },
        notes: this.optionalString(input.notes),
        metadataJson: this.nullableJsonValue(input.metadataJson),
        createdById: actorId,
        updatedById: actorId,
      },
    });
    await this.audit.log({ actorId, action: "marketplace.config.created", entityType: "MarketplaceConfig", entityId: config.id, metadata: { key, name } });
    return this.toConfigDto(config);
  }

  async updateConfig(actorId: string, id: string, input: Record<string, unknown>) {
    await this.ensureConfig(id);
    const data: Prisma.MarketplaceConfigUpdateInput = { updatedById: actorId };
    if (input.key !== undefined) data.key = this.enumValue(ManualMarketplaceKey, input.key, "Marketplace key")!;
    if (input.name !== undefined) data.name = this.stringValue(input.name, "Marketplace name")!;
    if (input.isEnabled !== undefined) data.isEnabled = this.booleanValue(input.isEnabled, true);
    if (input.countryCode !== undefined) data.countryCode = this.stringValue(input.countryCode, "Country code")!;
    if (input.currency !== undefined) data.currency = this.stringValue(input.currency, "Currency")!;
    if (input.defaultLanguage !== undefined) data.defaultLanguage = this.stringValue(input.defaultLanguage, "Default language")!;
    if (input.supportedLanguages !== undefined) data.supportedLanguages = this.jsonValue(input.supportedLanguages) as Prisma.InputJsonValue;
    if (input.supportedListingTypes !== undefined) data.supportedListingTypes = this.jsonValue(input.supportedListingTypes) as Prisma.InputJsonValue;
    if (input.exportFormats !== undefined) data.exportFormats = this.jsonValue(input.exportFormats) as Prisma.InputJsonValue;
    if (input.imageRequirementsJson !== undefined) data.imageRequirementsJson = this.jsonValue(input.imageRequirementsJson) as Prisma.InputJsonValue;
    if (input.pricingRulesJson !== undefined) data.pricingRulesJson = this.jsonValue(input.pricingRulesJson) as Prisma.InputJsonValue;
    if (input.skuPrefix !== undefined) data.skuPrefix = this.stringValue(input.skuPrefix, "SKU prefix")!;
    if (input.statusMappingJson !== undefined) data.statusMappingJson = this.jsonValue(input.statusMappingJson) as Prisma.InputJsonValue;
    if (input.notes !== undefined) data.notes = this.optionalString(input.notes);
    if (input.metadataJson !== undefined) data.metadataJson = this.jsonValue(input.metadataJson) as Prisma.InputJsonValue;
    const config = await this.prisma.marketplaceConfig.update({ where: { id }, data });
    await this.audit.log({ actorId, action: "marketplace.config.updated", entityType: "MarketplaceConfig", entityId: id, metadata: { changed: Object.keys(input) } });
    return this.toConfigDto(config);
  }

  async setConfigEnabled(actorId: string, id: string, isEnabled: boolean) {
    const config = await this.prisma.marketplaceConfig.update({ where: { id }, data: { isEnabled, updatedById: actorId } });
    await this.audit.log({ actorId, action: isEnabled ? "marketplace.config.enabled" : "marketplace.config.disabled", entityType: "MarketplaceConfig", entityId: id });
    return this.toConfigDto(config);
  }

  async listMappings(marketplaceConfigId: string) {
    const rows = await this.prisma.marketplaceCategoryMapping.findMany({
      where: { marketplaceConfigId },
      include: { productType: true, baseProduct: true },
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    });
    return rows.map((row) => this.toMappingDto(row));
  }

  async createMapping(actorId: string, marketplaceConfigId: string, input: Record<string, unknown>) {
    await this.ensureConfig(marketplaceConfigId);
    const productTypeId = this.stringValue(input.productTypeId, "Product type")!;
    const mapping = await this.prisma.marketplaceCategoryMapping.create({
      data: {
        marketplaceConfigId,
        productTypeId,
        baseProductId: this.optionalString(input.baseProductId),
        marketplaceCategoryId: this.stringValue(input.marketplaceCategoryId, "Marketplace category id")!,
        marketplaceCategoryName: this.stringValue(input.marketplaceCategoryName, "Marketplace category name")!,
        requiredAttributesJson: this.nullableJsonValue(input.requiredAttributesJson),
        optionalAttributesJson: this.nullableJsonValue(input.optionalAttributesJson),
        valueMappingsJson: this.nullableJsonValue(input.valueMappingsJson),
        isActive: this.booleanValue(input.isActive, true),
        createdById: actorId,
        updatedById: actorId,
      },
      include: { productType: true, baseProduct: true },
    });
    await this.audit.log({ actorId, action: "marketplace.category_mapping.created", entityType: "MarketplaceCategoryMapping", entityId: mapping.id, metadata: { marketplaceConfigId, productTypeId } });
    return this.toMappingDto(mapping);
  }

  async updateMapping(actorId: string, mappingId: string, input: Record<string, unknown>) {
    const data: Prisma.MarketplaceCategoryMappingUpdateInput = { updatedById: actorId };
    if (input.marketplaceCategoryId !== undefined) data.marketplaceCategoryId = this.stringValue(input.marketplaceCategoryId, "Marketplace category id")!;
    if (input.marketplaceCategoryName !== undefined) data.marketplaceCategoryName = this.stringValue(input.marketplaceCategoryName, "Marketplace category name")!;
    if (input.requiredAttributesJson !== undefined) data.requiredAttributesJson = this.jsonValue(input.requiredAttributesJson) as Prisma.InputJsonValue;
    if (input.optionalAttributesJson !== undefined) data.optionalAttributesJson = this.jsonValue(input.optionalAttributesJson) as Prisma.InputJsonValue;
    if (input.valueMappingsJson !== undefined) data.valueMappingsJson = this.jsonValue(input.valueMappingsJson) as Prisma.InputJsonValue;
    if (input.isActive !== undefined) data.isActive = this.booleanValue(input.isActive, true);
    const mapping = await this.prisma.marketplaceCategoryMapping.update({ where: { id: mappingId }, data, include: { productType: true, baseProduct: true } });
    await this.audit.log({ actorId, action: "marketplace.category_mapping.updated", entityType: "MarketplaceCategoryMapping", entityId: mappingId, metadata: { changed: Object.keys(input) } });
    return this.toMappingDto(mapping);
  }

  async deleteMapping(actorId: string, mappingId: string) {
    await this.prisma.marketplaceCategoryMapping.delete({ where: { id: mappingId } });
    await this.audit.log({ actorId, action: "marketplace.category_mapping.deleted", entityType: "MarketplaceCategoryMapping", entityId: mappingId });
    return { ok: true };
  }

  async listCandidates(marketplaceConfigId: string, input: { type?: "PRODUCT" | "FILM"; search?: string }) {
    const config = await this.ensureConfig(marketplaceConfigId);
    const rows = await this.findCandidateListings({ type: input.type, search: input.search });
    const candidates = await Promise.all(rows.map((listing) => this.buildCandidate(config, listing)));
    return {
      marketplace: this.toConfigDto(config),
      total: candidates.length,
      eligible: candidates.filter((candidate) => candidate.eligible).length,
      blocked: candidates.filter((candidate) => !candidate.eligible).length,
      items: candidates,
    };
  }

  async validateListings(marketplaceConfigId: string, listingIds: string[]) {
    const config = await this.ensureConfig(marketplaceConfigId);
    const rows = await this.findListingsByIds(listingIds);
    const candidates = await Promise.all(rows.map((listing) => this.buildCandidate(config, listing)));
    return { total: candidates.length, items: candidates };
  }

  async createBatch(actorId: string, input: Record<string, unknown>) {
    const marketplaceConfigId = this.stringValue(input.marketplaceConfigId, "Marketplace")!;
    const config = await this.ensureConfig(marketplaceConfigId);
    if (!config.isEnabled) throw new BadRequestException("Marketplace config is disabled");
    const listingIds = this.stringArrayValue(input.listingIds, "Listing ids");
    if (listingIds.length === 0) throw new BadRequestException("Choose at least one listing");
    const exportFormat = this.enumValue(MarketplaceExportFormat, input.exportFormat, "Export format") ?? MarketplaceExportFormat.CSV;
    const rows = await this.findListingsByIds(listingIds);
    if (rows.length !== listingIds.length) throw new BadRequestException("Some listings were not found");
    const candidates = await Promise.all(rows.map((listing) => this.buildCandidate(config, listing)));
    const batch = await this.prisma.marketplaceExportBatch.create({
      data: {
        marketplaceConfigId,
        exportFormat,
        selectedListingIdsJson: listingIds,
        notes: this.optionalString(input.notes),
        createdById: actorId,
        updatedById: actorId,
        items: {
          create: candidates.map((candidate) => ({
            listing: { connect: { id: candidate.listingId } },
            status: candidate.eligible ? MarketplaceExportItemStatus.READY : MarketplaceExportItemStatus.BLOCKED,
            eligible: candidate.eligible,
            blockersJson: candidate.blockers,
            warningsJson: candidate.warnings,
            exportSku: candidate.exportSku,
            contentSnapshotJson: candidate.contentSnapshot,
            priceSnapshotJson: candidate.priceSnapshot,
            categorySnapshotJson: candidate.categorySnapshot ?? Prisma.JsonNull,
            imageSnapshotJson: candidate.imageSnapshot,
            variantSnapshotJson: candidate.variantSnapshot,
            rowJson: candidate.row,
          })),
        },
      },
      include: this.batchInclude(),
    });
    await this.audit.log({ actorId, action: "marketplace.export_batch.created", entityType: "MarketplaceExportBatch", entityId: batch.id, metadata: { marketplaceConfigId, exportFormat, listingIds } });
    return this.toBatchDetail(batch);
  }

  async listBatches() {
    const rows = await this.prisma.marketplaceExportBatch.findMany({ include: this.batchInclude(), orderBy: { createdAt: "desc" }, take: 100 });
    return rows.map((row) => this.toBatchSummary(row));
  }

  async getBatch(id: string) {
    const batch = await this.prisma.marketplaceExportBatch.findUnique({ where: { id }, include: this.batchInclude() });
    if (!batch) throw new NotFoundException("Export batch not found");
    return this.toBatchDetail(batch);
  }

  async updateBatchItem(actorId: string, itemId: string, input: Record<string, unknown>) {
    const item = await this.prisma.marketplaceExportItem.findUnique({ where: { id: itemId }, include: { batch: true } });
    if (!item) throw new NotFoundException("Export item not found");
    const row = this.asRecord(item.rowJson);
    const content = this.asRecord(item.contentSnapshotJson);
    const price = this.asRecord(item.priceSnapshotJson);
    const data: Prisma.MarketplaceExportItemUpdateInput = {};
    if (input.exportSku !== undefined) {
      data.exportSku = this.stringValue(input.exportSku, "Export SKU")!;
      data.skuOverrideReason = this.stringValue(input.skuOverrideReason, "SKU override reason") ?? "Manual SKU override";
      row.sku = data.exportSku;
    }
    if (input.title !== undefined) {
      content.title = this.stringValue(input.title, "Title")!;
      row.title = content.title;
    }
    if (input.description !== undefined) {
      content.description = this.optionalString(input.description);
      row.description = content.description;
    }
    if (input.exportPrice !== undefined) {
      const exportPrice = this.numberValue(input.exportPrice, "Export price");
      const priceSnapshot = { ...price, exportPrice, overridden: true, overrideReason: this.stringValue(input.priceOverrideReason, "Price override reason") ?? "Manual price override" };
      data.priceSnapshotJson = priceSnapshot;
      data.priceOverrideReason = priceSnapshot.overrideReason;
      row.price = exportPrice;
    }
    data.contentSnapshotJson = content as Prisma.InputJsonObject;
    data.rowJson = row as Prisma.InputJsonObject;
    const updated = await this.prisma.marketplaceExportItem.update({ where: { id: itemId }, data });
    await this.audit.log({ actorId, action: "marketplace.export_item.updated", entityType: "MarketplaceExportItem", entityId: itemId, metadata: { changed: Object.keys(input), batchId: item.batchId } });
    return updated;
  }

  async markBatchReady(actorId: string, id: string) {
    const batch = await this.prisma.marketplaceExportBatch.findUnique({ where: { id }, include: { items: true } });
    if (!batch) throw new NotFoundException("Export batch not found");
    const blocked = batch.items.filter((item) => !item.eligible || item.status === MarketplaceExportItemStatus.BLOCKED);
    if (blocked.length > 0) throw new BadRequestException("Resolve blocked export items before marking ready");
    const updated = await this.prisma.marketplaceExportBatch.update({ where: { id }, data: { status: MarketplaceExportBatchStatus.READY, updatedById: actorId }, include: this.batchInclude() });
    await this.audit.log({ actorId, action: "marketplace.export_batch.ready", entityType: "MarketplaceExportBatch", entityId: id });
    return this.toBatchDetail(updated);
  }

  async generateBatch(actorId: string, id: string) {
    const batch = await this.prisma.marketplaceExportBatch.findUnique({ where: { id }, include: this.batchInclude() });
    if (!batch) throw new NotFoundException("Export batch not found");
    const readyItems = batch.items.filter((item) => item.eligible && item.status !== MarketplaceExportItemStatus.CANCELED);
    if (readyItems.length === 0) throw new BadRequestException("Batch has no eligible items to export");
    await this.prisma.marketplaceExportBatch.update({ where: { id }, data: { status: MarketplaceExportBatchStatus.EXPORTING, updatedById: actorId } });
    try {
      const generated = await this.generateExportAsset(actorId, batch, readyItems);
      const updated = await this.prisma.marketplaceExportBatch.update({
        where: { id },
        data: {
          status: MarketplaceExportBatchStatus.EXPORTED,
          exportFileAssetId: generated.exportFileAssetId,
          zipFileAssetId: generated.zipFileAssetId,
          generatedAt: new Date(),
          exportedAt: new Date(),
          failureReason: null,
          updatedById: actorId,
        },
        include: this.batchInclude(),
      });
      await this.prisma.marketplaceExportItem.updateMany({ where: { batchId: id, eligible: true }, data: { status: MarketplaceExportItemStatus.EXPORTED } });
      await this.audit.log({ actorId, action: "marketplace.export_batch.generated", entityType: "MarketplaceExportBatch", entityId: id, metadata: { exportFormat: batch.exportFormat, itemCount: readyItems.length, ...generated } });
      return this.toBatchDetail(updated);
    } catch (error) {
      await this.prisma.marketplaceExportBatch.update({ where: { id }, data: { status: MarketplaceExportBatchStatus.FAILED, failureReason: error instanceof Error ? error.message : "Export generation failed" } });
      throw error;
    }
  }

  async getBatchDownload(actorId: string, id: string) {
    const batch = await this.prisma.marketplaceExportBatch.findUnique({ where: { id }, include: { exportFileAsset: true, zipFileAsset: true } });
    if (!batch) throw new NotFoundException("Export batch not found");
    const asset = batch.zipFileAsset ?? batch.exportFileAsset;
    if (!asset) throw new BadRequestException("Export file has not been generated");
    const url = await this.storage.createSignedReadUrl({ objectKey: asset.objectKey, expiresSeconds: 15 * 60 });
    await this.audit.log({ actorId, action: "marketplace.export_file.downloaded", entityType: "MarketplaceExportBatch", entityId: id, metadata: { fileAssetId: asset.id, objectKey: asset.objectKey } });
    return { url, expiresSeconds: 15 * 60, fileAssetId: asset.id, mimeType: asset.mimeType, filename: asset.objectKey.split("/").pop() };
  }

  async markBatchExported(actorId: string, id: string) {
    const batch = await this.prisma.marketplaceExportBatch.findUnique({ where: { id }, include: this.batchInclude() });
    if (!batch) throw new NotFoundException("Export batch not found");
    if (!batch.exportFileAssetId && !batch.zipFileAssetId) throw new BadRequestException("Generate export files before marking exported");
    const exportedListings = [];
    for (const item of batch.items.filter((row) => row.eligible)) {
      const row = this.asRecord(item.rowJson);
      const priceSnapshot = this.asRecord(item.priceSnapshotJson);
      const exported = await this.prisma.exportedListing.upsert({
        where: { marketplaceConfigId_exportSku: { marketplaceConfigId: batch.marketplaceConfigId, exportSku: item.exportSku } },
        create: {
          marketplaceConfigId: batch.marketplaceConfigId,
          listingId: item.listingId,
          exportBatchId: batch.id,
          exportSku: item.exportSku,
          exportTitle: String(row.title ?? "Marketplace listing"),
          exportPrice: new Prisma.Decimal(Number(priceSnapshot.exportPrice ?? row.price ?? 0)),
          currency: String(priceSnapshot.currency ?? row.currency ?? batch.marketplaceConfig.currency),
          categorySnapshotJson: item.categorySnapshotJson ?? undefined,
          imageSnapshotJson: item.imageSnapshotJson ?? undefined,
          contentSnapshotJson: item.contentSnapshotJson ?? undefined,
          priceSnapshotJson: item.priceSnapshotJson ?? undefined,
          status: ExportedListingStatus.EXPORTED,
        },
        update: {
          exportBatchId: batch.id,
          exportTitle: String(row.title ?? "Marketplace listing"),
          exportPrice: new Prisma.Decimal(Number(priceSnapshot.exportPrice ?? row.price ?? 0)),
          currency: String(priceSnapshot.currency ?? row.currency ?? batch.marketplaceConfig.currency),
          categorySnapshotJson: item.categorySnapshotJson ?? undefined,
          imageSnapshotJson: item.imageSnapshotJson ?? undefined,
          contentSnapshotJson: item.contentSnapshotJson ?? undefined,
          priceSnapshotJson: item.priceSnapshotJson ?? undefined,
          status: ExportedListingStatus.EXPORTED,
        },
      });
      exportedListings.push(exported);
    }
    const updated = await this.prisma.marketplaceExportBatch.update({ where: { id }, data: { status: MarketplaceExportBatchStatus.EXPORTED, exportedAt: new Date(), updatedById: actorId }, include: this.batchInclude() });
    await this.audit.log({ actorId, action: "marketplace.export_batch.marked_exported", entityType: "MarketplaceExportBatch", entityId: id, metadata: { exportedListings: exportedListings.length } });
    return this.toBatchDetail(updated);
  }

  async cancelBatch(actorId: string, id: string) {
    const updated = await this.prisma.marketplaceExportBatch.update({ where: { id }, data: { status: MarketplaceExportBatchStatus.CANCELED, updatedById: actorId }, include: this.batchInclude() });
    await this.prisma.marketplaceExportItem.updateMany({ where: { batchId: id }, data: { status: MarketplaceExportItemStatus.CANCELED } });
    await this.audit.log({ actorId, action: "marketplace.export_batch.canceled", entityType: "MarketplaceExportBatch", entityId: id });
    return this.toBatchDetail(updated);
  }

  async listExportedListings(input: { marketplaceConfigId?: string; status?: ExportedListingStatus }) {
    const rows = await this.prisma.exportedListing.findMany({
      where: { marketplaceConfigId: input.marketplaceConfigId, status: input.status },
      include: { marketplaceConfig: true, listing: true },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
    return rows.map((row) => ({
      id: row.id,
      marketplaceConfigId: row.marketplaceConfigId,
      marketplaceName: row.marketplaceConfig.name,
      listingId: row.listingId,
      listingTitle: row.listing.title,
      exportSku: row.exportSku,
      exportTitle: row.exportTitle,
      exportPrice: Number(row.exportPrice),
      currency: row.currency,
      status: row.status,
      externalUrl: row.externalUrl,
      externalListingId: row.externalListingId,
      manuallyListedAt: row.manuallyListedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async updateExportedListing(actorId: string, id: string, input: Record<string, unknown>) {
    const data: Prisma.ExportedListingUpdateInput = {};
    if (input.status !== undefined) data.status = this.enumValue(ExportedListingStatus, input.status, "Exported listing status")!;
    if (input.externalUrl !== undefined) data.externalUrl = this.optionalString(input.externalUrl);
    if (input.externalListingId !== undefined) data.externalListingId = this.optionalString(input.externalListingId);
    if (input.notes !== undefined) data.notes = this.optionalString(input.notes);
    if (input.lastCheckedAt !== undefined) data.lastCheckedAt = input.lastCheckedAt ? new Date(String(input.lastCheckedAt)) : null;
    const row = await this.prisma.exportedListing.update({ where: { id }, data });
    await this.audit.log({ actorId, action: "marketplace.exported_listing.updated", entityType: "ExportedListing", entityId: id, metadata: { changed: Object.keys(input) } });
    return row;
  }

  async markExportedListingListed(actorId: string, id: string, input: Record<string, unknown>) {
    const row = await this.prisma.exportedListing.update({
      where: { id },
      data: {
        status: ExportedListingStatus.MANUALLY_LISTED,
        externalUrl: this.optionalString(input.externalUrl),
        externalListingId: this.optionalString(input.externalListingId),
        manuallyListedById: actorId,
        manuallyListedAt: new Date(),
        notes: this.optionalString(input.notes),
      },
    });
    await this.audit.log({ actorId, action: "marketplace.exported_listing.marked_listed", entityType: "ExportedListing", entityId: id });
    return row;
  }

  async archiveExportedListing(actorId: string, id: string) {
    const row = await this.prisma.exportedListing.update({ where: { id }, data: { status: ExportedListingStatus.ARCHIVED } });
    await this.audit.log({ actorId, action: "marketplace.exported_listing.archived", entityType: "ExportedListing", entityId: id });
    return row;
  }

  async listExternalSales(input: { marketplaceConfigId?: string; status?: MarketplaceExternalSaleStatus }) {
    const rows = await this.prisma.marketplaceExternalSale.findMany({
      where: { marketplaceConfigId: input.marketplaceConfigId, status: input.status },
      include: { marketplaceConfig: true, listing: true, exportedListing: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map((row) => ({
      id: row.id,
      marketplaceConfigId: row.marketplaceConfigId,
      marketplaceName: row.marketplaceConfig.name,
      listingId: row.listingId,
      listingTitle: row.listing.title,
      exportedListingId: row.exportedListingId,
      exportSku: row.exportSku,
      externalOrderId: row.externalOrderId,
      quantity: row.quantity,
      salePrice: Number(row.salePrice),
      currency: row.currency,
      status: row.status,
      source: row.source,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async recordExternalSale(actorId: string, input: Record<string, unknown>) {
    const marketplaceConfigId = this.stringValue(input.marketplaceConfigId, "Marketplace")!;
    await this.ensureConfig(marketplaceConfigId);
    const exportedListingId = this.optionalString(input.exportedListingId);
    const exportedListing = exportedListingId ? await this.prisma.exportedListing.findUnique({ where: { id: exportedListingId } }) : null;
    const listingId = this.stringValue(input.listingId ?? exportedListing?.listingId, "Listing")!;
    const listing = await this.prisma.commerceListing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException("Listing not found");
    const sale = await this.prisma.marketplaceExternalSale.create({
      data: {
        marketplaceConfigId,
        exportedListingId,
        listingId,
        exportSku: this.stringValue(input.exportSku ?? exportedListing?.exportSku, "Export SKU")!,
        externalOrderId: this.optionalString(input.externalOrderId),
        quantity: Math.max(1, Math.trunc(this.numberValue(input.quantity ?? 1, "Quantity"))),
        salePrice: new Prisma.Decimal(this.numberValue(input.salePrice ?? exportedListing?.exportPrice ?? listing.price, "Sale price")),
        currency: this.stringValue(input.currency ?? exportedListing?.currency ?? listing.currency, "Currency")!,
        customerSnapshotJson: this.nullableJsonValue(input.customerSnapshotJson),
        deliverySnapshotJson: this.nullableJsonValue(input.deliverySnapshotJson),
        saleSnapshotJson: this.jsonValue(input.saleSnapshotJson) ?? { recordedAt: new Date().toISOString(), listingTitle: listing.title },
        conversionSnapshotJson: this.jsonValue(input.conversionSnapshotJson) ?? { conversionReady: true, conversionImplemented: false },
        source: MarketplaceExternalSaleSource.MANUAL,
        status: MarketplaceExternalSaleStatus.RECORDED,
        notes: this.optionalString(input.notes),
        createdById: actorId,
      },
    });
    await this.audit.log({ actorId, action: "marketplace.external_sale.recorded", entityType: "MarketplaceExternalSale", entityId: sale.id, metadata: { marketplaceConfigId, listingId, exportedListingId } });
    return sale;
  }

  convertExternalSale() {
    throw new BadRequestException("External sale conversion is model-ready but intentionally deferred for Slice 9.");
  }

  async exportListings(actorId: string, input: { type?: "PRODUCT" | "FILM" }) {
    const rows = await this.prisma.commerceListing.findMany({
      where: {
        status: ListingStatus.PUBLISHED,
        ...(input.type ? { type: input.type as ListingType } : {}),
      },
      orderBy: { publishedAt: "desc" },
      take: 500,
    });
    const exportedAt = new Date().toISOString();
    const items = rows.map((r) => ({
      listingId: r.id,
      type: r.type,
      title: r.title,
      description: r.description,
      slug: r.slug,
      price: Number(r.price),
      currency: r.currency,
      publishedAt: r.publishedAt?.toISOString() ?? null,
      imageCount: Array.isArray(r.imagesJson) ? r.imagesJson.length : 0,
    }));
    const result = {
      exportedAt,
      total: items.length,
      channel: "generic-marketplace",
      type: input.type ?? "ALL",
      items,
    };
    await this.audit.log({
      actorId,
      action: "marketplace.export.generate",
      entityType: "MarketplaceExport",
      entityId: exportedAt,
      metadata: { total: items.length, type: input.type ?? "ALL" },
    });
    return result;
  }

  async exportListingsCsv(actorId: string, input: { type?: "PRODUCT" | "FILM" }) {
    const json = await this.exportListings(actorId, input);
    const header = ["listingId", "type", "title", "description", "slug", "price", "currency", "publishedAt", "imageCount"];
    const lines = [header.join(",")];
    for (const item of json.items) {
      const row = [item.listingId, item.type, this.escapeCsv(item.title), this.escapeCsv(item.description ?? ""), item.slug, String(item.price), item.currency, item.publishedAt ?? "", String(item.imageCount)];
      lines.push(row.join(","));
    }
    return { exportedAt: json.exportedAt, total: json.total, csv: lines.join("\n") };
  }

  private async ensureConfig(id: string) {
    const config = await this.prisma.marketplaceConfig.findUnique({ where: { id } });
    if (!config) throw new NotFoundException("Marketplace config not found");
    return config;
  }

  private async findCandidateListings(input: { type?: "PRODUCT" | "FILM"; search?: string }) {
    return this.prisma.commerceListing.findMany({
      where: {
        status: ListingStatus.PUBLISHED,
        ...(input.type ? { type: input.type as ListingType } : {}),
        ...(input.search ? { OR: [{ title: { contains: input.search, mode: "insensitive" } }, { slug: { contains: input.search, mode: "insensitive" } }] } : {}),
      },
      include: { localBaseProduct: { include: { productType: true } }, designProductSelection: { include: { mockupAssets: true } } },
      orderBy: { publishedAt: "desc" },
      take: 500,
    });
  }

  private async findListingsByIds(ids: string[]) {
    return this.prisma.commerceListing.findMany({
      where: { id: { in: ids } },
      include: { localBaseProduct: { include: { productType: true } }, designProductSelection: { include: { mockupAssets: true } } },
    });
  }

  private async buildCandidate(config: Awaited<ReturnType<MarketplaceService["ensureConfig"]>>, listing: CandidateListing) {
    const blockers: string[] = [];
    const warnings: string[] = [];
    if (listing.status !== ListingStatus.PUBLISHED) blockers.push("LISTING_NOT_PUBLISHED");
    if (!Number.isFinite(Number(listing.price)) || Number(listing.price) <= 0) blockers.push("MISSING_PRICE");
    const productTypeId = listing.localBaseProduct?.productTypeId ?? null;
    if (!productTypeId) blockers.push("MISSING_PRODUCT_TYPE");
    if (!listing.localBaseProductId && listing.type === ListingType.PRODUCT) blockers.push("MISSING_BASE_PRODUCT");
    const mapping = productTypeId
      ? await this.prisma.marketplaceCategoryMapping.findFirst({
          where: {
            marketplaceConfigId: config.id,
            productTypeId,
            isActive: true,
            OR: [{ baseProductId: listing.localBaseProductId }, { baseProductId: null }],
          },
          orderBy: { baseProductId: "desc" },
        })
      : null;
    if (!mapping) blockers.push("MISSING_CATEGORY_MAPPING");
    const images = this.buildImageSnapshot(listing);
    const requirements = this.asRecord(config.imageRequirementsJson);
    const minimumImages = Number(requirements.minimumImages ?? 1);
    if (images.length < minimumImages) blockers.push("MISSING_REQUIRED_IMAGES");
    const requiredTypes = Array.isArray(requirements.requiredTypes) ? requirements.requiredTypes.map(String) : ["MAIN"];
    for (const type of requiredTypes) {
      if (!images.some((image) => image.type === type)) blockers.push(`MISSING_${type}_IMAGE`);
    }
    if (listing.type === ListingType.FILM) warnings.push("FILM_EXPORT_REQUIRES_MARKETPLACE_RIGHTS_REVIEW");
    const exportSku = this.buildSku(config, listing);
    const priceSnapshot = this.buildPriceSnapshot(config, listing);
    const contentSnapshot = this.buildContentSnapshot(config, listing);
    const categorySnapshot = mapping
      ? { mappingId: mapping.id, marketplaceCategoryId: mapping.marketplaceCategoryId, marketplaceCategoryName: mapping.marketplaceCategoryName, requiredAttributes: mapping.requiredAttributesJson ?? {}, valueMappings: mapping.valueMappingsJson ?? {} }
      : null;
    const variantSnapshot = this.buildVariantSnapshot(listing);
    const row = {
      sku: exportSku,
      listingId: listing.id,
      type: listing.type,
      title: contentSnapshot.title,
      description: contentSnapshot.description,
      price: priceSnapshot.exportPrice,
      currency: priceSnapshot.currency,
      categoryId: categorySnapshot?.marketplaceCategoryId ?? "",
      categoryName: categorySnapshot?.marketplaceCategoryName ?? "",
      imageUrls: images.map((image) => image.url).join(" | "),
      slug: listing.slug,
    };
    return {
      listingId: listing.id,
      listingTitle: listing.title,
      type: listing.type,
      eligible: blockers.length === 0,
      blockers,
      warnings,
      exportSku,
      contentSnapshot,
      priceSnapshot,
      categorySnapshot,
      imageSnapshot: { images },
      variantSnapshot,
      row,
    };
  }

  private buildSku(config: { skuPrefix: string; key: ManualMarketplaceKey }, listing: CandidateListing) {
    const base = listing.localBaseProduct?.skuPrefix ?? listing.type;
    const shortId = listing.id.replace(/-/g, "").slice(0, 8).toUpperCase();
    const variant = this.buildVariantCode(listing);
    return [config.skuPrefix || `RPD-${config.key}`, shortId, base, variant].filter(Boolean).join("-").replace(/[^A-Z0-9_-]/gi, "-").toUpperCase();
  }

  private buildVariantCode(listing: CandidateListing) {
    const metadata = this.asRecord(listing.metadataJson);
    const parts = [metadata.size, metadata.color, metadata.material, metadata.printSide].map((value) => (value ? String(value).slice(0, 8) : ""));
    return parts.filter(Boolean).join("-");
  }

  private buildPriceSnapshot(config: { pricingRulesJson: Prisma.JsonValue; currency: string }, listing: CandidateListing) {
    const rules = this.asRecord(config.pricingRulesJson);
    const listingPrice = Number(listing.price);
    const markupPercent = Number(rules.markupPercent ?? 0);
    const fixedMarkup = Number(rules.fixedMarkup ?? 0);
    const rounding = Math.max(1, Number(rules.rounding ?? 1));
    const rawPrice = listingPrice + listingPrice * (markupPercent / 100) + fixedMarkup;
    const exportPrice = Math.ceil(rawPrice / rounding) * rounding;
    return { listingPrice, markupPercent, fixedMarkup, rounding, exportPrice, currency: config.currency || listing.currency, sourceCurrency: listing.currency };
  }

  private buildContentSnapshot(config: { defaultLanguage: string }, listing: CandidateListing) {
    const metadata = this.asRecord(listing.metadataJson);
    const localized = this.asRecord(metadata.localized);
    const language = config.defaultLanguage || "uz-Latn";
    const localizedByLanguage = this.asRecord(localized[language]);
    return {
      language,
      title: String(localizedByLanguage.title ?? listing.title),
      description: String(localizedByLanguage.description ?? listing.description ?? listing.localBaseProduct?.description ?? listing.title),
      tags: Array.isArray(listing.tags) ? listing.tags : [],
      fallbackUsed: !localizedByLanguage.title,
    };
  }

  private buildImageSnapshot(listing: CandidateListing) {
    const mockups = listing.designProductSelection?.mockupAssets ?? [];
    const readyMockups = mockups
      .filter((asset) => asset.status === MockupAssetStatus.READY || asset.status === MockupAssetStatus.GENERATED)
      .filter((asset) => asset.imageUrl || asset.objectKey)
      .sort((a, b) => IMAGE_TYPES.indexOf(a.mockupType) - IMAGE_TYPES.indexOf(b.mockupType));
    if (readyMockups.length > 0) {
      return readyMockups.map((asset, index) => ({
        assetId: asset.id,
        type: asset.mockupType,
        url: asset.imageUrl ?? null,
        objectKey: asset.objectKey ?? null,
        filename: `${listing.slug}-${index + 1}-${asset.mockupType.toLowerCase()}.${asset.format ?? "jpg"}`,
        widthPx: asset.widthPx,
        heightPx: asset.heightPx,
        format: asset.format,
        safeForExport: Boolean(asset.imageUrl),
      }));
    }
    const rawImages = Array.isArray(listing.imagesJson) ? listing.imagesJson : [];
    return rawImages.map((image, index) => ({
      assetId: null,
      type: index === 0 ? "MAIN" : "SECONDARY",
      url: typeof image === "string" ? image : this.asRecord(image).url ?? null,
      objectKey: null,
      filename: `${listing.slug}-${index + 1}.jpg`,
      safeForExport: true,
    }));
  }

  private buildVariantSnapshot(listing: CandidateListing) {
    return {
      baseProductId: listing.localBaseProductId,
      baseProductSkuPrefix: listing.localBaseProduct?.skuPrefix ?? null,
      productTypeId: listing.localBaseProduct?.productTypeId ?? null,
      productTypeSlug: listing.localBaseProduct?.productType.slug ?? listing.productType ?? null,
      metadata: listing.metadataJson ?? {},
    };
  }

  private async generateExportAsset(actorId: string, batch: Prisma.MarketplaceExportBatchGetPayload<{ include: ReturnType<MarketplaceService["batchInclude"]> }>, items: Array<Prisma.MarketplaceExportItemGetPayload<Record<string, never>>>) {
    if (batch.exportFormat === MarketplaceExportFormat.XLSX) {
      const buffer = await this.buildXlsx(items);
      return { exportFileAssetId: await this.storeGeneratedAsset(actorId, batch.id, "xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer) };
    }
    if (batch.exportFormat === MarketplaceExportFormat.ZIP_IMAGES) {
      const buffer = await this.buildZip(items);
      return { zipFileAssetId: await this.storeGeneratedAsset(actorId, batch.id, "zip", "application/zip", buffer) };
    }
    const csv = this.buildCsv(items, batch.exportFormat === MarketplaceExportFormat.CSV_WITH_IMAGE_URLS);
    const buffer = Buffer.from(csv, "utf8");
    return { exportFileAssetId: await this.storeGeneratedAsset(actorId, batch.id, "csv", "text/csv", buffer) };
  }

  private buildCsv(items: Array<{ rowJson: Prisma.JsonValue }>, includeImageUrls: boolean) {
    const headers = ["sku", "listingId", "type", "title", "description", "price", "currency", "categoryId", "categoryName", ...(includeImageUrls ? ["imageUrls"] : []), "slug"];
    const lines = [headers.join(",")];
    for (const item of items) {
      const row = this.asRecord(item.rowJson);
      lines.push(headers.map((header) => this.escapeCsv(String(row[header] ?? ""))).join(","));
    }
    return lines.join("\n");
  }

  private async buildXlsx(items: Array<{ rowJson: Prisma.JsonValue }>) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "RashPOD";
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet("Marketplace Export");
    worksheet.columns = [
      { header: "SKU", key: "sku", width: 28 },
      { header: "Listing ID", key: "listingId", width: 38 },
      { header: "Type", key: "type", width: 12 },
      { header: "Title", key: "title", width: 36 },
      { header: "Description", key: "description", width: 60 },
      { header: "Price", key: "price", width: 14 },
      { header: "Currency", key: "currency", width: 10 },
      { header: "Category ID", key: "categoryId", width: 18 },
      { header: "Category", key: "categoryName", width: 28 },
      { header: "Image URLs", key: "imageUrls", width: 80 },
      { header: "Slug", key: "slug", width: 32 },
    ];
    for (const item of items) worksheet.addRow(this.asRecord(item.rowJson));
    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private buildZip(items: Array<{ rowJson: Prisma.JsonValue; imageSnapshotJson: Prisma.JsonValue; exportSku: string }>) {
    return new Promise<Buffer>((resolve, reject) => {
      const archive = archiver("zip", { zlib: { level: 9 } });
      const chunks: Buffer[] = [];
      archive.on("data", (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      archive.on("warning", reject);
      archive.on("error", reject);
      archive.on("end", () => resolve(Buffer.concat(chunks)));
      const manifest = items.map((item) => ({ sku: item.exportSku, row: this.asRecord(item.rowJson), images: this.asRecord(item.imageSnapshotJson).images ?? [] }));
      archive.append(JSON.stringify(manifest, null, 2), { name: "image-manifest.json" });
      archive.append(this.buildCsv(items, true), { name: "marketplace-export.csv" });
      archive.finalize().catch(reject);
    });
  }

  private async storeGeneratedAsset(actorId: string, batchId: string, extension: string, mimeType: string, buffer: Buffer) {
    const fileId = randomUUID();
    const objectKey = `marketplace-exports/${actorId}/${batchId}/${fileId}.${extension}`;
    const stored = await this.storage.writePrivateObject({ objectKey, buffer, mimeType });
    const file = await this.prisma.fileAsset.create({
      data: {
        id: fileId,
        ownerId: actorId,
        purpose: AssetPurpose.MARKETPLACE_EXPORT,
        storageProvider: stored.storageProvider === "GCS" ? AssetStorageProvider.GCS : AssetStorageProvider.LOCAL_DEV,
        accessPolicy: AssetAccessPolicy.PRIVATE_SIGNED_URL,
        bucket: stored.bucket,
        objectKey,
        mimeType,
        fileExtension: extension,
        sizeBytes: stored.sizeBytes,
        isPublic: false,
        uploadStatus: "READY",
        status: AssetLifecycleStatus.READY,
        uploadedAt: new Date(),
        verifiedAt: new Date(),
      },
    });
    return file.id;
  }

  private batchInclude() {
    return { marketplaceConfig: true, exportFileAsset: true, zipFileAsset: true, items: { include: { listing: true }, orderBy: { createdAt: "asc" as const } } };
  }

  private toConfigDto(row: { id: string; key: ManualMarketplaceKey; marketplaceType: MarketplaceType; name: string; isEnabled: boolean; countryCode: string; currency: string; defaultLanguage: string; supportedLanguages: Prisma.JsonValue; supportedListingTypes: Prisma.JsonValue; exportFormats: Prisma.JsonValue; imageRequirementsJson: Prisma.JsonValue; pricingRulesJson: Prisma.JsonValue; skuPrefix: string; notes: string | null; updatedAt: Date; createdAt: Date }) {
    return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
  }

  private toMappingDto(row: { id: string; marketplaceConfigId: string; productTypeId: string; baseProductId: string | null; marketplaceCategoryId: string; marketplaceCategoryName: string; requiredAttributesJson: Prisma.JsonValue; optionalAttributesJson: Prisma.JsonValue; valueMappingsJson: Prisma.JsonValue; isActive: boolean; updatedAt: Date; createdAt: Date; productType?: { name: string; slug: string } | null; baseProduct?: { name: string; skuPrefix: string } | null }) {
    return { ...row, productTypeName: row.productType?.name, productTypeSlug: row.productType?.slug, baseProductName: row.baseProduct?.name, baseProductSkuPrefix: row.baseProduct?.skuPrefix, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
  }

  private toBatchSummary(batch: any) {
    const items = Array.isArray(batch.items) ? batch.items : [];
    return {
      id: batch.id,
      marketplaceConfigId: batch.marketplaceConfigId,
      marketplaceName: batch.marketplaceConfig?.name,
      status: batch.status,
      exportFormat: batch.exportFormat,
      itemCount: items.length,
      eligibleCount: items.filter((item: any) => item.eligible).length,
      blockedCount: items.filter((item: any) => !item.eligible).length,
      generatedAt: batch.generatedAt?.toISOString?.() ?? null,
      exportedAt: batch.exportedAt?.toISOString?.() ?? null,
      createdAt: batch.createdAt.toISOString(),
      updatedAt: batch.updatedAt.toISOString(),
    };
  }

  private toBatchDetail(batch: any) {
    return {
      ...this.toBatchSummary(batch),
      failureReason: batch.failureReason,
      notes: batch.notes,
      exportFileAssetId: batch.exportFileAssetId,
      zipFileAssetId: batch.zipFileAssetId,
      items: batch.items.map((item: any) => ({
        id: item.id,
        listingId: item.listingId,
        listingTitle: item.listing?.title,
        status: item.status,
        eligible: item.eligible,
        blockers: item.blockersJson ?? [],
        warnings: item.warningsJson ?? [],
        exportSku: item.exportSku,
        contentSnapshot: item.contentSnapshotJson,
        priceSnapshot: item.priceSnapshotJson,
        categorySnapshot: item.categorySnapshotJson,
        imageSnapshot: item.imageSnapshotJson,
        row: item.rowJson,
      })),
    };
  }

  private enumValue<T extends Record<string, string>>(enumObject: T, value: unknown, label: string) {
    if (value === undefined || value === null || value === "") return undefined;
    const normalized = String(value);
    if (!Object.values(enumObject).includes(normalized)) throw new BadRequestException(`${label} is invalid`);
    return normalized as T[keyof T];
  }

  private stringValue(value: unknown, label: string) {
    if (typeof value !== "string" || value.trim().length === 0) throw new BadRequestException(`${label} is required`);
    return value.trim();
  }

  private optionalString(value: unknown) {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text.length > 0 ? text : null;
  }

  private booleanValue(value: unknown, fallback: boolean) {
    if (value === undefined || value === null) return fallback;
    return value === true || value === "true";
  }

  private numberValue(value: unknown, label: string) {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) throw new BadRequestException(`${label} must be a number`);
    return numberValue;
  }

  private stringArrayValue(value: unknown, label: string) {
    if (!Array.isArray(value)) throw new BadRequestException(`${label} must be an array`);
    return value.map((item) => this.stringValue(item, label));
  }

  private jsonValue(value: unknown) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return value as Prisma.InputJsonValue;
  }

  private nullableJsonValue(value: unknown) {
    if (value === undefined) return undefined;
    if (value === null) return Prisma.JsonNull;
    return value as Prisma.InputJsonValue;
  }

  private asRecord(value: unknown): JsonRecord {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
  }

  private escapeCsv(value: string) {
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }
}
