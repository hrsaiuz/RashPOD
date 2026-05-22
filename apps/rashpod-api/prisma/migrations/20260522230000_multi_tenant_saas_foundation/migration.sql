CREATE TYPE "TenantStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "TenantType" AS ENUM ('RASHPOD_DEFAULT', 'PRINT_SHOP', 'BRAND', 'STOREFRONT', 'WORKSHOP_PARTNER', 'CORPORATE');
CREATE TYPE "TenantMemberStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED');
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'LEGACY', 'DISABLED');
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY', 'MANUAL');
CREATE TYPE "BillingAccountStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'SUSPENDED');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'VOID', 'OVERDUE');

CREATE TABLE "SaaSPlan" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
  "currency" TEXT NOT NULL DEFAULT 'UZS',
  "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
  "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "trialDays" INTEGER NOT NULL DEFAULT 14,
  "includedLimits" JSONB,
  "featureFlags" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SaaSPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Tenant" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "legalName" TEXT,
  "country" TEXT NOT NULL DEFAULT 'UZ',
  "region" TEXT,
  "defaultCurrency" TEXT NOT NULL DEFAULT 'UZS',
  "defaultLocale" TEXT NOT NULL DEFAULT 'uz-Latn',
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Tashkent',
  "status" "TenantStatus" NOT NULL DEFAULT 'TRIAL',
  "tenantType" "TenantType" NOT NULL DEFAULT 'PRINT_SHOP',
  "ownerUserId" TEXT,
  "planId" TEXT,
  "billingAccountId" TEXT,
  "brandingId" TEXT,
  "settingsJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantMember" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "roleKey" TEXT NOT NULL,
  "status" "TenantMemberStatus" NOT NULL DEFAULT 'ACTIVE',
  "invitedById" TEXT,
  "invitedAt" TIMESTAMP(3),
  "joinedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantEntitlementOverride" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "reason" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantEntitlementOverride_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingAccount" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "billingEmail" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "taxId" TEXT,
  "billingAddress" TEXT,
  "status" "BillingAccountStatus" NOT NULL DEFAULT 'ACTIVE',
  "paymentMethodSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
  "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "trialEndsAt" TIMESTAMP(3),
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "manualBilling" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invoice" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "invoiceNumber" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'UZS',
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "dueDate" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "lineItems" JSONB,
  "paymentReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantBranding" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "displayName" TEXT,
  "logoUrl" TEXT,
  "dashboardLogoUrl" TEXT,
  "faviconUrl" TEXT,
  "accentColor" TEXT,
  "typographyJson" JSONB,
  "footerText" TEXT,
  "homepageJson" JSONB,
  "socialLinksJson" JSONB,
  "legalLinksJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantBranding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantDomain" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "hostname" TEXT NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantDomain_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SaaSPlan_code_key" ON "SaaSPlan"("code");
CREATE INDEX "SaaSPlan_status_billingInterval_idx" ON "SaaSPlan"("status", "billingInterval");
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE UNIQUE INDEX "Tenant_billingAccountId_key" ON "Tenant"("billingAccountId");
CREATE UNIQUE INDEX "Tenant_brandingId_key" ON "Tenant"("brandingId");
CREATE INDEX "Tenant_status_tenantType_idx" ON "Tenant"("status", "tenantType");
CREATE INDEX "Tenant_ownerUserId_idx" ON "Tenant"("ownerUserId");
CREATE UNIQUE INDEX "TenantMember_tenantId_userId_key" ON "TenantMember"("tenantId", "userId");
CREATE INDEX "TenantMember_userId_status_idx" ON "TenantMember"("userId", "status");
CREATE INDEX "TenantMember_tenantId_roleKey_status_idx" ON "TenantMember"("tenantId", "roleKey", "status");
CREATE UNIQUE INDEX "TenantEntitlementOverride_tenantId_key_key" ON "TenantEntitlementOverride"("tenantId", "key");
CREATE INDEX "TenantEntitlementOverride_tenantId_idx" ON "TenantEntitlementOverride"("tenantId");
CREATE INDEX "BillingAccount_tenantId_status_idx" ON "BillingAccount"("tenantId", "status");
CREATE INDEX "Subscription_tenantId_status_idx" ON "Subscription"("tenantId", "status");
CREATE INDEX "Subscription_planId_status_idx" ON "Subscription"("planId", "status");
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE INDEX "Invoice_tenantId_status_idx" ON "Invoice"("tenantId", "status");
CREATE INDEX "Invoice_subscriptionId_idx" ON "Invoice"("subscriptionId");
CREATE INDEX "TenantBranding_tenantId_idx" ON "TenantBranding"("tenantId");
CREATE UNIQUE INDEX "TenantDomain_hostname_key" ON "TenantDomain"("hostname");
CREATE INDEX "TenantDomain_tenantId_isPrimary_idx" ON "TenantDomain"("tenantId", "isPrimary");

