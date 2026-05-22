-- Slice 5: production operations and fulfillment control.
-- Add operational statuses and nullable/defaulted fields for deploy-safe rollout.

ALTER TYPE "ProductionJobStatus" ADD VALUE IF NOT EXISTS 'WAITING_FOR_FILE';
ALTER TYPE "ProductionJobStatus" ADD VALUE IF NOT EXISTS 'FILE_GENERATING';
ALTER TYPE "ProductionJobStatus" ADD VALUE IF NOT EXISTS 'IN_PRODUCTION';
ALTER TYPE "ProductionJobStatus" ADD VALUE IF NOT EXISTS 'QUALITY_CHECK';
ALTER TYPE "ProductionJobStatus" ADD VALUE IF NOT EXISTS 'QC_FAILED';
ALTER TYPE "ProductionJobStatus" ADD VALUE IF NOT EXISTS 'REPRINT_REQUIRED';
ALTER TYPE "ProductionJobStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_DELIVERY';
ALTER TYPE "ProductionJobStatus" ADD VALUE IF NOT EXISTS 'OUT_FOR_DELIVERY';
ALTER TYPE "ProductionJobStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';
ALTER TYPE "ProductionJobStatus" ADD VALUE IF NOT EXISTS 'CANCELED';
ALTER TYPE "ProductionJobStatus" ADD VALUE IF NOT EXISTS 'BLOCKED';

ALTER TABLE "ProductionJob"
  ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "assignedOperatorId" TEXT,
  ADD COLUMN "blockerReason" TEXT,
  ADD COLUMN "failureReason" TEXT,
  ADD COLUMN "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "startedAt" TIMESTAMP(3),
  ADD COLUMN "qcAt" TIMESTAMP(3),
  ADD COLUMN "readyAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "canceledAt" TIMESTAMP(3),
  ADD COLUMN "producedQuantity" INTEGER,
  ADD COLUMN "acceptedQuantity" INTEGER,
  ADD COLUMN "rejectedQuantity" INTEGER,
  ADD COLUMN "defectReason" TEXT,
  ADD COLUMN "reprintOfProductionItemId" TEXT,
  ADD COLUMN "deliveryProvider" TEXT,
  ADD COLUMN "deliveryTrackingRef" TEXT,
  ADD COLUMN "deliveryNote" TEXT,
  ADD COLUMN "pickupNote" TEXT,
  ADD COLUMN "statusHistoryJson" JSONB;

CREATE INDEX "ProductionJob_priority_dueAt_idx" ON "ProductionJob"("priority", "dueAt");
CREATE INDEX "ProductionJob_assignedOperatorId_idx" ON "ProductionJob"("assignedOperatorId");
CREATE INDEX "ProductionJob_productionFileStatus_idx" ON "ProductionJob"("productionFileStatus");
