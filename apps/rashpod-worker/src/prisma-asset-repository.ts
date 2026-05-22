import { DesignProductSelectionStatus, GeneratedAssetStatus, IntegrationLogStatus, ListingStatus, ListingType, MarketplaceKind, MarketplacePublicationStatus, PipelineType, Prisma, ProductionJobStatus, ProviderType } from "@prisma/client";
import { getPrismaClient } from "./db";
import { GeneratedAssetRecord, MarketplacePublicationRecord, MockupAssetRecord, PipelineSelectionRecord, PipelineSelectionStatus, ProductionJobRecord, WorkerRepository } from "./repository";

export class PrismaAssetRepository implements WorkerRepository {
  private readonly prisma = getPrismaClient();

  async getGeneratedAsset(id: string): Promise<GeneratedAssetRecord | null> {
    const row = await this.prisma.generatedAsset.findUnique({ where: { id } });
    if (!row) return null;
    return {
      id: row.id,
      status: row.status,
      fileKey: row.fileKey ?? undefined,
      objectKey: row.objectKey ?? undefined,
      contentType: row.contentType ?? undefined,
      format: row.format ?? undefined,
      errorMessage: row.errorMessage ?? undefined,
      widthPx: row.widthPx ?? undefined,
      heightPx: row.heightPx ?? undefined,
    };
  }

  async updateGeneratedAsset(
    id: string,
    data: Partial<Pick<GeneratedAssetRecord, "status" | "fileKey" | "objectKey" | "contentType" | "format" | "errorMessage" | "widthPx" | "heightPx">>,
  ): Promise<GeneratedAssetRecord> {
    const row = await this.prisma.generatedAsset.update({
      where: { id },
      data: {
        status: data.status as GeneratedAssetStatus | undefined,
        fileKey: data.fileKey,
        objectKey: data.objectKey,
        contentType: data.contentType,
        format: data.format,
        errorMessage: data.errorMessage,
        widthPx: data.widthPx,
        heightPx: data.heightPx,
      },
    });
    if (data.status === "READY") {
      await this.prisma.productionJob.updateMany({
        where: { productionFileAssetId: id },
        data: { productionFileStatus: "READY", productionFileObjectKey: data.objectKey, status: ProductionJobStatus.READY_FOR_PRINT, failureReason: null },
      });
    }
    if (data.status === "FAILED") {
      await this.prisma.productionJob.updateMany({
        where: { productionFileAssetId: id },
        data: { productionFileStatus: "FAILED", failureReason: data.errorMessage, status: ProductionJobStatus.WAITING_FOR_FILE },
      });
    }
    return {
      id: row.id,
      status: row.status,
      fileKey: row.fileKey ?? undefined,
      objectKey: row.objectKey ?? undefined,
      contentType: row.contentType ?? undefined,
      format: row.format ?? undefined,
      errorMessage: row.errorMessage ?? undefined,
      widthPx: row.widthPx ?? undefined,
      heightPx: row.heightPx ?? undefined,
    };
  }

  async getProductionJob(id: string): Promise<ProductionJobRecord | null> {
    const row = await this.prisma.productionJob.findUnique({ where: { id } });
    if (!row) return null;
    return {
      id: row.id,
      orderId: row.orderId,
      orderItemId: row.orderItemId,
      status: row.status,
      queueType: row.queueType,
      productionFileStatus: row.productionFileStatus,
      productionFileObjectKey: row.productionFileObjectKey,
      productionFileUrl: row.productionFileUrl,
      productSnapshotJson: row.productSnapshotJson,
      assetSnapshotJson: row.assetSnapshotJson,
      selectedOptionsJson: row.selectedOptionsJson,
      notes: row.notes,
    };
  }

  async updateProductionJob(
    id: string,
    data: { productionFileStatus?: string | null; productionFileObjectKey?: string | null; productionFileUrl?: string | null; status?: string; failureReason?: string | null },
  ): Promise<ProductionJobRecord> {
    await this.prisma.productionJob.update({
      where: { id },
      data: {
        productionFileStatus: data.productionFileStatus,
        productionFileObjectKey: data.productionFileObjectKey,
        productionFileUrl: data.productionFileUrl,
        status: data.status as ProductionJobStatus | undefined,
        failureReason: data.failureReason,
      },
    });
    const updated = await this.getProductionJob(id);
    if (!updated) throw new Error(`Production job ${id} not found`);
    return updated;
  }

