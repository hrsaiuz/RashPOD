import { BillingInterval, PlanStatus, SubscriptionStatus, TenantStatus, TenantType } from "@prisma/client";

export class CreateTenantDto {
  name!: string;
  slug?: string;
  legalName?: string;
  tenantType?: TenantType;
  ownerUserId?: string;
  planId?: string;
  country?: string;
  defaultCurrency?: string;
  defaultLocale?: string;
  timezone?: string;
}

export class UpdateTenantDto {
  name?: string;
  slug?: string;
  legalName?: string | null;
  status?: TenantStatus;
  tenantType?: TenantType;
  ownerUserId?: string | null;
  country?: string;
  region?: string | null;
  defaultCurrency?: string;
  defaultLocale?: string;
  timezone?: string;
  settingsJson?: Record<string, unknown>;
}

export class SwitchTenantDto {
  tenantId!: string;
}

export class UpdateTenantSettingsDto {
  name?: string;
  legalName?: string | null;
  country?: string;
  region?: string | null;
  defaultCurrency?: string;
  defaultLocale?: string;
  timezone?: string;
  settingsJson?: Record<string, unknown>;
}

export class UpdateTenantBrandingDto {
  displayName?: string | null;
  logoUrl?: string | null;
  dashboardLogoUrl?: string | null;
  faviconUrl?: string | null;
  accentColor?: string | null;
  typographyJson?: Record<string, unknown> | null;
  footerText?: string | null;
  homepageJson?: Record<string, unknown> | null;
  socialLinksJson?: Record<string, unknown> | null;
  legalLinksJson?: Record<string, unknown> | null;
}

export class UpsertTenantMemberDto {
  userId!: string;
  roleKey!: string;
}

export class UpdateTenantMemberDto {
  roleKey?: string;
  status?: "INVITED" | "ACTIVE" | "SUSPENDED" | "REMOVED";
}

export class CreatePlanDto {
  name!: string;
  code!: string;
  status?: PlanStatus;
  currency?: string;
  billingInterval?: BillingInterval;
  price?: string | number;
  trialDays?: number;
  includedLimits?: Record<string, unknown>;
  featureFlags?: Record<string, unknown>;
}

export class UpdatePlanDto {
  name?: string;
  status?: PlanStatus;
  currency?: string;
  billingInterval?: BillingInterval;
  price?: string | number;
  trialDays?: number;
  includedLimits?: Record<string, unknown> | null;
  featureFlags?: Record<string, unknown> | null;
}

export class AssignPlanDto {
  planId!: string;
  status?: SubscriptionStatus;
  notes?: string;
}

export class CreateInvoiceDto {
  tenantId!: string;
  subscriptionId?: string;
  invoiceNumber!: string;
  amount!: string | number;
  currency?: string;
  dueDate?: string;
  lineItems?: Record<string, unknown>;
}

export class MarkInvoicePaidDto {
  paymentReference?: string;
  paidAt?: string;
}

export class UpsertEntitlementOverrideDto {
  key!: string;
  value!: unknown;
  reason?: string;
}
