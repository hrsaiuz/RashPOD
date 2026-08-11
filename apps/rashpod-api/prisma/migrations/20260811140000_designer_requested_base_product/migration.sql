ALTER TABLE "DesignAsset"
ADD COLUMN "requestedBaseProductId" TEXT;

CREATE INDEX "DesignAsset_requestedBaseProductId_idx"
ON "DesignAsset"("requestedBaseProductId");

ALTER TABLE "DesignAsset"
ADD CONSTRAINT "DesignAsset_requestedBaseProductId_fkey"
FOREIGN KEY ("requestedBaseProductId") REFERENCES "BaseProduct"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
