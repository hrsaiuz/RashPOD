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
      latestDesignVersion: { id: "ver_1", fileKey: "designs/ver_1.png", dpi: 300 },
      placement: "FRONT",
      placementConfigJson: {
        version: 1,
        mockupTemplate: { id: "tpl_1", name: "Front", baseImageKey: "templates/base.png" },
        printArea: { x: 10, y: 20, width: 100, height: 120, safeX: 20, safeY: 30, safeWidth: 80, safeHeight: 80 },
        position: { x: 25, y: 35, width: 60, height: 60, scale: 1, rotation: 0 },
      },
      localBaseProduct: { id: "bp_1", name: "T-shirt", currency: "UZS" },
    },
    assets: [
      { id: "asset_1", mockupType: "MAIN", status: "PENDING" },
      { id: "asset_2", mockupType: "LIFESTYLE", status: "PENDING" },
      { id: "asset_3", mockupType: "DETAIL", status: "PENDING" },
      { id: "asset_4", mockupType: "PRINT_AREA_PREVIEW", status: "PENDING" },
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
  renderListingVariant: jest.fn(async (_selectionId: string, variant: string) => {
    const fileKey = `mockups/${variant}.png`;
    return { fileKey, objectKey: fileKey, contentType: "image/png", format: "png", widthPx: 2000, heightPx: 2000 };
  }),
  renderPreview: jest.fn(async () => {
    const fileKey = "mockups/preview.png";
    return { fileKey, objectKey: fileKey, contentType: "image/png", format: "png", widthPx: 2000, heightPx: 2000 };
  }),
  renderPipelineMockup: jest.fn(async (_context: any, variant: string) => {
    const fileKey = `mockups/${variant}.png`;
    return { fileKey, objectKey: fileKey, contentType: "image/png", format: "png", widthPx: 2000, heightPx: 2000 };
  }),
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
    expect(repo.assets[0]).toEqual(expect.objectContaining({ objectKey: "mockups/main.png", contentType: "image/png", format: "png", widthPx: 2000, heightPx: 2000, renderJobId: undefined }));
    expect(repo.assets[0].placementSnapshotJson).toEqual(expect.objectContaining({ placement: "FRONT", sourceDesignVersionId: "ver_1" }));
    expect(repo.listingCalls).toBe(1);
    expect(renderer.renderPipelineMockup).toHaveBeenCalledWith(expect.objectContaining({ id: "sel_1" }), "main");
    expect(renderer.renderPipelineMockup).toHaveBeenCalledWith(expect.objectContaining({ id: "sel_1" }), "lifestyle");
    expect(renderer.renderPipelineMockup).toHaveBeenCalledWith(expect.objectContaining({ id: "sel_1" }), "closeup");
    expect(renderer.renderPipelineMockup).toHaveBeenCalledWith(expect.objectContaining({ id: "sel_1" }), "preview");
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

  it("persists failure reasons when rendering fails", async () => {
    const repo = createRepo();
    const failingRenderer = {
      ...renderer,
      renderPipelineMockup: jest.fn(async () => {
        throw new Error("template missing");
      }),
    };
    const handler = new PipelineMockupJobHandler(repo, failingRenderer);

    const result = await handler.handleLocalMockups({ designProductSelectionId: "sel_1", workerJobId: "job_1" });

    expect(result.failed).toBe(true);
    expect(repo.selection.status).toBe("MOCKUP_FAILED");
    expect(repo.assets.every((asset) => asset.status === "FAILED" && asset.failureReason === "template missing" && asset.renderJobId === "job_1")).toBe(true);
  });

  it("does not re-render or duplicate assets that are already generated on retry", async () => {
    const repo = createRepo();
    repo.assets = repo.assets.map((asset) => ({ ...asset, status: "GENERATED", imageUrl: `mockups/${asset.id}.png`, objectKey: `mockups/${asset.id}.png` }));
    const retryRenderer = { ...renderer, renderPipelineMockup: jest.fn() };
    const handler = new PipelineMockupJobHandler(repo, retryRenderer);

    const result = await handler.handleLocalMockups({ designProductSelectionId: "sel_1", workerJobId: "job_retry" });

    expect(result.failed).toBe(false);
    expect(retryRenderer.renderPipelineMockup).not.toHaveBeenCalled();
    expect(repo.assets).toHaveLength(4);
    expect(repo.listingCalls).toBe(1);
  });
});
