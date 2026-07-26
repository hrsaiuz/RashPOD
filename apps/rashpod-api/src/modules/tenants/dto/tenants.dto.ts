import { BillingInterval, PlanStatus, SubscriptionStatus, TenantStatus, TenantType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsDefined, IsEnum, IsInt, IsObject, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from "class-validator";

export class ListTenantsQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(TenantStatus)
  @IsOptional()
  status?: TenantStatus;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}

export class CreateTenantDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  legalName?: string;

  @IsEnum(TenantType)
  @IsOptional()
  tenantType?: TenantType;

  @IsUUID()
  @IsOptional()
  ownerUserId?: string;

  @IsUUID()
  @IsOptional()
  planId?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  defaultCurrency?: string;

  @IsString()
  @IsOptional()
  defaultLocale?: string;

  @IsString()
  @IsOptional()
  timezone?: string;
}

export class UpdateTenantDto {
  @IsString()
  @MaxLength(120)
  @IsOptional()
  name?: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  legalName?: string | null;

  @IsEnum(TenantStatus)
  @IsOptional()
  status?: TenantStatus;

  @IsEnum(TenantType)
  @IsOptional()
  tenantType?: TenantType;

  @IsUUID()
  @IsOptional()
  ownerUserId?: string | null;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  region?: string | null;

  @IsString()
  @IsOptional()
  defaultCurrency?: string;

  @IsString()
  @IsOptional()
  defaultLocale?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsObject()
  @IsOptional()
  settingsJson?: Record<string, unknown>;
}

export class SwitchTenantDto {
  @IsUUID()
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
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @Matches(/^[A-Z0-9_]+$/)
  code!: string;

  @IsEnum(PlanStatus)
  @IsOptional()
  status?: PlanStatus;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEnum(BillingInterval)
  @IsOptional()
  billingInterval?: BillingInterval;

  @IsOptional()
  price?: string | number;

  @IsInt()
  @Min(0)
  @IsOptional()
  trialDays?: number;

  @IsObject()
  @IsOptional()
  includedLimits?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  featureFlags?: Record<string, unknown>;
}

export class UpdatePlanDto {
  @IsString()
  @MaxLength(120)
  @IsOptional()
  name?: string;

  @IsEnum(PlanStatus)
  @IsOptional()
  status?: PlanStatus;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEnum(BillingInterval)
  @IsOptional()
  billingInterval?: BillingInterval;

  @IsOptional()
  price?: string | number;

  @IsInt()
  @Min(0)
  @IsOptional()
  trialDays?: number;

  @IsObject()
  @IsOptional()
  includedLimits?: Record<string, unknown> | null;

  @IsObject()
  @IsOptional()
  featureFlags?: Record<string, unknown> | null;
}

export class AssignPlanDto {
  @IsUUID()
  planId!: string;

  @IsEnum(SubscriptionStatus)
  @IsOptional()
  status?: SubscriptionStatus;

  @IsString()
  @IsOptional()
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
  @IsString()
  key!: string;

  @IsDefined()
  value!: unknown;

  @IsString()
  @IsOptional()
  reason?: string;
}
