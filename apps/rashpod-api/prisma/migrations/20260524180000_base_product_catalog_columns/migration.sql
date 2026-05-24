-- BaseProduct catalog columns referenced by admin CRUD but never migrated to production.
ALTER TABLE "BaseProduct" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "BaseProduct" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "BaseProduct" ADD COLUMN IF NOT EXISTS "availableColors" JSONB;
ALTER TABLE "BaseProduct" ADD COLUMN IF NOT EXISTS "availableSizes" JSONB;
ALTER TABLE "BaseProduct" ADD COLUMN IF NOT EXISTS "baseCost" DECIMAL(10, 2);
ALTER TABLE "BaseProduct" ADD COLUMN IF NOT EXISTS "defaultPrice" DECIMAL(10, 2);
