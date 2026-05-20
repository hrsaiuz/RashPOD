import { MarketplacePublicationRecord, WorkerRepository } from "../repository";

const ACTION = "marketplace-publication.publish";

export class MarketplacePublicationJobHandler {
  constructor(private readonly repo: WorkerRepository) {}

  async handlePublish(input: { marketplacePublicationId: string }) {
    const repo = this.publicationRepo();
    const publication = await repo.getMarketplacePublication(input.marketplacePublicationId);
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

    const providerExternalListingId = this.providerExternalListingId(publication);
    await repo.updateMarketplacePublication(publication.id, {
      status: "PUBLISHED",
      errorMessage: null,
      providerExternalListingId,
      providerSyncProductId: publication.provider === "PRINTFUL" ? providerExternalListingId : null,
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

  private async failPublication(publication: MarketplacePublicationRecord, errorCode: string, errorMessage: string) {
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

  private providerReadinessError(publication: MarketplacePublicationRecord) {
    if (publication.provider !== "PRINTFUL") return null;
    if (process.env.PRINTFUL_ENABLED !== "true") return "PRINTFUL_NOT_CONFIGURED";
    if (!process.env.PRINTFUL_API_TOKEN) return "PRINTFUL_API_TOKEN_MISSING";
    return null;
  }

  private providerExternalListingId(publication: MarketplacePublicationRecord) {
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
      Pick<WorkerRepository, "getMarketplacePublication" | "updateMarketplacePublication" | "markListingPublishedIfComplete" | "createIntegrationLog">
    >;
  }
}
