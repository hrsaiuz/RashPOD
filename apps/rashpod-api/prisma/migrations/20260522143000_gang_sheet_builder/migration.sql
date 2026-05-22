-- AlterEnum
ALTER TYPE "AssetPurpose" ADD VALUE IF NOT EXISTS 'GANG_SHEET_SOURCE';
ALTER TYPE "AssetPurpose" ADD VALUE IF NOT EXISTS 'GANG_SHEET_PREVIEW';
ALTER TYPE "AssetPurpose" ADD VALUE IF NOT EXISTS 'GANG_SHEET_PRODUCTION_FILE';
ALTER TYPE "FilmOrderKind" ADD VALUE IF NOT EXISTS 'GANG_SHEET_FILM';

-- CreateEnum
CREATE TYPE "GangSheetOwnerType" AS ENUM ('CUSTOMER', 'DESIGNER', 'ADMIN', 'SYSTEM');
CREATE TYPE "GangSheetStatus" AS ENUM ('DRAFT', 'VALIDATING', 'READY_FOR_CHECKOUT', 'CHECKED_OUT', 'IN_PRODUCTION', 'COMPLETED', 'ARCHIVED', 'FAILED');
CREATE TYPE "GangSheetSource" AS ENUM ('CUSTOMER_BUILDER', 'DESIGNER_DESIGNS', 'ADMIN_BATCH', 'SYSTEM_OPTIMIZATION');
CREATE TYPE "GangSheetItemSourceType" AS ENUM ('CUSTOM_UPLOAD', 'DESIGN', 'DESIGN_VERSION', 'ORDER_ITEM', 'ASSET');
CREATE TYPE "GangSheetItemValidationStatus" AS ENUM ('PENDING', 'VALID', 'WARNING', 'INVALID');
CREATE TYPE "GangSheetPricingMode" AS ENUM ('AREA_BASED', 'SHEET_BASED', 'LINEAR_METER_BASED');

-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN "gangSheetId" TEXT;
ALTER TABLE "CartItem" ADD COLUMN "gangSheetSnapshotJson" JSONB;
ALTER TABLE "OrderItem" ADD COLUMN "gangSheetId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "gangSheetSnapshotJson" JSONB;
ALTER TABLE "ProductionJob" ADD COLUMN "gangSheetId" TEXT;
ALTER TABLE "ProductionJob" ADD COLUMN "gangSheetSnapshotJson" JSONB;

