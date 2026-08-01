ALTER TABLE "DesignVersion"
ADD COLUMN "placement" "PlacementKind";

CREATE INDEX "DesignVersion_designAssetId_placement_createdAt_idx"
ON "DesignVersion"("designAssetId", "placement", "createdAt" DESC);

ALTER TABLE "DesignProductSelection"
ADD COLUMN "sourceDesignVersionId" TEXT;

CREATE INDEX "DesignProductSelection_sourceDesignVersionId_idx"
ON "DesignProductSelection"("sourceDesignVersionId");

ALTER TABLE "DesignProductSelection"
ADD CONSTRAINT "DesignProductSelection_sourceDesignVersionId_fkey"
FOREIGN KEY ("sourceDesignVersionId") REFERENCES "DesignVersion"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
