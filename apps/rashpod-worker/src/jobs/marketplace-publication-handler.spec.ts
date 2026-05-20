import { MarketplacePublicationJobHandler } from "./marketplace-publication-handler";
import { WorkerRepository } from "../repository";

function createRepo(publicationOverrides: any = {}) {
  const publication = {
    id: "pub_1",
    marketplace: "RASHPOD_LOCAL",
    provider: "RASHPOD",
    status: "QUEUED",
    productListing: {
      id: "listing_1",
      status: "READY_TO_PUBLISH",
      title: "Demo tee",
      pipeline: "LOCAL",
      mockupAssetIds: ["mockup_1"],
      designProductSelectionId: "selection_1",
    },
    ...publicationOverrides,
  };
  const repo: WorkerRepository & { publication: any; logs: any[]; listingStatus: string } = {
    publication,
    logs: [],
    listingStatus: "READY_TO_PUBLISH",
    async getGeneratedAsset() {
      return null;
    },
    async updateGeneratedAsset() {
      throw new Error("not used");
    },
    async getMarketplacePublication() {
      return repo.publication;
    },
    async updateMarketplacePublication(_id, data) {
      repo.publication = { ...repo.publication, ...data };
      return repo.publication;
    },
    async markListingPublishedIfComplete(listingId) {
      repo.listingStatus = "PUBLISHED";
      return { id: listingId, status: repo.listingStatus };
    },
    async createIntegrationLog(data) {
      repo.logs.push(data);
    },
  };
  return repo;
}

describe("MarketplacePublicationJobHandler", () => {
  beforeEach(() => {
    delete process.env.PRINTFUL_ENABLED;
    delete process.env.PRINTFUL_API_TOKEN;
  });

  it("publishes RashPOD local publications", async () => {
    const repo = createRepo();
    const handler = new MarketplacePublicationJobHandler(repo);

    const result = await handler.handlePublish({ marketplacePublicationId: "pub_1" });

    expect(result).toMatchObject({ published: true, marketplacePublicationId: "pub_1" });
    expect(repo.publication.status).toBe("PUBLISHED");
    expect(repo.publication.providerExternalListingId).toBe("rashpod_rashpod_local_pub_1");
    expect(repo.listingStatus).toBe("PUBLISHED");
    expect(repo.logs.map((log) => log.status)).toEqual(["PENDING", "SUCCESS"]);
  });

  it("fails Printful publications when Printful is not configured", async () => {
    const repo = createRepo({ marketplace: "ETSY", provider: "PRINTFUL" });
    const handler = new MarketplacePublicationJobHandler(repo);

    const result = await handler.handlePublish({ marketplacePublicationId: "pub_1" });

    expect(result).toEqual({ failed: true, errorCode: "PRINTFUL_NOT_CONFIGURED" });
    expect(repo.publication.status).toBe("FAILED");
    expect(repo.logs[0]).toMatchObject({ status: "FAILED", errorCode: "PRINTFUL_NOT_CONFIGURED" });
  });

  it("skips marketplaces that require manual review", async () => {
    const repo = createRepo({ marketplace: "AMAZON", status: "NEEDS_REVIEW" });
    const handler = new MarketplacePublicationJobHandler(repo);

    const result = await handler.handlePublish({ marketplacePublicationId: "pub_1" });

    expect(result).toEqual({ skipped: true, reason: "MARKETPLACE_NEEDS_REVIEW" });
    expect(repo.publication.status).toBe("NEEDS_REVIEW");
    expect(repo.logs[0]).toMatchObject({ status: "SKIPPED", errorCode: "MARKETPLACE_NEEDS_REVIEW" });
  });
});
