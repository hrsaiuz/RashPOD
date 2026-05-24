import { PrintfulApiClient, buildPrintfulMockupTaskBody, extractMockupUrls } from "@rashpod/printful";
import { createArtifactStore } from "../artifact-store";
import { createSignedReadUrl } from "../gcs-signing";
import { WorkerRepository } from "../repository";

const MAX_POLL_ATTEMPTS = 12;

export class PrintfulMockupPollJobHandler {
  constructor(
    private readonly repo: WorkerRepository,
    private readonly client = new PrintfulApiClient(),
    private readonly artifactStore = createArtifactStore(),
  ) {}

  async handlePoll(input: { mockupAssetId: string; taskKey: string; designProductSelectionId: string; attempt?: number }) {
    const repo = this.pipelineRepo();
    const attempt = input.attempt ?? 1;
    const response = await this.client.getMockupTask(input.taskKey);
    const result = (response.result ?? {}) as Record<string, unknown>;
    const status = String(result.status ?? "pending").toLowerCase();

    if (status === "pending") {
      if (attempt >= MAX_POLL_ATTEMPTS) {
        await this.failSelection(repo, input.designProductSelectionId, input.mockupAssetId, "PRINTFUL_MOCKUP_TIMEOUT");
        return { failed: true, errorCode: "PRINTFUL_MOCKUP_TIMEOUT" };
      }
      await repo.enqueueWorkerJob!({
        type: "POLL_PRINTFUL_MOCKUP_TASK",
        payload: { ...input, attempt: attempt + 1 },
        nextRunAt: new Date(Date.now() + Math.min(120_000, 2_000 * Math.pow(2, attempt))),
        idempotencyKey: `poll:${input.taskKey}:${attempt + 1}`,
      });
      return { pending: true, attempt };
    }

    if (status === "failed") {
      await this.failSelection(repo, input.designProductSelectionId, input.mockupAssetId, "PRINTFUL_MOCKUP_FAILED", result);
      return { failed: true, errorCode: "PRINTFUL_MOCKUP_FAILED" };
    }

    const urls = extractMockupUrls(result);
    if (urls.length === 0) {
      await this.failSelection(repo, input.designProductSelectionId, input.mockupAssetId, "PRINTFUL_MOCKUP_EMPTY");
      return { failed: true, errorCode: "PRINTFUL_MOCKUP_EMPTY" };
    }

    const assets = await repo.listMockupAssets(input.designProductSelectionId);
    const pendingAssets = assets.filter((asset) => asset.status === "PROCESSING" || asset.status === "PENDING");
    const targets = pendingAssets.length > 0 ? pendingAssets : assets;

    for (let index = 0; index < targets.length; index += 1) {
      const asset = targets[index]!;
      const mockupUrl = urls[index] ?? urls[0]!;
      const buffer = await this.download(mockupUrl);
      const objectKey = `mockups/printful/${input.designProductSelectionId}/${asset.id}.jpg`;
      const storedKey = await this.artifactStore.putBuffer(objectKey, buffer, "image/jpeg");
      await repo.updateMockupAsset(asset.id, {
        status: "GENERATED",
        imageUrl: storedKey,
        thumbnailUrl: storedKey,
        objectKey: storedKey,
        contentType: "image/jpeg",
        format: "jpg",
        providerTaskId: input.taskKey,
        metadataJson: { printfulMockupUrl: mockupUrl, providerTaskId: input.taskKey },
      });
    }

    const processingCount = await repo.countProcessingMockupAssets!(input.designProductSelectionId);
    if (processingCount > 0) return { partial: true };

    await repo.updatePipelineSelection(input.designProductSelectionId, { status: "MOCKUP_READY", errorMessage: null });
    const listing = await repo.createListingDraftForSelection(input.designProductSelectionId);
    return { completed: true, listing };
  }

