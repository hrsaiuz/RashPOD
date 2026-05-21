import { PipelineRenderContext, RenderedFile, SharpRenderer } from "../renderer";
import { MockupAssetRecord, PipelineSelectionRecord, WorkerRepository } from "../repository";

export interface PipelineMockupRendererPort {
  renderListingVariant(selectionId: string, variant: "main" | "lifestyle" | "closeup"): Promise<RenderedFile>;
  renderPreview(selectionId: string): Promise<RenderedFile>;
  renderPipelineMockup?(context: PipelineRenderContext, variant: "main" | "lifestyle" | "closeup" | "preview"): Promise<RenderedFile>;
}

export class PipelineMockupJobHandler {
  constructor(
    private readonly repo: WorkerRepository,
    private readonly renderer: PipelineMockupRendererPort = new SharpRenderer(),
  ) {}

  async handleLocalMockups(input: { designProductSelectionId: string }) {
    return this.generateMockups(input.designProductSelectionId, "LOCAL_MOCKUP_GENERATION_FAILED");
  }

  async handlePrintfulMockups(input: { designProductSelectionId: string }) {
    const repo = this.pipelineRepo();
    const selection = await repo.getPipelineSelection(input.designProductSelectionId);
    if (!selection) throw new Error("Selection not found");
    if (!selection.printfulProductTemplate) {
      await repo.updatePipelineSelection(selection.id, { status: "MOCKUP_FAILED", errorMessage: "INVALID_PRINTFUL_VARIANT" });
      return { failed: true, errorCode: "INVALID_PRINTFUL_VARIANT" };
    }

    if (process.env.PRINTFUL_ENABLED !== "true") {
      await this.failSelection(selection.id, "PRINTFUL_NOT_CONFIGURED");
      return { failed: true, errorCode: "PRINTFUL_NOT_CONFIGURED" };
    }
    if (!process.env.PRINTFUL_API_TOKEN) {
      await this.failSelection(selection.id, "PRINTFUL_API_TOKEN_MISSING");
      return { failed: true, errorCode: "PRINTFUL_API_TOKEN_MISSING" };
    }

    return this.generateMockups(input.designProductSelectionId, "PRINTFUL_MOCKUP_FAILED", "printful-dev-task");
  }

  private async generateMockups(selectionId: string, failureCode: string, providerTaskId?: string) {
    const repo = this.pipelineRepo();
    const selection = await repo.getPipelineSelection(selectionId);
    if (!selection) throw new Error("Selection not found");
    await repo.updatePipelineSelection(selectionId, { status: "MOCKUP_GENERATING", errorMessage: null });

    const assets = await repo.listMockupAssets(selectionId);
    const results: MockupAssetRecord[] = [];
    let failed = false;

    for (const asset of assets) {
      try {
        const rendered = await this.renderAsset(selection, asset);
        const updated = await repo.updateMockupAsset(asset.id, {
          status: "GENERATED",
          imageUrl: rendered.fileKey,
          thumbnailUrl: rendered.fileKey,
          providerTaskId,
          metadataJson: { widthPx: rendered.widthPx, heightPx: rendered.heightPx },
        });
        results.push(updated);
      } catch (error) {
        failed = true;
        const updated = await repo.updateMockupAsset(asset.id, {
          status: "FAILED",
          metadataJson: { errorMessage: error instanceof Error ? error.message : failureCode },
        });
        results.push(updated);
      }
    }

    if (failed) {
      await repo.updatePipelineSelection(selectionId, { status: "MOCKUP_FAILED", errorMessage: failureCode });
      return { failed: true, assets: results };
    }

    await repo.updatePipelineSelection(selectionId, { status: "MOCKUP_READY", errorMessage: null });
    const listing = await repo.createListingDraftForSelection(selectionId);
    return { failed: false, assets: results, listing };
  }

  private async renderAsset(selection: PipelineSelectionRecord, asset: MockupAssetRecord) {
    const variant = asset.mockupType === "MAIN" ? "main" : asset.mockupType === "DETAIL" ? "closeup" : asset.mockupType === "SECONDARY" || asset.mockupType === "LIFESTYLE" ? "lifestyle" : "preview";
    if (this.renderer.renderPipelineMockup) return this.renderer.renderPipelineMockup(selection, variant);
    if (variant === "main") return this.renderer.renderListingVariant(selection.id, "main");
    if (variant === "lifestyle") return this.renderer.renderListingVariant(selection.id, "lifestyle");
    return this.renderer.renderPreview(selection.id);
  }

  private async failSelection(selectionId: string, errorMessage: string) {
    const repo = this.pipelineRepo();
    await repo.updatePipelineSelection(selectionId, { status: "MOCKUP_FAILED", errorMessage });
    const assets = await repo.listMockupAssets(selectionId);
    for (const asset of assets) {
      await repo.updateMockupAsset(asset.id, { status: "FAILED", metadataJson: { errorMessage } });
    }
  }

  private pipelineRepo() {
    if (
      !this.repo.getPipelineSelection ||
      !this.repo.updatePipelineSelection ||
      !this.repo.listMockupAssets ||
      !this.repo.updateMockupAsset ||
      !this.repo.createListingDraftForSelection
    ) {
      throw new Error("Pipeline repository methods are not configured");
    }
    return this.repo as Required<Pick<WorkerRepository, "getPipelineSelection" | "updatePipelineSelection" | "listMockupAssets" | "updateMockupAsset" | "createListingDraftForSelection">>;
  }
}
