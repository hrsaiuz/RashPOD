ALTER TYPE "AssetPurpose" ADD VALUE IF NOT EXISTS 'WORKSHOP_QC_EVIDENCE';

ALTER TABLE "Order"
  ADD COLUMN "workshopCode" TEXT,
  ADD COLUMN "packedAt" TIMESTAMP(3),
  ADD COLUMN "packedById" TEXT,
  ADD COLUMN "packingNote" TEXT,
  ADD COLUMN "pickupCompletedAt" TIMESTAMP(3),
  ADD COLUMN "deliveryFailedAt" TIMESTAMP(3),
  ADD COLUMN "deliveryFailedReason" TEXT;

ALTER TABLE "ProductionJob"
  ADD COLUMN "workshopCode" TEXT,
  ADD COLUMN "packedAt" TIMESTAMP(3),
  ADD COLUMN "packedById" TEXT,
  ADD COLUMN "packageCode" TEXT;

CREATE UNIQUE INDEX "Order_workshopCode_key" ON "Order"("workshopCode");
CREATE UNIQUE INDEX "ProductionJob_workshopCode_key" ON "ProductionJob"("workshopCode");
CREATE INDEX "ProductionJob_workshopCode_idx" ON "ProductionJob"("workshopCode");
CREATE INDEX "ProductionJob_packageCode_idx" ON "ProductionJob"("packageCode");

CREATE TABLE "WorkshopQcEvidence" (
  "id" TEXT NOT NULL,
  "productionJobId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "note" TEXT,
  "defectReason" TEXT,
  "acceptedQuantity" INTEGER,
  "rejectedQuantity" INTEGER,
  "customerVisible" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkshopQcEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkshopIssue" (
  "id" TEXT NOT NULL,
  "productionJobId" TEXT,
  "orderId" TEXT,
  "type" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'NORMAL',
  "note" TEXT NOT NULL,
  "photoAssetId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "blockedProduction" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT,
  "resolvedById" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "resolutionNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkshopIssue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkshopMobileAction" (
  "id" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "responseJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkshopMobileAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkshopQcEvidence_productionJobId_createdAt_idx" ON "WorkshopQcEvidence"("productionJobId", "createdAt");
CREATE INDEX "WorkshopQcEvidence_assetId_idx" ON "WorkshopQcEvidence"("assetId");
CREATE INDEX "WorkshopIssue_productionJobId_status_severity_idx" ON "WorkshopIssue"("productionJobId", "status", "severity");
CREATE INDEX "WorkshopIssue_orderId_status_idx" ON "WorkshopIssue"("orderId", "status");
CREATE INDEX "WorkshopIssue_status_severity_createdAt_idx" ON "WorkshopIssue"("status", "severity", "createdAt");
CREATE UNIQUE INDEX "WorkshopMobileAction_idempotencyKey_key" ON "WorkshopMobileAction"("idempotencyKey");
CREATE INDEX "WorkshopMobileAction_actorId_createdAt_idx" ON "WorkshopMobileAction"("actorId", "createdAt");
CREATE INDEX "WorkshopMobileAction_entityType_entityId_idx" ON "WorkshopMobileAction"("entityType", "entityId");

ALTER TABLE "WorkshopQcEvidence" ADD CONSTRAINT "WorkshopQcEvidence_productionJobId_fkey" FOREIGN KEY ("productionJobId") REFERENCES "ProductionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkshopQcEvidence" ADD CONSTRAINT "WorkshopQcEvidence_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FileAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkshopIssue" ADD CONSTRAINT "WorkshopIssue_productionJobId_fkey" FOREIGN KEY ("productionJobId") REFERENCES "ProductionJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkshopIssue" ADD CONSTRAINT "WorkshopIssue_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkshopIssue" ADD CONSTRAINT "WorkshopIssue_photoAssetId_fkey" FOREIGN KEY ("photoAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