  private async download(url: string) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`PRINTFUL_MOCKUP_DOWNLOAD_FAILED:${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }

  private async failSelection(repo: ReturnType<PrintfulMockupPollJobHandler["pipelineRepo"]>, selectionId: string, assetId: string, code: string, details?: unknown) {
    await repo.updateMockupAsset(assetId, { status: "FAILED", failureReason: code, metadataJson: { errorMessage: code, details } });
    await repo.updatePipelineSelection(selectionId, { status: "MOCKUP_FAILED", errorMessage: code });
  }

  private pipelineRepo() {
    if (!this.repo.listMockupAssets || !this.repo.updateMockupAsset || !this.repo.updatePipelineSelection || !this.repo.createListingDraftForSelection || !this.repo.countProcessingMockupAssets || !this.repo.enqueueWorkerJob) {
      throw new Error("Printful poll repository methods are not configured");
    }
    return this.repo as Required<
      Pick<WorkerRepository, "listMockupAssets" | "updateMockupAsset" | "updatePipelineSelection" | "createListingDraftForSelection" | "countProcessingMockupAssets" | "enqueueWorkerJob">
    >;
  }
}

export class PrintfulMockupStartHelper {
  constructor(
    private readonly repo: WorkerRepository,
    private readonly client = new PrintfulApiClient(),
  ) {}

  async ensureFileAndCreateTask(selectionId: string, renderJobId?: string) {
    const repo = this.pipelineRepo();
    const selection = await repo.getPipelineSelection(selectionId);
    if (!selection?.printfulProductTemplate) throw new Error("INVALID_PRINTFUL_VARIANT");

    const file = await repo.ensurePrintfulFileForDesign!(selection.designId, async (url) => {
      const response = await this.client.uploadFileFromUrl(url);
      const fileId = response.result?.id;
      if (!fileId) throw new Error("PRINTFUL_FILE_UPLOAD_FAILED");
      return { fileId: String(fileId), printfulUrl: response.result?.url ?? null };
    });

    const body = buildPrintfulMockupTaskBody({
      template: selection.printfulProductTemplate,
      fileId: file.printfulFileId,
      placement: selection.placement?.toLowerCase(),
      position: {
        width: selection.width,
        height: selection.height,
        left: selection.left,
        top: selection.top,
        scale: selection.scale,
      },
    });
    const { catalog_product_id, ...payload } = body;
    const taskResponse = await this.client.createMockupTask(catalog_product_id, payload);
    const taskKey = taskResponse.result?.task_key;
    if (!taskKey) throw new Error("PRINTFUL_MOCKUP_TASK_FAILED");

    const assets = await repo.listMockupAssets(selectionId);
    for (const asset of assets) {
      if (asset.status === "GENERATED" || asset.status === "READY") continue;
      await repo.updateMockupAsset(asset.id, { status: "PROCESSING", renderJobId: renderJobId ?? null, providerTaskId: taskKey, failureReason: null });
    }

    const mainAsset = assets.find((asset) => asset.mockupType === "MAIN") ?? assets[0];
    if (!mainAsset) throw new Error("MOCKUP_ASSETS_MISSING");

    await repo.enqueueWorkerJob!({
      type: "POLL_PRINTFUL_MOCKUP_TASK",
      payload: { mockupAssetId: mainAsset.id, taskKey, designProductSelectionId: selectionId, attempt: 1 },
      nextRunAt: new Date(Date.now() + 5_000),
      idempotencyKey: `poll:${taskKey}:1`,
    });

    return { taskKey, printfulFileId: file.printfulFileId };
  }

  private pipelineRepo() {
    if (!this.repo.getPipelineSelection || !this.repo.listMockupAssets || !this.repo.updateMockupAsset || !this.repo.ensurePrintfulFileForDesign || !this.repo.enqueueWorkerJob) {
      throw new Error("Printful mockup repository methods are not configured");
    }
    return this.repo as Required<Pick<WorkerRepository, "getPipelineSelection" | "listMockupAssets" | "updateMockupAsset" | "ensurePrintfulFileForDesign" | "enqueueWorkerJob">>;
  }
}

export { createSignedReadUrl };
