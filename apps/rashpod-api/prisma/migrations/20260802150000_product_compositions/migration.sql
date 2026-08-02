CREATE TABLE "ProductComposition" (
  "id" TEXT NOT NULL,
  "designId" TEXT NOT NULL,
  "pipeline" "PipelineType" NOT NULL,
  "compositionKey" TEXT NOT NULL,
  "localBaseProductId" TEXT,
  "mockupTemplateId" TEXT,
  "printfulProductTemplateId" TEXT,
  "selectedByModeratorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductComposition_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DesignProductSelection" ADD COLUMN "productCompositionId" TEXT;
ALTER TABLE "CommerceListing" ADD COLUMN "productCompositionId" TEXT;

CREATE UNIQUE INDEX "ProductComposition_designId_pipeline_compositionKey_key" ON "ProductComposition"("designId", "pipeline", "compositionKey");
CREATE INDEX "ProductComposition_designId_pipeline_idx" ON "ProductComposition"("designId", "pipeline");
CREATE INDEX "ProductComposition_localBaseProductId_idx" ON "ProductComposition"("localBaseProductId");
CREATE INDEX "ProductComposition_mockupTemplateId_idx" ON "ProductComposition"("mockupTemplateId");
CREATE INDEX "ProductComposition_printfulProductTemplateId_idx" ON "ProductComposition"("printfulProductTemplateId");
CREATE INDEX "DesignProductSelection_productCompositionId_idx" ON "DesignProductSelection"("productCompositionId");
CREATE UNIQUE INDEX "CommerceListing_productCompositionId_key" ON "CommerceListing"("productCompositionId");

ALTER TABLE "ProductComposition" ADD CONSTRAINT "ProductComposition_designId_fkey" FOREIGN KEY ("designId") REFERENCES "DesignAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductComposition" ADD CONSTRAINT "ProductComposition_localBaseProductId_fkey" FOREIGN KEY ("localBaseProductId") REFERENCES "BaseProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductComposition" ADD CONSTRAINT "ProductComposition_mockupTemplateId_fkey" FOREIGN KEY ("mockupTemplateId") REFERENCES "MockupTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductComposition" ADD CONSTRAINT "ProductComposition_printfulProductTemplateId_fkey" FOREIGN KEY ("printfulProductTemplateId") REFERENCES "PrintfulProductTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DesignProductSelection" ADD CONSTRAINT "DesignProductSelection_productCompositionId_fkey" FOREIGN KEY ("productCompositionId") REFERENCES "ProductComposition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommerceListing" ADD CONSTRAINT "CommerceListing_productCompositionId_fkey" FOREIGN KEY ("productCompositionId") REFERENCES "ProductComposition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
