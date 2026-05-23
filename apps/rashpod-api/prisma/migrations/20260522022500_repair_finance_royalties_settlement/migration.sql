-- Repair migration for production databases where
-- 20260522003000_finance_royalties_settlement was manually marked applied
-- after a partial failed execution.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoyaltyEntryType') THEN
    CREATE TYPE "RoyaltyEntryType" AS ENUM ('PENDING', 'EARNED', 'PAYABLE', 'PAID', 'REVERSED', 'ADJUSTMENT');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentReconciliationStatus') THEN
    CREATE TYPE "PaymentReconciliationStatus" AS ENUM ('UNRECONCILED', 'MATCHED', 'MISMATCHED', 'MANUAL_REVIEW');
  END IF;
END $$;

ALTER TYPE "RoyaltyLedgerStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "RoyaltyLedgerStatus" ADD VALUE IF NOT EXISTS 'EARNED';
ALTER TYPE "RoyaltyLedgerStatus" ADD VALUE IF NOT EXISTS 'PAYABLE';
ALTER TYPE "RoyaltyLedgerStatus" ADD VALUE IF NOT EXISTS 'PAID';
ALTER TYPE "RoyaltyLedgerStatus" ADD VALUE IF NOT EXISTS 'REVERSED';
ALTER TYPE "RoyaltyLedgerStatus" ADD VALUE IF NOT EXISTS 'ADJUSTMENT';

ALTER TYPE "PayoutStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "PayoutStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "PayoutStatus" ADD VALUE IF NOT EXISTS 'PAID';
ALTER TYPE "PayoutStatus" ADD VALUE IF NOT EXISTS 'CANCELED';

COMMIT;
BEGIN;

CREATE TABLE IF NOT EXISTS "OrderFinanceSnapshot" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "designerId" TEXT,
  "customerId" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'UZS',
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "grossLineAmount" DECIMAL(12,2) NOT NULL,
  "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "netRevenue" DECIMAL(12,2) NOT NULL,
  "deliveryFeeAllocation" DECIMAL(12,2),
  "taxAmount" DECIMAL(12,2),
  "paymentProviderFee" DECIMAL(12,2),
  "baseProductCost" DECIMAL(12,2),
  "productionCost" DECIMAL(12,2),
  "deliveryCost" DECIMAL(12,2),
  "royaltyRuleSnapshot" JSONB,
  "royaltyAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "platformMarginEstimate" DECIMAL(12,2),
  "marginIncomplete" BOOLEAN NOT NULL DEFAULT false,
  "incompleteReason" TEXT,
  "settlementStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "refundStatus" TEXT NOT NULL DEFAULT 'NONE',
  "calculationBasisJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrderFinanceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PaymentReconciliation" (
  "id" TEXT NOT NULL,
  "paymentTransactionId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerTransactionId" TEXT,
  "expectedAmount" DECIMAL(12,2) NOT NULL,
  "receivedAmount" DECIMAL(12,2),
  "currency" TEXT NOT NULL DEFAULT 'UZS',
  "providerStatus" TEXT,
  "internalStatus" TEXT,
  "discrepancyAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "status" "PaymentReconciliationStatus" NOT NULL DEFAULT 'UNRECONCILED',
  "reconciledAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "note" TEXT,
  "rawPayloadJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentReconciliation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RoyaltyLedgerEntry"
  ADD COLUMN IF NOT EXISTS "entryType" "RoyaltyEntryType" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "designId" TEXT,
  ADD COLUMN IF NOT EXISTS "designVersionId" TEXT,
  ADD COLUMN IF NOT EXISTS "calculationBasis" JSONB,
  ADD COLUMN IF NOT EXISTS "royaltyRuleSnapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "availableAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reason" TEXT,
  ADD COLUMN IF NOT EXISTS "note" TEXT,
  ADD COLUMN IF NOT EXISTS "createdById" TEXT,
  ADD COLUMN IF NOT EXISTS "source" TEXT,
  ADD COLUMN IF NOT EXISTS "reversalOfEntryId" TEXT;

ALTER TABLE "RoyaltyLedgerEntry" ALTER COLUMN "orderId" DROP NOT NULL;
ALTER TABLE "RoyaltyLedgerEntry" ALTER COLUMN "orderItemId" DROP NOT NULL;
ALTER TABLE "RoyaltyLedgerEntry" ALTER COLUMN "listingId" DROP NOT NULL;
ALTER TABLE "RoyaltyLedgerEntry" ALTER COLUMN "royaltyRate" DROP NOT NULL;

ALTER TABLE "Payout"
  ADD COLUMN IF NOT EXISTS "note" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedById" TEXT,
  ADD COLUMN IF NOT EXISTS "paidById" TEXT,
  ADD COLUMN IF NOT EXISTS "exportFileRef" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "canceledAt" TIMESTAMP(3);

ALTER TABLE "Payout" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

DROP INDEX IF EXISTS "RoyaltyLedgerEntry_orderItemId_designerId_key";
CREATE INDEX IF NOT EXISTS "RoyaltyLedgerEntry_orderItemId_designerId_idx" ON "RoyaltyLedgerEntry"("orderItemId", "designerId");
CREATE INDEX IF NOT EXISTS "RoyaltyLedgerEntry_designerId_entryType_idx" ON "RoyaltyLedgerEntry"("designerId", "entryType");

CREATE UNIQUE INDEX IF NOT EXISTS "OrderFinanceSnapshot_orderItemId_key" ON "OrderFinanceSnapshot"("orderItemId");
CREATE INDEX IF NOT EXISTS "OrderFinanceSnapshot_designerId_settlementStatus_idx" ON "OrderFinanceSnapshot"("designerId", "settlementStatus");
CREATE INDEX IF NOT EXISTS "OrderFinanceSnapshot_orderId_idx" ON "OrderFinanceSnapshot"("orderId");

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentReconciliation_paymentTransactionId_key" ON "PaymentReconciliation"("paymentTransactionId");
CREATE INDEX IF NOT EXISTS "PaymentReconciliation_status_createdAt_idx" ON "PaymentReconciliation"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentReconciliation_orderId_idx" ON "PaymentReconciliation"("orderId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderFinanceSnapshot_orderId_fkey') THEN
    ALTER TABLE "OrderFinanceSnapshot" ADD CONSTRAINT "OrderFinanceSnapshot_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderFinanceSnapshot_orderItemId_fkey') THEN
    ALTER TABLE "OrderFinanceSnapshot" ADD CONSTRAINT "OrderFinanceSnapshot_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentReconciliation_paymentTransactionId_fkey') THEN
    ALTER TABLE "PaymentReconciliation" ADD CONSTRAINT "PaymentReconciliation_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "PaymentTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentReconciliation_orderId_fkey') THEN
    ALTER TABLE "PaymentReconciliation" ADD CONSTRAINT "PaymentReconciliation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
  END IF;
END $$;
