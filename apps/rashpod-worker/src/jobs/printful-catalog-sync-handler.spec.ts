import { PrintfulCatalogSyncJobHandler } from "./printful-catalog-sync-handler";
import { WorkerRepository } from "../repository";

function createRepo(overrides: Partial<WorkerRepository & { logs: any[] }> = {}) {
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
    async getPrintfulSettings() {
      return {
        enabled: true,
        defaultStoreId: "12345",
        catalogAllowlist: [{ catalogProductId: 71, rashpodProductType: "classic_crew_neck_tshirt", defaultTechnique: "dtg", defaultPlacement: "front" }],
      };
    },
    async upsertPrintfulProductTemplate(input) {
      return { id: "tpl_1", displayName: input.displayName };
    },
    async ensurePrintfulPlacementPreset() {
      return { created: true };
    },
    ...overrides,
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

  it("persists templates from the configured allowlist", async () => {
    process.env.PRINTFUL_ENABLED = "true";
    process.env.PRINTFUL_API_TOKEN = "token";
    const repo = createRepo();
    const client = {
      isEnabled: () => true,
      hasToken: () => true,
      getCatalogProduct: jest.fn(async () => ({ result: { id: 71, title: "T-Shirt", variants: [{ id: 4011 }] } })),
      getPrintfiles: jest.fn(async () => ({ result: { variant_printfiles: [{ printfiles: [{ placement: "front" }] }], available_techniques: { dtg: {} } } })),
    } as any;
    const handler = new PrintfulCatalogSyncJobHandler(repo, client);

    const result = await handler.handleSync({ requestedBy: "admin_1" });

    expect(result).toEqual({ synced: true, persistedTemplates: 1, updatedPresets: 1, errors: [] });
    expect(client.getCatalogProduct).toHaveBeenCalledWith(71);
    expect(repo.logs.map((log) => log.status)).toEqual(["PENDING", "SUCCESS"]);
  });

  it("fails when allowlist is empty", async () => {
    process.env.PRINTFUL_ENABLED = "true";
    process.env.PRINTFUL_API_TOKEN = "token";
    const repo = createRepo({
      async getPrintfulSettings() {
        return { enabled: true, catalogAllowlist: [] };
      },
    });
    const client = { isEnabled: () => true, hasToken: () => true } as any;
    const handler = new PrintfulCatalogSyncJobHandler(repo, client);

    const result = await handler.handleSync({ requestedBy: "admin_1" });

    expect(result).toEqual({ failed: true, errorCode: "PRINTFUL_ALLOWLIST_EMPTY" });
  });
});
