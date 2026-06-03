export type PrintfulCatalogAllowlistItem = {
  catalogProductId: number;
  rashpodProductType: string;
  displayName?: string;
  defaultVariantIds?: number[];
  defaultTechnique?: string;
  defaultPlacement?: string;
};

export type PrintfulSettingsValue = {
  enabled?: boolean;
  defaultStoreId?: string | null;
  connectedMarketplaces?: string[];
  autoPublishTrusted?: boolean;
  allowGlobalWithoutLocal?: boolean;
  catalogAllowlist?: PrintfulCatalogAllowlistItem[];
};

export type PrintfulTemplateUpsertInput = {
  rashpodProductType: string;
  displayName: string;
  printfulCatalogProductId: string;
  printfulProductName: string;
  printfulVariantIds: string[];
  allowedColorVariantIds?: string[];
  allowedSizeVariantIds?: string[];
  allowedPlacements: string[];
  allowedTechniques: string[];
  defaultTechnique: string;
  defaultPlacement: string;
  defaultRetailPrice?: string | null;
  estimatedBaseCost?: string | null;
  currency: string;
  previewImageUrl?: string | null;
  printfulStoreId?: string | null;
  printAreasJson?: import("./print-area-parser").PrintfulPrintAreasMap;
  metadataJson?: Record<string, unknown>;
};

export type PrintfulMockupTaskPayload = {
  variant_ids: Array<number | string>;
  format?: string;
  files: Array<{
    placement: string;
    technique?: string;
    file_id?: string | number;
    image_url?: string;
    position?: {
      width?: number | null;
      height?: number | null;
      left?: number | null;
      top?: number | null;
      scale?: number | null;
    };
  }>;
};

export type PrintfulSyncProductPayload = {
  sync_product: {
    name: string;
    thumbnail?: string;
  };
  sync_variants: Array<{
    variant_id: number;
    retail_price: string;
    files: Array<{ type: string; id?: string | number; url?: string }>;
  }>;
};
