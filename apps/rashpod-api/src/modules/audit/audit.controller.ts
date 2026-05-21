import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { AuditService } from "./audit.service";

@Controller("admin/audit-logs")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission("audit-logs:read")
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(
    @Query("actorId") actorId?: string,
    @Query("action") action?: string,
    @Query("entityType") entityType?: string,
    @Query("entityId") entityId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.audit.query({
      actorId,
      action,
      entityType,
      entityId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}