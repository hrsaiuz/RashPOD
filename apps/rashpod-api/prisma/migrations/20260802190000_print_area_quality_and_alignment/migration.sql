ALTER TABLE "PrintArea"
ADD COLUMN "minimumDpi" INTEGER NOT NULL DEFAULT 150;

-- Keep every safe zone centered inside its configured print area. This applies
-- equally to front, back, chest, sleeve, wrap, and custom placements.
UPDATE "PrintArea"
SET
  "safeX" = "x" + ROUND(("width" - "safeWidth") / 2.0)::INTEGER,
  "safeY" = "y" + ROUND(("height" - "safeHeight") / 2.0)::INTEGER;

-- Front/back/wrap artwork is horizontally centered on the actual uploaded
-- product-view image. Vertical positioning remains garment-specific.
WITH area_canvas AS (
  SELECT
    pa."id",
    media."width" AS canvas_width
  FROM "PrintArea" pa
  JOIN "MockupTemplate" template ON template."id" = pa."mockupTemplateId"
  LEFT JOIN "MockupView" view ON view."id" = pa."mockupViewId"
  JOIN LATERAL (
    SELECT asset."width"
    FROM "MediaAsset" asset
    WHERE asset."width" IS NOT NULL
      AND (asset."objectKey" = COALESCE(view."blankImageKey", template."baseImageKey")
        OR asset."key" = COALESCE(view."blankImageKey", template."baseImageKey"))
    ORDER BY asset."updatedAt" DESC
    LIMIT 1
  ) media ON TRUE
  WHERE pa."placement" IN ('FRONT', 'BACK', 'FULL_WRAP')
    AND media."width" >= pa."width"
)
UPDATE "PrintArea" pa
SET
  "x" = ROUND((area_canvas.canvas_width - pa."width") / 2.0)::INTEGER,
  "safeX" = ROUND((area_canvas.canvas_width - pa."width") / 2.0)::INTEGER
    + ROUND((pa."width" - pa."safeWidth") / 2.0)::INTEGER
FROM area_canvas
WHERE pa."id" = area_canvas."id";
