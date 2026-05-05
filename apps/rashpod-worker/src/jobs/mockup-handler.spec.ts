import { InMemoryWorkerRepository } from "../mock-repository";
import { MockupJobHandler } from "./mockup-handler";

describe("MockupJobHandler", () => {
  const fakeRenderer = {
    async renderPreview(placementId: string) {
      return { fileKey: `generated-mockups/${placementId}/preview-test.png`, widthPx: 2000, heightPx: 2000 };
    },
    async renderListingVariant(placementId: string, variant: "main" | "lifestyle" | "closeup") {
      return { fileKey: `listing-images/${placementId}/${variant}-test.png`, widthPx: 2000, heightPx: 2000 };
    },
    async renderFilmPreview(placementId: string) {
      return { fileKey: `film-previews/${placementId}/film-preview-test.png`, widthPx: 2000, heightPx: 2000 };
    },
    async renderProductionFile(placementId: string) {
      return { fileKey: `production-files/${placementId}/print-ready-test.png`, widthPx: 3000, heightPx: 3000 };
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
});
