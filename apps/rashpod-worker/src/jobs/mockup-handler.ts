import { GeneratedAssetRecord, LegacyPlacementRenderContext, ProductionJobRecord, WorkerRepository } from "../repository";
import { PipelineRenderContext, RenderedFile, SharpRenderer } from "../renderer";

export interface MockupRendererPort {
  renderPreview(placementId: string): Promise<RenderedFile>;
  renderListingVariant(placementId: string, variant: "main" | "lifestyle" | "closeup"): Promise<RenderedFile>;
  renderFilmPreview(placementId: string): Promise<RenderedFile>;
  renderProductionFile(placementId: string): Promise<RenderedFile>;
  renderPipelineMockup?(context: PipelineRenderContext, variant: "main" | "lifestyle" | "closeup" | "preview"): Promise<RenderedFile>;
  renderFilmProductionFile?(input: { productionJobId: string; queueType: string; widthCm?: number | null; heightCm?: number | null; quantity?: number | null }): Promise<RenderedFile>;
  renderGangSheetProductionFile?(input: { productionJobId: string; queueType: string; snapshot: Record<string, unknown>; quantity?: number | null }): Promise<RenderedFile>;
}

export class MockupJobHandler {
  constructor(
    private readonly repo: WorkerRepository,
    private readonly renderer: MockupRendererPort = new SharpRenderer(),
  ) {}

  async handlePreview(input: { placementId: string; generatedAssetId: string }) {
    await this.repo.updateGeneratedAsset(input.generatedAssetId, { status: "PROCESSING", errorMessage: undefined });
    try {
      const context = await this.getPlacementContext(input.placementId);
      const rendered = context && this.renderer.renderPipelineMockup
        ? await this.renderer.renderPipelineMockup(context, "preview")
        : await this.renderer.renderPreview(input.placementId);
      return await this.repo.updateGeneratedAsset(input.generatedAssetId, {
        status: "READY",
        fileKey: rendered.fileKey,
        objectKey: rendered.objectKey,
        contentType: rendered.contentType,
        format: rendered.format,
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
    let context: LegacyPlacementRenderContext | null;
    try {
      context = await this.getPlacementContext(input.placementId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Mockup placement context is unavailable";
      for (const id of input.generatedAssetIds) {
        results.push(await this.repo.updateGeneratedAsset(id, {
          status: "FAILED",
          errorMessage,
        }));
      }
      return results;
    }
    for (const id of input.generatedAssetIds) {
      await this.repo.updateGeneratedAsset(id, { status: "PROCESSING", errorMessage: undefined });
      try {
        const variant = this.getVariantByIndex(id, input.generatedAssetIds);
        const rendered = context && this.renderer.renderPipelineMockup
          ? await this.renderer.renderPipelineMockup(context, variant)
          : await this.renderer.renderListingVariant(input.placementId, variant);
        const updated = await this.repo.updateGeneratedAsset(id, {
          status: "READY",
          fileKey: rendered.fileKey,
          objectKey: rendered.objectKey,
          contentType: rendered.contentType,
          format: rendered.format,
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
        objectKey: rendered.objectKey,
        contentType: rendered.contentType,
        format: rendered.format,
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

  async handleProductionFile(input: { placementId: string; generatedAssetId: string }): Promise<GeneratedAssetRecord>;
  async handleProductionFile(input: { productionJobId: string }): Promise<ProductionJobRecord>;
  async handleProductionFile(input: { placementId?: string; generatedAssetId?: string; productionJobId?: string }): Promise<GeneratedAssetRecord | ProductionJobRecord> {
    if (input.productionJobId) return this.handleFilmProductionFile(input.productionJobId);
    if (!input.placementId || !input.generatedAssetId) throw new Error("Production file job requires placementId/generatedAssetId or productionJobId");
    await this.repo.updateGeneratedAsset(input.generatedAssetId, { status: "PROCESSING", errorMessage: undefined });
    try {
      const rendered = await this.renderer.renderProductionFile(input.placementId);
      return await this.repo.updateGeneratedAsset(input.generatedAssetId, {
        status: "READY",
        fileKey: rendered.fileKey,
        objectKey: rendered.objectKey,
        contentType: rendered.contentType,
        format: rendered.format,
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

  private async handleFilmProductionFile(productionJobId: string) {
    if (!this.repo.getProductionJob || !this.repo.updateProductionJob || !this.renderer.renderFilmProductionFile) {
      throw new Error("Film production file generation is not configured");
    }
    const job = await this.repo.getProductionJob(productionJobId);
    if (!job) throw new Error(`Production job ${productionJobId} not found`);
    await this.repo.updateProductionJob(productionJobId, { productionFileStatus: "PROCESSING", status: "FILE_GENERATING", failureReason: null });
    try {
      const product = this.objectJson(job.productSnapshotJson);
      const gangSheetSnapshot = this.objectJson(job.gangSheetSnapshotJson);
      const rendered = gangSheetSnapshot.id && this.renderer.renderGangSheetProductionFile
        ? await this.renderer.renderGangSheetProductionFile({
            productionJobId,
            queueType: job.queueType,
            snapshot: gangSheetSnapshot,
            quantity: this.numberFrom(product.quantity),
          })
        : await this.renderer.renderFilmProductionFile({
            productionJobId,
            queueType: job.queueType,
            widthCm: this.numberFrom(product.filmWidthCm),
            heightCm: this.numberFrom(product.filmHeightCm),
            quantity: this.numberFrom(product.quantity),
          });
      return await this.repo.updateProductionJob(productionJobId, {
        productionFileStatus: "READY",
        productionFileObjectKey: rendered.objectKey,
        productionFileUrl: rendered.fileKey,
        status: "READY_FOR_PRINT",
        failureReason: null,
      });
    } catch (error) {
      return this.repo.updateProductionJob(productionJobId, {
        productionFileStatus: "FAILED",
        status: "WAITING_FOR_FILE",
        failureReason: error instanceof Error ? error.message : "Unknown film production file generation error",
      });
    }
  }

  private async getPlacementContext(placementId: string): Promise<LegacyPlacementRenderContext | null> {
    if (!this.repo.getLegacyPlacementRenderContext) return null;
    const context = await this.repo.getLegacyPlacementRenderContext(placementId);
    if (!context) throw new Error(`Mockup placement ${placementId} not found`);
    return context;
  }

  private objectJson(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private numberFrom(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  }

  private getVariantByIndex(currentId: string, ids: string[]): "main" | "lifestyle" | "closeup" {
    const index = ids.indexOf(currentId);
    if (index === 0) return "main";
    if (index === 1) return "lifestyle";
    return "closeup";
  }
}
