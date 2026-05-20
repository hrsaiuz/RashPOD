import { PrintfulCatalogSyncJobHandler } from "./printful-catalog-sync-handler";
import { WorkerRepository } from "../repository";

function createRepo() {
  const repo: WorkerRepository & { logs: any[] } = {
    logs: [],
    async getGeneratedAsset() {
      return null;
    },
    async updateGeneratedAsset() {
      throw new Error("not used");
    },
    async createIntegrationLog(data) {
      repo.logs.push(data);
    },
  };
  return repo;
}

describe("PrintfulCatalogSyncJobHandler", () => {
  beforeEach(() => {
    delete process.env.PRINTFUL_ENABLED;
    delete process.env.PRINTFUL_API_TOKEN;
    delete process.env.PRINTFUL_API_BASE_URL;
  });

  it("fails when Printful is disabled", async () => {
    const repo = createRepo();
    const handler = new PrintfulCatalogSyncJobHandler(repo);

    const result = await handler.handleSync({ requestedBy: "admin_1" });

    expect(result).toEqual({ failed: true, errorCode: "PRINTFUL_NOT_CONFIGURED" });
    expect(repo.logs[0]).toMatchObject({ status: "FAILED", errorCode: "PRINTFUL_NOT_CONFIGURED" });
  });

  it("records catalog response summaries", async () => {
    process.env.PRINTFUL_ENABLED = "true";
    process.env.PRINTFUL_API_TOKEN = "token";
    const repo = createRepo();
    const fetcher = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ result: [{ id: 1 }, { id: 2 }] }),
      text: async () => "",
    }));
    const handler = new PrintfulCatalogSyncJobHandler(repo, fetcher);

    const result = await handler.handleSync({ requestedBy: "admin_1" });

    expect(result).toEqual({ synced: true, productCount: 2, persistedTemplates: 0 });
    expect(fetcher).toHaveBeenCalledWith("https://api.printful.com/store/products", expect.any(Object));
    expect(repo.logs.map((log) => log.status)).toEqual(["PENDING", "SUCCESS"]);
  });
});
