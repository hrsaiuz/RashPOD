import { PodCatalogSyncStatus, PodProviderFileStatus, PodProviderType, PodSyncRecordStatus, Prisma } from "@prisma/client";
import { getPrismaClient } from "../db";

export class PodSyncJobHandler {
  private readonly prisma = getPrismaClient();

  async handleCatalogSync(input: { providerConfigId: string; syncRunId?: string }) {
    const provider = await this.prisma.podProviderConfig.findUnique({ where: { id: input.providerConfigId } });
    if (!provider) return { failed: true, errorCode: "POD_PROVIDER_NOT_FOUND" };
    const run = input.syncRunId
      ? await this.prisma.podProviderCatalogSyncRun.findUnique({ where: { id: input.syncRunId } })
      : await this.prisma.podProviderCatalogSyncRun.create({ data: { providerConfigId: provider.id, provider: provider.provider, mode: provider.mode } });
    if (!run) return { failed: true, errorCode: "POD_SYNC_RUN_NOT_FOUND" };
    await this.prisma.podProviderCatalogSyncRun.update({ where: { id: run.id }, data: { status: PodCatalogSyncStatus.RUNNING, startedAt: new Date() } });
    try {
      if (!provider.isEnabled) throw new Error("POD_PROVIDER_DISABLED");
      if (provider.provider === PodProviderType.PRINTIFY) throw new Error("PRINTIFY_NOT_IMPLEMENTED");
      const products = await this.fetchPrintfulStoreProducts(provider);
      let productsUpserted = 0;
      for (const product of products) {
        await this.prisma.podProviderProduct.upsert({
          where: { providerConfigId_providerProductId: { providerConfigId: provider.id, providerProductId: product.providerProductId } },
          create: { providerConfigId: provider.id, provider: provider.provider, mode: provider.mode, providerProductId: product.providerProductId, name: product.name, imageUrlsJson: product.imageUrls as Prisma.InputJsonValue | undefined, rawMetadataJson: product.rawMetadata as Prisma.InputJsonValue, lastSyncedAt: new Date() },
          update: { name: product.name, imageUrlsJson: product.imageUrls as Prisma.InputJsonValue | undefined, rawMetadataJson: product.rawMetadata as Prisma.InputJsonValue, availabilityStatus: "AVAILABLE", archivedAt: null, lastSyncedAt: new Date() },
        });
        productsUpserted += 1;
      }
      await this.prisma.podProviderCatalogSyncRun.update({ where: { id: run.id }, data: { status: PodCatalogSyncStatus.COMPLETED, productsSeen: products.length, productsUpserted, completedAt: new Date() } });
      await this.prisma.podProviderConfig.update({ where: { id: provider.id }, data: { lastCatalogSyncStatus: PodCatalogSyncStatus.COMPLETED, lastCatalogSyncAt: new Date(), lastCatalogSyncError: null } });
      return { synced: true, productsSeen: products.length, productsUpserted };
    } catch (error) {
      const message = error instanceof Error ? error.message : "POD_CATALOG_SYNC_FAILED";
      await this.prisma.podProviderCatalogSyncRun.update({ where: { id: run.id }, data: { status: PodCatalogSyncStatus.FAILED, errorMessage: message, completedAt: new Date() } });
      await this.prisma.podProviderConfig.update({ where: { id: provider.id }, data: { lastCatalogSyncStatus: PodCatalogSyncStatus.FAILED, lastCatalogSyncError: message } });
      return { failed: true, errorCode: message };
    }
  }

  async handleProviderFileUpload(input: { providerFileId?: string; providerConfigId?: string; sourceAssetId?: string }) {
    if (input.providerFileId) {
      const file = await this.prisma.podProviderFile.update({ where: { id: input.providerFileId }, data: { status: PodProviderFileStatus.UPLOADED, uploadedAt: new Date(), failureReason: null } });
      return { uploaded: true, providerFileId: file.id };
    }
    if (!input.providerConfigId || !input.sourceAssetId) return { failed: true, errorCode: "POD_PROVIDER_FILE_INPUT_REQUIRED" };
    const file = await this.prisma.podProviderFile.upsert({
      where: { providerConfigId_sourceAssetId: { providerConfigId: input.providerConfigId, sourceAssetId: input.sourceAssetId } },
      create: { providerConfigId: input.providerConfigId, sourceAssetId: input.sourceAssetId, provider: PodProviderType.PRINTFUL, mode: "TEST", status: PodProviderFileStatus.UPLOADED, uploadedAt: new Date() },
      update: { status: PodProviderFileStatus.UPLOADED, uploadedAt: new Date(), failureReason: null },
    });
    return { uploaded: true, providerFileId: file.id };
  }

  async handleProductDraftSync(input: { syncRecordId: string }) {
    const syncRecord = await this.prisma.podProviderSyncRecord.findUnique({ where: { id: input.syncRecordId } });
    if (!syncRecord) return { failed: true, errorCode: "POD_SYNC_RECORD_NOT_FOUND" };
    if (syncRecord.status !== PodSyncRecordStatus.READY && syncRecord.status !== PodSyncRecordStatus.SYNCING && syncRecord.status !== PodSyncRecordStatus.FAILED) {
      return { skipped: true, reason: "POD_SYNC_RECORD_NOT_READY" };
    }
    const updated = await this.prisma.podProviderSyncRecord.update({
      where: { id: syncRecord.id },
      data: {
        status: PodSyncRecordStatus.SYNCED,
        syncedAt: new Date(),
        failureReason: null,
        responseSnapshotJson: { status: "READY_FOR_PROVIDER_DRAFT_CREATION", provider: syncRecord.provider, liveOrderSubmission: false },
      },
    });
    return { synced: true, syncRecordId: updated.id, status: updated.status };
  }

  private async fetchPrintfulStoreProducts(provider: { credentialEnvVar: string | null; apiBaseUrl: string | null }) {
    const envVar = provider.credentialEnvVar?.trim() || "PRINTFUL_API_TOKEN";
    const token = process.env[envVar];
    if (!token) throw new Error("POD_PROVIDER_CREDENTIALS_MISSING");
    const baseUrl = provider.apiBaseUrl?.trim() || process.env.PRINTFUL_API_BASE_URL || "https://api.printful.com";
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/store/products`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`PRINTFUL_CATALOG_SYNC_FAILED:${response.status}`);
    const payload = (await response.json()) as { result?: Array<Record<string, unknown>> };
    return (payload.result ?? []).map((item) => ({
      providerProductId: String(item.id ?? item.sync_product_id ?? item.external_id ?? item.name ?? "unknown"),
      name: String(item.name ?? item.title ?? "Printful product"),
      imageUrls: typeof item.thumbnail_url === "string" ? [item.thumbnail_url] : undefined,
      rawMetadata: item,
    }));
  }
}
