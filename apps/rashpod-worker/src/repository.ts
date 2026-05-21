export type AssetStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";

export interface GeneratedAssetRecord {
  id: string;
  status: AssetStatus;
  fileKey?: string;
  errorMessage?: string;
  widthPx?: number;
  heightPx?: number;
}

export type PipelineSelectionStatus =
  | "SELECTED"
  | "MOCKUP_PENDING"
  | "MOCKUP_GENERATING"
  | "MOCKUP_READY"
  | "MOCKUP_FAILED"
  | "LISTING_DRAFT"
  | "READY_TO_PUBLISH"
  | "PUBLISHED"
  | "FAILED";

export interface PipelineSelectionRecord {
  id: string;
  designId: string;
  pipeline: "LOCAL" | "GLOBAL_PRINTFUL";
  status: PipelineSelectionStatus;
  errorMessage?: string;
  design?: { id: string; title: string; designerId: string };
  latestDesignVersion?: { id: string; fileKey: string; widthPx?: number | null; heightPx?: number | null; dpi?: number | null; hasTransparency?: boolean | null } | null;
  placement?: string;
  width?: number | null;
  height?: number | null;
  x?: number | null;
  y?: number | null;
  top?: number | null;
  left?: number | null;
  scale?: number | null;
  rotation?: number | null;
  units?: "CM" | "INCH" | "PX";
  placementConfigJson?: unknown;
  localBaseProduct?: { id: string; name: string; imageUrl?: string; defaultPrice?: unknown; baseCost?: unknown; currency?: string } | null;
  printfulProductTemplate?: {
    id: string;
    displayName: string;
    printfulCatalogProductId: string;
    printfulVariantIds: unknown;
    defaultPlacement: string;
    defaultTechnique: string;
    defaultRetailPrice?: unknown;
    estimatedBaseCost?: unknown;
    currency: string;
  } | null;
  targetMarketplaces?: unknown;
}

export interface MockupAssetRecord {
  id: string;
  mockupType: "MAIN" | "SECONDARY" | "DETAIL" | "LIFESTYLE" | "PRINT_AREA_PREVIEW";
  status: "PENDING" | "GENERATED" | "FAILED";
}

export type MarketplacePublicationStatus = "NOT_SELECTED" | "DRAFT" | "QUEUED" | "PUBLISHING" | "PUBLISHED" | "FAILED" | "NEEDS_REVIEW";

export interface MarketplacePublicationRecord {
  id: string;
  marketplace: string;
  provider: "RASHPOD" | "PRINTFUL" | "DIRECT_MARKETPLACE";
  status: MarketplacePublicationStatus;
  productListing: {
    id: string;
    status: string;
    title: string;
    pipeline?: "LOCAL" | "GLOBAL_PRINTFUL" | null;
    mockupAssetIds?: unknown;
    designProductSelectionId?: string | null;
  };
}

export interface WorkerRepository {
  getGeneratedAsset(id: string): Promise<GeneratedAssetRecord | null>;
  updateGeneratedAsset(
    id: string,
    data: Partial<Pick<GeneratedAssetRecord, "status" | "fileKey" | "errorMessage" | "widthPx" | "heightPx">>,
  ): Promise<GeneratedAssetRecord>;
  getPipelineSelection?(id: string): Promise<PipelineSelectionRecord | null>;
  updatePipelineSelection?(id: string, data: { status?: PipelineSelectionStatus; errorMessage?: string | null }): Promise<PipelineSelectionRecord>;
  listMockupAssets?(selectionId: string): Promise<MockupAssetRecord[]>;
  updateMockupAsset?(
    id: string,
    data: { status?: "PENDING" | "GENERATED" | "FAILED"; imageUrl?: string | null; thumbnailUrl?: string | null; providerTaskId?: string | null; metadataJson?: unknown },
  ): Promise<MockupAssetRecord>;
  createListingDraftForSelection?(selectionId: string): Promise<{ id: string; status: string } | null>;
  getMarketplacePublication?(id: string): Promise<MarketplacePublicationRecord | null>;
  updateMarketplacePublication?(
    id: string,
    data: { status?: MarketplacePublicationStatus; errorMessage?: string | null; providerExternalListingId?: string | null; providerSyncProductId?: string | null; lastSyncedAt?: Date | null; metadataJson?: unknown },
  ): Promise<MarketplacePublicationRecord>;
  markListingPublishedIfComplete?(listingId: string): Promise<{ id: string; status: string }>;
  createIntegrationLog?(data: {
    productListingId?: string | null;
    marketplacePublicationId?: string | null;
    action: string;
    status: "PENDING" | "SUCCESS" | "FAILED" | "SKIPPED";
    errorCode?: string | null;
    errorMessage?: string | null;
    responseSummaryJson?: unknown;
  }): Promise<void>;
}
