ALTER TABLE "PlacementPreset"
ADD COLUMN "providerPlacement" TEXT;

ALTER TABLE "DesignProductSelection"
ADD COLUMN "providerPlacement" TEXT;

UPDATE "PlacementPreset"
SET "providerPlacement" = lower("placement"::text)
WHERE "pipeline" = 'GLOBAL_PRINTFUL'
  AND "providerPlacement" IS NULL;

UPDATE "DesignProductSelection"
SET "providerPlacement" = lower("placement"::text)
WHERE "pipeline" = 'GLOBAL_PRINTFUL'
  AND "providerPlacement" IS NULL;
