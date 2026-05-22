-- CreateEnum
CREATE TYPE "MarketplaceType" AS ENUM ('MANUAL_EXPORT');

-- CreateEnum
CREATE TYPE "ManualMarketplaceKey" AS ENUM ('UZUM', 'OLX_UZ', 'TELEGRAM_SHOP', 'INSTAGRAM', 'FACEBOOK', 'OTHER');

-- CreateEnum
CREATE TYPE "MarketplaceExportFormat" AS ENUM ('CSV', 'XLSX', 'ZIP_IMAGES', 'CSV_WITH_IMAGE_URLS');

-- CreateEnum
CREATE TYPE "MarketplaceExportBatchStatus" AS ENUM ('DRAFT', 'READY', 'EXPORTING', 'EXPORTED', 'FAILED', 'CANCELED', 'PARTIALLY_EXPORTED');

-- CreateEnum
CREATE TYPE "MarketplaceExportItemStatus" AS ENUM ('DRAFT', 'READY', 'BLOCKED', 'EXPORTED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ExportedListingStatus" AS ENUM ('EXPORTED', 'MANUALLY_LISTED', 'ACTIVE', 'PAUSED', 'SOLD_EXTERNALLY', 'ARCHIVED', 'ERROR');

-- CreateEnum
CREATE TYPE "MarketplaceExternalSaleStatus" AS ENUM ('RECORDED', 'ORDER_CREATED', 'CANCELED');

-- CreateEnum
CREATE TYPE "MarketplaceExternalSaleSource" AS ENUM ('MANUAL');

-- AlterEnum
ALTER TYPE "AssetPurpose" ADD VALUE IF NOT EXISTS 'MARKETPLACE_EXPORT';

-- CreateTable
CREATE TABLE "MarketplaceConfig" (
    "id" TEXT NOT NULL,
    "key" "ManualMarketplaceKey" NOT NULL,
    "marketplaceType" "MarketplaceType" NOT NULL DEFAULT 'MANUAL_EXPORT',
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "countryCode" TEXT NOT NULL DEFAULT 'UZ',
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "defaultLanguage" TEXT NOT NULL DEFAULT 'uz-Latn',
    "supportedLanguages" JSONB,
    "supportedListingTypes" JSONB,
    "exportFormats" JSONB,
    "imageRequirementsJson" JSONB,
    "pricingRulesJson" JSONB,
    "skuPrefix" TEXT NOT NULL DEFAULT 'RPD',
    "statusMappingJson" JSONB,
    "notes" TEXT,
    "metadataJson" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceCategoryMapping" (
    "id" TEXT NOT NULL,
    "marketplaceConfigId" TEXT NOT NULL,
    "productTypeId" TEXT NOT NULL,
    "baseProductId" TEXT,
    "marketplaceCategoryId" TEXT NOT NULL,
    "marketplaceCategoryName" TEXT NOT NULL,
    "requiredAttributesJson" JSONB,
    "optionalAttributesJson" JSONB,
    "valueMappingsJson" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceCategoryMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceExportBatch" (
    "id" TEXT NOT NULL,
    "marketplaceConfigId" TEXT NOT NULL,
    "status" "MarketplaceExportBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "exportFormat" "MarketplaceExportFormat" NOT NULL DEFAULT 'CSV',
    "selectedListingIdsJson" JSONB,
    "exportFileAssetId" TEXT,
    "zipFileAssetId" TEXT,
    "generatedAt" TIMESTAMP(3),
    "exportedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceExportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceExportItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "status" "MarketplaceExportItemStatus" NOT NULL DEFAULT 'DRAFT',
    "eligible" BOOLEAN NOT NULL DEFAULT false,
    "blockersJson" JSONB,
    "warningsJson" JSONB,
    "exportSku" TEXT NOT NULL,
    "contentSnapshotJson" JSONB,
    "priceSnapshotJson" JSONB,
    "categorySnapshotJson" JSONB,
    "imageSnapshotJson" JSONB,
    "variantSnapshotJson" JSONB,
    "skuOverrideReason" TEXT,
    "priceOverrideReason" TEXT,
    "rowJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceExportItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportedListing" (
    "id" TEXT NOT NULL,
    "marketplaceConfigId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "exportBatchId" TEXT,
    "exportSku" TEXT NOT NULL,
    "exportTitle" TEXT NOT NULL,
    "exportPrice" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "categorySnapshotJson" JSONB,
    "imageSnapshotJson" JSONB,
    "contentSnapshotJson" JSONB,
    "priceSnapshotJson" JSONB,
    "status" "ExportedListingStatus" NOT NULL DEFAULT 'EXPORTED',
    "externalUrl" TEXT,
    "externalListingId" TEXT,
    "manuallyListedById" TEXT,
    "manuallyListedAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExportedListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceExternalSale" (
    "id" TEXT NOT NULL,
    "marketplaceConfigId" TEXT NOT NULL,
    "exportedListingId" TEXT,
    "listingId" TEXT NOT NULL,
    "exportSku" TEXT NOT NULL,
    "externalOrderId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "salePrice" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "customerSnapshotJson" JSONB,
    "deliverySnapshotJson" JSONB,
    "saleSnapshotJson" JSONB,
    "conversionSnapshotJson" JSONB,
    "source" "MarketplaceExternalSaleSource" NOT NULL DEFAULT 'MANUAL',
    "status" "MarketplaceExternalSaleStatus" NOT NULL DEFAULT 'RECORDED',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceExternalSale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceConfig_key_name_key" ON "MarketplaceConfig"("key", "name");
CREATE INDEX "MarketplaceConfig_key_isEnabled_idx" ON "MarketplaceConfig"("key", "isEnabled");
CREATE UNIQUE INDEX "MarketplaceCategoryMapping_marketplaceConfigId_productTypeId_baseProductId_key" ON "MarketplaceCategoryMapping"("marketplaceConfigId", "productTypeId", "baseProductId");
CREATE INDEX "MarketplaceCategoryMapping_marketplaceConfigId_isActive_idx" ON "MarketplaceCategoryMapping"("marketplaceConfigId", "isActive");
CREATE INDEX "MarketplaceCategoryMapping_productTypeId_idx" ON "MarketplaceCategoryMapping"("productTypeId");
CREATE INDEX "MarketplaceCategoryMapping_baseProductId_idx" ON "MarketplaceCategoryMapping"("baseProductId");
CREATE INDEX "MarketplaceExportBatch_marketplaceConfigId_status_createdAt_idx" ON "MarketplaceExportBatch"("marketplaceConfigId", "status", "createdAt");
CREATE INDEX "MarketplaceExportBatch_exportFileAssetId_idx" ON "MarketplaceExportBatch"("exportFileAssetId");
CREATE INDEX "MarketplaceExportBatch_zipFileAssetId_idx" ON "MarketplaceExportBatch"("zipFileAssetId");
CREATE UNIQUE INDEX "MarketplaceExportItem_batchId_listingId_key" ON "MarketplaceExportItem"("batchId", "listingId");
CREATE INDEX "MarketplaceExportItem_listingId_idx" ON "MarketplaceExportItem"("listingId");
CREATE INDEX "MarketplaceExportItem_exportSku_idx" ON "MarketplaceExportItem"("exportSku");
CREATE INDEX "MarketplaceExportItem_status_eligible_idx" ON "MarketplaceExportItem"("status", "eligible");
CREATE UNIQUE INDEX "ExportedListing_marketplaceConfigId_exportSku_key" ON "ExportedListing"("marketplaceConfigId", "exportSku");
CREATE INDEX "ExportedListing_listingId_idx" ON "ExportedListing"("listingId");
CREATE INDEX "ExportedListing_status_updatedAt_idx" ON "ExportedListing"("status", "updatedAt");
CREATE INDEX "ExportedListing_externalListingId_idx" ON "ExportedListing"("externalListingId");
CREATE INDEX "MarketplaceExternalSale_marketplaceConfigId_status_createdAt_idx" ON "MarketplaceExternalSale"("marketplaceConfigId", "status", "createdAt");
CREATE INDEX "MarketplaceExternalSale_exportedListingId_idx" ON "MarketplaceExternalSale"("exportedListingId");
CREATE INDEX "MarketplaceExternalSale_listingId_idx" ON "MarketplaceExternalSale"("listingId");
CREATE INDEX "MarketplaceExternalSale_externalOrderId_idx" ON "MarketplaceExternalSale"("externalOrderId");

-- AddForeignKey
ALTER TABLE "MarketplaceCategoryMapping" ADD CONSTRAINT "MarketplaceCategoryMapping_marketplaceConfigId_fkey" FOREIGN KEY ("marketplaceConfigId") REFERENCES "MarketplaceConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceCategoryMapping" ADD CONSTRAINT "MarketplaceCategoryMapping_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketplaceCategoryMapping" ADD CONSTRAINT "MarketplaceCategoryMapping_baseProductId_fkey" FOREIGN KEY ("baseProductId") REFERENCES "BaseProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceExportBatch" ADD CONSTRAINT "MarketplaceExportBatch_marketplaceConfigId_fkey" FOREIGN KEY ("marketplaceConfigId") REFERENCES "MarketplaceConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketplaceExportBatch" ADD CONSTRAINT "MarketplaceExportBatch_exportFileAssetId_fkey" FOREIGN KEY ("exportFileAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceExportBatch" ADD CONSTRAINT "MarketplaceExportBatch_zipFileAssetId_fkey" FOREIGN KEY ("zipFileAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceExportItem" ADD CONSTRAINT "MarketplaceExportItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "MarketplaceExportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceExportItem" ADD CONSTRAINT "MarketplaceExportItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "CommerceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExportedListing" ADD CONSTRAINT "ExportedListing_marketplaceConfigId_fkey" FOREIGN KEY ("marketplaceConfigId") REFERENCES "MarketplaceConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExportedListing" ADD CONSTRAINT "ExportedListing_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "CommerceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExportedListing" ADD CONSTRAINT "ExportedListing_exportBatchId_fkey" FOREIGN KEY ("exportBatchId") REFERENCES "MarketplaceExportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceExternalSale" ADD CONSTRAINT "MarketplaceExternalSale_marketplaceConfigId_fkey" FOREIGN KEY ("marketplaceConfigId") REFERENCES "MarketplaceConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketplaceExternalSale" ADD CONSTRAINT "MarketplaceExternalSale_exportedListingId_fkey" FOREIGN KEY ("exportedListingId") REFERENCES "ExportedListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceExternalSale" ADD CONSTRAINT "MarketplaceExternalSale_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "CommerceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
