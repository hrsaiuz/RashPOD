ALTER TYPE "DesignStatus" ADD VALUE IF NOT EXISTS 'PENDING_MODERATION';
ALTER TYPE "DesignStatus" ADD VALUE IF NOT EXISTS 'APPROVED_LOCAL';
ALTER TYPE "DesignStatus" ADD VALUE IF NOT EXISTS 'APPROVED_GLOBAL';
ALTER TYPE "ListingStatus" ADD VALUE IF NOT EXISTS 'READY_TO_PUBLISH';
ALTER TYPE "ListingStatus" ADD VALUE IF NOT EXISTS 'UNPUBLISHED';
ALTER TYPE "ListingStatus" ADD VALUE IF NOT EXISTS 'FAILED';

DO $$
BEGIN
  CREATE TYPE "PipelineType" AS ENUM ('LOCAL', 'GLOBAL_PRINTFUL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ProviderType" AS ENUM ('RASHPOD', 'PRINTFUL', 'DIRECT_MARKETPLACE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ModerationPipelineDecision" AS ENUM ('REJECT', 'APPROVE_LOCAL', 'APPROVE_GLOBAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "RejectionReasonCode" AS ENUM ('COPYRIGHT_RISK', 'OFFENSIVE_CONTENT', 'POLITICAL_SENSITIVE_CONTENT', 'LOW_IMAGE_RESOLUTION', 'POOR_IMAGE_QUALITY', 'WRONG_FILE_FORMAT', 'TRANSPARENCY_OR_BACKGROUND_ISSUE', 'NOT_SUITABLE_FOR_PRODUCTION', 'DUPLICATE_OR_SPAM', 'MARKETPLACE_COMPLIANCE_RISK', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "LocalProductType" AS ENUM ('T_SHIRT', 'LONG_SLEEVE_T_SHIRT', 'HOODIE', 'SWEATSHIRT', 'MUG', 'CAP', 'TOTE_BAG', 'POSTER', 'STICKER', 'DTF_FILM', 'UV_DTF_FILM', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "NecklineType" AS ENUM ('CREW_NECK', 'V_NECK', 'POLO', 'HOODIE', 'NONE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SleeveType" AS ENUM ('SHORT', 'LONG', 'SLEEVELESS', 'NONE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "LocalProductionMethod" AS ENUM ('DTF', 'UV_DTF', 'DTG', 'SUBLIMATION', 'EMBROIDERY', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PlacementKind" AS ENUM ('FRONT', 'BACK', 'LEFT_CHEST', 'RIGHT_CHEST', 'LEFT_SLEEVE', 'RIGHT_SLEEVE', 'FULL_WRAP', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PlacementAlignment" AS ENUM ('CENTER', 'TOP_CENTER', 'LEFT_CHEST', 'CUSTOM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PlacementUnits" AS ENUM ('CM', 'INCH', 'PX');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "DesignProductSelectionStatus" AS ENUM ('SELECTED', 'MOCKUP_PENDING', 'MOCKUP_GENERATING', 'MOCKUP_READY', 'MOCKUP_FAILED', 'LISTING_DRAFT', 'READY_TO_PUBLISH', 'PUBLISHED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "MockupAssetType" AS ENUM ('MAIN', 'SECONDARY', 'DETAIL', 'LIFESTYLE', 'PRINT_AREA_PREVIEW');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "MockupAssetStatus" AS ENUM ('PENDING', 'GENERATED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "MarketplaceKind" AS ENUM ('RASHPOD_LOCAL', 'LOCAL_MARKETPLACE', 'ETSY', 'AMAZON', 'EBAY', 'SHOPIFY', 'WOOCOMMERCE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "MarketplacePublicationStatus" AS ENUM ('NOT_SELECTED', 'DRAFT', 'QUEUED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'NEEDS_REVIEW');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PrintfulMappingStatus" AS ENUM ('PENDING', 'READY', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "IntegrationLogStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "DesignAsset" ADD COLUMN IF NOT EXISTS "tags" JSONB;
ALTER TABLE "DesignAsset" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;
ALTER TABLE "DesignAsset" ADD COLUMN IF NOT EXISTS "originalFileUrl" TEXT;
ALTER TABLE "DesignAsset" ADD COLUMN IF NOT EXISTS "processedFileUrl" TEXT;
ALTER TABLE "DesignAsset" ADD COLUMN IF NOT EXISTS "transparentFileUrl" TEXT;
ALTER TABLE "DesignAsset" ADD COLUMN IF NOT EXISTS "previewUrl" TEXT;
ALTER TABLE "DesignAsset" ADD COLUMN IF NOT EXISTS "widthPx" INTEGER;
ALTER TABLE "DesignAsset" ADD COLUMN IF NOT EXISTS "heightPx" INTEGER;
ALTER TABLE "DesignAsset" ADD COLUMN IF NOT EXISTS "dpi" INTEGER;
ALTER TABLE "DesignAsset" ADD COLUMN IF NOT EXISTS "fileType" TEXT;
ALTER TABLE "DesignAsset" ADD COLUMN IF NOT EXISTS "fileSize" INTEGER;
ALTER TABLE "DesignAsset" ADD COLUMN IF NOT EXISTS "moderationDecision" TEXT;
ALTER TABLE "DesignAsset" ADD COLUMN IF NOT EXISTS "moderationStatus" TEXT;
ALTER TABLE "DesignAsset" ADD COLUMN IF NOT EXISTS "moderatedById" TEXT;
ALTER TABLE "DesignAsset" ADD COLUMN IF NOT EXISTS "moderatedAt" TIMESTAMP(3);
ALTER TABLE "DesignAsset" ADD COLUMN IF NOT EXISTS "rejectionReasons" JSONB;
ALTER TABLE "DesignAsset" ADD COLUMN IF NOT EXISTS "customRejectionReason" TEXT;
ALTER TABLE "DesignAsset" ADD COLUMN IF NOT EXISTS "copyrightRiskStatus" TEXT;
ALTER TABLE "DesignAsset" ADD COLUMN IF NOT EXISTS "contentSafetyStatus" TEXT;

ALTER TABLE "BaseProduct" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "BaseProduct" ADD COLUMN IF NOT EXISTS "localProductType" "LocalProductType";
ALTER TABLE "BaseProduct" ADD COLUMN IF NOT EXISTS "neckline" "NecklineType";
ALTER TABLE "BaseProduct" ADD COLUMN IF NOT EXISTS "sleeveType" "SleeveType";
ALTER TABLE "BaseProduct" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'UZS';
ALTER TABLE "BaseProduct" ADD COLUMN IF NOT EXISTS "baseImageUrls" JSONB;
ALTER TABLE "BaseProduct" ADD COLUMN IF NOT EXISTS "mockupSceneImages" JSONB;
ALTER TABLE "BaseProduct" ADD COLUMN IF NOT EXISTS "printableAreas" JSONB;
ALTER TABLE "BaseProduct" ADD COLUMN IF NOT EXISTS "localProductionMethod" "LocalProductionMethod";

ALTER TABLE "PrintArea" ADD COLUMN IF NOT EXISTS "placement" "PlacementKind";
ALTER TABLE "PrintArea" ADD COLUMN IF NOT EXISTS "widthCm" DOUBLE PRECISION;
ALTER TABLE "PrintArea" ADD COLUMN IF NOT EXISTS "heightCm" DOUBLE PRECISION;
ALTER TABLE "PrintArea" ADD COLUMN IF NOT EXISTS "safeZonePx" INTEGER;
ALTER TABLE "PrintArea" ADD COLUMN IF NOT EXISTS "defaultPresetId" TEXT;
ALTER TABLE "PrintArea" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "CommerceListing" ADD COLUMN IF NOT EXISTS "pipeline" "PipelineType";
ALTER TABLE "CommerceListing" ADD COLUMN IF NOT EXISTS "tags" JSONB;
ALTER TABLE "CommerceListing" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;
ALTER TABLE "CommerceListing" ADD COLUMN IF NOT EXISTS "productType" TEXT;
ALTER TABLE "CommerceListing" ADD COLUMN IF NOT EXISTS "localBaseProductId" TEXT;
ALTER TABLE "CommerceListing" ADD COLUMN IF NOT EXISTS "printfulProductTemplateId" TEXT;
ALTER TABLE "CommerceListing" ADD COLUMN IF NOT EXISTS "designProductSelectionId" TEXT;
ALTER TABLE "CommerceListing" ADD COLUMN IF NOT EXISTS "mockupAssetIds" JSONB;
ALTER TABLE "CommerceListing" ADD COLUMN IF NOT EXISTS "cost" DECIMAL(10, 2);
ALTER TABLE "CommerceListing" ADD COLUMN IF NOT EXISTS "marketplaceFeeEstimate" DECIMAL(10, 2);
ALTER TABLE "CommerceListing" ADD COLUMN IF NOT EXISTS "rashpodCommission" DECIMAL(10, 2);
ALTER TABLE "CommerceListing" ADD COLUMN IF NOT EXISTS "designerRoyalty" DECIMAL(10, 2);
ALTER TABLE "CommerceListing" ADD COLUMN IF NOT EXISTS "seoMetadata" JSONB;

CREATE TABLE IF NOT EXISTS "ModerationAudit" (
  "id" TEXT NOT NULL,
  "designId" TEXT NOT NULL,
  "moderatorId" TEXT NOT NULL,
  "decision" "ModerationPipelineDecision" NOT NULL,
  "predefinedReasons" JSONB,
  "customReason" TEXT,
  "notes" TEXT,
  "beforeStatus" "DesignStatus" NOT NULL,
  "afterStatus" "DesignStatus" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModerationAudit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PrintfulProductTemplate" (
  "id" TEXT NOT NULL,
  "rashpodProductType" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "provider" "ProviderType" NOT NULL DEFAULT 'PRINTFUL',
  "printfulCatalogProductId" TEXT NOT NULL,
  "printfulProductName" TEXT NOT NULL,
  "printfulVariantIds" JSONB NOT NULL,
  "allowedColorVariantIds" JSONB,
  "allowedSizeVariantIds" JSONB,
  "allowedPlacements" JSONB NOT NULL,
  "allowedTechniques" JSONB NOT NULL,
  "defaultTechnique" TEXT NOT NULL,
  "defaultPlacement" TEXT NOT NULL,
  "printfulStoreId" TEXT,
  "defaultRetailPrice" DECIMAL(10, 2),
  "estimatedBaseCost" DECIMAL(10, 2),
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PrintfulProductTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PlacementPreset" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "pipeline" "PipelineType" NOT NULL,
  "productTemplateId" TEXT,
  "localBaseProductId" TEXT,
  "placement" "PlacementKind" NOT NULL,
  "defaultWidthCm" DOUBLE PRECISION,
  "defaultHeightCm" DOUBLE PRECISION,
  "defaultWidthIn" DOUBLE PRECISION,
  "defaultHeightIn" DOUBLE PRECISION,
  "defaultX" DOUBLE PRECISION,
  "defaultY" DOUBLE PRECISION,
  "defaultScale" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "alignment" "PlacementAlignment" NOT NULL DEFAULT 'CENTER',
  "units" "PlacementUnits" NOT NULL DEFAULT 'CM',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlacementPreset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DesignProductSelection" (
  "id" TEXT NOT NULL,
  "designId" TEXT NOT NULL,
  "pipeline" "PipelineType" NOT NULL,
  "localBaseProductId" TEXT,
  "printfulProductTemplateId" TEXT,
  "placementPresetId" TEXT NOT NULL,
  "placement" "PlacementKind" NOT NULL,
  "technique" TEXT,
  "width" DOUBLE PRECISION,
  "height" DOUBLE PRECISION,
  "x" DOUBLE PRECISION,
  "y" DOUBLE PRECISION,
  "top" DOUBLE PRECISION,
  "left" DOUBLE PRECISION,
  "scale" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "units" "PlacementUnits" NOT NULL DEFAULT 'CM',
  "positionHash" TEXT NOT NULL,
  "targetMarketplaces" JSONB,
  "selectedByModeratorId" TEXT NOT NULL,
  "status" "DesignProductSelectionStatus" NOT NULL DEFAULT 'SELECTED',
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DesignProductSelection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MockupAsset" (
  "id" TEXT NOT NULL,
  "designId" TEXT NOT NULL,
  "designProductSelectionId" TEXT NOT NULL,
  "pipeline" "PipelineType" NOT NULL,
  "provider" "ProviderType" NOT NULL,
  "imageUrl" TEXT,
  "thumbnailUrl" TEXT,
  "mockupType" "MockupAssetType" NOT NULL,
  "providerMockupId" TEXT,
  "providerTaskId" TEXT,
  "status" "MockupAssetStatus" NOT NULL DEFAULT 'PENDING',
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MockupAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MarketplacePublication" (
  "id" TEXT NOT NULL,
  "productListingId" TEXT NOT NULL,
  "marketplace" "MarketplaceKind" NOT NULL,
  "provider" "ProviderType" NOT NULL,
  "providerStoreId" TEXT,
  "providerSyncProductId" TEXT,
  "providerExternalListingId" TEXT,
  "status" "MarketplacePublicationStatus" NOT NULL DEFAULT 'DRAFT',
  "errorMessage" TEXT,
  "lastSyncedAt" TIMESTAMP(3),
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketplacePublication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PrintfulFileMapping" (
  "id" TEXT NOT NULL,
  "designId" TEXT NOT NULL,
  "printfulFileId" TEXT,
  "originalUrl" TEXT,
  "printfulUrl" TEXT,
  "status" "PrintfulMappingStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PrintfulFileMapping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IntegrationLog" (
  "id" TEXT NOT NULL,
  "designId" TEXT,
  "productListingId" TEXT,
  "marketplacePublicationId" TEXT,
  "action" TEXT NOT NULL,
  "requestId" TEXT,
  "status" "IntegrationLogStatus" NOT NULL,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "responseSummaryJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ModerationAudit_designId_createdAt_idx" ON "ModerationAudit"("designId", "createdAt");
CREATE INDEX IF NOT EXISTS "ModerationAudit_moderatorId_idx" ON "ModerationAudit"("moderatorId");
CREATE UNIQUE INDEX IF NOT EXISTS "PrintfulProductTemplate_provider_printfulCatalogProductId_displayName_key" ON "PrintfulProductTemplate"("provider", "printfulCatalogProductId", "displayName");
CREATE INDEX IF NOT EXISTS "PlacementPreset_pipeline_active_idx" ON "PlacementPreset"("pipeline", "active");
CREATE UNIQUE INDEX IF NOT EXISTS "DesignProductSelection_designId_pipeline_positionHash_key" ON "DesignProductSelection"("designId", "pipeline", "positionHash");
CREATE INDEX IF NOT EXISTS "DesignProductSelection_designId_pipeline_idx" ON "DesignProductSelection"("designId", "pipeline");
CREATE INDEX IF NOT EXISTS "DesignProductSelection_status_idx" ON "DesignProductSelection"("status");
CREATE INDEX IF NOT EXISTS "MockupAsset_designId_pipeline_idx" ON "MockupAsset"("designId", "pipeline");
CREATE INDEX IF NOT EXISTS "MockupAsset_designProductSelectionId_status_idx" ON "MockupAsset"("designProductSelectionId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "CommerceListing_designProductSelectionId_key" ON "CommerceListing"("designProductSelectionId");
CREATE UNIQUE INDEX IF NOT EXISTS "MarketplacePublication_productListingId_marketplace_key" ON "MarketplacePublication"("productListingId", "marketplace");
CREATE INDEX IF NOT EXISTS "MarketplacePublication_marketplace_status_idx" ON "MarketplacePublication"("marketplace", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "PrintfulFileMapping_designId_printfulFileId_key" ON "PrintfulFileMapping"("designId", "printfulFileId");
CREATE INDEX IF NOT EXISTS "PrintfulFileMapping_designId_status_idx" ON "PrintfulFileMapping"("designId", "status");
CREATE INDEX IF NOT EXISTS "IntegrationLog_designId_createdAt_idx" ON "IntegrationLog"("designId", "createdAt");
CREATE INDEX IF NOT EXISTS "IntegrationLog_productListingId_createdAt_idx" ON "IntegrationLog"("productListingId", "createdAt");
CREATE INDEX IF NOT EXISTS "IntegrationLog_marketplacePublicationId_createdAt_idx" ON "IntegrationLog"("marketplacePublicationId", "createdAt");
CREATE INDEX IF NOT EXISTS "IntegrationLog_action_status_idx" ON "IntegrationLog"("action", "status");

ALTER TABLE "ModerationAudit" ADD CONSTRAINT "ModerationAudit_designId_fkey" FOREIGN KEY ("designId") REFERENCES "DesignAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlacementPreset" ADD CONSTRAINT "PlacementPreset_productTemplateId_fkey" FOREIGN KEY ("productTemplateId") REFERENCES "PrintfulProductTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlacementPreset" ADD CONSTRAINT "PlacementPreset_localBaseProductId_fkey" FOREIGN KEY ("localBaseProductId") REFERENCES "BaseProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DesignProductSelection" ADD CONSTRAINT "DesignProductSelection_designId_fkey" FOREIGN KEY ("designId") REFERENCES "DesignAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DesignProductSelection" ADD CONSTRAINT "DesignProductSelection_localBaseProductId_fkey" FOREIGN KEY ("localBaseProductId") REFERENCES "BaseProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DesignProductSelection" ADD CONSTRAINT "DesignProductSelection_printfulProductTemplateId_fkey" FOREIGN KEY ("printfulProductTemplateId") REFERENCES "PrintfulProductTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DesignProductSelection" ADD CONSTRAINT "DesignProductSelection_placementPresetId_fkey" FOREIGN KEY ("placementPresetId") REFERENCES "PlacementPreset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MockupAsset" ADD CONSTRAINT "MockupAsset_designId_fkey" FOREIGN KEY ("designId") REFERENCES "DesignAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MockupAsset" ADD CONSTRAINT "MockupAsset_designProductSelectionId_fkey" FOREIGN KEY ("designProductSelectionId") REFERENCES "DesignProductSelection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommerceListing" ADD CONSTRAINT "CommerceListing_localBaseProductId_fkey" FOREIGN KEY ("localBaseProductId") REFERENCES "BaseProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommerceListing" ADD CONSTRAINT "CommerceListing_printfulProductTemplateId_fkey" FOREIGN KEY ("printfulProductTemplateId") REFERENCES "PrintfulProductTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommerceListing" ADD CONSTRAINT "CommerceListing_designProductSelectionId_fkey" FOREIGN KEY ("designProductSelectionId") REFERENCES "DesignProductSelection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplacePublication" ADD CONSTRAINT "MarketplacePublication_productListingId_fkey" FOREIGN KEY ("productListingId") REFERENCES "CommerceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrintfulFileMapping" ADD CONSTRAINT "PrintfulFileMapping_designId_fkey" FOREIGN KEY ("designId") REFERENCES "DesignAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
