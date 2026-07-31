import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  ListingStatus,
  MarketplaceKind,
  MarketplacePublicationStatus,
  MockupAssetType,
  PipelineType,
  PlacementAlignment,
  PlacementKind,
  PlacementUnits,
  Prisma,
  ProviderType,
} from "@prisma/client";
import { mapCatalogProductToTemplate } from "@rashpod/printful";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { JobDispatcherService } from "../worker-jobs/job-dispatcher.service";
import { ListPrintfulCatalogProductsQueryDto, PreparePrintfulCatalogProductDto, PublishPrintfulListingDto } from "./dto/printful-catalog.dto";
import { PrintfulClient } from "./printful.client";

type JsonRecord = Record<string, unknown>;

@Injectable()
export class PrintfulPublicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly client: PrintfulClient,
    private readonly jobs: JobDispatcherService,
    private readonly audit: AuditService,
  ) {}

  async listStores() {
    const rows: Array<{ id?: number; name?: string; type?: string; website?: string }> = [];
    const limit = 100;
    let offset = 0;
    let total = 0;
    do {
      const response = await this.client.listStores({ offset, limit });
      rows.push(...(response.result ?? []));
      total = response.paging?.total ?? rows.length;
      const pageOffset = response.paging?.offset ?? offset;
      const pageLimit = response.paging?.limit ?? limit;
      offset = pageOffset + pageLimit;
    } while (offset < total);

    return rows
      .filter((store) => store.id != null)
      .map((store) => {
        const type = store.type || "unknown";
        const directPublishingSupported = this.supportsDirectPublishing(type);
        return {
          id: String(store.id),
          name: store.name || `Printful store ${store.id}`,
          type,
          website: store.website || null,
          directPublishingSupported,
          publishingMode: directPublishingSupported ? "PRINTFUL_PRODUCTS_API" : "EXTERNAL_PLATFORM_CONNECTOR_REQUIRED",
        };
      });
  }

  async listPublications(listingId: string) {
    const rows = await this.prisma.marketplacePublication.findMany({
      where: { productListingId: listingId, provider: ProviderType.PRINTFUL },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((row) => {
      const metadata = this.record(row.metadataJson);
      const targetStore = this.record(metadata.targetStore);
      return {
        id: row.id,
        storeId: row.providerStoreId,
        storeName: String(targetStore.name ?? row.providerStoreId ?? "Printful store"),
        status: row.status,
        providerSyncProductId: row.providerSyncProductId,
        errorMessage: row.errorMessage,
        lastSyncedAt: row.lastSyncedAt,
        updatedAt: row.updatedAt,
      };
    });
  }

  async listCategories() {
    const response = await this.client.listCategories();
    return (response.result ?? [])
      .filter((category) => category.id != null)
      .map((category) => ({
        id: Number(category.id),
        parentId: category.parent_id == null ? null : Number(category.parent_id),
        title: category.title || `Category ${category.id}`,
        imageUrl: category.image_url || null,
        size: category.size || null,
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  async listProducts(query: ListPrintfulCatalogProductsQueryDto) {
    const limit = query.limit ?? 40;
    const response = await this.client.listCatalogProducts({
      categoryId: query.categoryId,
      offset: query.offset ?? 0,
      limit,
    });
    const search = query.search?.toLocaleLowerCase();
    const items = (response.result ?? [])
      .map((product) => this.normalizeProductSummary(product))
      .filter((product) => !search || `${product.title} ${product.brand ?? ""} ${product.typeName ?? ""}`.toLocaleLowerCase().includes(search));
    return {
      items,
      paging: {
        total: response.paging?.total ?? items.length,
        offset: response.paging?.offset ?? query.offset ?? 0,
        limit: response.paging?.limit ?? limit,
      },
    };
  }

  async getProduct(productId: number) {
    const [response, printfilesResponse] = await Promise.all([
      this.client.getCatalogProduct(productId),
      this.client.getPrintfiles(productId),
    ]);
    const result = this.record(response.result);
    const product = this.record(result.product);
    const variants = Array.isArray(result.variants) ? result.variants.map((variant) => this.record(variant)) : [];
    const printfiles = this.record(printfilesResponse.result);
    const availableTechniques = this.record(printfiles.available_techniques);
    const variantPrintfiles = Array.isArray(printfiles.variant_printfiles)
      ? printfiles.variant_printfiles.map((entry) => this.record(entry))
      : [];
    const placements = [...new Set(variantPrintfiles.flatMap((entry) =>
      Array.isArray(entry.printfiles)
        ? entry.printfiles.map((printfile) => String(this.record(printfile).placement ?? "")).filter(Boolean)
        : [],
    ))];
    if (!Object.keys(product).length) throw new NotFoundException("PRINTFUL_PRODUCT_NOT_FOUND");
    return {
      ...this.normalizeProductSummary(product),
      techniques: Object.keys(availableTechniques),
      placements,
      variants: variants.map((variant) => ({
        id: Number(variant.id),
        name: String(variant.name ?? (`${variant.color ?? ""} ${variant.size ?? ""}`.trim() || `Variant ${variant.id}`)),
        color: variant.color == null ? null : String(variant.color),
        colorCode: variant.color_code == null ? null : String(variant.color_code),
        size: variant.size == null ? null : String(variant.size),
        imageUrl: variant.image == null ? null : String(variant.image),
        price: variant.price == null ? null : String(variant.price),
        inStock: variant.in_stock !== false,
      })),
    };
  }

  async prepareCatalogProduct(actorId: string, productId: number, dto: PreparePrintfulCatalogProductDto) {
    const [productResponse, printfilesResponse] = await Promise.all([
      this.client.getCatalogProduct(productId),
      this.client.getPrintfiles(productId),
    ]);
    const result = this.record(productResponse.result);
    const product = this.record(result.product);
    const variants = Array.isArray(result.variants) ? result.variants.map((variant) => this.record(variant)) : [];
    if (!Object.keys(product).length) throw new NotFoundException("PRINTFUL_PRODUCT_NOT_FOUND");

    const availableVariantIds = variants
      .filter((variant) => variant.in_stock !== false && variant.id != null)
      .map((variant) => Number(variant.id))
      .filter(Number.isFinite);
    if (!availableVariantIds.length) throw new BadRequestException("INVALID_PRINTFUL_VARIANT: no in-stock variants are available");

    const printfiles = this.record(printfilesResponse.result);
    const availableTechniques = Object.keys(this.record(printfiles.available_techniques));
    const providerPlacements = this.providerPlacements(printfiles);
    const defaultTechnique = availableTechniques.includes("dtg") ? "dtg" : availableTechniques[0] ?? "dtg";
    const defaultPlacement = providerPlacements.includes("front") ? "front" : providerPlacements[0] ?? "front";
    const rashpodProductType = dto.rashpodProductType?.trim()
      || String(product.type_name ?? product.type ?? "Printful product");
    const mapped = mapCatalogProductToTemplate({
      allowlistItem: {
        catalogProductId: productId,
        rashpodProductType,
        displayName: String(product.title ?? product.name ?? `Printful product ${productId}`),
        defaultVariantIds: availableVariantIds,
        defaultTechnique,
        defaultPlacement,
      },
      product: { ...product, variants },
      printfiles,
    });

    const template = await this.prisma.printfulProductTemplate.upsert({
      where: {
        provider_printfulCatalogProductId_displayName: {
          provider: ProviderType.PRINTFUL,
          printfulCatalogProductId: mapped.printfulCatalogProductId,
          displayName: mapped.displayName,
        },
      },
      create: {
        provider: ProviderType.PRINTFUL,
        rashpodProductType: mapped.rashpodProductType,
        displayName: mapped.displayName,
        printfulCatalogProductId: mapped.printfulCatalogProductId,
        printfulProductName: mapped.printfulProductName,
        printfulVariantIds: mapped.printfulVariantIds,
        allowedColorVariantIds: mapped.allowedColorVariantIds ?? mapped.printfulVariantIds,
        allowedSizeVariantIds: mapped.allowedSizeVariantIds ?? mapped.printfulVariantIds,
        allowedPlacements: mapped.allowedPlacements,
        allowedTechniques: mapped.allowedTechniques,
        defaultTechnique: mapped.defaultTechnique,
        defaultPlacement: mapped.defaultPlacement,
        defaultRetailPrice: mapped.defaultRetailPrice == null ? null : new Prisma.Decimal(mapped.defaultRetailPrice),
        estimatedBaseCost: mapped.estimatedBaseCost == null ? null : new Prisma.Decimal(mapped.estimatedBaseCost),
        currency: mapped.currency,
        previewImageUrl: mapped.previewImageUrl,
        printAreasJson: mapped.printAreasJson as Prisma.InputJsonValue,
        metadataJson: mapped.metadataJson as Prisma.InputJsonValue,
        active: true,
      },
      update: {
        rashpodProductType: mapped.rashpodProductType,
        printfulProductName: mapped.printfulProductName,
        printfulVariantIds: mapped.printfulVariantIds,
        allowedColorVariantIds: mapped.allowedColorVariantIds ?? mapped.printfulVariantIds,
        allowedSizeVariantIds: mapped.allowedSizeVariantIds ?? mapped.printfulVariantIds,
        allowedPlacements: mapped.allowedPlacements,
        allowedTechniques: mapped.allowedTechniques,
        defaultTechnique: mapped.defaultTechnique,
        defaultPlacement: mapped.defaultPlacement,
        defaultRetailPrice: mapped.defaultRetailPrice == null ? undefined : new Prisma.Decimal(mapped.defaultRetailPrice),
        estimatedBaseCost: mapped.estimatedBaseCost == null ? undefined : new Prisma.Decimal(mapped.estimatedBaseCost),
        currency: mapped.currency,
        previewImageUrl: mapped.previewImageUrl,
        printAreasJson: mapped.printAreasJson as Prisma.InputJsonValue,
        metadataJson: mapped.metadataJson as Prisma.InputJsonValue,
        active: true,
      },
    });
    const presets = await this.ensureProviderPlacementPresets(template.id, mapped.allowedPlacements, mapped.printAreasJson);
    await this.audit.log({
      actorId,
      action: "printful.catalog-product.prepared-for-moderation",
      entityType: "PrintfulProductTemplate",
      entityId: template.id,
      metadata: { catalogProductId: productId, providerPlacements: presets.map((preset) => preset.providerPlacement) },
    });
    return {
      template,
      presets,
      product: {
        ...this.normalizeProductSummary(product),
        techniques: availableTechniques,
        placements: providerPlacements,
        variants: variants.map((variant) => ({
          id: Number(variant.id),
          name: String(variant.name ?? (`${variant.color ?? ""} ${variant.size ?? ""}`.trim() || `Variant ${variant.id}`)),
          color: variant.color == null ? null : String(variant.color),
          colorCode: variant.color_code == null ? null : String(variant.color_code),
          size: variant.size == null ? null : String(variant.size),
          imageUrl: variant.image == null ? null : String(variant.image),
          price: variant.price == null ? null : String(variant.price),
          inStock: variant.in_stock !== false,
        })),
      },
    };
  }

  async publish(actorId: string, listingId: string, dto: PublishPrintfulListingDto) {
    const publicationVersion = randomUUID();
    const [listing, stores, productResponse] = await Promise.all([
      this.prisma.commerceListing.findUnique({
        where: { id: listingId },
        include: {
          designProductSelection: { include: { printfulProductTemplate: true, mockupAssets: true } },
          designAsset: { include: { commercialRights: true } },
        },
      }),
      this.listStores(),
      this.client.getCatalogProduct(dto.catalogProductId),
    ]);
    if (!listing) throw new NotFoundException("LISTING_NOT_FOUND");
    if (!listing.designProductSelection) throw new BadRequestException("PRINTFUL_SELECTION_MISSING");
    if (!listing.designAsset) throw new BadRequestException("PRINTFUL_DESIGN_MISSING");
    if (!listing.designAsset.commercialRights?.allowProductSales) throw new BadRequestException("PRODUCT_SALES_RIGHTS_REQUIRED");
    if (!listing.designAsset.commercialRights.allowMarketplacePublishing) throw new BadRequestException("MARKETPLACE_RIGHTS_REQUIRED");
    if (listing.pipeline !== PipelineType.GLOBAL_PRINTFUL || listing.designProductSelection.pipeline !== PipelineType.GLOBAL_PRINTFUL) {
      throw new BadRequestException("PRINTFUL_SELECTION_MISMATCH: listing is not approved for the Printful pipeline");
    }
    const approvedTemplate = listing.designProductSelection.printfulProductTemplate;
    if (!approvedTemplate) throw new BadRequestException("PRINTFUL_SELECTION_MISSING");
    const requiredMockups = [MockupAssetType.MAIN, MockupAssetType.LIFESTYLE, MockupAssetType.DETAIL];
    const readyMockupTypes = new Set(listing.designProductSelection.mockupAssets
      .filter((asset) => asset.status === "READY")
      .map((asset) => asset.mockupType));
    const missingMockups = requiredMockups.filter((type) => !readyMockupTypes.has(type));
    if (missingMockups.length) {
      throw new BadRequestException(`PRINTFUL_MOCKUPS_NOT_READY:${missingMockups.join(",")}`);
    }
    const approvedPlacement = listing.designProductSelection.providerPlacement
      ?? listing.designProductSelection.placement.toLowerCase();
    const approvedConfig = this.record(listing.designProductSelection.placementConfigJson);
    const approvedVariantIds = Array.isArray(approvedConfig.selectedVariantIds)
      ? approvedConfig.selectedVariantIds.map(String).sort()
      : [];
    const requestedVariantIds = dto.variantIds.map(String).sort();
    if (String(dto.catalogProductId) !== approvedTemplate.printfulCatalogProductId) {
      throw new BadRequestException("PRINTFUL_CONFIGURATION_CHANGED: catalog product differs from the approved mockups");
    }
    if (dto.placement.trim().toLowerCase().replace(/[\s-]+/g, "_") !== approvedPlacement) {
      throw new BadRequestException("PRINTFUL_CONFIGURATION_CHANGED: placement differs from the approved mockups");
    }
    if (dto.technique !== listing.designProductSelection.technique) {
      throw new BadRequestException("PRINTFUL_CONFIGURATION_CHANGED: technique differs from the approved mockups");
    }
    if (approvedVariantIds.length !== requestedVariantIds.length || approvedVariantIds.some((id, index) => id !== requestedVariantIds[index])) {
      throw new BadRequestException("PRINTFUL_CONFIGURATION_CHANGED: variants differ from the approved mockups");
    }

    const storeMap = new Map(stores.map((store) => [store.id, store]));
    const storeIds = [...new Set(dto.storeIds.map(String))];
    const missingStores = storeIds.filter((storeId) => !storeMap.has(storeId));
    if (missingStores.length) throw new BadRequestException(`PRINTFUL_STORE_NOT_ACCESSIBLE:${missingStores.join(",")}`);
    const unsupportedStores = storeIds
      .map((storeId) => storeMap.get(storeId)!)
      .filter((store) => !store.directPublishingSupported);
    if (unsupportedStores.length) {
      throw new BadRequestException(
        `PRINTFUL_EXTERNAL_STORE_CONNECTOR_REQUIRED:${unsupportedStores.map((store) => `${store.id}:${store.type}`).join(",")}`,
      );
    }

    const productResult = this.record(productResponse.result);
    const product = this.record(productResult.product);
    const variants = Array.isArray(productResult.variants) ? productResult.variants.map((variant) => this.record(variant)) : [];
    if (!Object.keys(product).length) throw new BadRequestException("PRINTFUL_PRODUCT_NOT_FOUND");
    const availableVariantIds = new Set(variants.map((variant) => Number(variant.id)).filter(Number.isFinite));
    const invalidVariants = dto.variantIds.filter((variantId) => !availableVariantIds.has(variantId));
    if (invalidVariants.length) throw new BadRequestException(`INVALID_PRINTFUL_VARIANT:${invalidVariants.join(",")}`);

    const publications = await this.prisma.$transaction(async (tx) => {
      await tx.commerceListing.update({
        where: { id: listing.id },
        data: {
          pipeline: PipelineType.GLOBAL_PRINTFUL,
          printfulProductTemplateId: approvedTemplate.id,
          status: ListingStatus.READY_TO_PUBLISH,
        },
      });

      const rows = [];
      for (const storeId of storeIds) {
        const store = storeMap.get(storeId)!;
        const publication = await tx.marketplacePublication.upsert({
          where: {
            productListingId_marketplace_publicationKey: {
              productListingId: listing.id,
              marketplace: MarketplaceKind.PRINTFUL,
              publicationKey: `store:${storeId}`,
            },
          },
          create: {
            productListingId: listing.id,
            marketplace: MarketplaceKind.PRINTFUL,
            publicationKey: `store:${storeId}`,
            provider: ProviderType.PRINTFUL,
            providerStoreId: storeId,
            status: MarketplacePublicationStatus.QUEUED,
            metadataJson: this.publicationMetadata(store, dto, actorId, publicationVersion, variants),
          },
          update: {
            providerStoreId: storeId,
            status: MarketplacePublicationStatus.QUEUED,
            errorMessage: null,
            metadataJson: this.publicationMetadata(store, dto, actorId, publicationVersion, variants),
          },
        });
        rows.push(publication);
      }
      return rows;
    });

    const jobs = [];
    for (const publication of publications) {
      jobs.push(await this.jobs.enqueue("PUBLISH_MARKETPLACE_LISTING", {
        marketplacePublicationId: publication.id,
        publicationVersion,
      }));
    }
    await this.audit.log({
      actorId,
      action: "printful.publication.queued",
      entityType: "CommerceListing",
      entityId: listing.id,
      metadata: {
        catalogProductId: dto.catalogProductId,
        variantCount: dto.variantIds.length,
        storeIds,
        publicationVersion,
        publicationIds: publications.map((publication) => publication.id),
      },
    });
    return { listingId: listing.id, templateId: approvedTemplate.id, publications, jobs };
  }

  async retry(actorId: string, publicationId: string) {
    const publication = await this.prisma.marketplacePublication.findFirst({
      where: { id: publicationId, provider: ProviderType.PRINTFUL },
    });
    if (!publication) throw new NotFoundException("PRINTFUL_PUBLICATION_NOT_FOUND");
    if (publication.status !== MarketplacePublicationStatus.FAILED) {
      throw new BadRequestException("PRINTFUL_PUBLICATION_NOT_FAILED");
    }
    const publicationVersion = randomUUID();
    const metadata = this.record(publication.metadataJson);
    const updated = await this.prisma.marketplacePublication.update({
      where: { id: publication.id },
      data: {
        status: MarketplacePublicationStatus.QUEUED,
        errorMessage: null,
        metadataJson: { ...metadata, publicationVersion, retriedBy: actorId, retriedAt: new Date().toISOString() },
      },
    });
    const job = await this.jobs.enqueue("PUBLISH_MARKETPLACE_LISTING", {
      marketplacePublicationId: publication.id,
      publicationVersion,
    });
    await this.audit.log({
      actorId,
      action: "printful.publication.retry_queued",
      entityType: "MarketplacePublication",
      entityId: publication.id,
      metadata: { publicationVersion, providerStoreId: publication.providerStoreId },
    });
    return { publication: updated, job };
  }

  private publicationMetadata(
    store: {
      id: string;
      name: string;
      type: string;
      website: string | null;
      directPublishingSupported: boolean;
      publishingMode: string;
    },
    dto: PublishPrintfulListingDto,
    actorId: string,
    publicationVersion: string,
    variants: JsonRecord[],
  ) {
    const selectedIds = new Set(dto.variantIds);
    return {
      targetStore: store,
      catalogProductId: String(dto.catalogProductId),
      variantIds: dto.variantIds.map(String),
      placement: dto.placement,
      technique: dto.technique,
      retailPrice: dto.retailPrice,
      requestedBy: actorId,
      publicationVersion,
      variantSelections: variants
        .filter((variant) => selectedIds.has(Number(variant.id)))
        .map((variant) => ({
          id: String(variant.id),
          name: String(variant.name ?? (`${variant.color ?? ""} ${variant.size ?? ""}`.trim() || `Variant ${variant.id}`)),
          color: variant.color == null ? null : String(variant.color),
          colorCode: variant.color_code == null ? null : String(variant.color_code),
          size: variant.size == null ? null : String(variant.size),
          inStock: variant.in_stock !== false,
        })),
    } satisfies Prisma.InputJsonObject;
  }

  private normalizeProductSummary(product: JsonRecord) {
    return {
      id: Number(product.id),
      title: String(product.title ?? product.name ?? `Printful product ${product.id}`),
      type: product.type == null ? null : String(product.type),
      typeName: product.type_name == null ? null : String(product.type_name),
      brand: product.brand == null ? null : String(product.brand),
      imageUrl: product.image == null ? null : String(product.image),
      variantCount: Number(product.variant_count ?? 0),
    };
  }

  private providerPlacements(printfiles: JsonRecord) {
    const variantPrintfiles = Array.isArray(printfiles.variant_printfiles) ? printfiles.variant_printfiles : [];
    return [...new Set(variantPrintfiles.flatMap((entry) => {
      const files = this.record(entry).printfiles;
      if (!Array.isArray(files)) return [];
      return files
        .map((file) => String(this.record(file).placement ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_"))
        .filter(Boolean);
    }))];
  }

  private async ensureProviderPlacementPresets(productTemplateId: string, placements: string[], printAreas: unknown) {
    const areaMap = this.record(printAreas);
    const rows = [];
    for (const rawPlacement of placements) {
      const providerPlacement = rawPlacement.trim().toLowerCase().replace(/[\s-]+/g, "_");
      if (!providerPlacement) continue;
      const area = this.record(areaMap[providerPlacement]);
      const placement = this.placementKind(providerPlacement);
      const existing = await this.prisma.placementPreset.findFirst({
        where: { pipeline: PipelineType.GLOBAL_PRINTFUL, productTemplateId, providerPlacement },
      });
      const data = {
        name: providerPlacement.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "),
        placement,
        providerPlacement,
        defaultWidthIn: Number(area.printAreaWidthIn) || 4,
        defaultHeightIn: Number(area.printAreaHeightIn) || 4,
        defaultX: Number(area.areaLeftIn) || 0,
        defaultY: Number(area.areaTopIn) || 0,
        defaultScale: 1,
        alignment: PlacementAlignment.CENTER,
        units: PlacementUnits.INCH,
        active: true,
      };
      rows.push(existing
        ? await this.prisma.placementPreset.update({ where: { id: existing.id }, data })
        : await this.prisma.placementPreset.create({ data: { ...data, pipeline: PipelineType.GLOBAL_PRINTFUL, productTemplateId } }));
    }
    return rows;
  }

  private placementKind(providerPlacement: string): PlacementKind {
    const key = providerPlacement.toUpperCase();
    if (key === "FRONT") return PlacementKind.FRONT;
    if (key === "BACK") return PlacementKind.BACK;
    if (key.includes("LEFT_CHEST")) return PlacementKind.LEFT_CHEST;
    if (key.includes("RIGHT_CHEST")) return PlacementKind.RIGHT_CHEST;
    if (key.includes("LEFT_SLEEVE")) return PlacementKind.LEFT_SLEEVE;
    if (key.includes("RIGHT_SLEEVE")) return PlacementKind.RIGHT_SLEEVE;
    if (key.includes("WRAP") || key.includes("ALL_OVER")) return PlacementKind.FULL_WRAP;
    return PlacementKind.OTHER;
  }

  private supportsDirectPublishing(type: string) {
    return type.toLocaleLowerCase() === "native";
  }

  private record(value: unknown): JsonRecord {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
  }
}
