import { PrintfulApiClient, buildPrintfulSyncProductPayload } from "@rashpod/printful";
import { createSignedReadUrl } from "../gcs-signing";
import { MarketplacePublicationPublishContext, WorkerRepository } from "../repository";

const ACTION = "marketplace-publication.publish";

export class MarketplacePublicationJobHandler {
  constructor(
    private readonly repo: WorkerRepository,
    private readonly client = new PrintfulApiClient(),
  ) {}

  async handlePublish(input: { marketplacePublicationId: string }) {
    const repo = this.publicationRepo();
    const publication = await (repo.getMarketplacePublicationPublishContext?.(input.marketplacePublicationId) ?? repo.getMarketplacePublication(input.marketplacePublicationId));
    if (!publication) throw new Error("Marketplace publication not found");

    if (publication.status === "NEEDS_REVIEW") {
      await repo.createIntegrationLog({
        productListingId: publication.productListing.id,
        marketplacePublicationId: publication.id,
        action: ACTION,
        status: "SKIPPED",
        errorCode: "MARKETPLACE_NEEDS_REVIEW",
        errorMessage: "Manual marketplace review is required before publishing.",
      });
      return { skipped: true, reason: "MARKETPLACE_NEEDS_REVIEW" };
    }

    const mockupIds = Array.isArray(publication.productListing.mockupAssetIds) ? publication.productListing.mockupAssetIds : [];
    if (mockupIds.length === 0) return this.failPublication(publication, "MISSING_MOCKUPS", "Generated mockups are required before publishing.");

    const providerError = this.providerReadinessError(publication);
    if (providerError) return this.failPublication(publication, providerError, providerError);

    await repo.updateMarketplacePublication(publication.id, { status: "PUBLISHING", errorMessage: null });
    await repo.createIntegrationLog({
      productListingId: publication.productListing.id,
      marketplacePublicationId: publication.id,
      action: ACTION,
      status: "PENDING",
      responseSummaryJson: { marketplace: publication.marketplace, provider: publication.provider },
    });

    if (publication.provider === "PRINTFUL") {
      return this.publishPrintful(repo, publication as MarketplacePublicationPublishContext);
    }

    const providerExternalListingId = this.providerExternalListingId(publication);
    await repo.updateMarketplacePublication(publication.id, {
      status: "PUBLISHED",
      errorMessage: null,
      providerExternalListingId,
      providerSyncProductId: null,
      lastSyncedAt: new Date(),
      metadataJson: { publishedByWorker: true },
    });
    await repo.createIntegrationLog({
      productListingId: publication.productListing.id,
      marketplacePublicationId: publication.id,
      action: ACTION,
      status: "SUCCESS",
      responseSummaryJson: { providerExternalListingId },
    });
    const listing = await repo.markListingPublishedIfComplete(publication.productListing.id);
    return { published: true, marketplacePublicationId: publication.id, providerExternalListingId, listing };
  }

  private async publishPrintful(repo: ReturnType<MarketplacePublicationJobHandler["publicationRepo"]>, publication: MarketplacePublicationPublishContext) {
    const template = publication.printfulProductTemplate ?? publication.selection?.printfulProductTemplate;
    const fileId = publication.printfulFileId;
    if (!template || !fileId) return this.failPublication(publication, "PRINTFUL_PUBLISH_CONTEXT_MISSING", "Printful template or uploaded design file is missing.");

    const variantIds = Array.isArray(template.printfulVariantIds) ? template.printfulVariantIds.filter((item): item is string => typeof item === "string") : [];
    if (variantIds.length === 0) return this.failPublication(publication, "INVALID_PRINTFUL_VARIANT", "Printful variant IDs are missing.");

    const mainAsset = publication.mockupAssets?.find((asset) => asset.mockupType === "MAIN") ?? publication.mockupAssets?.[0];
    const thumbnailUrl = mainAsset?.objectKey ? await createSignedReadUrl(mainAsset.objectKey, 3600) : mainAsset?.imageUrl ?? undefined;
    const retailPrice = template.defaultRetailPrice != null ? String(template.defaultRetailPrice) : publication.productListing.price != null ? String(publication.productListing.price) : "24.99";
    const placement = (publication.selection?.placement ?? template.defaultPlacement ?? "front").toLowerCase();

    const payload = buildPrintfulSyncProductPayload({
      title: publication.productListing.title,
      thumbnailUrl,
      variantIds,
      retailPrice,
      fileId,
      placement,
    });

    try {
      const response = await this.client.createSyncProduct(payload);
      const syncProductId = response.result?.id ?? response.result?.sync_product?.id;
      const externalId = syncProductId != null ? String(syncProductId) : undefined;
      if (!externalId) return this.failPublication(publication, "PRINTFUL_SYNC_PRODUCT_FAILED", "Printful did not return a sync product id.");

      await repo.updateMarketplacePublication(publication.id, {
        status: "PUBLISHED",
        errorMessage: null,
        providerExternalListingId: externalId,
        providerSyncProductId: externalId,
        lastSyncedAt: new Date(),
        metadataJson: {
          publishedByWorker: true,
          printfulSyncProductId: externalId,
          syncVariants: response.result?.sync_variants ?? [],
        },
      });
      await repo.createIntegrationLog({
        productListingId: publication.productListing.id,
        marketplacePublicationId: publication.id,
        action: ACTION,
        status: "SUCCESS",
        responseSummaryJson: { providerExternalListingId: externalId, providerSyncProductId: externalId },
      });
      const listing = await repo.markListingPublishedIfComplete(publication.productListing.id);
      return { published: true, marketplacePublicationId: publication.id, providerExternalListingId: externalId, listing };
    } catch (error) {
      const message = error instanceof Error ? error.message : "PRINTFUL_SYNC_PRODUCT_FAILED";
      return this.failPublication(publication, "PRINTFUL_SYNC_PRODUCT_FAILED", message);
    }
  }

  private async failPublication(publication: MarketplacePublicationPublishContext, errorCode: string, errorMessage: string) {
    const repo = this.publicationRepo();
    await repo.updateMarketplacePublication(publication.id, { status: "FAILED", errorMessage });
    await repo.createIntegrationLog({
      productListingId: publication.productListing.id,
      marketplacePublicationId: publication.id,
      action: ACTION,
      status: "FAILED",
      errorCode,
      errorMessage,
    });
    return { failed: true, errorCode };
  }

  private providerReadinessError(publication: MarketplacePublicationPublishContext) {
    if (publication.provider !== "PRINTFUL") return null;
    if (process.env.PRINTFUL_ENABLED !== "true") return "PRINTFUL_NOT_CONFIGURED";
    if (!process.env.PRINTFUL_API_TOKEN) return "PRINTFUL_API_TOKEN_MISSING";
    return null;
  }

  private providerExternalListingId(publication: MarketplacePublicationPublishContext) {
    const prefix = publication.provider === "RASHPOD" ? "rashpod" : publication.provider.toLowerCase();
    return `${prefix}_${publication.marketplace.toLowerCase()}_${publication.id}`;
  }

  private publicationRepo() {
    if (
      !this.repo.getMarketplacePublication ||
      !this.repo.updateMarketplacePublication ||
      !this.repo.markListingPublishedIfComplete ||
      !this.repo.createIntegrationLog
    ) {
      throw new Error("Marketplace publication repository methods are not configured");
    }
    return this.repo as Required<
      Pick<WorkerRepository, "getMarketplacePublication" | "getMarketplacePublicationPublishContext" | "updateMarketplacePublication" | "markListingPublishedIfComplete" | "createIntegrationLog">
    >;
  }
}
