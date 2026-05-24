import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, PodCatalogSyncStatus, PodMappingQuality, PodProviderFileStatus, PodProviderMode, PodProviderType, PodSyncRecordStatus, PodWebhookEventStatus, PlacementUnits } from "@prisma/client";
import { createHash } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { StorageService } from "../files/storage.service";
import { JobDispatcherService } from "../worker-jobs/job-dispatcher.service";
import { PodPlacementTransformService } from "./placement-transform.service";
import { PodProviderAdapter } from "./provider-adapters/pod-provider-adapter";
import { PrintfulProviderAdapter } from "./provider-adapters/printful-provider.adapter";
import { PrintifyProviderAdapter } from "./provider-adapters/printify-provider.adapter";
import { PrintfulWebhookService } from "../printful/printful-webhook.service";

type JsonObject = Record<string, unknown>;

@Injectable()
export class PodService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
    private readonly jobs: JobDispatcherService,
    private readonly transform: PodPlacementTransformService,
    private readonly printful: PrintfulProviderAdapter,
    private readonly printify: PrintifyProviderAdapter,
    private readonly printfulWebhook: PrintfulWebhookService,
  ) {}

  async overview() {
    const [providers, products, mappedProducts, printAreaMappings, readySyncRecords, failedSyncRecords, webhookEvents] = await Promise.all([
      this.prisma.podProviderConfig.count(),
      this.prisma.podProviderProduct.count(),
      this.prisma.podProductMapping.count({ where: { isActive: true } }),
      this.prisma.podPrintAreaMapping.count({ where: { isActive: true } }),
      this.prisma.podProviderSyncRecord.count({ where: { status: { in: [PodSyncRecordStatus.READY, PodSyncRecordStatus.SYNCED] } } }),
      this.prisma.podProviderSyncRecord.count({ where: { status: PodSyncRecordStatus.FAILED } }),
      this.prisma.podWebhookEvent.count(),
    ]);
    return { providers, products, mappedProducts, printAreaMappings, readySyncRecords, failedSyncRecords, webhookEvents };
  }

  async listProviders() {
    const providers = await this.prisma.podProviderConfig.findMany({ orderBy: [{ provider: "asc" }, { mode: "asc" }] });
    return providers.map((provider) => this.safeProvider(provider));
  }

  async createProvider(actorId: string, body: JsonObject) {
    const provider = this.provider(body.provider);
    const mode = this.mode(body.mode ?? "TEST");
    const created = await this.prisma.podProviderConfig.create({
      data: {
        provider,
        mode,
        displayName: this.requiredString(body.displayName, "Display name is required"),
        isEnabled: this.boolean(body.isEnabled, false),
        credentialEnvVar: this.optionalString(body.credentialEnvVar),
        credentialSecretRef: this.optionalString(body.credentialSecretRef),
        webhookSecretEnvVar: this.optionalString(body.webhookSecretEnvVar),
        webhookSecretRef: this.optionalString(body.webhookSecretRef),
        apiBaseUrl: this.optionalString(body.apiBaseUrl),
        storeId: this.optionalString(body.storeId),
        defaultCurrency: this.optionalString(body.defaultCurrency) ?? "USD",
        defaultCountryCode: this.optionalString(body.defaultCountryCode),
        defaultRegion: this.optionalString(body.defaultRegion),
        fulfillmentRegion: this.optionalString(body.fulfillmentRegion),
        sellingRegion: this.optionalString(body.sellingRegion),
        shippingPreference: this.optionalString(body.shippingPreference),
        metadataJson: this.json(body.metadataJson),
        createdById: actorId,
        updatedById: actorId,
      },
    });
    await this.audit.log({ actorId, action: "pod-provider.create", entityType: "PodProviderConfig", entityId: created.id, metadata: { provider, mode } });
    return this.safeProvider(created);
  }

  async updateProvider(actorId: string, id: string, body: JsonObject) {
    await this.ensureProvider(id);
    const updated = await this.prisma.podProviderConfig.update({
      where: { id },
      data: {
        displayName: this.optionalString(body.displayName),
        isEnabled: typeof body.isEnabled === "boolean" ? body.isEnabled : undefined,
        credentialEnvVar: this.optionalStringOrNull(body.credentialEnvVar),
        credentialSecretRef: this.optionalStringOrNull(body.credentialSecretRef),
        webhookSecretEnvVar: this.optionalStringOrNull(body.webhookSecretEnvVar),
        webhookSecretRef: this.optionalStringOrNull(body.webhookSecretRef),
        apiBaseUrl: this.optionalStringOrNull(body.apiBaseUrl),
        storeId: this.optionalStringOrNull(body.storeId),
        defaultCurrency: this.optionalString(body.defaultCurrency),
        defaultCountryCode: this.optionalStringOrNull(body.defaultCountryCode),
        defaultRegion: this.optionalStringOrNull(body.defaultRegion),
        fulfillmentRegion: this.optionalStringOrNull(body.fulfillmentRegion),
        sellingRegion: this.optionalStringOrNull(body.sellingRegion),
        shippingPreference: this.optionalStringOrNull(body.shippingPreference),
        metadataJson: body.metadataJson === undefined ? undefined : this.json(body.metadataJson),
        updatedById: actorId,
      },
    });
    await this.audit.log({ actorId, action: "pod-provider.update", entityType: "PodProviderConfig", entityId: id, metadata: { provider: updated.provider, mode: updated.mode } });
    return this.safeProvider(updated);
  }

  async setProviderEnabled(actorId: string, id: string, enabled: boolean) {
    const updated = await this.prisma.podProviderConfig.update({ where: { id }, data: { isEnabled: enabled, updatedById: actorId } }).catch(() => null);
    if (!updated) throw new NotFoundException("POD_PROVIDER_NOT_FOUND");
    await this.audit.log({ actorId, action: enabled ? "pod-provider.enable" : "pod-provider.disable", entityType: "PodProviderConfig", entityId: id, metadata: { provider: updated.provider, mode: updated.mode } });
    return this.safeProvider(updated);
  }

  async validateProviderConfig(id: string) {
    const provider = await this.ensureProvider(id);
    return this.adapter(provider.provider).validateConfig(provider);
  }

  async syncCatalog(actorId: string, id: string) {
    const provider = await this.ensureProvider(id);
    const status = this.adapter(provider.provider).validateConfig(provider);
    if (!provider.isEnabled) throw new BadRequestException("POD_PROVIDER_DISABLED");
    if (!status.configured) throw new BadRequestException("POD_PROVIDER_CREDENTIALS_MISSING");
    const run = await this.prisma.podProviderCatalogSyncRun.create({
      data: { providerConfigId: provider.id, provider: provider.provider, mode: provider.mode, requestedById: actorId, status: PodCatalogSyncStatus.PENDING },
    });
    const job = await this.jobs.enqueue("SYNC_POD_CATALOG", { providerConfigId: provider.id, syncRunId: run.id });
    await this.prisma.podProviderConfig.update({ where: { id: provider.id }, data: { lastCatalogSyncStatus: PodCatalogSyncStatus.PENDING, updatedById: actorId } });
    await this.audit.log({ actorId, action: "pod-catalog.sync-requested", entityType: "PodProviderCatalogSyncRun", entityId: run.id, metadata: { provider: provider.provider, mode: provider.mode, workerJobId: job.jobId } });
    return { run, job };
  }

  async applyCatalogSync(providerConfigId: string, syncRunId?: string) {
    const provider = await this.ensureProvider(providerConfigId);
    const run = syncRunId ? await this.prisma.podProviderCatalogSyncRun.findUnique({ where: { id: syncRunId } }) : null;
    const actualRun = run ?? await this.prisma.podProviderCatalogSyncRun.create({ data: { providerConfigId: provider.id, provider: provider.provider, mode: provider.mode } });
    await this.prisma.podProviderCatalogSyncRun.update({ where: { id: actualRun.id }, data: { status: PodCatalogSyncStatus.RUNNING, startedAt: new Date() } });
    try {
      const products = await this.adapter(provider.provider).syncCatalog(provider);
      let productsUpserted = 0;
      let variantsSeen = 0;
      let printAreasSeen = 0;
      for (const product of products) {
        const savedProduct = await this.prisma.podProviderProduct.upsert({
          where: { providerConfigId_providerProductId: { providerConfigId: provider.id, providerProductId: product.providerProductId } },
          create: {
            providerConfigId: provider.id,
            provider: provider.provider,
            mode: provider.mode,
            providerProductId: product.providerProductId,
            name: product.name,
            category: product.category,
            brand: product.brand,
            model: product.model,
            description: product.description,
            imageUrlsJson: this.json(product.imageUrls),
            currency: product.currency ?? provider.defaultCurrency,
            baseCost: product.baseCost,
            suggestedRetailPrice: product.suggestedRetailPrice,
            rawMetadataJson: this.json(product.rawMetadata),
            lastSyncedAt: new Date(),
          },
          update: {
            name: product.name,
            category: product.category,
            brand: product.brand,
            model: product.model,
            description: product.description,
            imageUrlsJson: this.json(product.imageUrls),
            currency: product.currency ?? provider.defaultCurrency,
            baseCost: product.baseCost,
            suggestedRetailPrice: product.suggestedRetailPrice,
            rawMetadataJson: this.json(product.rawMetadata),
            availabilityStatus: "AVAILABLE",
            archivedAt: null,
            lastSyncedAt: new Date(),
          },
        });
        productsUpserted += 1;
        for (const variant of product.variants) {
          variantsSeen += 1;
          await this.prisma.podProviderVariant.upsert({
            where: { providerProductId_providerVariantId: { providerProductId: savedProduct.id, providerVariantId: variant.providerVariantId } },
            create: { providerProductId: savedProduct.id, providerVariantId: variant.providerVariantId, name: variant.name, sku: variant.sku, color: variant.color, size: variant.size, material: variant.material, currency: variant.currency ?? provider.defaultCurrency, baseCost: variant.baseCost, suggestedRetailPrice: variant.suggestedRetailPrice, rawMetadataJson: this.json(variant.rawMetadata), lastSyncedAt: new Date() },
            update: { name: variant.name, sku: variant.sku, color: variant.color, size: variant.size, material: variant.material, currency: variant.currency ?? provider.defaultCurrency, baseCost: variant.baseCost, suggestedRetailPrice: variant.suggestedRetailPrice, rawMetadataJson: this.json(variant.rawMetadata), availabilityStatus: "AVAILABLE", archivedAt: null, lastSyncedAt: new Date() },
          });
        }
        for (const area of product.printAreas) {
          printAreasSeen += 1;
          await this.prisma.podProviderPrintArea.upsert({
            where: { providerProductId_providerPrintAreaId: { providerProductId: savedProduct.id, providerPrintAreaId: area.providerPrintAreaId } },
            create: { providerProductId: savedProduct.id, providerPrintAreaId: area.providerPrintAreaId, name: area.name, placement: area.placement, width: area.width, height: area.height, units: area.units ?? PlacementUnits.INCH, dpi: area.dpi, techniquesJson: this.json(area.techniques), rawMetadataJson: this.json(area.rawMetadata), lastSyncedAt: new Date() },
            update: { name: area.name, placement: area.placement, width: area.width, height: area.height, units: area.units ?? PlacementUnits.INCH, dpi: area.dpi, techniquesJson: this.json(area.techniques), rawMetadataJson: this.json(area.rawMetadata), availabilityStatus: "AVAILABLE", archivedAt: null, lastSyncedAt: new Date() },
          });
        }
      }
      await this.prisma.podProviderCatalogSyncRun.update({ where: { id: actualRun.id }, data: { status: PodCatalogSyncStatus.COMPLETED, productsSeen: products.length, productsUpserted, variantsSeen, printAreasSeen, completedAt: new Date() } });
      await this.prisma.podProviderConfig.update({ where: { id: provider.id }, data: { lastCatalogSyncStatus: PodCatalogSyncStatus.COMPLETED, lastCatalogSyncAt: new Date(), lastCatalogSyncError: null } });
      return { productsSeen: products.length, productsUpserted, variantsSeen, printAreasSeen };
    } catch (error) {
      const message = error instanceof Error ? error.message : "POD_CATALOG_SYNC_FAILED";
      await this.prisma.podProviderCatalogSyncRun.update({ where: { id: actualRun.id }, data: { status: PodCatalogSyncStatus.FAILED, errorMessage: message, completedAt: new Date() } });
      await this.prisma.podProviderConfig.update({ where: { id: provider.id }, data: { lastCatalogSyncStatus: PodCatalogSyncStatus.FAILED, lastCatalogSyncError: message } });
      throw error;
    }
  }

  listCatalog(filters: { providerConfigId?: string; availabilityStatus?: string; mapped?: string }) {
    return this.prisma.podProviderProduct.findMany({
      where: {
        providerConfigId: filters.providerConfigId,
        availabilityStatus: this.optionalAvailability(filters.availabilityStatus),
        ...(filters.mapped === "true" ? { productMappings: { some: { isActive: true } } } : {}),
        ...(filters.mapped === "false" ? { productMappings: { none: { isActive: true } } } : {}),
      },
      include: { variants: { take: 20 }, printAreas: { take: 20 }, productMappings: { where: { isActive: true }, take: 5 } },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
  }

  getCatalogProduct(id: string) {
    return this.prisma.podProviderProduct.findUnique({ where: { id }, include: { variants: true, printAreas: true, productMappings: true } });
  }

  listProductMappings(providerConfigId?: string) {
    return this.prisma.podProductMapping.findMany({ where: { providerConfigId }, include: { providerConfig: true, productType: true, baseProduct: true, providerProduct: true }, orderBy: { updatedAt: "desc" }, take: 200 });
  }

  async createProductMapping(actorId: string, body: JsonObject) {
    const providerProduct = await this.prisma.podProviderProduct.findUnique({ where: { id: this.requiredString(body.providerProductId, "Provider product is required") } });
    if (!providerProduct) throw new NotFoundException("POD_PROVIDER_PRODUCT_NOT_FOUND");
    const mapping = await this.prisma.podProductMapping.create({
      data: {
        providerConfigId: this.requiredString(body.providerConfigId ?? providerProduct.providerConfigId, "Provider config is required"),
        productTypeId: this.requiredString(body.productTypeId, "Product type is required"),
        baseProductId: this.optionalString(body.baseProductId),
        providerProductId: providerProduct.id,
        providerVariantIdsJson: this.json(body.providerVariantIdsJson),
        defaultProviderVariantId: this.optionalString(body.defaultProviderVariantId),
        colorMappingJson: this.json(body.colorMappingJson),
        sizeMappingJson: this.json(body.sizeMappingJson),
        materialMappingJson: this.json(body.materialMappingJson),
        region: this.optionalString(body.region),
        currency: this.optionalString(body.currency) ?? providerProduct.currency,
        isActive: this.boolean(body.isActive, true),
        quality: this.quality(body.quality),
        notes: this.optionalString(body.notes),
        metadataJson: this.json(body.metadataJson),
        createdById: actorId,
        updatedById: actorId,
      },
    });
    await this.audit.log({ actorId, action: "pod-product-mapping.create", entityType: "PodProductMapping", entityId: mapping.id, metadata: { providerConfigId: mapping.providerConfigId, productTypeId: mapping.productTypeId } });
    return mapping;
  }

  async updateProductMapping(actorId: string, id: string, body: JsonObject) {
    const mapping = await this.prisma.podProductMapping.update({
      where: { id },
      data: {
        providerVariantIdsJson: body.providerVariantIdsJson === undefined ? undefined : this.json(body.providerVariantIdsJson),
        defaultProviderVariantId: this.optionalStringOrNull(body.defaultProviderVariantId),
        colorMappingJson: body.colorMappingJson === undefined ? undefined : this.json(body.colorMappingJson),
        sizeMappingJson: body.sizeMappingJson === undefined ? undefined : this.json(body.sizeMappingJson),
        materialMappingJson: body.materialMappingJson === undefined ? undefined : this.json(body.materialMappingJson),
        region: this.optionalStringOrNull(body.region),
        currency: this.optionalString(body.currency),
        isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
        quality: body.quality === undefined ? undefined : this.quality(body.quality),
        notes: this.optionalStringOrNull(body.notes),
        metadataJson: body.metadataJson === undefined ? undefined : this.json(body.metadataJson),
        updatedById: actorId,
      },
    }).catch(() => null);
    if (!mapping) throw new NotFoundException("POD_PRODUCT_MAPPING_NOT_FOUND");
    await this.audit.log({ actorId, action: "pod-product-mapping.update", entityType: "PodProductMapping", entityId: id, metadata: { isActive: mapping.isActive, quality: mapping.quality } });
    return mapping;
  }

  listPrintAreaMappings(providerConfigId?: string) {
    return this.prisma.podPrintAreaMapping.findMany({ where: { providerConfigId }, include: { providerConfig: true, printArea: true, providerProduct: true, providerPrintArea: true }, orderBy: { updatedAt: "desc" }, take: 200 });
  }

  async createPrintAreaMapping(actorId: string, body: JsonObject) {
    const mapping = await this.prisma.podPrintAreaMapping.create({
      data: {
        providerConfigId: this.requiredString(body.providerConfigId, "Provider config is required"),
        printAreaId: this.requiredString(body.printAreaId, "RashPOD print area is required"),
        providerProductId: this.requiredString(body.providerProductId, "Provider product is required"),
        providerPrintAreaId: this.requiredString(body.providerPrintAreaId, "Provider print area is required"),
        coordinateSystem: this.optionalString(body.coordinateSystem) ?? "PROVIDER_UNITS",
        providerPlacement: this.optionalString(body.providerPlacement),
        providerUnits: this.units(body.providerUnits),
        providerDpi: this.optionalNumber(body.providerDpi),
        providerWidth: this.optionalNumber(body.providerWidth),
        providerHeight: this.optionalNumber(body.providerHeight),
        offsetX: this.optionalNumber(body.offsetX) ?? 0,
        offsetY: this.optionalNumber(body.offsetY) ?? 0,
        supportsRotation: this.boolean(body.supportsRotation, false),
        minScale: this.optionalNumber(body.minScale),
        maxScale: this.optionalNumber(body.maxScale),
        safeZoneMappingJson: this.json(body.safeZoneMappingJson),
        technique: this.optionalString(body.technique),
        isActive: this.boolean(body.isActive, true),
        quality: this.quality(body.quality),
        notes: this.optionalString(body.notes),
        metadataJson: this.json(body.metadataJson),
        createdById: actorId,
        updatedById: actorId,
      },
    });
    await this.audit.log({ actorId, action: "pod-print-area-mapping.create", entityType: "PodPrintAreaMapping", entityId: mapping.id, metadata: { printAreaId: mapping.printAreaId, providerPrintAreaId: mapping.providerPrintAreaId } });
    return mapping;
  }

  async updatePrintAreaMapping(actorId: string, id: string, body: JsonObject) {
    const mapping = await this.prisma.podPrintAreaMapping.update({
      where: { id },
      data: {
        coordinateSystem: this.optionalString(body.coordinateSystem),
        providerPlacement: this.optionalStringOrNull(body.providerPlacement),
        providerUnits: body.providerUnits === undefined ? undefined : this.units(body.providerUnits),
        providerDpi: this.optionalNumberOrNull(body.providerDpi),
        providerWidth: this.optionalNumberOrNull(body.providerWidth),
        providerHeight: this.optionalNumberOrNull(body.providerHeight),
        offsetX: this.optionalNumber(body.offsetX),
        offsetY: this.optionalNumber(body.offsetY),
        supportsRotation: typeof body.supportsRotation === "boolean" ? body.supportsRotation : undefined,
        minScale: this.optionalNumberOrNull(body.minScale),
        maxScale: this.optionalNumberOrNull(body.maxScale),
        safeZoneMappingJson: body.safeZoneMappingJson === undefined ? undefined : this.json(body.safeZoneMappingJson),
        technique: this.optionalStringOrNull(body.technique),
        isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
        quality: body.quality === undefined ? undefined : this.quality(body.quality),
        notes: this.optionalStringOrNull(body.notes),
        metadataJson: body.metadataJson === undefined ? undefined : this.json(body.metadataJson),
        updatedById: actorId,
      },
    }).catch(() => null);
    if (!mapping) throw new NotFoundException("POD_PRINT_AREA_MAPPING_NOT_FOUND");
    await this.audit.log({ actorId, action: "pod-print-area-mapping.update", entityType: "PodPrintAreaMapping", entityId: id, metadata: { isActive: mapping.isActive, quality: mapping.quality } });
    return mapping;
  }

  async validatePrintAreaMapping(id: string, body: JsonObject) {
    const mapping = await this.prisma.podPrintAreaMapping.findUnique({ where: { id }, include: { printArea: true } });
    if (!mapping) throw new NotFoundException("POD_PRINT_AREA_MAPPING_NOT_FOUND");
    const position = (body.position && typeof body.position === "object" ? body.position : {}) as JsonObject;
    return this.transform.transform({
      position: {
        width: this.optionalNumber(position.width) ?? mapping.printArea.width,
        height: this.optionalNumber(position.height) ?? mapping.printArea.height,
        x: this.optionalNumber(position.x) ?? 0,
        y: this.optionalNumber(position.y) ?? 0,
        scale: this.optionalNumber(position.scale) ?? 1,
        rotation: this.optionalNumber(position.rotation) ?? 0,
        units: this.units(position.units ?? PlacementUnits.PX),
      },
      localPrintArea: mapping.printArea,
      mapping,
    });
  }

  async listGlobalCandidates(providerConfigId?: string) {
    const listings = await this.prisma.commerceListing.findMany({
      where: { type: "PRODUCT", status: { in: ["PUBLISHED", "READY_TO_PUBLISH", "READY_FOR_REVIEW", "DRAFT"] } },
      include: { localBaseProduct: true, designProductSelection: { include: { placementPreset: true } }, podSyncRecords: { take: 5, orderBy: { updatedAt: "desc" } } },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    const candidates = [];
    for (const listing of listings) {
      candidates.push({ listing, readiness: await this.readinessForListing(listing.id, providerConfigId) });
    }
    return candidates;
  }

  validateGlobalCandidate(listingId: string, body: JsonObject) {
    return this.readinessForListing(listingId, this.optionalString(body.providerConfigId));
  }

  async createSyncRecord(actorId: string, listingId: string, body: JsonObject) {
    const readiness = await this.readinessForListing(listingId, this.requiredString(body.providerConfigId, "Provider config is required"));
    if (!readiness.providerConfig || !readiness.productMapping) throw new BadRequestException("POD_SYNC_BLOCKED: provider and product mapping are required");
    const providerConfig = readiness.providerConfig;
    const mapping = readiness.productMapping;
    const printAreaMapping = readiness.printAreaMapping;
    const listing = readiness.listing;
    const placementPayload = readiness.transform?.payload ?? { version: 1, status: "MANUAL_REVIEW", blockers: readiness.blockers };
    const placementHash = readiness.transform?.placementHash ?? createHash("sha256").update(JSON.stringify(placementPayload)).digest("hex").slice(0, 32);
    const status = readiness.blockers.length === 0 ? PodSyncRecordStatus.READY : PodSyncRecordStatus.MANUAL_REVIEW;
    const syncRecord = await this.prisma.podProviderSyncRecord.upsert({
      where: { providerConfigId_listingId_productMappingId_placementHash: { providerConfigId: providerConfig.id, listingId, productMappingId: mapping.id, placementHash } },
      create: {
        providerConfigId: providerConfig.id,
        provider: providerConfig.provider,
        mode: providerConfig.mode,
        listingId,
        designId: listing.designAssetId,
        designVersionId: undefined,
        productTypeId: mapping.productTypeId,
        baseProductId: mapping.baseProductId,
        productMappingId: mapping.id,
        printAreaMappingId: printAreaMapping?.id,
        providerProductId: mapping.providerProductId,
        providerVariantId: mapping.defaultProviderVariantId,
        status,
        failureReason: readiness.blockers.length > 0 ? readiness.blockers.join("; ") : undefined,
        placementHash,
        providerPlacementPayloadSnapshotJson: placementPayload as Prisma.InputJsonValue,
        payloadSnapshotJson: this.json({ listingId, productMappingId: mapping.id, printAreaMappingId: printAreaMapping?.id, providerVariantId: mapping.defaultProviderVariantId }),
        createdById: actorId,
      },
      update: { status, failureReason: readiness.blockers.length > 0 ? readiness.blockers.join("; ") : null, providerPlacementPayloadSnapshotJson: placementPayload as Prisma.InputJsonValue, updatedAt: new Date() },
    });
    await this.audit.log({ actorId, action: "pod-sync-record.create", entityType: "PodProviderSyncRecord", entityId: syncRecord.id, metadata: { status, blockers: readiness.blockers } });
    return { syncRecord, readiness };
  }

  async prepareProviderFile(actorId: string, body: JsonObject) {
    const providerConfig = await this.ensureProvider(this.requiredString(body.providerConfigId, "Provider config is required"));
    const sourceAsset = await this.prisma.fileAsset.findUnique({ where: { id: this.requiredString(body.sourceAssetId, "Source asset is required") } });
    if (!sourceAsset) throw new NotFoundException("SOURCE_ASSET_NOT_FOUND");
    if (!["READY", "UPLOADED"].includes(sourceAsset.status)) throw new BadRequestException("POD_PROVIDER_FILE_BLOCKED: source asset is not ready");
    const transferUrl = await this.storage.createSignedReadUrl({ objectKey: sourceAsset.objectKey, expiresSeconds: 60 * 60 });
    const adapterResult = await this.adapter(providerConfig.provider).uploadFile(providerConfig, { sourceAssetId: sourceAsset.id, transferUrl, mimeType: sourceAsset.mimeType });
    const file = await this.prisma.podProviderFile.upsert({
      where: { providerConfigId_sourceAssetId: { providerConfigId: providerConfig.id, sourceAssetId: sourceAsset.id } },
      create: { providerConfigId: providerConfig.id, provider: providerConfig.provider, mode: providerConfig.mode, sourceAssetId: sourceAsset.id, designId: sourceAsset.designId, designVersionId: sourceAsset.designVersionId, providerFileId: adapterResult.providerFileId, transferUrlSnapshot: transferUrl, status: PodProviderFileStatus.UPLOADED, uploadedAt: new Date(), expiresAt: new Date(Date.now() + 60 * 60 * 1000), metadataJson: this.json(adapterResult.metadata) },
      update: { providerFileId: adapterResult.providerFileId, transferUrlSnapshot: transferUrl, status: PodProviderFileStatus.UPLOADED, failureReason: null, uploadedAt: new Date(), expiresAt: new Date(Date.now() + 60 * 60 * 1000), metadataJson: this.json(adapterResult.metadata) },
    });
    await this.audit.log({ actorId, action: "pod-provider-file.prepare", entityType: "PodProviderFile", entityId: file.id, metadata: { provider: providerConfig.provider, sourceAssetId: sourceAsset.id } });
    return { ...file, transferUrlSnapshot: undefined };
  }

  listSyncRecords(filters: { providerConfigId?: string; status?: string }) {
    return this.prisma.podProviderSyncRecord.findMany({
      where: { providerConfigId: filters.providerConfigId, status: this.optionalSyncStatus(filters.status) },
      include: { providerConfig: true, listing: true, productMapping: true, printAreaMapping: true, mockups: true },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
  }

  getSyncRecord(id: string) {
    return this.prisma.podProviderSyncRecord.findUnique({ where: { id }, include: { providerConfig: true, listing: true, productMapping: true, printAreaMapping: true, providerFile: true, mockups: true } });
  }

  async syncRecord(actorId: string, id: string) {
    const syncRecord = await this.prisma.podProviderSyncRecord.findUnique({ where: { id }, include: { providerConfig: true } });
    if (!syncRecord) throw new NotFoundException("POD_SYNC_RECORD_NOT_FOUND");
    if (syncRecord.status !== PodSyncRecordStatus.READY && syncRecord.status !== PodSyncRecordStatus.FAILED) throw new BadRequestException("POD_SYNC_RECORD_NOT_READY");
    const job = await this.jobs.enqueue("SYNC_POD_PRODUCT_DRAFT", { syncRecordId: id });
    const updated = await this.prisma.podProviderSyncRecord.update({ where: { id }, data: { status: PodSyncRecordStatus.SYNCING } });
    await this.audit.log({ actorId, action: "pod-sync-record.sync-requested", entityType: "PodProviderSyncRecord", entityId: id, metadata: { workerJobId: job.jobId } });
    return { syncRecord: updated, job };
  }

  async applySyncRecord(id: string) {
    const syncRecord = await this.prisma.podProviderSyncRecord.findUnique({ where: { id }, include: { providerConfig: true } });
    if (!syncRecord) throw new NotFoundException("POD_SYNC_RECORD_NOT_FOUND");
    try {
      const response = await this.adapter(syncRecord.provider).createProductDraft(syncRecord.providerConfig, (syncRecord.payloadSnapshotJson ?? {}) as JsonObject);
      return this.prisma.podProviderSyncRecord.update({ where: { id }, data: { status: PodSyncRecordStatus.SYNCED, providerDraftProductId: response.providerDraftProductId, responseSnapshotJson: this.json(response.response), failureReason: null, syncedAt: new Date() } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "POD_SYNC_RECORD_FAILED";
      return this.prisma.podProviderSyncRecord.update({ where: { id }, data: { status: PodSyncRecordStatus.FAILED, failureReason: message, responseSnapshotJson: this.json({ error: message }) } });
    }
  }

  async cancelSyncRecord(actorId: string, id: string) {
    const updated = await this.prisma.podProviderSyncRecord.update({ where: { id }, data: { status: PodSyncRecordStatus.CANCELED } }).catch(() => null);
    if (!updated) throw new NotFoundException("POD_SYNC_RECORD_NOT_FOUND");
    await this.audit.log({ actorId, action: "pod-sync-record.cancel", entityType: "PodProviderSyncRecord", entityId: id, metadata: {} });
    return updated;
  }

  async logWebhook(providerText: string, body: JsonObject, signature?: string) {
    const provider = this.provider(providerText);
    if (provider === PodProviderType.PRINTFUL) {
      const printfulResult = await this.printfulWebhook.handleWebhook(body, signature);
      if (!printfulResult.accepted) {
        return { accepted: false, eventId: null, reason: printfulResult.reason };
      }
    }
    const config = await this.prisma.podProviderConfig.findFirst({ where: { provider, isEnabled: true }, orderBy: { updatedAt: "desc" } });
    const signatureValid = config?.webhookSecretEnvVar || config?.webhookSecretRef ? Boolean(signature) : undefined;
    const event = await this.prisma.podWebhookEvent.create({
      data: {
        provider,
        providerConfigId: config?.id,
        mode: config?.mode,
        eventType: this.optionalString(body.type ?? body.event),
        signatureValid,
        status: signatureValid === false ? PodWebhookEventStatus.REJECTED : PodWebhookEventStatus.ACCEPTED,
        payloadSummaryJson: this.json({ keys: Object.keys(body).slice(0, 20) }),
        rawPayloadJson: this.json(body),
      },
    });
    return { accepted: event.status !== PodWebhookEventStatus.REJECTED, eventId: event.id };
  }

  private async readinessForListing(listingId: string, providerConfigId?: string) {
    const listing = await this.prisma.commerceListing.findUnique({
      where: { id: listingId },
      include: { localBaseProduct: true, designProductSelection: { include: { design: true } } },
    });
    if (!listing) throw new NotFoundException("LISTING_NOT_FOUND");
    const blockers: string[] = [];
    if (listing.type !== "PRODUCT") blockers.push("Only product listings can enter global POD provider sync.");
    const providerConfig = providerConfigId ? await this.prisma.podProviderConfig.findUnique({ where: { id: providerConfigId } }) : await this.prisma.podProviderConfig.findFirst({ where: { isEnabled: true }, orderBy: { updatedAt: "desc" } });
    if (!providerConfig) blockers.push("Provider configuration is missing.");
    if (providerConfig && !providerConfig.isEnabled) blockers.push("Provider is disabled.");
    if (providerConfig) {
      const status = this.adapter(providerConfig.provider).validateConfig(providerConfig);
      if (!status.configured) blockers.push(status.message ?? "Provider credentials are missing.");
    }
    const productMapping = providerConfig ? await this.prisma.podProductMapping.findFirst({ where: { providerConfigId: providerConfig.id, isActive: true, productTypeId: listing.localBaseProduct?.productTypeId, OR: [{ baseProductId: listing.localBaseProductId }, { baseProductId: null }] }, include: { providerProduct: true }, orderBy: [{ baseProductId: "desc" }, { updatedAt: "desc" }] }) : null;
    if (!productMapping) blockers.push("Product mapping is missing.");
    if (productMapping && !productMapping.defaultProviderVariantId) blockers.push("Default provider variant is missing.");
    const printAreaMapping = providerConfig && listing.designProductSelection?.placementConfigJson && productMapping
      ? await this.findPrintAreaMapping(providerConfig.id, productMapping.providerProductId, listing.designProductSelection.placementConfigJson)
      : null;
    if (listing.designProductSelection?.placementConfigJson && !printAreaMapping) blockers.push("Print area mapping is missing.");
    let transformResult: ReturnType<PodPlacementTransformService["transform"]> | undefined;
    if (printAreaMapping && listing.designProductSelection) {
      try {
        transformResult = this.transform.transform({
          position: { width: listing.designProductSelection.width, height: listing.designProductSelection.height, x: listing.designProductSelection.x, y: listing.designProductSelection.y, left: listing.designProductSelection.left, top: listing.designProductSelection.top, scale: listing.designProductSelection.scale, rotation: listing.designProductSelection.rotation, units: listing.designProductSelection.units },
          localPrintArea: printAreaMapping.printArea,
          mapping: printAreaMapping,
        });
      } catch (error) {
        blockers.push(error instanceof Error ? error.message : "Placement transform failed.");
      }
    }
    return { eligible: blockers.length === 0, blockers, listing, providerConfig: providerConfig ? this.safeProvider(providerConfig) as typeof providerConfig : null, productMapping, printAreaMapping, transform: transformResult };
  }

  private async findPrintAreaMapping(providerConfigId: string, providerProductId: string, placementConfig: Prisma.JsonValue) {
    const printAreaId = this.printAreaIdFromPlacementConfig(placementConfig);
    if (!printAreaId) return null;
    return this.prisma.podPrintAreaMapping.findFirst({ where: { providerConfigId, providerProductId, printAreaId, isActive: true }, include: { printArea: true }, orderBy: { updatedAt: "desc" } });
  }

  private printAreaIdFromPlacementConfig(value: Prisma.JsonValue) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    const printArea = (value as JsonObject).printArea;
    if (!printArea || typeof printArea !== "object" || Array.isArray(printArea)) return undefined;
    const id = (printArea as JsonObject).id;
    return typeof id === "string" ? id : undefined;
  }

  private async ensureProvider(id: string) {
    const provider = await this.prisma.podProviderConfig.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException("POD_PROVIDER_NOT_FOUND");
    return provider;
  }

  private adapter(provider: PodProviderType): PodProviderAdapter {
    return provider === PodProviderType.PRINTFUL ? this.printful : this.printify;
  }

  private safeProvider<T extends { credentialEnvVar?: string | null; credentialSecretRef?: string | null; webhookSecretEnvVar?: string | null; webhookSecretRef?: string | null }>(provider: T) {
    return {
      ...provider,
      credentialConfigured: Boolean(provider.credentialEnvVar || provider.credentialSecretRef),
      webhookSecretConfigured: Boolean(provider.webhookSecretEnvVar || provider.webhookSecretRef),
      credentialEnvVar: provider.credentialEnvVar ?? undefined,
      credentialSecretRef: provider.credentialSecretRef ? "CONFIGURED" : undefined,
      webhookSecretEnvVar: provider.webhookSecretEnvVar ?? undefined,
      webhookSecretRef: provider.webhookSecretRef ? "CONFIGURED" : undefined,
    };
  }

  private provider(value: unknown): PodProviderType {
    const normalized = String(value ?? "").trim().toUpperCase();
    if (normalized in PodProviderType) return normalized as PodProviderType;
    throw new BadRequestException("INVALID_POD_PROVIDER");
  }

  private mode(value: unknown): PodProviderMode {
    const normalized = String(value ?? "TEST").trim().toUpperCase();
    if (normalized in PodProviderMode) return normalized as PodProviderMode;
    throw new BadRequestException("INVALID_POD_PROVIDER_MODE");
  }

  private units(value: unknown): PlacementUnits {
    const normalized = String(value ?? "INCH").trim().toUpperCase();
    if (normalized in PlacementUnits) return normalized as PlacementUnits;
    throw new BadRequestException("INVALID_PLACEMENT_UNITS");
  }

  private quality(value: unknown): PodMappingQuality {
    const normalized = String(value ?? "MANUAL_REVIEW").trim().toUpperCase();
    if (normalized in PodMappingQuality) return normalized as PodMappingQuality;
    throw new BadRequestException("INVALID_POD_MAPPING_QUALITY");
  }

  private optionalAvailability(value?: string) {
    if (!value) return undefined;
    const normalized = value.trim().toUpperCase();
    if (["AVAILABLE", "UNAVAILABLE", "ARCHIVED"].includes(normalized)) return normalized as any;
    return undefined;
  }

  private optionalSyncStatus(value?: string) {
    if (!value) return undefined;
    const normalized = value.trim().toUpperCase();
    if (normalized in PodSyncRecordStatus) return normalized as PodSyncRecordStatus;
    return undefined;
  }

  private requiredString(value: unknown, message: string) {
    const text = this.optionalString(value);
    if (!text) throw new BadRequestException(message);
    return text;
  }

  private optionalString(value: unknown) {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
  }

  private optionalStringOrNull(value: unknown) {
    if (value === null) return null;
    return this.optionalString(value);
  }

  private optionalNumber(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim().length > 0 && Number.isFinite(Number(value))) return Number(value);
    return undefined;
  }

  private optionalNumberOrNull(value: unknown) {
    if (value === null) return null;
    return this.optionalNumber(value);
  }

  private boolean(value: unknown, fallback: boolean) {
    return typeof value === "boolean" ? value : fallback;
  }

  private json(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined || value === null) return undefined;
    return value as Prisma.InputJsonValue;
  }
}
