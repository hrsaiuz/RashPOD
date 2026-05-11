CREATE TABLE IF NOT EXISTS "PlatformSetting" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

CREATE TABLE IF NOT EXISTS "EmailTemplate" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "variables" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailTemplate_key_key" ON "EmailTemplate"("key");

CREATE TABLE IF NOT EXISTS "AiSetting" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AiSetting_pkey" PRIMARY KEY ("key")
);

DO $$
BEGIN
  CREATE TYPE "MediaCategory" AS ENUM (
    'UI_ASSET',
    'BRANDING_LOGO_WEB',
    'BRANDING_LOGO_DASHBOARD',
    'BRANDING_LOGO_LOGIN',
    'BRANDING_FAVICON',
    'BASE_PRODUCT_IMAGE',
    'MOCKUP_TEMPLATE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "MediaAsset" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "category" "MediaCategory" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "bucket" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "publicUrl" TEXT,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "uploaderId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MediaAsset_key_key" ON "MediaAsset"("key");
CREATE INDEX IF NOT EXISTS "MediaAsset_category_isActive_idx" ON "MediaAsset"("category", "isActive");
CREATE INDEX IF NOT EXISTS "MediaAsset_category_sortOrder_idx" ON "MediaAsset"("category", "sortOrder");
