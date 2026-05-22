import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { TenantStatus } from "@prisma/client";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import {
  AssignPlanDto,
  CreateInvoiceDto,
  CreatePlanDto,
  CreateTenantDto,
  MarkInvoicePaidDto,
  SwitchTenantDto,
  UpdatePlanDto,
  UpdateTenantBrandingDto,
  UpdateTenantDto,
  UpdateTenantMemberDto,
  UpdateTenantSettingsDto,
  UpsertEntitlementOverrideDto,
  UpsertTenantMemberDto,
} from "./dto/tenants.dto";
import { TenantsService } from "./tenants.service";

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller()
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get("tenants/my")
  @RequirePermission("tenant:settings:read")
  myTenants(@CurrentUser() user: RequestUser) {
    return this.tenants.myTenants(user.sub);
  }

  @Post("tenants/switch")
  @RequirePermission("tenant:settings:read")
  switchTenant(@CurrentUser() user: RequestUser, @Body() dto: SwitchTenantDto) {
    return this.tenants.switchTenant(user, dto.tenantId);
  }

  @Get("tenant/current")
  @RequirePermission("tenant:settings:read")
  current(@CurrentUser() user: RequestUser) {
    return this.tenants.currentTenant(user.sub, user.tenantId ?? user.tid);
  }

  @Patch("tenant/settings")
  @RequirePermission("tenant:settings:manage")
  updateSettings(@CurrentUser() user: RequestUser, @Body() dto: UpdateTenantSettingsDto) {
    return this.tenants.updateSettings(user.sub, this.requireTenantId(user), dto);
  }

  @Patch("tenant/branding")
  @RequirePermission("tenant:branding:manage")
  updateBranding(@CurrentUser() user: RequestUser, @Body() dto: UpdateTenantBrandingDto) {
    return this.tenants.updateBranding(user.sub, this.requireTenantId(user), dto);
  }

  @Get("tenant/members")
  @RequirePermission("tenant:members:read")
  members(@CurrentUser() user: RequestUser) {
    return this.tenants.members(user.sub, this.requireTenantId(user));
  }

  @Post("tenant/members")
  @RequirePermission("tenant:members:manage")
  upsertMember(@CurrentUser() user: RequestUser, @Body() dto: UpsertTenantMemberDto) {
    return this.tenants.upsertMember(user.sub, this.requireTenantId(user), dto);
  }

  @Patch("tenant/members/:memberId")
  @RequirePermission("tenant:members:manage")
  updateMember(@CurrentUser() user: RequestUser, @Param("memberId") memberId: string, @Body() dto: UpdateTenantMemberDto) {
    return this.tenants.updateMember(user.sub, this.requireTenantId(user), memberId, dto);
  }

  @Get("tenant/usage")
  @RequirePermission("tenant:usage:read")
  usage(@CurrentUser() user: RequestUser) {
    return this.tenants.usage(user.sub, this.requireTenantId(user));
  }

  @Get("tenant/billing")
  @RequirePermission("tenant:billing:read")
  billing(@CurrentUser() user: RequestUser) {
    return this.tenants.billing(user.sub, this.requireTenantId(user));
  }

  @Get("tenant/entitlements")
  @RequirePermission("entitlements:read")
  entitlements(@CurrentUser() user: RequestUser) {
    return this.tenants.entitlements(user.sub, this.requireTenantId(user));
  }

  @Get("super-admin/tenants")
  @RequirePermission("tenants:read-all")
  listTenants(@Query("search") search?: string, @Query("status") status?: TenantStatus) {
    return this.tenants.listTenants({ search, status });
  }

  @Post("super-admin/tenants")
  @RequirePermission("tenants:create")
  createTenant(@CurrentUser() user: RequestUser, @Body() dto: CreateTenantDto) {
    return this.tenants.createTenant(user.sub, dto);
  }

  @Get("super-admin/tenants/:tenantId")
  @RequirePermission("tenants:read-all")
  tenantDetails(@Param("tenantId") tenantId: string) {
    return this.tenants.tenantDetails(tenantId);
  }

  @Patch("super-admin/tenants/:tenantId")
  @RequirePermission("tenants:update")
  updateTenant(@CurrentUser() user: RequestUser, @Param("tenantId") tenantId: string, @Body() dto: UpdateTenantDto) {
    return this.tenants.updateTenant(user.sub, tenantId, dto);
  }

  @Post("super-admin/tenants/:tenantId/suspend")
  @RequirePermission("tenants:suspend")
  suspendTenant(@CurrentUser() user: RequestUser, @Param("tenantId") tenantId: string) {
    return this.tenants.setTenantStatus(user.sub, tenantId, "SUSPENDED");
  }

  @Post("super-admin/tenants/:tenantId/reactivate")
  @RequirePermission("tenants:suspend")
  reactivateTenant(@CurrentUser() user: RequestUser, @Param("tenantId") tenantId: string) {
    return this.tenants.setTenantStatus(user.sub, tenantId, "ACTIVE");
  }

  @Post("super-admin/tenants/:tenantId/plan")
  @RequirePermission("tenants:assign-plan")
  assignPlan(@CurrentUser() user: RequestUser, @Param("tenantId") tenantId: string, @Body() dto: AssignPlanDto) {
    return this.tenants.assignPlan(user.sub, tenantId, dto);
  }

  @Post("super-admin/tenants/:tenantId/entitlements")
  @RequirePermission("entitlements:override")
  overrideEntitlement(@CurrentUser() user: RequestUser, @Param("tenantId") tenantId: string, @Body() dto: UpsertEntitlementOverrideDto) {
    return this.tenants.upsertEntitlementOverride(user.sub, tenantId, dto);
  }

  @Get("super-admin/plans")
  @RequirePermission("tenants:read-all")
  plans() {
    return this.tenants.listPlans();
  }

  @Post("super-admin/plans")
  @RequirePermission("plans:manage")
  createPlan(@CurrentUser() user: RequestUser, @Body() dto: CreatePlanDto) {
    return this.tenants.createPlan(user.sub, dto);
  }

  @Patch("super-admin/plans/:planId")
  @RequirePermission("plans:manage")
  updatePlan(@CurrentUser() user: RequestUser, @Param("planId") planId: string, @Body() dto: UpdatePlanDto) {
    return this.tenants.updatePlan(user.sub, planId, dto);
  }

  @Post("super-admin/invoices")
  @RequirePermission("billing:manage-all")
  createInvoice(@CurrentUser() user: RequestUser, @Body() dto: CreateInvoiceDto) {
    return this.tenants.createInvoice(user.sub, dto);
  }

  @Post("super-admin/invoices/:invoiceId/mark-paid")
  @RequirePermission("billing:manage-all")
  markInvoicePaid(@CurrentUser() user: RequestUser, @Param("invoiceId") invoiceId: string, @Body() dto: MarkInvoicePaidDto) {
    return this.tenants.markInvoicePaid(user.sub, invoiceId, dto);
  }

  @Get("super-admin/tenant-health")
  @RequirePermission("tenant-health:read-all")
  tenantHealth() {
    return this.tenants.tenantHealth();
  }

  private requireTenantId(user: RequestUser) {
    return user.tenantId ?? user.tid ?? "";
  }
}
