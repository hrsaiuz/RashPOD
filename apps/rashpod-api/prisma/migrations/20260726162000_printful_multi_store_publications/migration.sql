ALTER TYPE "MarketplaceKind" ADD VALUE IF NOT EXISTS 'PRINTFUL';

ALTER TABLE "MarketplacePublication"
ADD COLUMN "publicationKey" TEXT NOT NULL DEFAULT 'default';

DROP INDEX IF EXISTS "MarketplacePublication_productListingId_marketplace_key";

CREATE UNIQUE INDEX "MarketplacePublication_productListingId_marketplace_publicationKey_key"
ON "MarketplacePublication"("productListingId", "marketplace", "publicationKey");

CREATE INDEX "MarketplacePublication_providerStoreId_status_idx"
ON "MarketplacePublication"("providerStoreId", "status");
