import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { UserRole, DesignerStatus } from "@prisma/client";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { PermissionKey } from "../../common/auth/permissions";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { UpdateAdminSettingsDto } from "../admin-ops/dto/update-admin-settings.dto";
import { SuperAdminPlatformService } from "./super-admin-platform.service";

@Controller("super-admin")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SuperAdminPlatformController {
  constructor(private readonly service: SuperAdminPlatformService) {}

  @Get("rbac/permissions")
  @RequirePermission("super-admin:rbac-manage")
  getPermissions() {
    return this.service.getPermissionsMatrix();
  }

  @Patch("rbac/permissions")
  @RequirePermission("super-admin:rbac-manage")
  updatePermissions(@CurrentUser() user: RequestUser, @Body() body: { overrides: Partial<Record<PermissionKey, UserRole[]>> }) {
    return this.service.updatePermissions(user.sub, body.overrides ?? {});
  }

  @Get("users")
  @RequirePermission("super-admin:users-manage")
  listUsers(
    @Query("search") search?: string,
    @Query("role") role?: UserRole,
    @Query("limit") limit?: string,
    @Query("page") page?: string,
  ) {
    return this.service.listUsers({ search, role, limit: limit ? Number(limit) : undefined, page: page ? Number(page) : undefined });
  }

  @Patch("users/:id/role")
  @RequirePermission("super-admin:users-manage")
  updateUserRole(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: { role: UserRole }) {
    return this.service.updateUserRole(user.sub, id, body.role);
  }

  @Patch("users/:id/designer-status")
  @RequirePermission("super-admin:users-manage")
  updateDesignerStatus(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: { designerStatus: DesignerStatus }) {
    return this.service.updateDesignerStatus(user.sub, id, body.designerStatus);
  }

  @Get("secrets")
  @RequirePermission("super-admin:secrets-manage")
  listSecrets() {
    return this.service.listSecrets();
  }

  @Post("secrets")
  @RequirePermission("super-admin:secrets-manage")
  createSecret(@CurrentUser() user: RequestUser, @Body() body: { name: string; envVar: string; secretManagerRef?: string; service: string; lastRotatedAt?: string; notes?: string }) {
    return this.service.createSecret(user.sub, body);
  }

  @Patch("secrets/:id")
  @RequirePermission("super-admin:secrets-manage")
  updateSecret(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: { name?: string; envVar?: string; secretManagerRef?: string; service?: string; lastRotatedAt?: string; notes?: string }) {
    return this.service.updateSecret(user.sub, id, body);
  }

  @Delete("secrets/:id")
  @RequirePermission("super-admin:secrets-manage")
  deleteSecret(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.service.deleteSecret(user.sub, id);
  }

  @Get("system/settings")
  @RequirePermission("super-admin:system-manage")
  getSystemSettings() {
    return this.service.getSystemSettings();
  }

  @Patch("system/settings")
  @RequirePermission("super-admin:system-manage")
  updateSystemSettings(@CurrentUser() user: RequestUser, @Body() dto: UpdateAdminSettingsDto) {
    return this.service.updateSystemSettings(user.sub, dto);
  }

  @Get("system/health")
  @RequirePermission("super-admin:system-manage")
  getSystemHealth() {
    return this.service.getSystemHealth();
  }
}
