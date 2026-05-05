import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { AdminOpsService } from "./admin-ops.service";
import { CreateEmailTemplateDto } from "./dto/create-email-template.dto";
import { TestEmailTemplateDto } from "./dto/test-email-template.dto";
import { UpdateAdminSettingsDto } from "./dto/update-admin-settings.dto";
import { UpdateAiSettingsDto } from "./dto/update-ai-settings.dto";
import { UpdateEmailTemplateDto } from "./dto/update-email-template.dto";

@Controller("admin")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminOpsController {
  constructor(private readonly adminOps: AdminOpsService) {}

  @Get("settings")
  @RequirePermission("admin-settings:manage")
  getSettings() {
    return this.adminOps.getSettings();
  }

  @Patch("settings")
  @RequirePermission("admin-settings:manage")
  updateSettings(@CurrentUser() user: RequestUser, @Body() dto: UpdateAdminSettingsDto) {
    return this.adminOps.updateSettings(user.sub, dto);
  }

  @Get("email-templates")
  @RequirePermission("email-templates:manage")
  listEmailTemplates() {
    return this.adminOps.listEmailTemplates();
  }

  @Post("email-templates")
  @RequirePermission("email-templates:manage")
  createEmailTemplate(@CurrentUser() user: RequestUser, @Body() dto: CreateEmailTemplateDto) {
    return this.adminOps.createEmailTemplate(user.sub, dto);
  }

  @Patch("email-templates/:id")
  @RequirePermission("email-templates:manage")
  updateEmailTemplate(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateEmailTemplateDto) {
    return this.adminOps.updateEmailTemplate(user.sub, id, dto);
  }

  @Post("email-templates/:id/test")
  @RequirePermission("email-templates:manage")
  testEmailTemplate(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: TestEmailTemplateDto) {
    return this.adminOps.testEmailTemplate(user.sub, id, dto);
  }

  @Get("ai-settings")
  @RequirePermission("ai-settings:manage")
  getAiSettings() {
    return this.adminOps.getAiSettings();
  }

  @Patch("ai-settings")
  @RequirePermission("ai-settings:manage")
  updateAiSettings(@CurrentUser() user: RequestUser, @Body() dto: UpdateAiSettingsDto) {
    return this.adminOps.updateAiSettings(user.sub, dto);
  }

  @Get("audit-logs")
  @RequirePermission("audit-logs:read")
  listAuditLogs(
    @Query("actorId") actorId?: string,
    @Query("action") action?: string,
    @Query("entityType") entityType?: string,
    @Query("entityId") entityId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.adminOps.listAuditLogs({
      actorId,
      action,
      entityType,
      entityId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("audit-logs/:id")
  @RequirePermission("audit-logs:read")
  getAuditLog(@Param("id") id: string) {
    return this.adminOps.getAuditLog(id);
  }
}