ALTER TABLE "UserPreferences" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "DesignAsset" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "FileAsset" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "ProductType" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "RoyaltyRule" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "BaseProduct" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "MockupTemplate" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "FilmSaleSettings" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "FilmSheetPreset" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "GangSheet" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "DeliverySetting" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "GeneratedAsset" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "CommerceListing" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "MarketplaceConfig" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Cart" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Order" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "SupportRequest" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "PaymentTransaction" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "OrderFinanceSnapshot" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "LedgerEntry" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "RoyaltyLedgerEntry" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Payout" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "PaymentReconciliation" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "ProductionJob" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "WorkshopQcEvidence" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "WorkshopIssue" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "WorkshopMobileAction" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "CorporateRequest" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "WorkerJob" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Notification" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "CrmTag" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "CrmNote" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "CrmContactLog" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "DailyMetric" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "ReportExport" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "EmailTemplate" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "DesignerApplication" ADD COLUMN "tenantId" TEXT;

INSERT INTO "SaaSPlan" ("id", "name", "code", "status", "currency", "billingInterval", "price", "trialDays", "includedLimits", "featureFlags", "createdAt", "updatedAt")
VALUES ('00000000-0000-4000-8000-000000000101', 'RashPOD Default', 'rashpod-default', 'ACTIVE', 'UZS', 'MANUAL', 0, 0, '{"designs":null,"orders":null,"users":null,"storageGb":null}'::jsonb, '{"defaultTenant":true,"whiteLabel":true,"workshopMobile":true}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "TenantBranding" ("id", "tenantId", "displayName", "accentColor", "createdAt", "updatedAt")
VALUES ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000100', 'RashPOD', '#788AE0', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "BillingAccount" ("id", "tenantId", "billingEmail", "companyName", "status", "createdAt", "updatedAt")
VALUES ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000100', 'billing@rashpod.local', 'RashPOD', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Tenant" ("id", "name", "slug", "country", "defaultCurrency", "defaultLocale", "timezone", "status", "tenantType", "ownerUserId", "planId", "billingAccountId", "brandingId", "settingsJson", "createdAt", "updatedAt")
SELECT '00000000-0000-4000-8000-000000000100', 'RashPOD', 'rashpod', 'UZ', 'UZS', 'uz-Latn', 'Asia/Tashkent', 'ACTIVE', 'RASHPOD_DEFAULT',
  (SELECT "id" FROM "User" WHERE "role" = 'SUPER_ADMIN' ORDER BY "createdAt" ASC LIMIT 1),
  '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000103',
  '{"defaultTenant":true}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Tenant" WHERE "slug" = 'rashpod');

UPDATE "TenantBranding" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "id" = '00000000-0000-4000-8000-000000000103';
UPDATE "BillingAccount" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "id" = '00000000-0000-4000-8000-000000000102';

INSERT INTO "Subscription" ("id", "tenantId", "planId", "status", "startDate", "currentPeriodStart", "manualBilling", "notes", "createdAt", "updatedAt")
VALUES ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-000000000101', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, true, 'Default RashPOD tenant bootstrap subscription.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "TenantMember" ("id", "tenantId", "userId", "roleKey", "status", "joinedAt", "createdAt", "updatedAt")
SELECT 'default-member-' || "id", '00000000-0000-4000-8000-000000000100', "id", "role"::text, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User"
ON CONFLICT ("tenantId", "userId") DO NOTHING;

UPDATE "UserPreferences" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "DesignAsset" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "FileAsset" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "ProductType" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "RoyaltyRule" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "BaseProduct" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "MockupTemplate" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "FilmSaleSettings" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "FilmSheetPreset" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "GangSheet" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "DeliverySetting" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "GeneratedAsset" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "CommerceListing" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "MarketplaceConfig" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "Cart" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "Order" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "SupportRequest" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "PaymentTransaction" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "OrderFinanceSnapshot" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "LedgerEntry" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "RoyaltyLedgerEntry" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "Payout" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "PaymentReconciliation" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "ProductionJob" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "WorkshopQcEvidence" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "WorkshopIssue" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "WorkshopMobileAction" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "CorporateRequest" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "WorkerJob" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "AnalyticsEvent" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "Notification" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "CrmTag" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "CrmNote" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "CrmContactLog" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "DailyMetric" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "ReportExport" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "AuditLog" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "EmailTemplate" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "MediaAsset" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;
UPDATE "DesignerApplication" SET "tenantId" = '00000000-0000-4000-8000-000000000100' WHERE "tenantId" IS NULL;

CREATE INDEX "UserPreferences_tenantId_idx" ON "UserPreferences"("tenantId");
CREATE INDEX "DesignAsset_tenantId_status_idx" ON "DesignAsset"("tenantId", "status");
CREATE INDEX "FileAsset_tenantId_purpose_idx" ON "FileAsset"("tenantId", "purpose");
CREATE INDEX "ProductType_tenantId_isActive_idx" ON "ProductType"("tenantId", "isActive");
CREATE INDEX "RoyaltyRule_tenantId_scope_isActive_idx" ON "RoyaltyRule"("tenantId", "scope", "isActive");
CREATE INDEX "BaseProduct_tenantId_isActive_idx" ON "BaseProduct"("tenantId", "isActive");
CREATE INDEX "MockupTemplate_tenantId_isActive_idx" ON "MockupTemplate"("tenantId", "isActive");
CREATE INDEX "FilmSaleSettings_tenantId_idx" ON "FilmSaleSettings"("tenantId");
CREATE INDEX "FilmSheetPreset_tenantId_enabled_idx" ON "FilmSheetPreset"("tenantId", "enabled");
CREATE INDEX "GangSheet_tenantId_status_idx" ON "GangSheet"("tenantId", "status");
CREATE INDEX "CommerceListing_tenantId_status_type_idx" ON "CommerceListing"("tenantId", "status", "type");
CREATE INDEX "CommerceListing_tenantId_slug_idx" ON "CommerceListing"("tenantId", "slug");
CREATE INDEX "Cart_tenantId_customerId_idx" ON "Cart"("tenantId", "customerId");
CREATE INDEX "Order_tenantId_status_createdAt_idx" ON "Order"("tenantId", "status", "createdAt");
CREATE INDEX "SupportRequest_tenantId_status_priority_createdAt_idx" ON "SupportRequest"("tenantId", "status", "priority", "createdAt");
CREATE INDEX "PaymentTransaction_tenantId_status_createdAt_idx" ON "PaymentTransaction"("tenantId", "status", "createdAt");
CREATE INDEX "OrderFinanceSnapshot_tenantId_settlementStatus_idx" ON "OrderFinanceSnapshot"("tenantId", "settlementStatus");
CREATE INDEX "LedgerEntry_tenantId_type_status_idx" ON "LedgerEntry"("tenantId", "type", "status");
CREATE INDEX "RoyaltyLedgerEntry_tenantId_status_idx" ON "RoyaltyLedgerEntry"("tenantId", "status");
CREATE INDEX "Payout_tenantId_status_idx" ON "Payout"("tenantId", "status");
CREATE INDEX "PaymentReconciliation_tenantId_status_createdAt_idx" ON "PaymentReconciliation"("tenantId", "status", "createdAt");
CREATE INDEX "ProductionJob_tenantId_status_createdAt_idx" ON "ProductionJob"("tenantId", "status", "createdAt");
CREATE INDEX "WorkshopQcEvidence_tenantId_createdAt_idx" ON "WorkshopQcEvidence"("tenantId", "createdAt");
CREATE INDEX "WorkshopIssue_tenantId_status_severity_idx" ON "WorkshopIssue"("tenantId", "status", "severity");
CREATE INDEX "WorkshopMobileAction_tenantId_actorId_createdAt_idx" ON "WorkshopMobileAction"("tenantId", "actorId", "createdAt");
CREATE INDEX "CorporateRequest_tenantId_status_createdAt_idx" ON "CorporateRequest"("tenantId", "status", "createdAt");
CREATE INDEX "WorkerJob_tenantId_type_status_idx" ON "WorkerJob"("tenantId", "type", "status");
CREATE INDEX "AnalyticsEvent_tenantId_eventType_occurredAt_idx" ON "AnalyticsEvent"("tenantId", "eventType", "occurredAt");
CREATE INDEX "Notification_tenantId_type_createdAt_idx" ON "Notification"("tenantId", "type", "createdAt");
CREATE INDEX "CrmTag_tenantId_key_idx" ON "CrmTag"("tenantId", "key");
CREATE INDEX "CrmNote_tenantId_userId_createdAt_idx" ON "CrmNote"("tenantId", "userId", "createdAt");
CREATE INDEX "CrmContactLog_tenantId_userId_contactedAt_idx" ON "CrmContactLog"("tenantId", "userId", "contactedAt");
CREATE INDEX "DailyMetric_tenantId_metricKey_date_idx" ON "DailyMetric"("tenantId", "metricKey", "date");
CREATE INDEX "ReportExport_tenantId_reportType_createdAt_idx" ON "ReportExport"("tenantId", "reportType", "createdAt");
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");
CREATE INDEX "EmailTemplate_tenantId_key_idx" ON "EmailTemplate"("tenantId", "key");
CREATE INDEX "MediaAsset_tenantId_category_isActive_idx" ON "MediaAsset"("tenantId", "category", "isActive");
CREATE INDEX "DesignerApplication_tenantId_status_submittedAt_idx" ON "DesignerApplication"("tenantId", "status", "submittedAt");

ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SaaSPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "BillingAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_brandingId_fkey" FOREIGN KEY ("brandingId") REFERENCES "TenantBranding"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TenantMember" ADD CONSTRAINT "TenantMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantMember" ADD CONSTRAINT "TenantMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantMember" ADD CONSTRAINT "TenantMember_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TenantEntitlementOverride" ADD CONSTRAINT "TenantEntitlementOverride_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantEntitlementOverride" ADD CONSTRAINT "TenantEntitlementOverride_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingAccount" ADD CONSTRAINT "BillingAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SaaSPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TenantBranding" ADD CONSTRAINT "TenantBranding_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantDomain" ADD CONSTRAINT "TenantDomain_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DesignAsset" ADD CONSTRAINT "DesignAsset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductType" ADD CONSTRAINT "ProductType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RoyaltyRule" ADD CONSTRAINT "RoyaltyRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BaseProduct" ADD CONSTRAINT "BaseProduct_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MockupTemplate" ADD CONSTRAINT "MockupTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FilmSaleSettings" ADD CONSTRAINT "FilmSaleSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FilmSheetPreset" ADD CONSTRAINT "FilmSheetPreset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GangSheet" ADD CONSTRAINT "GangSheet_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeliverySetting" ADD CONSTRAINT "DeliverySetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GeneratedAsset" ADD CONSTRAINT "GeneratedAsset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommerceListing" ADD CONSTRAINT "CommerceListing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceConfig" ADD CONSTRAINT "MarketplaceConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderFinanceSnapshot" ADD CONSTRAINT "OrderFinanceSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RoyaltyLedgerEntry" ADD CONSTRAINT "RoyaltyLedgerEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentReconciliation" ADD CONSTRAINT "PaymentReconciliation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkshopQcEvidence" ADD CONSTRAINT "WorkshopQcEvidence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkshopIssue" ADD CONSTRAINT "WorkshopIssue_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkshopMobileAction" ADD CONSTRAINT "WorkshopMobileAction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CorporateRequest" ADD CONSTRAINT "CorporateRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkerJob" ADD CONSTRAINT "WorkerJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmTag" ADD CONSTRAINT "CrmTag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmNote" ADD CONSTRAINT "CrmNote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmContactLog" ADD CONSTRAINT "CrmContactLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DailyMetric" ADD CONSTRAINT "DailyMetric_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReportExport" ADD CONSTRAINT "ReportExport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DesignerApplication" ADD CONSTRAINT "DesignerApplication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
