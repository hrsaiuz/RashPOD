-- Every local print area owns a generated default preset. The preset does not
-- hardcode artwork dimensions: the editor derives its initial placement from
-- the print area's current safe zone, so later safe-zone edits stay in sync.
INSERT INTO "PlacementPreset" (
  "id",
  "name",
  "pipeline",
  "localBaseProductId",
  "placement",
  "defaultScale",
  "alignment",
  "units",
  "active",
  "createdAt",
  "updatedAt"
)
SELECT
  'print-area-default-' || area."id",
  area."name" || ' default',
  'LOCAL'::"PipelineType",
  template."baseProductId",
  COALESCE(area."placement", 'OTHER'::"PlacementKind"),
  1,
  'CENTER'::"PlacementAlignment",
  'PX'::"PlacementUnits",
  area."isActive",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "PrintArea" area
JOIN "MockupTemplate" template ON template."id" = area."mockupTemplateId"
WHERE area."defaultPresetId" IS NULL
ON CONFLICT ("id") DO NOTHING;

UPDATE "PrintArea" area
SET "defaultPresetId" = 'print-area-default-' || area."id"
WHERE area."defaultPresetId" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "PlacementPreset" preset
    WHERE preset."id" = 'print-area-default-' || area."id"
  );

CREATE INDEX IF NOT EXISTS "PrintArea_defaultPresetId_idx" ON "PrintArea"("defaultPresetId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PrintArea_defaultPresetId_fkey'
  ) THEN
    ALTER TABLE "PrintArea"
      ADD CONSTRAINT "PrintArea_defaultPresetId_fkey"
      FOREIGN KEY ("defaultPresetId") REFERENCES "PlacementPreset"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
