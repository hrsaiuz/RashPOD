-- Slice 8: DTF / UV-DTF film sales flow foundations

ALTER TYPE "AssetPurpose" ADD VALUE IF NOT EXISTS 'FILM_SOURCE';

CREATE TYPE "FilmOrderKind" AS ENUM ('DESIGN_FILM', 'CUSTOM_FILM');
CREATE TYPE "FilmType" AS ENUM ('DTF', 'UV_DTF');
CREATE TYPE "FilmConsentAction" AS ENUM ('ENABLED', 'REVOKED', 'ADMIN_ENABLED', 'ADMIN_REVOKED');

ALTER TABLE "FilmSaleSettings"
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'UZS',
  ADD COLUMN "dtfPricingJson" JSONB,
  ADD COLUMN "uvDtfPricingJson" JSONB,
  ADD COLUMN "consentPolicyJson" JSONB,
  ADD COLUMN "royaltyPolicyJson" JSONB,
  ADD COLUMN "productionConstraintsJson" JSONB,
  ADD COLUMN "settingsVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "taxRatePercent" DECIMAL(10,4);

ALTER TABLE "CartItem"
  ALTER COLUMN "listingId" DROP NOT NULL,
  ADD COLUMN "itemKind" "FilmOrderKind",
  ADD COLUMN "filmType" "FilmType",
  ADD COLUMN "filmWidthCm" DOUBLE PRECISION,
  ADD COLUMN "filmHeightCm" DOUBLE PRECISION,
  ADD COLUMN "filmAreaCm2" DOUBLE PRECISION,
  ADD COLUMN "filmSourceAssetId" TEXT,
  ADD COLUMN "filmPricingSnapshotJson" JSONB,
  ADD COLUMN "filmConsentSnapshotJson" JSONB,
  ADD COLUMN "filmOptionsJson" JSONB;

ALTER TABLE "OrderItem"
  ALTER COLUMN "listingId" DROP NOT NULL,
  ADD COLUMN "itemKind" "FilmOrderKind",
  ADD COLUMN "filmType" "FilmType",
  ADD COLUMN "filmWidthCm" DOUBLE PRECISION,
  ADD COLUMN "filmHeightCm" DOUBLE PRECISION,
  ADD COLUMN "filmAreaCm2" DOUBLE PRECISION,
  ADD COLUMN "filmSourceAssetId" TEXT,
  ADD COLUMN "filmPricingSnapshotJson" JSONB,
  ADD COLUMN "filmConsentSnapshotJson" JSONB,
  ADD COLUMN "filmProductionSnapshotJson" JSONB;

ALTER TABLE "OrderFinanceSnapshot"
  ALTER COLUMN "listingId" DROP NOT NULL;

CREATE TABLE "FilmConsentEvent" (
  "id" TEXT NOT NULL,
  "designAssetId" TEXT NOT NULL,
  "designerId" TEXT NOT NULL,
  "actorId" TEXT,
  "designVersionId" TEXT,
  "action" "FilmConsentAction" NOT NULL,
  "reason" TEXT,
  "policySnapshotJson" JSONB,
  "royaltySnapshotJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FilmConsentEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FilmConsentEvent_designAssetId_createdAt_idx" ON "FilmConsentEvent"("designAssetId", "createdAt");
CREATE INDEX "FilmConsentEvent_designerId_createdAt_idx" ON "FilmConsentEvent"("designerId", "createdAt");
CREATE INDEX "FilmConsentEvent_actorId_idx" ON "FilmConsentEvent"("actorId");

ALTER TABLE "FilmConsentEvent"
  ADD CONSTRAINT "FilmConsentEvent_designAssetId_fkey"
  FOREIGN KEY ("designAssetId") REFERENCES "DesignAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FilmConsentEvent"
  ADD CONSTRAINT "FilmConsentEvent_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
