-- AlterEnum
ALTER TYPE "AssetPurpose" ADD VALUE IF NOT EXISTS 'POD_PROVIDER_FILE';
ALTER TYPE "PipelineType" ADD VALUE IF NOT EXISTS 'GLOBAL_POD';
ALTER TYPE "ProviderType" ADD VALUE IF NOT EXISTS 'PRINTIFY';

-- CreateEnum
CREATE TYPE "PodProviderType" AS ENUM ('PRINTFUL', 'PRINTIFY');
CREATE TYPE "PodProviderMode" AS ENUM ('TEST', 'LIVE');
CREATE TYPE "PodCatalogSyncStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE "PodAvailabilityStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'ARCHIVED');
CREATE TYPE "PodMappingQuality" AS ENUM ('EXACT', 'COMPATIBLE', 'MANUAL_REVIEW');
CREATE TYPE "PodProviderFileStatus" AS ENUM ('PENDING', 'UPLOADED', 'FAILED');
CREATE TYPE "PodSyncRecordStatus" AS ENUM ('DRAFT', 'VALIDATING', 'READY', 'SYNCING', 'SYNCED', 'FAILED', 'MANUAL_REVIEW', 'CANCELED');
CREATE TYPE "PodMockupStatus" AS ENUM ('PENDING', 'READY', 'FAILED');
CREATE TYPE "PodWebhookEventStatus" AS ENUM ('ACCEPTED', 'REJECTED', 'PROCESSED', 'FAILED');
CREATE TYPE "OrderFulfillmentRoute" AS ENUM ('LOCAL_PRODUCTION', 'GLOBAL_POD_PROVIDER', 'MANUAL_EXTERNAL');

