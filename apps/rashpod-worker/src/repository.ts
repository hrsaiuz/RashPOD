export type AssetStatus = "PENDING" | "UPLOADED" | "VERIFYING" | "PROCESSING" | "READY" | "FAILED" | "EXPIRED" | "REPLACED" | "ARCHIVED";

export interface GeneratedAssetRecord {
  id: string;
  status: AssetStatus;
  fileKey?: string;
  objectKey?: string;
  contentType?: string;
  format?: string;
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
  pipeline: "LOCAL" | "GLOBAL_PRINTFUL" | "GLOBAL_POD";
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
  status: "PENDING" | "PROCESSING" | "GENERATED" | "READY" | "FAILED" | "REPLACED" | "ARCHIVED";
  imageUrl?: string | null;
  objectKey?: string | null;
}

export type MarketplacePublicationStatus = "NOT_SELECTED" | "DRAFT" | "QUEUED" | "PUBLISHING" | "PUBLISHED" | "FAILED" | "NEEDS_REVIEW";

export interface MarketplacePublicationRecord {
  id: string;
  marketplace: string;
  provider: "RASHPOD" | "PRINTFUL" | "PRINTIFY" | "DIRECT_MARKETPLACE";
  status: MarketplacePublicationStatus;
  productListing: {
    id: string;
    status: string;
    title: string;
    pipeline?: "LOCAL" | "GLOBAL_PRINTFUL" | "GLOBAL_POD" | null;
    mockupAssetIds?: unknown;
    designProductSelectionId?: string | null;
  };
}

export interface ProductionJobRecord {
  id: string;
  orderId: string;
  orderItemId?: string | null;
  status?: string;
  queueType: string;
  productionFileStatus?: string | null;
  productionFileObjectKey?: string | null;
  productionFileUrl?: string | null;
  productSnapshotJson?: unknown;
  assetSnapshotJson?: unknown;
  gangSheetSnapshotJson?: unknown;
  selectedOptionsJson?: unknown;
  notes?: string | null;
}

export interface AiJobRecord {
  id: string;
  workflow: string;
  entityType: string;
  entityId: string;
  provider?: string | null;
  model?: string | null;
  status: string;
  inputSummary?: unknown;
  inputSnapshot?: unknown;
  promptVersion?: string | null;
  outputSummary?: unknown;
  tokenUsageJson?: unknown;
  costEstimateUsd?: number | null;
  failureReason?: string | null;
}

export interface NotificationDeliveryRecord {
  id: string;
  channel: string;
  status: string;
  destination?: string | null;
  payloadJson?: unknown;
}

export interface WorkerRepository {
  getGeneratedAsset(id: string): Promise<GeneratedAssetRecord | null>;
  updateGeneratedAsset(
    id: string,
    data: Partial<Pick<GeneratedAssetRecord, "status" | "fileKey" | "objectKey" | "contentType" | "format" | "errorMessage" | "widthPx" | "heightPx">>,
  ): Promise<GeneratedAssetRecord>;
  getProductionJob?(id: string): Promise<ProductionJobRecord | null>;
  updateProductionJob?(
    id: string,
    data: { productionFileStatus?: string | null; productionFileObjectKey?: string | null; productionFileUrl?: string | null; status?: string; failureReason?: string | null },
  ): Promise<ProductionJobRecord>;
  getPipelineSelection?(id: string): Promise<PipelineSelectionRecord | null>;
  updatePipelineSelection?(id: string, data: { status?: PipelineSelectionStatus; errorMessage?: string | null }): Promise<PipelineSelectionRecord>;
  listMockupAssets?(selectionId: string): Promise<MockupAssetRecord[]>;
  updateMockupAsset?(
    id: string,
    data: {
      status?: "PENDING" | "PROCESSING" | "GENERATED" | "READY" | "FAILED" | "REPLACED" | "ARCHIVED";
      imageUrl?: string | null;
      thumbnailUrl?: string | null;
      objectKey?: string | null;
      contentType?: string | null;
      format?: string | null;
      widthPx?: number | null;
      heightPx?: number | null;
      dpi?: number | null;
      placementSnapshotJson?: unknown;
      renderJobId?: string | null;
      failureReason?: string | null;
      providerTaskId?: string | null;
      metadataJson?: unknown;
    },
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
  getAiJob?(id: string): Promise<AiJobRecord | null>;
  updateAiJob?(
    id: string,
    data: { status?: string; outputSummary?: unknown; tokenUsageJson?: unknown; costEstimateUsd?: number | null; failureReason?: string | null; completedAt?: Date | null },
  ): Promise<AiJobRecord>;
  createAiSuggestion?(data: { aiJobId: string; suggestionType: string; confidence?: number | null; severity?: string | null; payload: unknown }): Promise<{ id: string }>;
  getNotificationDelivery?(id: string): Promise<NotificationDeliveryRecord | null>;
  updateNotificationDelivery?(id: string, data: { status?: string; providerRef?: string | null; errorMessage?: string | null; attemptedAt?: Date | null; deliveredAt?: Date | null }): Promise<NotificationDeliveryRecord>;
}
