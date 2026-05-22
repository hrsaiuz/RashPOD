import { Injectable } from "@nestjs/common";
import { PodProviderConfig, PodProviderType } from "@prisma/client";
import { PodAdapterConfigStatus, PodCatalogProductInput, PodProviderAdapter } from "./pod-provider-adapter";

@Injectable()
export class PrintifyProviderAdapter implements PodProviderAdapter {
  provider = PodProviderType.PRINTIFY;

  validateConfig(config: PodProviderConfig): PodAdapterConfigStatus {
    const envVar = config.credentialEnvVar?.trim() || "PRINTIFY_API_TOKEN";
    const configured = Boolean(process.env[envVar]) || Boolean(config.credentialSecretRef?.trim());
    return {
      provider: this.provider,
      configured,
      enabled: config.isEnabled,
      mode: config.mode,
      message: configured ? "Printify adapter foundation is configured; live catalog sync is not implemented in Slice 10." : `Missing credential reference or ${envVar}`,
      supportsCatalogSync: false,
      supportsFileUpload: false,
      supportsProductDraft: false,
    };
  }

  async syncCatalog(_config: PodProviderConfig): Promise<PodCatalogProductInput[]> {
    throw new Error("PRINTIFY_NOT_IMPLEMENTED");
  }

  async uploadFile(): Promise<{ providerFileId?: string; metadata?: Record<string, unknown> }> {
    throw new Error("PRINTIFY_NOT_IMPLEMENTED");
  }

  async createProductDraft(): Promise<{ providerDraftProductId?: string; response?: Record<string, unknown> }> {
    throw new Error("PRINTIFY_NOT_IMPLEMENTED");
  }
}
