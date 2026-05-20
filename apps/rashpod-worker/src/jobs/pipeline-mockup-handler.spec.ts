import { PipelineMockupJobHandler } from "./pipeline-mockup-handler";
import { WorkerRepository } from "../repository";

function createRepo(): WorkerRepository & { selection: any; assets: any[]; listingCalls: number } {
  const repo: WorkerRepository & { selection: any; assets: any[]; listingCalls: number } = {
    selection: {
      id: "sel_1",
      designId: "design_1",
      pipeline: "LOCAL",
      status: "MOCKUP_PENDING",
      design: { id: "design_1", title: "Demo", designerId: "designer_1" },
      localBaseProduct: { id: "bp_1", name: "T-shirt", currency: "UZS" },
    },
    assets: [
      { id: "asset_1", mockupType: "MAIN", status: "PENDING" },
      { id: "asset_2", mockupType: "SECONDARY", status: "PENDING" },
      { id: "asset_3", mockupType: "PRINT_AREA_PREVIEW", status: "PENDING" },
    ],
    listingCalls: 0,
    async getGeneratedAsset() {
      return null;
    },
    async updateGeneratedAsset() {
      throw new Error("not used");
    },
    async getPipelineSelection() {
      return repo.selection;
    },
    async updatePipelineSelection(_id, data) {
      repo.selection = { ...repo.selection, ...data };
      return repo.selection;
    },
    async listMockupAssets() {
      return repo.assets;
    },
    async updateMockupAsset(id, data) {
      const index = repo.assets.findIndex((asset) => asset.id === id);
      repo.assets[index] = { ...repo.assets[index], ...data };
      return repo.assets[index];
    },
    async createListingDraftForSelection() {
      repo.listingCalls += 1;
      return { id: "listing_1", status: "DRAFT" };
    },
  };
  return repo;
}

const renderer = {
  renderListingVariant: jest.fn(async (_selectionId: string, variant: string) => ({ fileKey: `mockups/${variant}.png`, widthPx: 2000, heightPx: 2000 })),
  renderPreview: jest.fn(async () => ({ fileKey: "mockups/preview.png", widthPx: 2000, heightPx: 2000 })),
};

describe("PipelineMockupJobHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.PRINTFUL_ENABLED;
    delete process.env.PRINTFUL_API_TOKEN;
  });

  it("generates local mockup assets and creates a listing draft", async () => {
    const repo = createRepo();
    const handler = new PipelineMockupJobHandler(repo, renderer);

    const result = await handler.handleLocalMockups({ designProductSelectionId: "sel_1" });

    expect(result.failed).toBe(false);
    expect(repo.selection.status).toBe("MOCKUP_READY");
    expect(repo.assets.every((asset) => asset.status === "GENERATED")).toBe(true);
    expect(repo.listingCalls).toBe(1);
  });

  it("marks Printful mockups failed when Printful is disabled", async () => {
    const repo = createRepo();
    repo.selection.pipeline = "GLOBAL_PRINTFUL";
    repo.selection.printfulProductTemplate = { id: "pt_1", displayName: "Printful Tee" };
    const handler = new PipelineMockupJobHandler(repo, renderer);

    const result = await handler.handlePrintfulMockups({ designProductSelectionId: "sel_1" });

    expect(result).toEqual({ failed: true, errorCode: "PRINTFUL_NOT_CONFIGURED" });
    expect(repo.selection.status).toBe("MOCKUP_FAILED");
    expect(repo.selection.errorMessage).toBe("PRINTFUL_NOT_CONFIGURED");
    expect(repo.assets.every((asset) => asset.status === "FAILED")).toBe(true);
  });
});
