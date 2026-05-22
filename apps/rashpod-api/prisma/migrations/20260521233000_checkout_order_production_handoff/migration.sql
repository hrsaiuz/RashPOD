-- Slice 4: checkout, payment, order, and production handoff hardening.
-- All additions are nullable/defaulted to keep production migration deploy-safe.

ALTER TABLE "CartItem"
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'UZS',
  ADD COLUMN "selectedSize" TEXT,
  ADD COLUMN "selectedColor" TEXT,
  ADD COLUMN "selectedMaterial" TEXT,
  ADD COLUMN "selectedPrintSide" TEXT;

ALTER TABLE "Order"
  ADD COLUMN "customerName" TEXT,
  ADD COLUMN "customerPhone" TEXT,
  ADD COLUMN "customerEmail" TEXT,
  ADD COLUMN "deliveryAddress" TEXT,
  ADD COLUMN "pickupLocation" TEXT,
  ADD COLUMN "customerNote" TEXT,
  ADD COLUMN "discountTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "pricingSnapshotJson" JSONB,
  ADD COLUMN "deliverySnapshotJson" JSONB,
  ADD COLUMN "paymentSnapshotJson" JSONB;

ALTER TABLE "OrderItem"
  ADD COLUMN "listingTitle" TEXT,
  ADD COLUMN "designerId" TEXT,
  ADD COLUMN "designAssetId" TEXT,
  ADD COLUMN "designVersionId" TEXT,
  ADD COLUMN "productTypeId" TEXT,
  ADD COLUMN "productTypeName" TEXT,
  ADD COLUMN "baseProductId" TEXT,
  ADD COLUMN "baseProductName" TEXT,
  ADD COLUMN "baseProductSku" TEXT,
  ADD COLUMN "selectedSize" TEXT,
  ADD COLUMN "selectedColor" TEXT,
  ADD COLUMN "selectedMaterial" TEXT,
  ADD COLUMN "selectedPrintSide" TEXT,
  ADD COLUMN "mockupAssetIds" JSONB,
  ADD COLUMN "mockupImageUrl" TEXT,
  ADD COLUMN "productionFileAssetId" TEXT,
  ADD COLUMN "placementSnapshotJson" JSONB,
  ADD COLUMN "printAreaSnapshotJson" JSONB,
  ADD COLUMN "royaltySnapshotJson" JSONB,
  ADD COLUMN "pricingSnapshotJson" JSONB,
  ADD COLUMN "productionSnapshotJson" JSONB,
  ADD COLUMN "designerRoyaltyAmount" DECIMAL(10,2),
  ADD COLUMN "productionCostEstimate" DECIMAL(10,2),
  ADD COLUMN "deliveryFeeAllocation" DECIMAL(10,2);

ALTER TABLE "PaymentTransaction"
  ADD COLUMN "providerPaymentId" TEXT,
  ADD COLUMN "checkoutUrl" TEXT,
  ADD COLUMN "attemptNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "settingsSnapshotJson" JSONB;

ALTER TABLE "ProductionJob"
  ADD COLUMN "customerSnapshotJson" JSONB,
  ADD COLUMN "productSnapshotJson" JSONB,
  ADD COLUMN "placementSnapshotJson" JSONB,
  ADD COLUMN "printAreaSnapshotJson" JSONB,
  ADD COLUMN "assetSnapshotJson" JSONB,
  ADD COLUMN "selectedOptionsJson" JSONB,
  ADD COLUMN "productionFileStatus" TEXT,
  ADD COLUMN "productionFileAssetId" TEXT,
  ADD COLUMN "productionFileObjectKey" TEXT,
  ADD COLUMN "productionFileUrl" TEXT,
  ADD COLUMN "productionFileJobId" TEXT,
  ADD COLUMN "mockupPreviewUrl" TEXT,
  ADD COLUMN "dueAt" TIMESTAMP(3),
  ADD COLUMN "qcStatus" TEXT,
  ADD COLUMN "qcNote" TEXT,
  ADD COLUMN "qcFailedReason" TEXT,
  ADD COLUMN "qcCheckedById" TEXT,
  ADD COLUMN "qcCheckedAt" TIMESTAMP(3);

ALTER TABLE "ProductionJob"
  ADD CONSTRAINT "ProductionJob_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;

CREATE INDEX "ProductionJob_orderId_status_idx" ON "ProductionJob"("orderId", "status");
CREATE INDEX "ProductionJob_orderItemId_idx" ON "ProductionJob"("orderItemId");
CREATE INDEX "ProductionJob_status_createdAt_idx" ON "ProductionJob"("status", "createdAt");
