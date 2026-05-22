import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Prisma, TenantStatus, UserRole } from "@prisma/client";
import { AuthSessionStore } from "../auth/auth-session.store";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import {
  AssignPlanDto,
  CreateInvoiceDto,
  CreatePlanDto,
  CreateTenantDto,
  MarkInvoicePaidDto,
  UpdatePlanDto,
  UpdateTenantBrandingDto,
  UpdateTenantDto,
  UpdateTenantMemberDto,
  UpdateTenantSettingsDto,
  UpsertEntitlementOverrideDto,
  UpsertTenantMemberDto,
} from "./dto/tenants.dto";

const DEFAULT_TENANT_SLUG = "rashpod";
const ACTIVE_TENANT_STATUSES: TenantStatus[] = ["TRIAL", "ACTIVE", "PAST_DUE"];

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
  ) {}

  async myTenants(userId: string) {
    await this.ensureDefaultMembership(userId);
    const memberships = await this.prisma.tenantMember.findMany({
      where: { userId, status: { not: "REMOVED" } },
      include: { tenant: { include: { plan: true, branding: true, domains: true } } },
      orderBy: { createdAt: "asc" },
    });
    return { items: memberships };
  }

  async currentTenant(userId: string, tenantId?: string) {
    const tenant = tenantId
      ? await this.requireTenantMembership(userId, tenantId)
      : await this.resolveDefaultTenantForUser(userId);
    return this.tenantDetails(tenant.id);
  }

  async switchTenant(user: { sub: string; role: string; email: string }, tenantId: string) {
    const tenant = await this.requireTenantMembership(user.sub, tenantId);
    if (tenant.status === "SUSPENDED" || tenant.status === "ARCHIVED") {
      throw new ForbiddenException("Tenant is not available");
    }
    const sessionVersion = AuthSessionStore.getSessionVersion(user.sub);
    const accessToken = await this.jwtService.signAsync(
      { sub: user.sub, role: user.role, email: user.email, sv: sessionVersion, tid: tenant.id },
      { secret: process.env.JWT_SECRET || "rashpod-dev-secret", expiresIn: "7d" },
    );
    await this.audit.log({ actorId: user.sub, action: "tenant.switch", entityType: "Tenant", entityId: tenant.id });
    return { accessToken, tenant };
  }

  async updateSettings(actorId: string, tenantId: string, dto: UpdateTenantSettingsDto) {
    const tenant = await this.requireTenantMembership(actorId, tenantId);
    const updated = await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        name: dto.name,
        legalName: dto.legalName,
        country: dto.country,
        region: dto.region,
        defaultCurrency: dto.defaultCurrency,
        defaultLocale: dto.defaultLocale,
        timezone: dto.timezone,
        settingsJson: dto.settingsJson as Prisma.InputJsonValue | undefined,
      },
    });
    await this.audit.log({ actorId, action: "tenant.settings.update", entityType: "Tenant", entityId: tenant.id });
    return updated;
  }

  async updateBranding(actorId: string, tenantId: string, dto: UpdateTenantBrandingDto) {
    const tenant = await this.requireTenantMembership(actorId, tenantId);
    const existing = await this.prisma.tenantBranding.findFirst({ where: { tenantId: tenant.id } });
    const data = {
      displayName: dto.displayName,
      logoUrl: dto.logoUrl,
      dashboardLogoUrl: dto.dashboardLogoUrl,
      faviconUrl: dto.faviconUrl,
      accentColor: dto.accentColor,
      typographyJson: dto.typographyJson as Prisma.InputJsonValue | undefined,
      footerText: dto.footerText,
      homepageJson: dto.homepageJson as Prisma.InputJsonValue | undefined,
      socialLinksJson: dto.socialLinksJson as Prisma.InputJsonValue | undefined,
      legalLinksJson: dto.legalLinksJson as Prisma.InputJsonValue | undefined,
    };
    const branding = existing
      ? await this.prisma.tenantBranding.update({ where: { id: existing.id }, data })
      : await this.prisma.tenantBranding.create({ data: { tenantId: tenant.id, ...data } });
    await this.prisma.tenant.update({ where: { id: tenant.id }, data: { brandingId: branding.id } });
    await this.audit.log({ actorId, action: "tenant.branding.update", entityType: "TenantBranding", entityId: branding.id });
    return branding;
  }

  async members(userId: string, tenantId: string) {
    const tenant = await this.requireTenantMembership(userId, tenantId);
    return this.prisma.tenantMember.findMany({
      where: { tenantId: tenant.id, status: { not: "REMOVED" } },
      include: { user: { select: { id: true, email: true, displayName: true, role: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  async upsertMember(actorId: string, tenantId: string, dto: UpsertTenantMemberDto) {
    const tenant = await this.requireTenantMembership(actorId, tenantId);
    const member = await this.prisma.tenantMember.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: dto.userId } },
      create: { tenantId: tenant.id, userId: dto.userId, roleKey: dto.roleKey, status: "ACTIVE", invitedById: actorId, invitedAt: new Date(), joinedAt: new Date() },
      update: { roleKey: dto.roleKey, status: "ACTIVE" },
    });
    await this.audit.log({ actorId, action: "tenant.member.upsert", entityType: "TenantMember", entityId: member.id });
    return member;
  }

  async updateMember(actorId: string, tenantId: string, memberId: string, dto: UpdateTenantMemberDto) {
    const tenant = await this.requireTenantMembership(actorId, tenantId);
    const existing = await this.prisma.tenantMember.findFirst({ where: { id: memberId, tenantId: tenant.id } });
    if (!existing) throw new NotFoundException("Tenant member not found");
    const member = await this.prisma.tenantMember.update({ where: { id: memberId }, data: { roleKey: dto.roleKey, status: dto.status } });
    await this.audit.log({ actorId, action: "tenant.member.update", entityType: "TenantMember", entityId: member.id });
    return member;
  }

  async usage(userId: string, tenantId: string) {
    const tenant = await this.requireTenantMembership(userId, tenantId);
    const [users, designs, listings, orders, productionJobs, storage] = await Promise.all([
      this.prisma.tenantMember.count({ where: { tenantId: tenant.id, status: "ACTIVE" } }),
      this.prisma.designAsset.count({ where: { tenantId: tenant.id } }),
      this.prisma.commerceListing.count({ where: { tenantId: tenant.id } }),
      this.prisma.order.count({ where: { tenantId: tenant.id } }),
      this.prisma.productionJob.count({ where: { tenantId: tenant.id } }),
      this.prisma.fileAsset.aggregate({ where: { tenantId: tenant.id }, _sum: { sizeBytes: true } }),
    ]);
    return { tenantId: tenant.id, users, designs, listings, orders, productionJobs, storageBytes: storage._sum.sizeBytes ?? 0 };
  }

  async billing(userId: string, tenantId: string) {
    const tenant = await this.requireTenantMembership(userId, tenantId);
    return this.prisma.tenant.findUnique({
      where: { id: tenant.id },
      include: { plan: true, billingAccount: true, subscriptions: { orderBy: { createdAt: "desc" }, take: 5 }, invoices: { orderBy: { createdAt: "desc" }, take: 20 } },
    });
  }

  async entitlements(userId: string, tenantId: string) {
    const tenant = await this.requireTenantMembership(userId, tenantId);
    const full = await this.prisma.tenant.findUnique({
      where: { id: tenant.id },
      include: { plan: true, entitlementOverrides: true },
    });
    return {
      plan: full?.plan,
      includedLimits: full?.plan?.includedLimits ?? {},
      featureFlags: full?.plan?.featureFlags ?? {},
      overrides: full?.entitlementOverrides ?? [],
    };
  }

  async listTenants(filters: { search?: string; status?: TenantStatus }) {
    return this.prisma.tenant.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.search ? { OR: [{ name: { contains: filters.search, mode: "insensitive" } }, { slug: { contains: filters.search, mode: "insensitive" } }] } : {}),
      },
      include: { plan: true, billingAccount: true, branding: true, _count: { select: { members: true, orders: true, commerceListings: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async createTenant(actorId: string, dto: CreateTenantDto) {
    const slug = dto.slug ?? this.slugify(dto.name);
    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug,
        legalName: dto.legalName,
        tenantType: dto.tenantType ?? "PRINT_SHOP",
        ownerUserId: dto.ownerUserId,
        planId: dto.planId,
        country: dto.country ?? "UZ",
        defaultCurrency: dto.defaultCurrency ?? "UZS",
        defaultLocale: dto.defaultLocale ?? "uz-Latn",
        timezone: dto.timezone ?? "Asia/Tashkent",
      },
    });
    if (dto.ownerUserId) {
      await this.prisma.tenantMember.upsert({
        where: { tenantId_userId: { tenantId: tenant.id, userId: dto.ownerUserId } },
        create: { tenantId: tenant.id, userId: dto.ownerUserId, roleKey: UserRole.ADMIN, status: "ACTIVE", invitedById: actorId, joinedAt: new Date() },
        update: { status: "ACTIVE", roleKey: UserRole.ADMIN },
      });
    }
    await this.audit.log({ actorId, action: "tenant.create", entityType: "Tenant", entityId: tenant.id });
    return tenant;
  }

  async tenantDetails(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { plan: true, billingAccount: true, branding: true, domains: true, subscriptions: { orderBy: { createdAt: "desc" }, take: 3 }, entitlementOverrides: true },
    });
    if (!tenant) throw new NotFoundException("Tenant not found");
    return tenant;
  }

  async updateTenant(actorId: string, tenantId: string, dto: UpdateTenantDto) {
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: dto.name,
        slug: dto.slug,
        legalName: dto.legalName,
        status: dto.status,
        tenantType: dto.tenantType,
        ownerUserId: dto.ownerUserId,
        country: dto.country,
        region: dto.region,
        defaultCurrency: dto.defaultCurrency,
        defaultLocale: dto.defaultLocale,
        timezone: dto.timezone,
        settingsJson: dto.settingsJson as Prisma.InputJsonValue | undefined,
      },
    });
    await this.audit.log({ actorId, action: "tenant.update", entityType: "Tenant", entityId: tenant.id });
    return tenant;
  }

  async setTenantStatus(actorId: string, tenantId: string, status: TenantStatus) {
    const tenant = await this.prisma.tenant.update({ where: { id: tenantId }, data: { status } });
    await this.audit.log({ actorId, action: `tenant.${status.toLowerCase()}`, entityType: "Tenant", entityId: tenant.id });
    return tenant;
  }

  async listPlans() {
    return this.prisma.saaSPlan.findMany({ orderBy: [{ status: "asc" }, { price: "asc" }] });
  }

  async createPlan(actorId: string, dto: CreatePlanDto) {
    const plan = await this.prisma.saaSPlan.create({
      data: {
        name: dto.name,
        code: dto.code,
        status: dto.status ?? "ACTIVE",
        currency: dto.currency ?? "UZS",
        billingInterval: dto.billingInterval ?? "MONTHLY",
        price: dto.price ?? 0,
        trialDays: dto.trialDays ?? 14,
        includedLimits: dto.includedLimits as Prisma.InputJsonValue | undefined,
        featureFlags: dto.featureFlags as Prisma.InputJsonValue | undefined,
      },
    });
    await this.audit.log({ actorId, action: "plan.create", entityType: "SaaSPlan", entityId: plan.id });
    return plan;
  }

  async updatePlan(actorId: string, planId: string, dto: UpdatePlanDto) {
    const plan = await this.prisma.saaSPlan.update({
      where: { id: planId },
      data: {
        name: dto.name,
        status: dto.status,
        currency: dto.currency,
        billingInterval: dto.billingInterval,
        price: dto.price,
        trialDays: dto.trialDays,
        includedLimits: dto.includedLimits as Prisma.InputJsonValue | undefined,
        featureFlags: dto.featureFlags as Prisma.InputJsonValue | undefined,
      },
    });
    await this.audit.log({ actorId, action: "plan.update", entityType: "SaaSPlan", entityId: plan.id });
    return plan;
  }

  async assignPlan(actorId: string, tenantId: string, dto: AssignPlanDto) {
    const subscription = await this.prisma.subscription.create({
      data: { tenantId, planId: dto.planId, status: dto.status ?? "ACTIVE", currentPeriodStart: new Date(), manualBilling: true, notes: dto.notes },
    });
    await this.prisma.tenant.update({ where: { id: tenantId }, data: { planId: dto.planId } });
    await this.audit.log({ actorId, action: "tenant.plan.assign", entityType: "Subscription", entityId: subscription.id });
    return subscription;
  }

  async createInvoice(actorId: string, dto: CreateInvoiceDto) {
    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId: dto.tenantId,
        subscriptionId: dto.subscriptionId,
        invoiceNumber: dto.invoiceNumber,
        amount: dto.amount,
        currency: dto.currency ?? "UZS",
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        lineItems: dto.lineItems as Prisma.InputJsonValue | undefined,
      },
    });
    await this.audit.log({ actorId, action: "invoice.create", entityType: "Invoice", entityId: invoice.id });
    return invoice;
  }

  async markInvoicePaid(actorId: string, invoiceId: string, dto: MarkInvoicePaidDto) {
    const invoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "PAID", paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(), paymentReference: dto.paymentReference },
    });
    await this.audit.log({ actorId, action: "invoice.mark-paid", entityType: "Invoice", entityId: invoice.id });
    return invoice;
  }

  async upsertEntitlementOverride(actorId: string, tenantId: string, dto: UpsertEntitlementOverrideDto) {
    const item = await this.prisma.tenantEntitlementOverride.upsert({
      where: { tenantId_key: { tenantId, key: dto.key } },
      create: { tenantId, key: dto.key, value: dto.value as Prisma.InputJsonValue, reason: dto.reason, createdById: actorId },
      update: { value: dto.value as Prisma.InputJsonValue, reason: dto.reason, createdById: actorId },
    });
    await this.audit.log({ actorId, action: "tenant.entitlement.override", entityType: "TenantEntitlementOverride", entityId: item.id });
    return item;
  }

  async tenantHealth() {
    const tenants = await this.prisma.tenant.findMany({
      include: { plan: true, _count: { select: { members: true, orders: true, productionJobs: true, invoices: true } } },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      plan: tenant.plan?.code ?? null,
      counts: tenant._count,
      attention: tenant.status === "PAST_DUE" || tenant.status === "SUSPENDED" || tenant._count.invoices > 0,
    }));
  }

  private async requireTenantMembership(userId: string, tenantId: string) {
    const membership = await this.prisma.tenantMember.findFirst({
      where: { userId, tenantId, status: "ACTIVE", tenant: { status: { in: ACTIVE_TENANT_STATUSES } } },
      include: { tenant: true },
    });
    if (!membership) throw new ForbiddenException("Tenant membership required");
    return membership.tenant;
  }

  private async resolveDefaultTenantForUser(userId: string) {
    const membership = await this.prisma.tenantMember.findFirst({
      where: { userId, status: "ACTIVE", tenant: { status: { in: ACTIVE_TENANT_STATUSES } } },
      include: { tenant: true },
      orderBy: { createdAt: "asc" },
    });
    if (membership) return membership.tenant;
    return this.ensureDefaultMembership(userId);
  }

  private async ensureDefaultMembership(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) throw new ForbiddenException("User not found");
    let tenant = await this.prisma.tenant.findUnique({ where: { slug: DEFAULT_TENANT_SLUG } });
    if (!tenant) {
      const plan = await this.prisma.saaSPlan.upsert({
        where: { code: "rashpod-default" },
        create: { name: "RashPOD Default", code: "rashpod-default", billingInterval: "MANUAL", trialDays: 0 },
        update: {},
      });
      tenant = await this.prisma.tenant.create({ data: { name: "RashPOD", slug: DEFAULT_TENANT_SLUG, status: "ACTIVE", tenantType: "RASHPOD_DEFAULT", planId: plan.id } });
    }
    await this.prisma.tenantMember.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId } },
      create: { tenantId: tenant.id, userId, roleKey: user.role, status: "ACTIVE", joinedAt: new Date() },
      update: { roleKey: user.role, status: "ACTIVE" },
    });
    return tenant;
  }

  private slugify(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 64) || "tenant";
  }
}
