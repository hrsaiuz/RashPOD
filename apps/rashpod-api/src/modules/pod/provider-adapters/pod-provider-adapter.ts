import { PodProviderConfig, PodProviderType } from "@prisma/client";

export interface PodAdapterConfigStatus {
  provider: PodProviderType;
  configured: boolean;
  enabled: boolean;
  mode: string;
  message?: string;
  supportsCatalogSync: boolean;
  supportsFileUpload: boolean;
  supportsProductDraft: boolean;
}

export interface PodCatalogProductInput {
  providerProductId: string;
  name: string;
  category?: string;
  brand?: string;
  model?: string;
  description?: string;
  imageUrls?: string[];
  currency?: string;
  baseCost?: number;
  suggestedRetailPrice?: number;
  rawMetadata?: Record<string, unknown>;
  variants: Array<{
    providerVariantId: string;
    name: string;
    sku?: string;
    color?: string;
    size?: string;
    material?: string;
    currency?: string;
    baseCost?: number;
    suggestedRetailPrice?: number;
    rawMetadata?: Record<string, unknown>;
  }>;
  printAreas: Array<{
    providerPrintAreaId: string;
    name: string;
    placement?: string;
    width?: number;
    height?: number;
    units?: "CM" | "INCH" | "PX";
    dpi?: number;
    techniques?: string[];
    rawMetadata?: Record<string, unknown>;
  }>;
}

export interface PodProviderAdapter {
  provider: PodProviderType;
  validateConfig(config: PodProviderConfig): PodAdapterConfigStatus;
  syncCatalog(config: PodProviderConfig): Promise<PodCatalogProductInput[]>;
  uploadFile(config: PodProviderConfig, input: { sourceAssetId: string; transferUrl: string; mimeType: string }): Promise<{ providerFileId?: string; metadata?: Record<string, unknown> }>;
  createProductDraft(config: PodProviderConfig, payload: Record<string, unknown>): Promise<{ providerDraftProductId?: string; response?: Record<string, unknown> }>;
}
