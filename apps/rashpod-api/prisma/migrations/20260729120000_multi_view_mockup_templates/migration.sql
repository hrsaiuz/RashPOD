-- Additive multi-view mockup foundation. Legacy image columns remain available
-- until existing templates have been migrated to the normalized structure.
CREATE TYPE "MockupTemplateVersion" AS ENUM ('LEGACY_V1', 'MULTI_VIEW_V2');
CREATE TYPE "MockupGalleryAssetRole" AS ENUM ('LIFESTYLE', 'DETAIL');

ALTER TABLE "MockupTemplate"
ADD COLUMN "configurationVersion" "MockupTemplateVersion" NOT NULL DEFAULT 'LEGACY_V1';

CREATE TABLE "MockupView" (
    "id" TEXT NOT NULL,
    "mockupTemplateId" TEXT NOT NULL,
    "viewKey" TEXT NOT NULL,
    "placementCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "blankImageKey" TEXT NOT NULL,
    "mockupStyle" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockupView_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MockupGalleryAsset" (
    "id" TEXT NOT NULL,
    "mockupTemplateId" TEXT NOT NULL,
    "mockupViewId" TEXT,
    "role" "MockupGalleryAssetRole" NOT NULL,
    "imageKey" TEXT NOT NULL,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockupGalleryAsset_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PrintArea"
ADD COLUMN "mockupViewId" TEXT;

CREATE UNIQUE INDEX "MockupView_mockupTemplateId_viewKey_key"
ON "MockupView"("mockupTemplateId", "viewKey");

CREATE INDEX "MockupView_mockupTemplateId_placementCode_isActive_idx"
ON "MockupView"("mockupTemplateId", "placementCode", "isActive");

CREATE INDEX "MockupView_mockupTemplateId_sortOrder_idx"
ON "MockupView"("mockupTemplateId", "sortOrder");

CREATE INDEX "MockupGalleryAsset_mockupTemplateId_role_isActive_sortOrder_idx"
ON "MockupGalleryAsset"("mockupTemplateId", "role", "isActive", "sortOrder");

CREATE INDEX "MockupGalleryAsset_mockupViewId_idx"
ON "MockupGalleryAsset"("mockupViewId");

CREATE INDEX "PrintArea_mockupViewId_idx"
ON "PrintArea"("mockupViewId");

ALTER TABLE "MockupView"
ADD CONSTRAINT "MockupView_mockupTemplateId_fkey"
FOREIGN KEY ("mockupTemplateId") REFERENCES "MockupTemplate"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MockupGalleryAsset"
ADD CONSTRAINT "MockupGalleryAsset_mockupTemplateId_fkey"
FOREIGN KEY ("mockupTemplateId") REFERENCES "MockupTemplate"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MockupGalleryAsset"
ADD CONSTRAINT "MockupGalleryAsset_mockupViewId_fkey"
FOREIGN KEY ("mockupViewId") REFERENCES "MockupView"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PrintArea"
ADD CONSTRAINT "PrintArea_mockupViewId_fkey"
FOREIGN KEY ("mockupViewId") REFERENCES "MockupView"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill every legacy template with a primary rendering view. The original
-- columns remain populated for V1 readers and rollback-safe application deploys.
INSERT INTO "MockupView" (
    "id",
    "mockupTemplateId",
    "viewKey",
    "placementCode",
    "name",
    "blankImageKey",
    "sortOrder",
    "isPrimary",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    template."id",
    'legacy_primary',
    COALESCE(
        (
            SELECT LOWER(area."placement"::text)
            FROM "PrintArea" area
            WHERE area."mockupTemplateId" = template."id"
              AND area."placement" IS NOT NULL
            ORDER BY area."createdAt" ASC
            LIMIT 1
        ),
        'front'
    ),
    'Primary view',
    template."baseImageKey",
    0,
    true,
    template."isActive",
    template."createdAt",
    CURRENT_TIMESTAMP
FROM "MockupTemplate" template
WHERE NOT EXISTS (
    SELECT 1
    FROM "MockupView" view
    WHERE view."mockupTemplateId" = template."id"
      AND view."viewKey" = 'legacy_primary'
);

INSERT INTO "MockupGalleryAsset" (
    "id",
    "mockupTemplateId",
    "mockupViewId",
    "role",
    "imageKey",
    "sortOrder",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    template."id",
    view."id",
    'LIFESTYLE'::"MockupGalleryAssetRole",
    template."lifestyleImageKey",
    0,
    template."isActive",
    template."createdAt",
    CURRENT_TIMESTAMP
FROM "MockupTemplate" template
JOIN "MockupView" view
  ON view."mockupTemplateId" = template."id"
 AND view."viewKey" = 'legacy_primary'
WHERE template."lifestyleImageKey" IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM "MockupGalleryAsset" asset
      WHERE asset."mockupTemplateId" = template."id"
        AND asset."role" = 'LIFESTYLE'
        AND asset."imageKey" = template."lifestyleImageKey"
  );

INSERT INTO "MockupGalleryAsset" (
    "id",
    "mockupTemplateId",
    "mockupViewId",
    "role",
    "imageKey",
    "sortOrder",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    template."id",
    view."id",
    'DETAIL'::"MockupGalleryAssetRole",
    template."closeupImageKey",
    0,
    template."isActive",
    template."createdAt",
    CURRENT_TIMESTAMP
FROM "MockupTemplate" template
JOIN "MockupView" view
  ON view."mockupTemplateId" = template."id"
 AND view."viewKey" = 'legacy_primary'
WHERE template."closeupImageKey" IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM "MockupGalleryAsset" asset
      WHERE asset."mockupTemplateId" = template."id"
        AND asset."role" = 'DETAIL'
        AND asset."imageKey" = template."closeupImageKey"
  );

UPDATE "PrintArea" area
SET "mockupViewId" = view."id"
FROM "MockupView" view
WHERE area."mockupTemplateId" = view."mockupTemplateId"
  AND view."viewKey" = 'legacy_primary'
  AND area."mockupViewId" IS NULL;

UPDATE "MockupTemplate"
SET "configurationVersion" = 'MULTI_VIEW_V2'
WHERE "configurationVersion" = 'LEGACY_V1';