-- CreateTable
CREATE TABLE "PodProviderConfig" (
    "id" TEXT NOT NULL,
    "provider" "PodProviderType" NOT NULL,
    "mode" "PodProviderMode" NOT NULL DEFAULT 'TEST',
    "displayName" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "credentialEnvVar" TEXT,
    "credentialSecretRef" TEXT,
    "webhookSecretEnvVar" TEXT,
    "webhookSecretRef" TEXT,
    "apiBaseUrl" TEXT,
    "storeId" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
    "defaultCountryCode" TEXT,
    "defaultRegion" TEXT,
    "fulfillmentRegion" TEXT,
    "sellingRegion" TEXT,
    "shippingPreference" TEXT,
    "lastCatalogSyncStatus" "PodCatalogSyncStatus",
    "lastCatalogSyncAt" TIMESTAMP(3),
    "lastCatalogSyncError" TEXT,
    "metadataJson" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodProviderConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PodProviderCatalogSyncRun" (
    "id" TEXT NOT NULL,
    "providerConfigId" TEXT NOT NULL,
    "provider" "PodProviderType" NOT NULL,
    "mode" "PodProviderMode" NOT NULL,
    "status" "PodCatalogSyncStatus" NOT NULL DEFAULT 'PENDING',
    "productsSeen" INTEGER NOT NULL DEFAULT 0,
    "productsUpserted" INTEGER NOT NULL DEFAULT 0,
    "variantsSeen" INTEGER NOT NULL DEFAULT 0,
    "printAreasSeen" INTEGER NOT NULL DEFAULT 0,
    "unavailableMarked" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "requestedById" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodProviderCatalogSyncRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PodProviderProduct" (
    "id" TEXT NOT NULL,
    "providerConfigId" TEXT NOT NULL,
    "provider" "PodProviderType" NOT NULL,
    "mode" "PodProviderMode" NOT NULL,
    "providerProductId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "description" TEXT,
    "imageUrlsJson" JSONB,
    "availabilityStatus" "PodAvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "regionsJson" JSONB,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "baseCost" DECIMAL(10,2),
    "suggestedRetailPrice" DECIMAL(10,2),
    "rawMetadataJson" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodProviderProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PodProviderVariant" (
    "id" TEXT NOT NULL,
    "providerProductId" TEXT NOT NULL,
    "providerVariantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "color" TEXT,
    "size" TEXT,
    "material" TEXT,
    "availabilityStatus" "PodAvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "regionsJson" JSONB,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "baseCost" DECIMAL(10,2),
    "suggestedRetailPrice" DECIMAL(10,2),
    "rawMetadataJson" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodProviderVariant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PodProviderPrintArea" (
    "id" TEXT NOT NULL,
    "providerProductId" TEXT NOT NULL,
    "providerPrintAreaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "placement" TEXT,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "units" "PlacementUnits" NOT NULL DEFAULT 'INCH',
    "dpi" INTEGER,
    "techniquesJson" JSONB,
    "availabilityStatus" "PodAvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "rawMetadataJson" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodProviderPrintArea_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PodProductMapping" (
    "id" TEXT NOT NULL,
    "providerConfigId" TEXT NOT NULL,
    "productTypeId" TEXT NOT NULL,
    "baseProductId" TEXT,
    "providerProductId" TEXT NOT NULL,
    "providerVariantIdsJson" JSONB,
    "defaultProviderVariantId" TEXT,
    "colorMappingJson" JSONB,
    "sizeMappingJson" JSONB,
    "materialMappingJson" JSONB,
    "region" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "quality" "PodMappingQuality" NOT NULL DEFAULT 'MANUAL_REVIEW',
    "notes" TEXT,
    "metadataJson" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodProductMapping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PodPrintAreaMapping" (
    "id" TEXT NOT NULL,
    "providerConfigId" TEXT NOT NULL,
    "printAreaId" TEXT NOT NULL,
    "providerProductId" TEXT NOT NULL,
    "providerPrintAreaId" TEXT NOT NULL,
    "coordinateSystem" TEXT NOT NULL DEFAULT 'PROVIDER_UNITS',
    "providerPlacement" TEXT,
    "providerUnits" "PlacementUnits" NOT NULL DEFAULT 'INCH',
    "providerDpi" INTEGER,
    "providerWidth" DOUBLE PRECISION,
    "providerHeight" DOUBLE PRECISION,
    "offsetX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "offsetY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "supportsRotation" BOOLEAN NOT NULL DEFAULT false,
    "minScale" DOUBLE PRECISION,
    "maxScale" DOUBLE PRECISION,
    "safeZoneMappingJson" JSONB,
    "technique" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "quality" "PodMappingQuality" NOT NULL DEFAULT 'MANUAL_REVIEW',
    "notes" TEXT,
    "metadataJson" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodPrintAreaMapping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PodProviderFile" (
    "id" TEXT NOT NULL,
    "providerConfigId" TEXT NOT NULL,
    "provider" "PodProviderType" NOT NULL,
    "mode" "PodProviderMode" NOT NULL,
    "sourceAssetId" TEXT NOT NULL,
    "designId" TEXT,
    "designVersionId" TEXT,
    "providerFileId" TEXT,
    "transferUrlSnapshot" TEXT,
    "status" "PodProviderFileStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "uploadedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodProviderFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PodProviderSyncRecord" (
    "id" TEXT NOT NULL,
    "providerConfigId" TEXT NOT NULL,
    "provider" "PodProviderType" NOT NULL,
    "mode" "PodProviderMode" NOT NULL,
    "listingId" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "designVersionId" TEXT,
    "productTypeId" TEXT,
    "baseProductId" TEXT,
    "productMappingId" TEXT NOT NULL,
    "printAreaMappingId" TEXT,
    "providerProductId" TEXT NOT NULL,
    "providerVariantId" TEXT,
    "providerFileId" TEXT,
    "providerDraftProductId" TEXT,
    "providerExternalProductId" TEXT,
    "status" "PodSyncRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "failureReason" TEXT,
    "placementHash" TEXT NOT NULL,
    "providerPlacementPayloadSnapshotJson" JSONB,
    "payloadSnapshotJson" JSONB,
    "responseSnapshotJson" JSONB,
    "providerMockupSnapshotJson" JSONB,
    "createdById" TEXT,
    "syncedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "replacedBySyncRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodProviderSyncRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PodProviderMockup" (
    "id" TEXT NOT NULL,
    "syncRecordId" TEXT NOT NULL,
    "providerMockupId" TEXT,
    "kind" "MockupAssetType" NOT NULL,
    "imageUrl" TEXT,
    "thumbnailUrl" TEXT,
    "widthPx" INTEGER,
    "heightPx" INTEGER,
    "status" "PodMockupStatus" NOT NULL DEFAULT 'PENDING',
    "payloadSnapshotJson" JSONB,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodProviderMockup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PodWebhookEvent" (
    "id" TEXT NOT NULL,
    "providerConfigId" TEXT,
    "provider" "PodProviderType" NOT NULL,
    "mode" "PodProviderMode",
    "eventType" TEXT,
    "signatureValid" BOOLEAN,
    "status" "PodWebhookEventStatus" NOT NULL DEFAULT 'ACCEPTED',
    "payloadSummaryJson" JSONB,
    "rawPayloadJson" JSONB,
    "errorMessage" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PodWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "fulfillmentRoute" "OrderFulfillmentRoute" NOT NULL DEFAULT 'LOCAL_PRODUCTION';
ALTER TABLE "OrderItem" ADD COLUMN "fulfillmentRoute" "OrderFulfillmentRoute" NOT NULL DEFAULT 'LOCAL_PRODUCTION';
ALTER TABLE "OrderItem" ADD COLUMN "providerSyncRecordId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "providerType" "PodProviderType";
ALTER TABLE "OrderItem" ADD COLUMN "providerProductId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "providerVariantId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "providerFileId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "providerPlacementPayloadSnapshotJson" JSONB;
ALTER TABLE "OrderItem" ADD COLUMN "providerFulfillmentSnapshotJson" JSONB;
ALTER TABLE "ProductionJob" ADD COLUMN "fulfillmentRoute" "OrderFulfillmentRoute" NOT NULL DEFAULT 'LOCAL_PRODUCTION';
ALTER TABLE "ProductionJob" ADD COLUMN "providerSyncRecordId" TEXT;
ALTER TABLE "ProductionJob" ADD COLUMN "providerType" "PodProviderType";
ALTER TABLE "ProductionJob" ADD COLUMN "providerOrderId" TEXT;
ALTER TABLE "ProductionJob" ADD COLUMN "providerStatus" TEXT;
ALTER TABLE "ProductionJob" ADD COLUMN "providerPayloadSnapshotJson" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "PodProviderConfig_provider_mode_key" ON "PodProviderConfig"("provider", "mode");
CREATE INDEX "PodProviderConfig_provider_mode_isEnabled_idx" ON "PodProviderConfig"("provider", "mode", "isEnabled");
CREATE INDEX "PodProviderCatalogSyncRun_providerConfigId_status_createdAt_idx" ON "PodProviderCatalogSyncRun"("providerConfigId", "status", "createdAt");
CREATE UNIQUE INDEX "PodProviderProduct_providerConfigId_providerProductId_key" ON "PodProviderProduct"("providerConfigId", "providerProductId");
CREATE INDEX "PodProviderProduct_provider_mode_availabilityStatus_idx" ON "PodProviderProduct"("provider", "mode", "availabilityStatus");
CREATE UNIQUE INDEX "PodProviderVariant_providerProductId_providerVariantId_key" ON "PodProviderVariant"("providerProductId", "providerVariantId");
CREATE INDEX "PodProviderVariant_availabilityStatus_idx" ON "PodProviderVariant"("availabilityStatus");
CREATE UNIQUE INDEX "PodProviderPrintArea_providerProductId_providerPrintAreaId_key" ON "PodProviderPrintArea"("providerProductId", "providerPrintAreaId");
CREATE INDEX "PodProviderPrintArea_placement_availabilityStatus_idx" ON "PodProviderPrintArea"("placement", "availabilityStatus");
CREATE UNIQUE INDEX "PodProductMapping_providerConfigId_productTypeId_baseProductId_providerProductId_key" ON "PodProductMapping"("providerConfigId", "productTypeId", "baseProductId", "providerProductId");
CREATE INDEX "PodProductMapping_providerConfigId_isActive_idx" ON "PodProductMapping"("providerConfigId", "isActive");
CREATE INDEX "PodProductMapping_productTypeId_idx" ON "PodProductMapping"("productTypeId");
CREATE INDEX "PodProductMapping_baseProductId_idx" ON "PodProductMapping"("baseProductId");
CREATE UNIQUE INDEX "PodPrintAreaMapping_providerConfigId_printAreaId_providerProductId_providerPrintAreaId_key" ON "PodPrintAreaMapping"("providerConfigId", "printAreaId", "providerProductId", "providerPrintAreaId");
CREATE INDEX "PodPrintAreaMapping_providerConfigId_isActive_idx" ON "PodPrintAreaMapping"("providerConfigId", "isActive");
CREATE INDEX "PodPrintAreaMapping_printAreaId_idx" ON "PodPrintAreaMapping"("printAreaId");
CREATE UNIQUE INDEX "PodProviderFile_providerConfigId_sourceAssetId_key" ON "PodProviderFile"("providerConfigId", "sourceAssetId");
CREATE INDEX "PodProviderFile_provider_mode_status_idx" ON "PodProviderFile"("provider", "mode", "status");
CREATE INDEX "PodProviderFile_sourceAssetId_idx" ON "PodProviderFile"("sourceAssetId");
CREATE UNIQUE INDEX "PodProviderSyncRecord_providerConfigId_listingId_productMappingId_placementHash_key" ON "PodProviderSyncRecord"("providerConfigId", "listingId", "productMappingId", "placementHash");
CREATE INDEX "PodProviderSyncRecord_providerConfigId_status_updatedAt_idx" ON "PodProviderSyncRecord"("providerConfigId", "status", "updatedAt");
CREATE INDEX "PodProviderSyncRecord_listingId_idx" ON "PodProviderSyncRecord"("listingId");
CREATE INDEX "PodProviderSyncRecord_designId_idx" ON "PodProviderSyncRecord"("designId");
CREATE INDEX "PodProviderMockup_syncRecordId_status_idx" ON "PodProviderMockup"("syncRecordId", "status");
CREATE INDEX "PodWebhookEvent_provider_receivedAt_idx" ON "PodWebhookEvent"("provider", "receivedAt");
CREATE INDEX "PodWebhookEvent_providerConfigId_status_idx" ON "PodWebhookEvent"("providerConfigId", "status");
CREATE INDEX "ProductionJob_providerSyncRecordId_idx" ON "ProductionJob"("providerSyncRecordId");

-- AddForeignKey
ALTER TABLE "PodProviderCatalogSyncRun" ADD CONSTRAINT "PodProviderCatalogSyncRun_providerConfigId_fkey" FOREIGN KEY ("providerConfigId") REFERENCES "PodProviderConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PodProviderProduct" ADD CONSTRAINT "PodProviderProduct_providerConfigId_fkey" FOREIGN KEY ("providerConfigId") REFERENCES "PodProviderConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PodProviderVariant" ADD CONSTRAINT "PodProviderVariant_providerProductId_fkey" FOREIGN KEY ("providerProductId") REFERENCES "PodProviderProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PodProviderPrintArea" ADD CONSTRAINT "PodProviderPrintArea_providerProductId_fkey" FOREIGN KEY ("providerProductId") REFERENCES "PodProviderProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PodProductMapping" ADD CONSTRAINT "PodProductMapping_providerConfigId_fkey" FOREIGN KEY ("providerConfigId") REFERENCES "PodProviderConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PodProductMapping" ADD CONSTRAINT "PodProductMapping_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PodProductMapping" ADD CONSTRAINT "PodProductMapping_baseProductId_fkey" FOREIGN KEY ("baseProductId") REFERENCES "BaseProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PodProductMapping" ADD CONSTRAINT "PodProductMapping_providerProductId_fkey" FOREIGN KEY ("providerProductId") REFERENCES "PodProviderProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PodPrintAreaMapping" ADD CONSTRAINT "PodPrintAreaMapping_providerConfigId_fkey" FOREIGN KEY ("providerConfigId") REFERENCES "PodProviderConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PodPrintAreaMapping" ADD CONSTRAINT "PodPrintAreaMapping_printAreaId_fkey" FOREIGN KEY ("printAreaId") REFERENCES "PrintArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PodPrintAreaMapping" ADD CONSTRAINT "PodPrintAreaMapping_providerProductId_fkey" FOREIGN KEY ("providerProductId") REFERENCES "PodProviderProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PodPrintAreaMapping" ADD CONSTRAINT "PodPrintAreaMapping_providerPrintAreaId_fkey" FOREIGN KEY ("providerPrintAreaId") REFERENCES "PodProviderPrintArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PodProviderFile" ADD CONSTRAINT "PodProviderFile_providerConfigId_fkey" FOREIGN KEY ("providerConfigId") REFERENCES "PodProviderConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PodProviderFile" ADD CONSTRAINT "PodProviderFile_sourceAssetId_fkey" FOREIGN KEY ("sourceAssetId") REFERENCES "FileAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PodProviderSyncRecord" ADD CONSTRAINT "PodProviderSyncRecord_providerConfigId_fkey" FOREIGN KEY ("providerConfigId") REFERENCES "PodProviderConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PodProviderSyncRecord" ADD CONSTRAINT "PodProviderSyncRecord_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "CommerceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PodProviderSyncRecord" ADD CONSTRAINT "PodProviderSyncRecord_providerProductId_fkey" FOREIGN KEY ("providerProductId") REFERENCES "PodProviderProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PodProviderSyncRecord" ADD CONSTRAINT "PodProviderSyncRecord_productMappingId_fkey" FOREIGN KEY ("productMappingId") REFERENCES "PodProductMapping"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PodProviderSyncRecord" ADD CONSTRAINT "PodProviderSyncRecord_printAreaMappingId_fkey" FOREIGN KEY ("printAreaMappingId") REFERENCES "PodPrintAreaMapping"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PodProviderSyncRecord" ADD CONSTRAINT "PodProviderSyncRecord_providerFileId_fkey" FOREIGN KEY ("providerFileId") REFERENCES "PodProviderFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PodProviderMockup" ADD CONSTRAINT "PodProviderMockup_syncRecordId_fkey" FOREIGN KEY ("syncRecordId") REFERENCES "PodProviderSyncRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PodWebhookEvent" ADD CONSTRAINT "PodWebhookEvent_providerConfigId_fkey" FOREIGN KEY ("providerConfigId") REFERENCES "PodProviderConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_providerSyncRecordId_fkey" FOREIGN KEY ("providerSyncRecordId") REFERENCES "PodProviderSyncRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_providerSyncRecordId_fkey" FOREIGN KEY ("providerSyncRecordId") REFERENCES "PodProviderSyncRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
