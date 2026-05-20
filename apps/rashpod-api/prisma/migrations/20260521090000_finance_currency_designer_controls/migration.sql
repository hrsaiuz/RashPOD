DO $$
BEGIN
  CREATE TYPE "DesignerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ExchangeRateSource" AS ENUM ('MANUAL', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "LedgerEntryType" AS ENUM ('SALE', 'ROYALTY', 'BONUS', 'PAYOUT', 'ADJUSTMENT', 'REFUND');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "LedgerEntryStatus" AS ENUM ('PENDING', 'POSTED', 'VOID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "RoyaltyLedgerStatus" AS ENUM ('CALCULATED', 'ACKNOWLEDGED', 'PAIDOUT', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PayoutStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'CONFIRMED', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PayoutMethod" AS ENUM ('CLICK_WALLET', 'BANK_ACCOUNT', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "BonusType" AS ENUM ('MANUAL', 'GROUP', 'PERFORMANCE', 'CAMPAIGN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "BonusStatus" AS ENUM ('DRAFT', 'APPLIED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "designerStatus" "DesignerStatus" NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "BaseProduct" DROP CONSTRAINT IF EXISTS "BaseProduct_productTypeId_fkey";
ALTER TABLE "BaseProduct" ADD CONSTRAINT "BaseProduct_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "CurrencyConfig" (
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "decimalPlaces" INTEGER NOT NULL DEFAULT 2,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "exchangeRateToUzs" DECIMAL(18, 6) NOT NULL,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CurrencyConfig_pkey" PRIMARY KEY ("code")
);

CREATE TABLE IF NOT EXISTS "ExchangeRate" (
  "id" TEXT NOT NULL,
  "fromCurrency" TEXT NOT NULL,
  "toCurrency" TEXT NOT NULL DEFAULT 'UZS',
  "rate" DECIMAL(18, 6) NOT NULL,
  "source" "ExchangeRateSource" NOT NULL DEFAULT 'MANUAL',
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LedgerEntry" (
  "id" TEXT NOT NULL,
  "type" "LedgerEntryType" NOT NULL,
  "status" "LedgerEntryStatus" NOT NULL DEFAULT 'POSTED',
  "designerId" TEXT,
  "orderId" TEXT,
  "orderItemId" TEXT,
  "paymentTransactionId" TEXT,
  "amount" DECIMAL(12, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'UZS',
  "amountUzs" DECIMAL(12, 2) NOT NULL,
  "description" TEXT,
  "metadataJson" JSONB,
  "postedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Payout" (
  "id" TEXT NOT NULL,
  "designerId" TEXT NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'UZS',
  "amountUzs" DECIMAL(12, 2) NOT NULL,
  "method" "PayoutMethod" NOT NULL DEFAULT 'MANUAL',
  "status" "PayoutStatus" NOT NULL DEFAULT 'REQUESTED',
  "reference" TEXT,
  "failureReason" TEXT,
  "metadataJson" JSONB,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processingAt" TIMESTAMP(3),
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RoyaltyLedgerEntry" (
  "id" TEXT NOT NULL,
  "designerId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "royaltyRuleId" TEXT,
  "royaltyRate" DECIMAL(10, 4) NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'UZS',
  "amountUzs" DECIMAL(12, 2) NOT NULL,
  "status" "RoyaltyLedgerStatus" NOT NULL DEFAULT 'CALCULATED',
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedAt" TIMESTAMP(3),
  "paidOutAt" TIMESTAMP(3),
  "payoutId" TEXT,
  CONSTRAINT "RoyaltyLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PayoutLedgerEntry" (
  "id" TEXT NOT NULL,
  "payoutId" TEXT NOT NULL,
  "ledgerEntryId" TEXT NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'UZS',
  "amountUzs" DECIMAL(12, 2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PayoutLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GroupBonus" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "BonusType" NOT NULL DEFAULT 'GROUP',
  "status" "BonusStatus" NOT NULL DEFAULT 'DRAFT',
  "amountPerDesigner" DECIMAL(12, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'UZS',
  "amountPerDesignerUzs" DECIMAL(12, 2) NOT NULL,
  "reason" TEXT NOT NULL,
  "criteriaJson" JSONB,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "appliedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  CONSTRAINT "GroupBonus_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DesignerBonus" (
  "id" TEXT NOT NULL,
  "designerId" TEXT NOT NULL,
  "groupBonusId" TEXT,
  "ledgerEntryId" TEXT,
  "createdById" TEXT,
  "type" "BonusType" NOT NULL DEFAULT 'MANUAL',
  "status" "BonusStatus" NOT NULL DEFAULT 'APPLIED',
  "amount" DECIMAL(12, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'UZS',
  "amountUzs" DECIMAL(12, 2) NOT NULL,
  "reason" TEXT NOT NULL,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "appliedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  CONSTRAINT "DesignerBonus_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ExchangeRate_fromCurrency_toCurrency_effectiveAt_idx" ON "ExchangeRate"("fromCurrency", "toCurrency", "effectiveAt");
CREATE INDEX IF NOT EXISTS "LedgerEntry_designerId_createdAt_idx" ON "LedgerEntry"("designerId", "createdAt");
CREATE INDEX IF NOT EXISTS "LedgerEntry_type_status_idx" ON "LedgerEntry"("type", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "RoyaltyLedgerEntry_orderItemId_designerId_key" ON "RoyaltyLedgerEntry"("orderItemId", "designerId");
CREATE INDEX IF NOT EXISTS "RoyaltyLedgerEntry_designerId_status_idx" ON "RoyaltyLedgerEntry"("designerId", "status");
CREATE INDEX IF NOT EXISTS "RoyaltyLedgerEntry_orderId_idx" ON "RoyaltyLedgerEntry"("orderId");
CREATE INDEX IF NOT EXISTS "Payout_designerId_status_idx" ON "Payout"("designerId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "PayoutLedgerEntry_payoutId_ledgerEntryId_key" ON "PayoutLedgerEntry"("payoutId", "ledgerEntryId");
CREATE UNIQUE INDEX IF NOT EXISTS "DesignerBonus_ledgerEntryId_key" ON "DesignerBonus"("ledgerEntryId");
CREATE INDEX IF NOT EXISTS "DesignerBonus_designerId_status_idx" ON "DesignerBonus"("designerId", "status");
CREATE INDEX IF NOT EXISTS "DesignerBonus_groupBonusId_idx" ON "DesignerBonus"("groupBonusId");

ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_designerId_fkey" FOREIGN KEY ("designerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "PaymentTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_designerId_fkey" FOREIGN KEY ("designerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RoyaltyLedgerEntry" ADD CONSTRAINT "RoyaltyLedgerEntry_designerId_fkey" FOREIGN KEY ("designerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RoyaltyLedgerEntry" ADD CONSTRAINT "RoyaltyLedgerEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoyaltyLedgerEntry" ADD CONSTRAINT "RoyaltyLedgerEntry_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoyaltyLedgerEntry" ADD CONSTRAINT "RoyaltyLedgerEntry_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "CommerceListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RoyaltyLedgerEntry" ADD CONSTRAINT "RoyaltyLedgerEntry_royaltyRuleId_fkey" FOREIGN KEY ("royaltyRuleId") REFERENCES "RoyaltyRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RoyaltyLedgerEntry" ADD CONSTRAINT "RoyaltyLedgerEntry_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayoutLedgerEntry" ADD CONSTRAINT "PayoutLedgerEntry_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayoutLedgerEntry" ADD CONSTRAINT "PayoutLedgerEntry_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupBonus" ADD CONSTRAINT "GroupBonus_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DesignerBonus" ADD CONSTRAINT "DesignerBonus_designerId_fkey" FOREIGN KEY ("designerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DesignerBonus" ADD CONSTRAINT "DesignerBonus_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DesignerBonus" ADD CONSTRAINT "DesignerBonus_groupBonusId_fkey" FOREIGN KEY ("groupBonusId") REFERENCES "GroupBonus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DesignerBonus" ADD CONSTRAINT "DesignerBonus_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
