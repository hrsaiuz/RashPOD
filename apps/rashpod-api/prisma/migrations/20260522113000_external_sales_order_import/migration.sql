-- AlterEnum
ALTER TYPE "AssetPurpose" ADD VALUE IF NOT EXISTS 'EXTERNAL_ORDER_IMPORT';

-- CreateEnum
CREATE TYPE "ExternalOrderSourceType" AS ENUM ('MARKETPLACE_MANUAL', 'MARKETPLACE_CSV_IMPORT', 'TELEGRAM_MANUAL', 'INSTAGRAM_MANUAL', 'PHONE_ORDER', 'SHOWROOM_OR_OFFLINE', 'GLOBAL_POD_PROVIDER_MANUAL', 'OTHER');
CREATE TYPE "ExternalOrderPaymentStatus" AS ENUM ('PAID_EXTERNALLY', 'CASH_ON_DELIVERY', 'PAYMENT_PENDING_MANUAL', 'UNPAID', 'REFUNDED_EXTERNALLY', 'CANCELED_EXTERNALLY', 'MANUAL_REVIEW');
CREATE TYPE "ExternalOrderIntakeStatus" AS ENUM ('DRAFT', 'VALIDATING', 'READY_TO_CONVERT', 'CONVERTED_TO_ORDER', 'NEEDS_REVIEW', 'DUPLICATE', 'CANCELED', 'FAILED');
CREATE TYPE "ExternalOrderItemMappingStatus" AS ENUM ('MAPPED', 'AUTO_MAPPED', 'NEEDS_MAPPING', 'NOT_FOUND', 'AMBIGUOUS');
CREATE TYPE "ExternalOrderDuplicateStatus" AS ENUM ('UNIQUE', 'POSSIBLE_DUPLICATE', 'CONFIRMED_DUPLICATE', 'DUPLICATE_IGNORED');
CREATE TYPE "ExternalOrderImportStatus" AS ENUM ('UPLOADED', 'PARSED', 'MAPPED', 'VALIDATED', 'IMPORTED', 'FAILED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'RASHPOD';
ALTER TABLE "Order" ADD COLUMN "channel" TEXT;
ALTER TABLE "Order" ADD COLUMN "externalSourceType" "ExternalOrderSourceType";
ALTER TABLE "Order" ADD COLUMN "externalOrderId" TEXT;
ALTER TABLE "Order" ADD COLUMN "externalSourceSnapshotJson" JSONB;

ALTER TABLE "OrderItem" ADD COLUMN "externalOrderIntakeItemId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "externalSourceType" "ExternalOrderSourceType";
ALTER TABLE "OrderItem" ADD COLUMN "externalOrderId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "externalSku" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "externalListingId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "externalChannelSnapshotJson" JSONB;

ALTER TABLE "ProductionJob" ADD COLUMN "externalSourceType" "ExternalOrderSourceType";
ALTER TABLE "ProductionJob" ADD COLUMN "externalOrderId" TEXT;
ALTER TABLE "ProductionJob" ADD COLUMN "externalSku" TEXT;
ALTER TABLE "ProductionJob" ADD COLUMN "externalListingId" TEXT;
ALTER TABLE "ProductionJob" ADD COLUMN "externalChannelSnapshotJson" JSONB;

-- CreateTable
CREATE TABLE "ExternalOrderImport" (
    "id" TEXT NOT NULL,
    "sourceType" "ExternalOrderSourceType" NOT NULL,
    "marketplaceConfigId" TEXT,
    "fileAssetId" TEXT,
    "originalFilename" TEXT,
    "mimeType" TEXT,
    "status" "ExternalOrderImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "columnMappingJson" JSONB,
    "parsedRowsJson" JSONB,
    "validationErrorsJson" JSONB,
    "validationWarningsJson" JSONB,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "strictMode" BOOLEAN NOT NULL DEFAULT false,
    "rawPayloadHash" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalOrderImport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalOrderIntake" (
    "id" TEXT NOT NULL,
    "sourceType" "ExternalOrderSourceType" NOT NULL,
    "marketplaceConfigId" TEXT,
    "importId" TEXT,
    "externalOrderId" TEXT,
    "externalOrderUrl" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "deliveryMethod" TEXT,
    "deliveryAddress" TEXT,
    "pickupLocation" TEXT,
    "paymentStatus" "ExternalOrderPaymentStatus" NOT NULL DEFAULT 'MANUAL_REVIEW',
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "rawPayloadJson" JSONB,
    "rawPayloadHash" TEXT,
    "status" "ExternalOrderIntakeStatus" NOT NULL DEFAULT 'DRAFT',
    "duplicateStatus" "ExternalOrderDuplicateStatus" NOT NULL DEFAULT 'UNIQUE',
    "validationErrorsJson" JSONB,
    "validationWarningsJson" JSONB,
    "conversionPreviewJson" JSONB,
    "internalOrderId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalOrderIntake_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalOrderIntakeItem" (
    "id" TEXT NOT NULL,
    "intakeId" TEXT NOT NULL,
    "externalSku" TEXT,
    "externalListingId" TEXT,
    "externalListingUrl" TEXT,
    "marketplaceConfigId" TEXT,
    "exportedListingId" TEXT,
    "listingId" TEXT,
    "baseProductId" TEXT,
    "productTypeId" TEXT,
    "designId" TEXT,
    "designVersionId" TEXT,
    "providerSyncRecordId" TEXT,
    "title" TEXT NOT NULL,
    "selectedSize" TEXT,
    "selectedColor" TEXT,
    "selectedMaterial" TEXT,
    "selectedPrintSide" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "imageUrl" TEXT,
    "previewAssetId" TEXT,
    "mappingStatus" "ExternalOrderItemMappingStatus" NOT NULL DEFAULT 'NEEDS_MAPPING',
    "validationErrorsJson" JSONB,
    "validationWarningsJson" JSONB,
    "matchedSnapshotJson" JSONB,
    "rawItemJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalOrderIntakeItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalOrderDuplicateCandidate" (
    "id" TEXT NOT NULL,
    "intakeId" TEXT NOT NULL,
    "matchedIntakeId" TEXT,
    "duplicateStatus" "ExternalOrderDuplicateStatus" NOT NULL DEFAULT 'POSSIBLE_DUPLICATE',
    "matchType" TEXT NOT NULL,
    "score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "detailsJson" JSONB,
    "resolutionReason" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalOrderDuplicateCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Order_source_channel_createdAt_idx" ON "Order"("source", "channel", "createdAt");
CREATE INDEX "Order_externalSourceType_externalOrderId_idx" ON "Order"("externalSourceType", "externalOrderId");
CREATE INDEX "OrderItem_externalOrderIntakeItemId_idx" ON "OrderItem"("externalOrderIntakeItemId");
CREATE INDEX "OrderItem_externalSourceType_externalOrderId_idx" ON "OrderItem"("externalSourceType", "externalOrderId");
CREATE INDEX "ProductionJob_externalSourceType_externalOrderId_idx" ON "ProductionJob"("externalSourceType", "externalOrderId");
CREATE INDEX "ExternalOrderImport_sourceType_status_createdAt_idx" ON "ExternalOrderImport"("sourceType", "status", "createdAt");
CREATE INDEX "ExternalOrderImport_marketplaceConfigId_idx" ON "ExternalOrderImport"("marketplaceConfigId");
CREATE INDEX "ExternalOrderImport_fileAssetId_idx" ON "ExternalOrderImport"("fileAssetId");
CREATE INDEX "ExternalOrderImport_rawPayloadHash_idx" ON "ExternalOrderImport"("rawPayloadHash");
CREATE UNIQUE INDEX "ExternalOrderIntake_internalOrderId_key" ON "ExternalOrderIntake"("internalOrderId");
CREATE INDEX "ExternalOrderIntake_sourceType_status_createdAt_idx" ON "ExternalOrderIntake"("sourceType", "status", "createdAt");
CREATE INDEX "ExternalOrderIntake_marketplaceConfigId_externalOrderId_idx" ON "ExternalOrderIntake"("marketplaceConfigId", "externalOrderId");
CREATE INDEX "ExternalOrderIntake_externalOrderId_idx" ON "ExternalOrderIntake"("externalOrderId");
CREATE INDEX "ExternalOrderIntake_customerPhone_totalAmount_createdAt_idx" ON "ExternalOrderIntake"("customerPhone", "totalAmount", "createdAt");
CREATE INDEX "ExternalOrderIntake_rawPayloadHash_idx" ON "ExternalOrderIntake"("rawPayloadHash");
CREATE INDEX "ExternalOrderIntake_duplicateStatus_idx" ON "ExternalOrderIntake"("duplicateStatus");
CREATE INDEX "ExternalOrderIntakeItem_intakeId_idx" ON "ExternalOrderIntakeItem"("intakeId");
CREATE INDEX "ExternalOrderIntakeItem_externalSku_idx" ON "ExternalOrderIntakeItem"("externalSku");
CREATE INDEX "ExternalOrderIntakeItem_exportedListingId_idx" ON "ExternalOrderIntakeItem"("exportedListingId");
CREATE INDEX "ExternalOrderIntakeItem_listingId_idx" ON "ExternalOrderIntakeItem"("listingId");
CREATE INDEX "ExternalOrderIntakeItem_mappingStatus_idx" ON "ExternalOrderIntakeItem"("mappingStatus");
CREATE INDEX "ExternalOrderIntakeItem_providerSyncRecordId_idx" ON "ExternalOrderIntakeItem"("providerSyncRecordId");
CREATE INDEX "ExternalOrderDuplicateCandidate_intakeId_duplicateStatus_idx" ON "ExternalOrderDuplicateCandidate"("intakeId", "duplicateStatus");
CREATE INDEX "ExternalOrderDuplicateCandidate_matchedIntakeId_idx" ON "ExternalOrderDuplicateCandidate"("matchedIntakeId");
CREATE INDEX "ExternalOrderDuplicateCandidate_matchType_idx" ON "ExternalOrderDuplicateCandidate"("matchType");

-- AddForeignKey
ALTER TABLE "ExternalOrderImport" ADD CONSTRAINT "ExternalOrderImport_marketplaceConfigId_fkey" FOREIGN KEY ("marketplaceConfigId") REFERENCES "MarketplaceConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExternalOrderImport" ADD CONSTRAINT "ExternalOrderImport_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExternalOrderImport" ADD CONSTRAINT "ExternalOrderImport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExternalOrderIntake" ADD CONSTRAINT "ExternalOrderIntake_marketplaceConfigId_fkey" FOREIGN KEY ("marketplaceConfigId") REFERENCES "MarketplaceConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExternalOrderIntake" ADD CONSTRAINT "ExternalOrderIntake_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ExternalOrderImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExternalOrderIntake" ADD CONSTRAINT "ExternalOrderIntake_internalOrderId_fkey" FOREIGN KEY ("internalOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExternalOrderIntake" ADD CONSTRAINT "ExternalOrderIntake_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExternalOrderIntakeItem" ADD CONSTRAINT "ExternalOrderIntakeItem_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "ExternalOrderIntake"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalOrderIntakeItem" ADD CONSTRAINT "ExternalOrderIntakeItem_marketplaceConfigId_fkey" FOREIGN KEY ("marketplaceConfigId") REFERENCES "MarketplaceConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExternalOrderIntakeItem" ADD CONSTRAINT "ExternalOrderIntakeItem_exportedListingId_fkey" FOREIGN KEY ("exportedListingId") REFERENCES "ExportedListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExternalOrderIntakeItem" ADD CONSTRAINT "ExternalOrderIntakeItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "CommerceListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExternalOrderIntakeItem" ADD CONSTRAINT "ExternalOrderIntakeItem_baseProductId_fkey" FOREIGN KEY ("baseProductId") REFERENCES "BaseProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExternalOrderIntakeItem" ADD CONSTRAINT "ExternalOrderIntakeItem_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExternalOrderIntakeItem" ADD CONSTRAINT "ExternalOrderIntakeItem_designId_fkey" FOREIGN KEY ("designId") REFERENCES "DesignAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExternalOrderIntakeItem" ADD CONSTRAINT "ExternalOrderIntakeItem_designVersionId_fkey" FOREIGN KEY ("designVersionId") REFERENCES "DesignVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExternalOrderIntakeItem" ADD CONSTRAINT "ExternalOrderIntakeItem_providerSyncRecordId_fkey" FOREIGN KEY ("providerSyncRecordId") REFERENCES "PodProviderSyncRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExternalOrderIntakeItem" ADD CONSTRAINT "ExternalOrderIntakeItem_previewAssetId_fkey" FOREIGN KEY ("previewAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExternalOrderDuplicateCandidate" ADD CONSTRAINT "ExternalOrderDuplicateCandidate_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "ExternalOrderIntake"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalOrderDuplicateCandidate" ADD CONSTRAINT "ExternalOrderDuplicateCandidate_matchedIntakeId_fkey" FOREIGN KEY ("matchedIntakeId") REFERENCES "ExternalOrderIntake"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_externalOrderIntakeItemId_fkey" FOREIGN KEY ("externalOrderIntakeItemId") REFERENCES "ExternalOrderIntakeItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
