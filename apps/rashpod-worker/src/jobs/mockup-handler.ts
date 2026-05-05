import { WorkerRepository } from "../repository";
import { RenderedFile, SharpRenderer } from "../renderer";

export interface MockupRendererPort {
  renderPreview(placementId: string): Promise<RenderedFile>;
  renderListingVariant(placementId: string, variant: "main" | "lifestyle" | "closeup"): Promise<RenderedFile>;
  renderFilmPreview(placementId: string): Promise<RenderedFile>;
  renderProductionFile(placementId: string): Promise<RenderedFile>;
}

export class MockupJobHandler {
  constructor(
    private readonly repo: WorkerRepository,
    private readonly renderer: MockupRendererPort = new SharpRenderer(),
  ) {}

  async handlePreview(input: { placementId: string; generatedAssetId: string }) {
    await this.repo.updateGeneratedAsset(input.generatedAssetId, { status: "PROCESSING", errorMessage: undefined });
    try {
      const rendered = await this.renderer.renderPreview(input.placementId);
      return await this.repo.updateGeneratedAsset(input.generatedAssetId, {
        status: "READY",
        fileKey: rendered.fileKey,
        widthPx: rendered.widthPx,
        heightPx: rendered.heightPx,
      });
    } catch (error) {
      return this.repo.updateGeneratedAsset(input.generatedAssetId, {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown preview generation error",
      });
    }
  }

  async handleListingPack(input: { placementId: string; generatedAssetIds: string[] }) {
    const results = [];
    for (const id of input.generatedAssetIds) {
      await this.repo.updateGeneratedAsset(id, { status: "PROCESSING", errorMessage: undefined });
      try {
        const variant = this.getVariantByIndex(id, input.generatedAssetIds);
        const rendered = await this.renderer.renderListingVariant(input.placementId, variant);
        const updated = await this.repo.updateGeneratedAsset(id, {
          status: "READY",
          fileKey: rendered.fileKey,
          widthPx: rendered.widthPx,
          heightPx: rendered.heightPx,
        });
        results.push(updated);
      } catch (error) {
        const failed = await this.repo.updateGeneratedAsset(id, {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Unknown listing generation error",
        });
        results.push(failed);
      }
    }
    return results;
  }

  async handleFilmPreview(input: { placementId: string; generatedAssetId: string }) {
    await this.repo.updateGeneratedAsset(input.generatedAssetId, { status: "PROCESSING", errorMessage: undefined });
    try {
      const rendered = await this.renderer.renderFilmPreview(input.placementId);
      return await this.repo.updateGeneratedAsset(input.generatedAssetId, {
        status: "READY",
        fileKey: rendered.fileKey,
        widthPx: rendered.widthPx,
        heightPx: rendered.heightPx,
      });
    } catch (error) {
      return this.repo.updateGeneratedAsset(input.generatedAssetId, {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown film preview generation error",
      });
    }
  }

  async handleProductionFile(input: { placementId: string; generatedAssetId: string }) {
    await this.repo.updateGeneratedAsset(input.generatedAssetId, { status: "PROCESSING", errorMessage: undefined });
    try {
      const rendered = await this.renderer.renderProductionFile(input.placementId);
      return await this.repo.updateGeneratedAsset(input.generatedAssetId, {
        status: "READY",
        fileKey: rendered.fileKey,
        widthPx: rendered.widthPx,
        heightPx: rendered.heightPx,
      });
    } catch (error) {
      return this.repo.updateGeneratedAsset(input.generatedAssetId, {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown production file generation error",
      });
    }
  }

  private getVariantByIndex(currentId: string, ids: string[]): "main" | "lifestyle" | "closeup" {
    const index = ids.indexOf(currentId);
    if (index === 0) return "main";
    if (index === 1) return "lifestyle";
    return "closeup";
  }
}
