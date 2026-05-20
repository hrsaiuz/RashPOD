import { DesignProductSelectionStatus, GeneratedAssetStatus, IntegrationLogStatus, ListingStatus, ListingType, MarketplaceKind, MarketplacePublicationStatus, PipelineType, Prisma, ProviderType } from "@prisma/client";
import { getPrismaClient } from "./db";
import { GeneratedAssetRecord, MarketplacePublicationRecord, MockupAssetRecord, PipelineSelectionRecord, PipelineSelectionStatus, WorkerRepository } from "./repository";

export class PrismaAssetRepository implements WorkerRepository {
  private readonly prisma = getPrismaClient();

  async getGeneratedAsset(id: string): Promise<GeneratedAssetRecord | null> {
    const row = await this.prisma.generatedAsset.findUnique({ where: { id } });
    if (!row) return null;
    return {
      id: row.id,
      status: row.status,
      fileKey: row.fileKey ?? undefined,
      errorMessage: row.errorMessage ?? undefined,
      widthPx: row.widthPx ?? undefined,
      heightPx: row.heightPx ?? undefined,
    };
  }

  async updateGeneratedAsset(
    id: string,
    data: Partial<Pick<GeneratedAssetRecord, "status" | "fileKey" | "errorMessage" | "widthPx" | "heightPx">>,
  ): Promise<GeneratedAssetRecord> {
    const row = await this.prisma.generatedAsset.update({
      where: { id },
      data: {
        status: data.status as GeneratedAssetStatus | undefined,
        fileKey: data.fileKey,
        errorMessage: data.errorMessage,
        widthPx: data.widthPx,
        heightPx: data.heightPx,
      },
    });
    return {
      id: row.id,
      status: row.status,
      fileKey: row.fileKey ?? undefined,
      errorMessage: row.errorMessage ?? undefined,
      widthPx: row.widthPx ?? undefined,
      heightPx: row.heightPx ?? undefined,
    };
  }

  async getPipelineSelection(id: string): Promise<PipelineSelectionRecord | null> {
    const row = await this.prisma.designProductSelection.findUnique({
      where: { id },
      include: { design: true, localBaseProduct: true, printfulProductTemplate: true },
    });
    if (!row) return null;
    return {
      id: row.id,
      designId: row.designId,
      pipeline: row.pipeline,
      status: row.status,
      errorMessage: row.errorMessage ?? undefined,
      targetMarketplaces: row.targetMarketplaces,
      design: { id: row.design.id, title: row.design.title, designerId: row.design.designerId },
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
    return rows.map((row) => ({ id: row.id, mockupType: row.mockupType, status: row.status }));
  }

  async updateMockupAsset(
    id: string,
    data: { status?: "PENDING" | "GENERATED" | "FAILED"; imageUrl?: string | null; thumbnailUrl?: string | null; providerTaskId?: string | null; metadataJson?: unknown },
  ): Promise<MockupAssetRecord> {
    const row = await this.prisma.mockupAsset.update({
      where: { id },
      data: {
        status: data.status,
        imageUrl: data.imageUrl,
        thumbnailUrl: data.thumbnailUrl,
        providerTaskId: data.providerTaskId,
        metadataJson: data.metadataJson as Prisma.InputJsonValue | undefined,
      },
    });
    return { id: row.id, mockupType: row.mockupType, status: row.status };
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
        localBaseProductId: selection.localBaseProductId,
        printfulProductTemplateId: selection.printfulProductTemplateId,
        designProductSelectionId: selection.id,
        mockupAssetIds: selection.mockupAssets.map((asset) => asset.id),
        imagesJson: selection.mockupAssets.map((asset) => asset.imageUrl).filter(Boolean),
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
}
