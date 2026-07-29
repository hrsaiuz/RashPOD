import { InMemoryWorkerRepository } from "../mock-repository";
import { MockupJobHandler } from "./mockup-handler";

describe("MockupJobHandler", () => {
  const fakeRenderer = {
    async renderPreview(placementId: string) {
      const fileKey = `generated-mockups/${placementId}/preview-test.png`;
      return { fileKey, objectKey: fileKey, contentType: "image/png", format: "png", widthPx: 2000, heightPx: 2000 };
    },
    async renderListingVariant(placementId: string, variant: "main" | "lifestyle" | "closeup") {
      const fileKey = `listing-images/${placementId}/${variant}-test.png`;
      return { fileKey, objectKey: fileKey, contentType: "image/png", format: "png", widthPx: 2000, heightPx: 2000 };
    },
    async renderFilmPreview(placementId: string) {
      const fileKey = `film-previews/${placementId}/film-preview-test.png`;
      return { fileKey, objectKey: fileKey, contentType: "image/png", format: "png", widthPx: 2000, heightPx: 2000 };
    },
    async renderProductionFile(placementId: string) {
      const fileKey = `production-files/${placementId}/print-ready-test.png`;
      return { fileKey, objectKey: fileKey, contentType: "image/png", format: "png", widthPx: 3000, heightPx: 3000 };
    },
    async renderFilmProductionFile(input: { productionJobId: string }) {
      const fileKey = `film-production-files/${input.productionJobId}/print-ready.png`;
      return { fileKey, objectKey: fileKey, contentType: "image/png", format: "png", widthPx: 1200, heightPx: 1600 };
    },
  };

  it("transitions preview asset from pending to ready", async () => {
    const repo = new InMemoryWorkerRepository([{ id: "a1", status: "PENDING" }]);
    const handler = new MockupJobHandler(repo, fakeRenderer);

    const result = await handler.handlePreview({ placementId: "p1", generatedAssetId: "a1" });
    expect(result.status).toBe("READY");
    expect(result.fileKey).toContain("generated-mockups/p1/preview-");
    expect(result.widthPx).toBe(2000);
    expect(result.heightPx).toBe(2000);
  });

  it("creates three ready outputs for listing pack", async () => {
    const repo = new InMemoryWorkerRepository([
      { id: "g1", status: "PENDING" },
      { id: "g2", status: "PENDING" },
      { id: "g3", status: "PENDING" },
    ]);
    const handler = new MockupJobHandler(repo, fakeRenderer);

    const results = await handler.handleListingPack({ placementId: "p9", generatedAssetIds: ["g1", "g2", "g3"] });
    expect(results).toHaveLength(3);
    for (const row of results) {
      expect(row.status).toBe("READY");
      expect(row.fileKey).toContain("listing-images/p9/");
      expect(row.widthPx).toBe(2000);
      expect(row.heightPx).toBe(2000);
    }
  });

  it("uses normalized placement context for preview and listing variants when available", async () => {
    const repo = new InMemoryWorkerRepository([
      { id: "preview", status: "PENDING" },
      { id: "main", status: "PENDING" },
      { id: "lifestyle", status: "PENDING" },
      { id: "detail", status: "PENDING" },
    ]) as InMemoryWorkerRepository & { getLegacyPlacementRenderContext: jest.Mock };
    repo.getLegacyPlacementRenderContext = jest.fn().mockResolvedValue({
      id: "placement_back",
      pipeline: "LOCAL",
      units: "PX",
      latestDesignVersion: { fileKey: "designs/art.png" },
      placementConfigJson: {
        version: 1,
        mockupTemplate: { id: "template_1", name: "Tee", baseImageKey: "views/back.png" },
        mockupView: { id: "view_back", blankImageKey: "views/back.png" },
        printArea: { x: 100, y: 100, width: 500, height: 600, safeX: 120, safeY: 120, safeWidth: 460, safeHeight: 560 },
        position: { x: 150, y: 150, width: 200, height: 240, scale: 1, rotation: 0 },
      },
    });
    const normalizedRenderer = {
      ...fakeRenderer,
      renderPipelineMockup: jest.fn(async (context: { id: string }, variant: string) => {
        const fileKey = `pipeline-mockups/${context.id}/${variant}.png`;
        return { fileKey, objectKey: fileKey, contentType: "image/png", format: "png", widthPx: 2000, heightPx: 2000 };
      }),
    };
    const handler = new MockupJobHandler(repo, normalizedRenderer);

    await handler.handlePreview({ placementId: "placement_back", generatedAssetId: "preview" });
    await handler.handleListingPack({
      placementId: "placement_back",
      generatedAssetIds: ["main", "lifestyle", "detail"],
    });

    expect(repo.getLegacyPlacementRenderContext).toHaveBeenCalledTimes(2);
    expect(normalizedRenderer.renderPipelineMockup.mock.calls.map((call) => call[1]))
      .toEqual(["preview", "main", "lifestyle", "closeup"]);
  });

  it("marks the full listing pack failed when normalized placement context is missing", async () => {
    const repo = new InMemoryWorkerRepository([
      { id: "main", status: "PENDING" },
      { id: "lifestyle", status: "PENDING" },
      { id: "detail", status: "PENDING" },
    ]) as InMemoryWorkerRepository & { getLegacyPlacementRenderContext: jest.Mock };
    repo.getLegacyPlacementRenderContext = jest.fn().mockResolvedValue(null);
    const normalizedRenderer = {
      ...fakeRenderer,
      renderPipelineMockup: jest.fn(),
    };
    const handler = new MockupJobHandler(repo, normalizedRenderer);

    const results = await handler.handleListingPack({
      placementId: "missing",
      generatedAssetIds: ["main", "lifestyle", "detail"],
    });

    expect(results.map((asset) => asset.status)).toEqual(["FAILED", "FAILED", "FAILED"]);
    expect(results.every((asset) => asset.errorMessage?.includes("not found"))).toBe(true);
    expect(normalizedRenderer.renderPipelineMockup).not.toHaveBeenCalled();
  });

  it("transitions film preview asset to ready", async () => {
    const repo = new InMemoryWorkerRepository([{ id: "f1", status: "PENDING" }]);
    const handler = new MockupJobHandler(repo, fakeRenderer);
    const result = await handler.handleFilmPreview({ placementId: "p-film", generatedAssetId: "f1" });
    expect(result.status).toBe("READY");
    expect(result.fileKey).toContain("film-previews/p-film/");
    expect(result.widthPx).toBe(2000);
    expect(result.heightPx).toBe(2000);
  });

  it("transitions production file asset to ready", async () => {
    const repo = new InMemoryWorkerRepository([{ id: "pf1", status: "PENDING" }]);
    const handler = new MockupJobHandler(repo, fakeRenderer);
    const result = await handler.handleProductionFile({ placementId: "p-prod", generatedAssetId: "pf1" });
    expect(result.status).toBe("READY");
    expect(result.fileKey).toContain("production-files/p-prod/");
    expect(result.widthPx).toBe(3000);
    expect(result.heightPx).toBe(3000);
  });

  it("generates a film production file directly from production job context", async () => {
    const productionJob = {
      id: "job-film-1",
      orderId: "order-1",
      orderItemId: "item-1",
      queueType: "DTF",
      productionFileStatus: "QUEUED",
      productSnapshotJson: { filmWidthCm: 30, filmHeightCm: 40, quantity: 2 },
    };
    const repo: any = {
      async getProductionJob(id: string) {
        return id === productionJob.id ? productionJob : null;
      },
      async updateProductionJob(_id: string, data: Record<string, unknown>) {
        Object.assign(productionJob, data);
        return productionJob;
      },
    };
    const handler = new MockupJobHandler(repo, fakeRenderer);

    const result = await handler.handleProductionFile({ productionJobId: "job-film-1" });

    expect(result.productionFileStatus).toBe("READY");
    expect(result.productionFileObjectKey).toContain("film-production-files/job-film-1/");
    expect(result.status).toBe("READY_FOR_PRINT");
  });
});
