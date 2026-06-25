CREATE TYPE "DesignStoryStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'NEEDS_CHANGES', 'PUBLISHED', 'UNPUBLISHED');

ALTER TYPE "AssetPurpose" ADD VALUE IF NOT EXISTS 'STORY_COVER_IMAGE';
ALTER TYPE "AssetPurpose" ADD VALUE IF NOT EXISTS 'STORY_AUDIO';
ALTER TYPE "AssetPurpose" ADD VALUE IF NOT EXISTS 'STORY_VIDEO';
ALTER TYPE "AssetPurpose" ADD VALUE IF NOT EXISTS 'STORY_QR';

CREATE TABLE "DesignStory" (
    "id" TEXT NOT NULL,
    "designAssetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "DesignStoryStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceLocale" TEXT NOT NULL DEFAULT 'uz',
    "publicUrl" TEXT,
    "qrCodeFileId" TEXT,
    "qrCodeImageUrl" TEXT,
    "coverImageFileId" TEXT,
    "titleTranslationsJson" JSONB,
    "bodyTranslationsJson" JSONB,
    "audioFileIdsJson" JSONB,
    "videoFileIdsJson" JSONB,
    "translationMetaJson" JSONB,
    "reviewNotes" TEXT,
    "requestedPublishAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "unpublishedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesignStory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DesignStory_designAssetId_key" ON "DesignStory"("designAssetId");
CREATE UNIQUE INDEX "DesignStory_slug_key" ON "DesignStory"("slug");
CREATE INDEX "DesignStory_status_updatedAt_idx" ON "DesignStory"("status", "updatedAt");

ALTER TABLE "DesignStory" ADD CONSTRAINT "DesignStory_designAssetId_fkey" FOREIGN KEY ("designAssetId") REFERENCES "DesignAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
