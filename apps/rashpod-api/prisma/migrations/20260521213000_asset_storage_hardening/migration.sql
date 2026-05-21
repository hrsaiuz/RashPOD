DO $$ BEGIN
  CREATE TYPE "AssetPurpose" AS ENUM (
    'DESIGN_ORIGINAL',
    'DESIGN_NORMALIZED',
    'MOCKUP_IMAGE',
    'LISTING_IMAGE',
    'PRODUCTION_FILE',
    'TEMPLATE_IMAGE',
    'PRINT_AREA_PREVIEW'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AssetStorageProvider" AS ENUM ('GCS', 'LOCAL_DEV');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AssetAccessPolicy" AS ENUM ('PRIVATE_SIGNED_URL', 'PUBLIC_READ', 'INTERNAL_ONLY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AssetLifecycleStatus" AS ENUM (
    'PENDING_UPLOAD',
    'UPLOADED',
    'VERIFYING',
    'READY',
    'PROCESSING',
    'FAILED',
    'EXPIRED',
    'REPLACED',
    'ARCHIVED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TYPE "GeneratedAssetStatus" ADD VALUE IF NOT EXISTS 'UPLOADED';
ALTER TYPE "GeneratedAssetStatus" ADD VALUE IF NOT EXISTS 'VERIFYING';
ALTER TYPE "GeneratedAssetStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "GeneratedAssetStatus" ADD VALUE IF NOT EXISTS 'REPLACED';
ALTER TYPE "GeneratedAssetStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

ALTER TYPE "MockupAssetStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "MockupAssetStatus" ADD VALUE IF NOT EXISTS 'READY';
ALTER TYPE "MockupAssetStatus" ADD VALUE IF NOT EXISTS 'REPLACED';
ALTER TYPE "MockupAssetStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

ALTER TABLE "FileAsset"
  ADD COLUMN IF NOT EXISTS "purpose" "AssetPurpose" NOT NULL DEFAULT 'DESIGN_ORIGINAL',
  ADD COLUMN IF NOT EXISTS "storageProvider" "AssetStorageProvider" NOT NULL DEFAULT 'GCS',
  ADD COLUMN IF NOT EXISTS "accessPolicy" "AssetAccessPolicy" NOT NULL DEFAULT 'PRIVATE_SIGNED_URL',
  ADD COLUMN IF NOT EXISTS "publicUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "fileExtension" TEXT,
  ADD COLUMN IF NOT EXISTS "widthPx" INTEGER,
  ADD COLUMN IF NOT EXISTS "heightPx" INTEGER,
  ADD COLUMN IF NOT EXISTS "dpi" INTEGER,
  ADD COLUMN IF NOT EXISTS "status" "AssetLifecycleStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
  ADD COLUMN IF NOT EXISTS "hashSha256" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceAssetId" TEXT,
  ADD COLUMN IF NOT EXISTS "designId" TEXT,
  ADD COLUMN IF NOT EXISTS "designVersionId" TEXT,
  ADD COLUMN IF NOT EXISTS "listingId" TEXT,
  ADD COLUMN IF NOT EXISTS "mockupTemplateId" TEXT,
  ADD COLUMN IF NOT EXISTS "baseProductId" TEXT,
  ADD COLUMN IF NOT EXISTS "printAreaId" TEXT,
  ADD COLUMN IF NOT EXISTS "placementSnapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "failureReason" TEXT,
  ADD COLUMN IF NOT EXISTS "uploadExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "uploadedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "replacedByAssetId" TEXT,
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

UPDATE "FileAsset"
SET "status" = CASE
  WHEN "uploadStatus" = 'READY' THEN 'READY'::"AssetLifecycleStatus"
  WHEN "uploadStatus" = 'FAILED' THEN 'FAILED'::"AssetLifecycleStatus"
  ELSE 'PENDING_UPLOAD'::"AssetLifecycleStatus"
END
WHERE "status" = 'PENDING_UPLOAD';

ALTER TABLE "GeneratedAsset"
  ADD COLUMN IF NOT EXISTS "objectKey" TEXT,
  ADD COLUMN IF NOT EXISTS "contentType" TEXT,
  ADD COLUMN IF NOT EXISTS "format" TEXT,
  ADD COLUMN IF NOT EXISTS "dpi" INTEGER,
  ADD COLUMN IF NOT EXISTS "checksum" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceAssetId" TEXT,
  ADD COLUMN IF NOT EXISTS "placementSnapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "renderJobId" TEXT,
  ADD COLUMN IF NOT EXISTS "failureReason" TEXT,
  ADD COLUMN IF NOT EXISTS "replacedByAssetId" TEXT,
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

UPDATE "GeneratedAsset"
SET "objectKey" = "fileKey"
WHERE "objectKey" IS NULL AND "fileKey" IS NOT NULL;

ALTER TABLE "MockupAsset"
  ADD COLUMN IF NOT EXISTS "objectKey" TEXT,
  ADD COLUMN IF NOT EXISTS "contentType" TEXT,
  ADD COLUMN IF NOT EXISTS "format" TEXT,
  ADD COLUMN IF NOT EXISTS "widthPx" INTEGER,
  ADD COLUMN IF NOT EXISTS "heightPx" INTEGER,
  ADD COLUMN IF NOT EXISTS "dpi" INTEGER,
  ADD COLUMN IF NOT EXISTS "checksum" TEXT,
  ADD COLUMN IF NOT EXISTS "placementSnapshotJson" JSONB,
  ADD COLUMN IF NOT EXISTS "renderJobId" TEXT,
  ADD COLUMN IF NOT EXISTS "failureReason" TEXT,
  ADD COLUMN IF NOT EXISTS "replacedById" TEXT,
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "MockupAsset" ALTER COLUMN "updatedAt" DROP DEFAULT;

UPDATE "MockupAsset"
SET "objectKey" = "imageUrl"
WHERE "objectKey" IS NULL AND "imageUrl" IS NOT NULL;

ALTER TABLE "WorkerJob"
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

CREATE INDEX IF NOT EXISTS "FileAsset_ownerId_purpose_status_idx" ON "FileAsset"("ownerId", "purpose", "status");
CREATE INDEX IF NOT EXISTS "FileAsset_designId_idx" ON "FileAsset"("designId");
CREATE INDEX IF NOT EXISTS "FileAsset_listingId_idx" ON "FileAsset"("listingId");
CREATE INDEX IF NOT EXISTS "MockupAsset_renderJobId_idx" ON "MockupAsset"("renderJobId");
CREATE INDEX IF NOT EXISTS "WorkerJob_type_status_nextRunAt_idx" ON "WorkerJob"("type", "status", "nextRunAt");
CREATE INDEX IF NOT EXISTS "WorkerJob_status_nextRunAt_idx" ON "WorkerJob"("status", "nextRunAt");
CREATE UNIQUE INDEX IF NOT EXISTS "WorkerJob_idempotencyKey_key" ON "WorkerJob"("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;