-- CreateTable
CREATE TABLE "FilmSheetPreset" (
    "id" TEXT NOT NULL,
    "filmType" "FilmType" NOT NULL,
    "name" TEXT NOT NULL,
    "widthCm" DOUBLE PRECISION NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "rollWidthCm" DOUBLE PRECISION,
    "maxLengthCm" DOUBLE PRECISION,
    "printableWidthCm" DOUBLE PRECISION NOT NULL,
    "printableHeightCm" DOUBLE PRECISION NOT NULL,
    "marginCm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gapCm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bleedCm" DOUBLE PRECISION,
    "minimumDpi" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "pricingMode" "GangSheetPricingMode" NOT NULL DEFAULT 'AREA_BASED',
    "pricingConfigJson" JSONB,
    "productionNotes" TEXT,
    "metadataJson" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilmSheetPreset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GangSheet" (
    "id" TEXT NOT NULL,
    "ownerType" "GangSheetOwnerType" NOT NULL,
    "ownerId" TEXT,
    "filmType" "FilmType" NOT NULL,
    "sheetPresetId" TEXT,
    "sheetPresetSnapshotJson" JSONB,
    "widthCm" DOUBLE PRECISION NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "dpi" INTEGER NOT NULL DEFAULT 300,
    "status" "GangSheetStatus" NOT NULL DEFAULT 'DRAFT',
    "pricingSnapshotJson" JSONB,
    "previewAssetId" TEXT,
    "productionFileAssetId" TEXT,
    "source" "GangSheetSource" NOT NULL DEFAULT 'CUSTOMER_BUILDER',
    "failureReason" TEXT,
    "validationErrorsJson" JSONB,
    "validationWarningsJson" JSONB,
    "layoutMetricsJson" JSONB,
    "internalBatch" BOOLEAN NOT NULL DEFAULT false,
    "checkedOutAt" TIMESTAMP(3),
    "productionRequestedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GangSheet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GangSheetItem" (
    "id" TEXT NOT NULL,
    "gangSheetId" TEXT NOT NULL,
    "sourceType" "GangSheetItemSourceType" NOT NULL,
    "sourceAssetId" TEXT,
    "designId" TEXT,
    "designVersionId" TEXT,
    "designerId" TEXT,
    "orderItemId" TEXT,
    "sourceConsentSnapshotJson" JSONB,
    "sourceAssetSnapshotJson" JSONB,
    "xCm" DOUBLE PRECISION NOT NULL,
    "yCm" DOUBLE PRECISION NOT NULL,
    "widthCm" DOUBLE PRECISION NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "zIndex" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "mirrored" BOOLEAN NOT NULL DEFAULT false,
    "cutLineEnabled" BOOLEAN NOT NULL DEFAULT false,
    "itemPricingSnapshotJson" JSONB,
    "royaltySnapshotJson" JSONB,
    "validationStatus" "GangSheetItemValidationStatus" NOT NULL DEFAULT 'PENDING',
    "validationErrorsJson" JSONB,
    "validationWarningsJson" JSONB,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GangSheetItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FilmSheetPreset_filmType_enabled_idx" ON "FilmSheetPreset"("filmType", "enabled");
CREATE INDEX "GangSheet_ownerType_ownerId_status_idx" ON "GangSheet"("ownerType", "ownerId", "status");
CREATE INDEX "GangSheet_filmType_status_idx" ON "GangSheet"("filmType", "status");
CREATE INDEX "GangSheet_source_createdAt_idx" ON "GangSheet"("source", "createdAt");
CREATE INDEX "GangSheetItem_gangSheetId_zIndex_idx" ON "GangSheetItem"("gangSheetId", "zIndex");
CREATE INDEX "GangSheetItem_sourceType_sourceAssetId_idx" ON "GangSheetItem"("sourceType", "sourceAssetId");
CREATE INDEX "GangSheetItem_designId_idx" ON "GangSheetItem"("designId");
CREATE INDEX "GangSheetItem_designerId_idx" ON "GangSheetItem"("designerId");
CREATE INDEX "GangSheetItem_orderItemId_idx" ON "GangSheetItem"("orderItemId");
CREATE INDEX "CartItem_gangSheetId_idx" ON "CartItem"("gangSheetId");
CREATE INDEX "OrderItem_gangSheetId_idx" ON "OrderItem"("gangSheetId");
CREATE INDEX "ProductionJob_gangSheetId_idx" ON "ProductionJob"("gangSheetId");

-- AddForeignKey
ALTER TABLE "FilmSheetPreset" ADD CONSTRAINT "FilmSheetPreset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FilmSheetPreset" ADD CONSTRAINT "FilmSheetPreset_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GangSheet" ADD CONSTRAINT "GangSheet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GangSheet" ADD CONSTRAINT "GangSheet_sheetPresetId_fkey" FOREIGN KEY ("sheetPresetId") REFERENCES "FilmSheetPreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GangSheet" ADD CONSTRAINT "GangSheet_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GangSheet" ADD CONSTRAINT "GangSheet_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GangSheetItem" ADD CONSTRAINT "GangSheetItem_gangSheetId_fkey" FOREIGN KEY ("gangSheetId") REFERENCES "GangSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GangSheetItem" ADD CONSTRAINT "GangSheetItem_sourceAssetId_fkey" FOREIGN KEY ("sourceAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GangSheetItem" ADD CONSTRAINT "GangSheetItem_designId_fkey" FOREIGN KEY ("designId") REFERENCES "DesignAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GangSheetItem" ADD CONSTRAINT "GangSheetItem_designVersionId_fkey" FOREIGN KEY ("designVersionId") REFERENCES "DesignVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GangSheetItem" ADD CONSTRAINT "GangSheetItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_gangSheetId_fkey" FOREIGN KEY ("gangSheetId") REFERENCES "GangSheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_gangSheetId_fkey" FOREIGN KEY ("gangSheetId") REFERENCES "GangSheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_gangSheetId_fkey" FOREIGN KEY ("gangSheetId") REFERENCES "GangSheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