  async getPipelineSelection(id: string): Promise<PipelineSelectionRecord | null> {
    const row = await this.prisma.designProductSelection.findUnique({
      where: { id },
      include: { design: { include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } } }, localBaseProduct: true, printfulProductTemplate: true },
    });
    if (!row) return null;
    return {
      id: row.id,
      designId: row.designId,
      pipeline: row.pipeline,
      status: row.status,
      errorMessage: row.errorMessage ?? undefined,
      targetMarketplaces: row.targetMarketplaces,
      placement: row.placement,
      width: row.width,
      height: row.height,
      x: row.x,
      y: row.y,
      top: row.top,
      left: row.left,
      scale: row.scale,
      rotation: row.rotation,
      units: row.units,
      placementConfigJson: row.placementConfigJson,
      design: { id: row.design.id, title: row.design.title, designerId: row.design.designerId },
      latestDesignVersion: row.design.versions[0]
        ? {
            id: row.design.versions[0].id,
            fileKey: row.design.versions[0].fileKey,
            widthPx: row.design.versions[0].widthPx,
            heightPx: row.design.versions[0].heightPx,
            dpi: row.design.versions[0].dpi,
            hasTransparency: row.design.versions[0].hasTransparency,
          }
        : null,
      localBaseProduct: row.localBaseProduct
        ? {
            id: row.localBaseProduct.id,
            name: row.localBaseProduct.name,
            imageUrl: row.localBaseProduct.imageUrl ?? undefined,
            defaultPrice: row.localBaseProduct.defaultPrice,
            baseCost: row.localBaseProduct.baseCost,
            currency: row.localBaseProduct.currency,
          }
        : null,
      printfulProductTemplate: row.printfulProductTemplate
        ? {
            id: row.printfulProductTemplate.id,
            displayName: row.printfulProductTemplate.displayName,
            printfulCatalogProductId: row.printfulProductTemplate.printfulCatalogProductId,
            printfulVariantIds: row.printfulProductTemplate.printfulVariantIds,
            defaultPlacement: row.printfulProductTemplate.defaultPlacement,
            defaultTechnique: row.printfulProductTemplate.defaultTechnique,
            defaultRetailPrice: row.printfulProductTemplate.defaultRetailPrice,
            estimatedBaseCost: row.printfulProductTemplate.estimatedBaseCost,
            currency: row.printfulProductTemplate.currency,
          }
        : null,
    };
  }

  async updatePipelineSelection(id: string, data: { status?: PipelineSelectionStatus; errorMessage?: string | null }) {
    await this.prisma.designProductSelection.update({
      where: { id },
      data: { status: data.status as DesignProductSelectionStatus | undefined, errorMessage: data.errorMessage },
    });
    const updated = await this.getPipelineSelection(id);
    if (!updated) throw new Error(`Pipeline selection ${id} not found`);
    return updated;
  }

  async listMockupAssets(selectionId: string): Promise<MockupAssetRecord[]> {
    const rows = await this.prisma.mockupAsset.findMany({
      where: { designProductSelectionId: selectionId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => ({ id: row.id, mockupType: row.mockupType, status: row.status, imageUrl: row.imageUrl, objectKey: row.objectKey }));
  }

  async updateMockupAsset(
    id: string,
    data: {
      status?: "PENDING" | "PROCESSING" | "GENERATED" | "READY" | "FAILED" | "REPLACED" | "ARCHIVED";
      imageUrl?: string | null;
      thumbnailUrl?: string | null;
      objectKey?: string | null;
      contentType?: string | null;
      format?: string | null;
      widthPx?: number | null;
      heightPx?: number | null;
      dpi?: number | null;
      placementSnapshotJson?: unknown;
      renderJobId?: string | null;
      failureReason?: string | null;
      providerTaskId?: string | null;
      metadataJson?: unknown;
    },
  ): Promise<MockupAssetRecord> {
    const row = await this.prisma.mockupAsset.update({
      where: { id },
      data: {
        status: data.status,
        imageUrl: data.imageUrl,
        thumbnailUrl: data.thumbnailUrl,
        objectKey: data.objectKey,
        contentType: data.contentType,
        format: data.format,
        widthPx: data.widthPx,
        heightPx: data.heightPx,
        dpi: data.dpi,
        placementSnapshotJson: data.placementSnapshotJson as Prisma.InputJsonValue | undefined,
        renderJobId: data.renderJobId,
        failureReason: data.failureReason,
        providerTaskId: data.providerTaskId,
        metadataJson: data.metadataJson as Prisma.InputJsonValue | undefined,
      },
    });
    return { id: row.id, mockupType: row.mockupType, status: row.status, imageUrl: row.imageUrl, objectKey: row.objectKey };
  }

  async createListingDraftForSelection(selectionId: string) {
    const selection = await this.prisma.designProductSelection.findUnique({
      where: { id: selectionId },
      include: { design: true, localBaseProduct: true, printfulProductTemplate: true, mockupAssets: true },
    });
    if (!selection || selection.status !== DesignProductSelectionStatus.MOCKUP_READY) return null;
    const existing = await this.prisma.commerceListing.findUnique({ where: { designProductSelectionId: selection.id } });
    if (existing) return { id: existing.id, status: existing.status };

    const isLocal = selection.pipeline === PipelineType.LOCAL;
    const title = isLocal
      ? `${selection.design.title} ${selection.localBaseProduct?.name ?? "Local product"}`
      : `${selection.design.title} ${selection.printfulProductTemplate?.displayName ?? "Global product"}`;
    const slug = `${selection.design.title}-${selection.id}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const price = isLocal ? (selection.localBaseProduct?.defaultPrice ?? new Prisma.Decimal(0)) : (selection.printfulProductTemplate?.defaultRetailPrice ?? new Prisma.Decimal(0));
    const cost = isLocal ? selection.localBaseProduct?.baseCost : selection.printfulProductTemplate?.estimatedBaseCost;
    const royalty = await this.calculateRoyalty(price, cost ?? null);

    const listing = await this.prisma.commerceListing.create({
      data: {
        type: ListingType.PRODUCT,
        status: ListingStatus.DRAFT,
        designerId: selection.design.designerId,
        designAssetId: selection.designId,
        pipeline: selection.pipeline,
        title,
        slug,
        price,
        currency: isLocal ? selection.localBaseProduct?.currency ?? "UZS" : selection.printfulProductTemplate?.currency ?? "USD",
        cost,
        designerRoyalty: royalty.amount,
        localBaseProductId: selection.localBaseProductId,
        printfulProductTemplateId: selection.printfulProductTemplateId,
        designProductSelectionId: selection.id,
        mockupAssetIds: selection.mockupAssets.filter((asset) => asset.status === "GENERATED" || asset.status === "READY").map((asset) => asset.id),
        imagesJson: selection.mockupAssets
          .filter((asset) => asset.status === "GENERATED" || asset.status === "READY")
          .map((asset) => asset.imageUrl)
          .filter(Boolean),
        metadataJson: {
          ...(royalty.rule ? { royaltyRuleId: royalty.rule.id, royaltyBasis: royalty.rule.basis, royaltyValue: royalty.rule.value.toString() } : {}),
          renderAssets: selection.mockupAssets
            .filter((asset) => asset.status === "GENERATED" || asset.status === "READY")
            .map((asset) => ({ id: asset.id, objectKey: asset.objectKey, contentType: asset.contentType, widthPx: asset.widthPx, heightPx: asset.heightPx, mockupType: asset.mockupType })),
        },
      },
    });

    const marketplaces = this.marketplacesForSelection(selection.pipeline, selection.targetMarketplaces);
    for (const marketplace of marketplaces) {
      await this.prisma.marketplacePublication.upsert({
        where: { productListingId_marketplace: { productListingId: listing.id, marketplace } },
        create: {
          productListingId: listing.id,
          marketplace,
          provider: marketplace === MarketplaceKind.RASHPOD_LOCAL || marketplace === MarketplaceKind.LOCAL_MARKETPLACE ? ProviderType.RASHPOD : ProviderType.PRINTFUL,
          status: marketplace === MarketplaceKind.AMAZON ? MarketplacePublicationStatus.NEEDS_REVIEW : MarketplacePublicationStatus.DRAFT,
        },
        update: {},
      });
    }

    await this.prisma.designProductSelection.update({ where: { id: selection.id }, data: { status: DesignProductSelectionStatus.LISTING_DRAFT } });
    return { id: listing.id, status: listing.status };
  }

  async getMarketplacePublication(id: string): Promise<MarketplacePublicationRecord | null> {
    const row = await this.prisma.marketplacePublication.findUnique({
      where: { id },
      include: { productListing: true },
    });
    if (!row) return null;
    return {
      id: row.id,
      marketplace: row.marketplace,
      provider: row.provider,
      status: row.status,
      productListing: {
        id: row.productListing.id,
        status: row.productListing.status,
        title: row.productListing.title,
        pipeline: row.productListing.pipeline,
        mockupAssetIds: row.productListing.mockupAssetIds,
        designProductSelectionId: row.productListing.designProductSelectionId,
      },
    };
  }

  async updateMarketplacePublication(
    id: string,
    data: { status?: MarketplacePublicationRecord["status"]; errorMessage?: string | null; providerExternalListingId?: string | null; providerSyncProductId?: string | null; lastSyncedAt?: Date | null; metadataJson?: unknown },
  ): Promise<MarketplacePublicationRecord> {
    await this.prisma.marketplacePublication.update({
      where: { id },
      data: {
        status: data.status as MarketplacePublicationStatus | undefined,
        errorMessage: data.errorMessage,
        providerExternalListingId: data.providerExternalListingId,
        providerSyncProductId: data.providerSyncProductId,
        lastSyncedAt: data.lastSyncedAt,
        metadataJson: data.metadataJson as Prisma.InputJsonValue | undefined,
      },
    });
    const updated = await this.getMarketplacePublication(id);
    if (!updated) throw new Error(`Marketplace publication ${id} not found`);
    return updated;
  }

  async markListingPublishedIfComplete(listingId: string) {
    const listing = await this.prisma.commerceListing.findUnique({
      where: { id: listingId },
      include: { marketplacePublications: true },
    });
    if (!listing) throw new Error(`Listing ${listingId} not found`);
    const publishable = listing.marketplacePublications.filter((publication) => publication.status !== MarketplacePublicationStatus.NEEDS_REVIEW);
    const allPublished = publishable.length > 0 && publishable.every((publication) => publication.status === MarketplacePublicationStatus.PUBLISHED);
    if (!allPublished) return { id: listing.id, status: listing.status };

    const updated = await this.prisma.commerceListing.update({
      where: { id: listing.id },
      data: { status: ListingStatus.PUBLISHED, publishedAt: listing.publishedAt ?? new Date() },
    });
    if (listing.designProductSelectionId) {
      await this.prisma.designProductSelection.update({
        where: { id: listing.designProductSelectionId },
        data: { status: DesignProductSelectionStatus.PUBLISHED, errorMessage: null },
      });
    }
    return { id: updated.id, status: updated.status };
  }

  async createIntegrationLog(data: {
    productListingId?: string | null;
    marketplacePublicationId?: string | null;
    action: string;
    status: "PENDING" | "SUCCESS" | "FAILED" | "SKIPPED";
    errorCode?: string | null;
    errorMessage?: string | null;
    responseSummaryJson?: unknown;
  }): Promise<void> {
    await this.prisma.integrationLog.create({
      data: {
        productListingId: data.productListingId,
        marketplacePublicationId: data.marketplacePublicationId,
        action: data.action,
        status: data.status as IntegrationLogStatus,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
        responseSummaryJson: data.responseSummaryJson as Prisma.InputJsonValue | undefined,
      },
    });
  }

  private marketplacesForSelection(pipeline: PipelineType, targetMarketplaces: Prisma.JsonValue | null) {
    if (pipeline === PipelineType.LOCAL) return [MarketplaceKind.RASHPOD_LOCAL];
    if (!Array.isArray(targetMarketplaces)) return [];
    return targetMarketplaces.filter((item): item is MarketplaceKind => typeof item === "string" && item in MarketplaceKind);
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
    const basisAmount = rule.basis === "NET_PROFIT_PERCENT" && priceDecimal.gt(costDecimal) ? priceDecimal.minus(costDecimal) : priceDecimal;
    const amount = rule.basis === "FIXED_AMOUNT" ? rate : basisAmount.mul(rate).div(100);
    return { amount: amount.toDecimalPlaces(2), rule };
  }
}
