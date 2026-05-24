import { PipelineRenderContext, RenderedFile, SharpRenderer } from "../renderer";
import { MockupAssetRecord, PipelineSelectionRecord, WorkerRepository } from "../repository";
import { PrintfulMockupStartHelper } from "./printful-mockup-poll-handler";

export interface PipelineMockupRendererPort {
  renderListingVariant(selectionId: string, variant: "main" | "lifestyle" | "closeup"): Promise<RenderedFile>;
  renderPreview(selectionId: string): Promise<RenderedFile>;
  renderPipelineMockup?(context: PipelineRenderContext, variant: "main" | "lifestyle" | "closeup" | "preview"): Promise<RenderedFile>;
}

export class PipelineMockupJobHandler {
  private readonly printfulHelper: PrintfulMockupStartHelper;

  constructor(
    private readonly repo: WorkerRepository,
    private readonly renderer: PipelineMockupRendererPort = new SharpRenderer(),
  ) {
    this.printfulHelper = new PrintfulMockupStartHelper(repo);
  }

  async handleLocalMockups(input: { designProductSelectionId: string; workerJobId?: string }) {
    return this.generateMockups(input.designProductSelectionId, "LOCAL_MOCKUP_GENERATION_FAILED", undefined, input.workerJobId);
  }

  async handlePrintfulMockups(input: { designProductSelectionId: string; workerJobId?: string }) {
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

    await repo.updatePipelineSelection(input.designProductSelectionId, { status: "MOCKUP_GENERATING", errorMessage: null });
    try {
      const started = await this.printfulHelper.ensureFileAndCreateTask(input.designProductSelectionId, input.workerJobId);
      return { processing: true, taskKey: started.taskKey, printfulFileId: started.printfulFileId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "PRINTFUL_MOCKUP_FAILED";
      await this.failSelection(selection.id, message);
      return { failed: true, errorCode: message };
    }
  }

  private async generateMockups(selectionId: string, failureCode: string, providerTaskId?: string, renderJobId?: string) {
    const repo = this.pipelineRepo();
    const selection = await repo.getPipelineSelection(selectionId);
    if (!selection) throw new Error("Selection not found");
    await repo.updatePipelineSelection(selectionId, { status: "MOCKUP_GENERATING", errorMessage: null });

    const assets = await repo.listMockupAssets(selectionId);
    const results: MockupAssetRecord[] = [];
    let failed = false;

    for (const asset of assets) {
      if ((asset.status === "GENERATED" || asset.status === "READY") && (asset.objectKey || asset.imageUrl)) {
        results.push(asset);
        continue;
      }
      try {
        await repo.updateMockupAsset(asset.id, { status: "PROCESSING", renderJobId, failureReason: null });
        const rendered = await this.renderAsset(selection, asset);
        const placementSnapshot = {
          designProductSelectionId: selection.id,
          pipeline: selection.pipeline,
          placement: selection.placement,
          width: selection.width,
          height: selection.height,
          x: selection.x,
          y: selection.y,
          top: selection.top,
          left: selection.left,
          scale: selection.scale,
          rotation: selection.rotation,
          units: selection.units,
          placementConfigJson: selection.placementConfigJson ?? null,
          sourceDesignVersionId: selection.latestDesignVersion?.id ?? null,
          sourceFileKey: selection.latestDesignVersion?.fileKey ?? null,
        };
        const updated = await repo.updateMockupAsset(asset.id, {
          status: "GENERATED",
          imageUrl: rendered.fileKey,
          thumbnailUrl: rendered.fileKey,
          objectKey: rendered.objectKey,
          contentType: rendered.contentType,
          format: rendered.format,
          widthPx: rendered.widthPx,
          heightPx: rendered.heightPx,
          dpi: selection.latestDesignVersion?.dpi ?? null,
          placementSnapshotJson: placementSnapshot,
          renderJobId,
          failureReason: null,
          providerTaskId,
          metadataJson: { widthPx: rendered.widthPx, heightPx: rendered.heightPx, contentType: rendered.contentType, format: rendered.format, objectKey: rendered.objectKey, placementSnapshot },
        });
        results.push(updated);
      } catch (error) {
        failed = true;
        const failureReason = error instanceof Error ? error.message : failureCode;
        const updated = await repo.updateMockupAsset(asset.id, {
          status: "FAILED",
          renderJobId,
          failureReason,
          metadataJson: { errorMessage: failureReason },
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
