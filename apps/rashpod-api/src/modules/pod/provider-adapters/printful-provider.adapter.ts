import { Injectable } from "@nestjs/common";
import { PodProviderConfig, PodProviderType } from "@prisma/client";
import { PodAdapterConfigStatus, PodCatalogProductInput, PodProviderAdapter } from "./pod-provider-adapter";

@Injectable()
export class PrintfulProviderAdapter implements PodProviderAdapter {
  provider = PodProviderType.PRINTFUL;

  validateConfig(config: PodProviderConfig): PodAdapterConfigStatus {
    const envVar = config.credentialEnvVar?.trim() || "PRINTFUL_API_TOKEN";
    const hasEnvToken = Boolean(process.env[envVar]);
    const hasSecretRef = Boolean(config.credentialSecretRef?.trim());
    const configured = hasEnvToken || hasSecretRef;
    return {
      provider: this.provider,
      configured,
      enabled: config.isEnabled,
      mode: config.mode,
      message: configured ? undefined : `Missing credential reference or ${envVar}`,
      supportsCatalogSync: true,
      supportsFileUpload: true,
      supportsProductDraft: true,
    };
  }

  async syncCatalog(config: PodProviderConfig): Promise<PodCatalogProductInput[]> {
    const status = this.validateConfig(config);
    if (!config.isEnabled || !status.configured) return [];
    const token = process.env[config.credentialEnvVar?.trim() || "PRINTFUL_API_TOKEN"];
    if (!token) return [];
    const baseUrl = config.apiBaseUrl?.trim() || process.env.PRINTFUL_API_BASE_URL || "https://api.printful.com";
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/store/products`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`PRINTFUL_CATALOG_SYNC_FAILED:${response.status}`);
    const json = (await response.json()) as { result?: Array<Record<string, unknown>> };
    return (json.result ?? []).map((item) => this.mapStoreProduct(item));
  }

  async uploadFile(_config: PodProviderConfig, input: { sourceAssetId: string; transferUrl: string; mimeType: string }) {
    return {
      providerFileId: undefined,
      metadata: {
        sourceAssetId: input.sourceAssetId,
        mimeType: input.mimeType,
        transferMode: "SIGNED_URL_READY_FOR_PROVIDER",
      },
    };
  }

  async createProductDraft(_config: PodProviderConfig, payload: Record<string, unknown>) {
    return {
      providerDraftProductId: undefined,
      response: { status: "READY_FOR_PROVIDER_CREATION", payloadSummary: payload },
    };
  }

  private mapStoreProduct(item: Record<string, unknown>): PodCatalogProductInput {
    const id = String(item.id ?? item.sync_product_id ?? item.external_id ?? item.name ?? "unknown");
    const name = String(item.name ?? item.title ?? `Printful product ${id}`);
    const thumbnail = typeof item.thumbnail_url === "string" ? [item.thumbnail_url] : undefined;
    return {
      providerProductId: id,
      name,
      category: typeof item.category === "string" ? item.category : undefined,
      imageUrls: thumbnail,
      rawMetadata: item,
      variants: [],
      printAreas: [],
    };
  }
}
