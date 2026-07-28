import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  DesignProductSelectionStatus,
  ListingStatus,
  MarketplaceKind,
  MarketplacePublicationStatus,
  PipelineType,
  Prisma,
  ProviderType,
} from "@prisma/client";
import { mapCatalogProductToTemplate } from "@rashpod/printful";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { JobDispatcherService } from "../worker-jobs/job-dispatcher.service";
import { ListPrintfulCatalogProductsQueryDto, PublishPrintfulListingDto } from "./dto/printful-catalog.dto";
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

  async publish(actorId: string, listingId: string, dto: PublishPrintfulListingDto) {
    const publicationVersion = randomUUID();
    const [listing, stores, productResponse, printfilesResponse] = await Promise.all([
      this.prisma.commerceListing.findUnique({
        where: { id: listingId },
        include: { designProductSelection: true, designAsset: true },
      }),
      this.listStores(),
      this.client.getCatalogProduct(dto.catalogProductId),
      this.client.getPrintfiles(dto.catalogProductId, dto.technique),
    ]);
    if (!listing) throw new NotFoundException("LISTING_NOT_FOUND");
    if (!listing.designProductSelection) throw new BadRequestException("PRINTFUL_SELECTION_MISSING");
    if (!listing.designAsset) throw new BadRequestException("PRINTFUL_DESIGN_MISSING");

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

    const mapped = mapCatalogProductToTemplate({
      allowlistItem: {
        catalogProductId: dto.catalogProductId,
        rashpodProductType: dto.rashpodProductType,
        displayName: String(product.title ?? product.name ?? `Printful product ${dto.catalogProductId}`),
        defaultVariantIds: dto.variantIds,
        defaultTechnique: dto.technique,
        defaultPlacement: dto.placement,
      },
      product: { ...product, variants },
      printfiles: this.record(printfilesResponse.result),
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
        defaultRetailPrice: new Prisma.Decimal(dto.retailPrice),
        estimatedBaseCost: mapped.estimatedBaseCost == null ? null : new Prisma.Decimal(mapped.estimatedBaseCost),
        currency: mapped.currency,
        previewImageUrl: mapped.previewImageUrl,
        printAreasJson: mapped.printAreasJson as Prisma.InputJsonValue,
        metadataJson: mapped.metadataJson as Prisma.InputJsonValue,
      },
      update: {
        rashpodProductType: mapped.rashpodProductType,
        printfulVariantIds: mapped.printfulVariantIds,
        allowedColorVariantIds: mapped.allowedColorVariantIds ?? mapped.printfulVariantIds,
        allowedSizeVariantIds: mapped.allowedSizeVariantIds ?? mapped.printfulVariantIds,
        allowedPlacements: mapped.allowedPlacements,
        allowedTechniques: mapped.allowedTechniques,
        defaultTechnique: mapped.defaultTechnique,
        defaultPlacement: mapped.defaultPlacement,
        defaultRetailPrice: new Prisma.Decimal(dto.retailPrice),
        previewImageUrl: mapped.previewImageUrl,
        printAreasJson: mapped.printAreasJson as Prisma.InputJsonValue,
        metadataJson: mapped.metadataJson as Prisma.InputJsonValue,
        active: true,
      },
    });

    const publications = await this.prisma.$transaction(async (tx) => {
      await tx.designProductSelection.update({
        where: { id: listing.designProductSelection!.id },
        data: {
          pipeline: PipelineType.GLOBAL_PRINTFUL,
          printfulProductTemplateId: template.id,
          technique: dto.technique,
          status: DesignProductSelectionStatus.LISTING_DRAFT,
          placementConfigJson: {
            ...this.record(listing.designProductSelection!.placementConfigJson),
            selectedVariantIds: dto.variantIds.map(String),
            printfulCatalogProductId: String(dto.catalogProductId),
            selectedStoreIds: storeIds,
          },
        },
      });
      await tx.commerceListing.update({
        where: { id: listing.id },
        data: {
          pipeline: PipelineType.GLOBAL_PRINTFUL,
          printfulProductTemplateId: template.id,
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
    return { listingId: listing.id, templateId: template.id, publications, jobs };
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

  private supportsDirectPublishing(type: string) {
    return type.toLocaleLowerCase() === "native";
  }

  private record(value: unknown): JsonRecord {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
  }
}
