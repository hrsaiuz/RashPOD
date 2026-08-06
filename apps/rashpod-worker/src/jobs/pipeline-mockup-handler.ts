import { PipelineRenderContext, RenderedFile, SharpRenderer } from "../renderer";
import { MockupAssetRecord, PipelineSelectionRecord, WorkerRepository } from "../repository";
import { PrintfulMockupStartHelper } from "./printful-mockup-poll-handler";
import { summarizePrintfulFailure, type PrintfulFailureSummary } from "@rashpod/printful";

export interface PipelineMockupRendererPort {
  readonly renderVersion?: string;
  renderFingerprint?(context: PipelineRenderContext, variant: "main" | "lifestyle" | "closeup" | "preview"): string;
  renderListingVariant(selectionId: string, variant: "main" | "lifestyle" | "closeup"): Promise<RenderedFile>;
  renderPreview(selectionId: string): Promise<RenderedFile>;
  renderPipelineMockup?(context: PipelineRenderContext, variant: "main" | "lifestyle" | "closeup" | "preview"): Promise<RenderedFile>;
}

export class PipelineMockupJobHandler {
  private readonly printfulHelper: Pick<PrintfulMockupStartHelper, "ensureFileAndCreateTask">;

  constructor(
    private readonly repo: WorkerRepository,
    private readonly renderer: PipelineMockupRendererPort = new SharpRenderer(),
    printfulHelper?: Pick<PrintfulMockupStartHelper, "ensureFileAndCreateTask">,
  ) {
    this.printfulHelper = printfulHelper ?? new PrintfulMockupStartHelper(repo);
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
      const failure = summarizePrintfulFailure(error);
      await this.failSelection(selection.id, failure.code, failure);
      return { failed: true, errorCode: failure.code, retryable: failure.retryable };
    }
  }

  private async generateMockups(selectionId: string, failureCode: string, providerTaskId?: string, renderJobId?: string) {
    const repo = this.pipelineRepo();
    const selection = await repo.getPipelineSelection(selectionId);
    if (!selection) throw new Error("Selection not found");
    await repo.updatePipelineSelection(selectionId, { status: "MOCKUP_GENERATING", errorMessage: null });

    const assets = await repo.listMockupAssets(selectionId);
    const requiredTypes = ["MAIN", "LIFESTYLE", "DETAIL"] as const;
    if (requiredTypes.some((mockupType) => !assets.some((asset) => asset.mockupType === mockupType))) {
      await this.failSelection(selectionId, "MOCKUP_ASSET_SET_INCOMPLETE");
      return { failed: true, errorCode: "MOCKUP_ASSET_SET_INCOMPLETE", assets: await repo.listMockupAssets(selectionId) };
    }
    const results: MockupAssetRecord[] = [];
    let failed = false;

    for (const asset of assets) {
      const assetMetadata = this.record(asset.metadataJson);
      const variant = this.variantForAsset(asset);
      try {
        const expectedFingerprint = this.renderer.renderFingerprint?.(selection, variant);
        const rendererIsCurrent = (!this.renderer.renderVersion || assetMetadata.renderVersion === this.renderer.renderVersion)
          && (!expectedFingerprint || assetMetadata.renderFingerprint === expectedFingerprint);
        if ((asset.status === "GENERATED" || asset.status === "READY") && (asset.objectKey || asset.imageUrl) && rendererIsCurrent) {
          results.push(asset);
          continue;
        }
        await repo.updateMockupAsset(asset.id, { status: "PROCESSING", renderJobId, failureReason: null });
        const rendered = await this.renderAsset(selection, asset);
        const placementSnapshot = {
          designProductSelectionId: selection.id,
          pipeline: selection.pipeline,
          placement: selection.placement,
          providerPlacement: selection.providerPlacement ?? null,
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
          metadataJson: {
            widthPx: rendered.widthPx,
            heightPx: rendered.heightPx,
            contentType: rendered.contentType,
            format: rendered.format,
            objectKey: rendered.objectKey,
            renderVersion: rendered.renderVersion ?? this.renderer.renderVersion ?? null,
            renderFingerprint: rendered.renderFingerprint ?? expectedFingerprint ?? null,
            placementSnapshot,
          },
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
    const variant = this.variantForAsset(asset);
    if (this.renderer.renderPipelineMockup) return this.renderer.renderPipelineMockup(selection, variant);
    if (variant === "main") return this.renderer.renderListingVariant(selection.id, "main");
    if (variant === "lifestyle") return this.renderer.renderListingVariant(selection.id, "lifestyle");
    return this.renderer.renderPreview(selection.id);
  }

  private variantForAsset(asset: MockupAssetRecord): "main" | "lifestyle" | "closeup" | "preview" {
    return asset.mockupType === "MAIN" ? "main" : asset.mockupType === "DETAIL" ? "closeup" : asset.mockupType === "SECONDARY" || asset.mockupType === "LIFESTYLE" ? "lifestyle" : "preview";
  }

  private async failSelection(selectionId: string, errorMessage: string, failure?: PrintfulFailureSummary) {
    const repo = this.pipelineRepo();
    await repo.updatePipelineSelection(selectionId, { status: "MOCKUP_FAILED", errorMessage });
    const assets = await repo.listMockupAssets(selectionId);
    for (const asset of assets) {
      await repo.updateMockupAsset(asset.id, {
        status: "FAILED",
        failureReason: errorMessage,
        metadataJson: {
          errorMessage,
          retryable: failure?.retryable ?? false,
          providerStatus: failure?.status,
          providerMessage: failure?.providerMessage,
          providerCode: failure?.providerCode,
          providerRequestId: failure?.requestId,
          operation: failure?.operation,
        },
      });
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

  private record(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }
}
