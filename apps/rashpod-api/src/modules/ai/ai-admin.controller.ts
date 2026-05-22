import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { AIEntityType, AIJobStatus, AIWorkflow } from "@prisma/client";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { AiService } from "./ai.service";

@Controller("admin/ai")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AiAdminController {
  constructor(private readonly ai: AiService) {}

  @Get("jobs")
  @RequirePermission("ai:jobs-read")
  listJobs(
    @Query("workflow") workflow?: AIWorkflow,
    @Query("status") status?: AIJobStatus,
    @Query("entityType") entityType?: AIEntityType,
    @Query("entityId") entityId?: string,
  ) {
    return this.ai.listJobs({ workflow, status, entityType, entityId });
  }

  @Get("jobs/:id")
  @RequirePermission("ai:jobs-read")
  getJob(@Param("id") id: string) {
    return this.ai.getJob(id);
  }

  @Post("jobs/:id/cancel")
  @RequirePermission("ai:jobs-cancel")
  cancelJob(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.ai.cancelJob(user.sub, id);
  }

  @Post("jobs/:id/retry")
  @RequirePermission("ai:jobs-run")
  retryJob(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.ai.retryJob(user.sub, id);
  }

  @Post("listings/:listingId/apply-copy")
  @RequirePermission("ai:suggestions-apply")
  applyListingCopy(@CurrentUser() user: RequestUser, @Param("listingId") listingId: string, @Body() body: { suggestionId: string; fields?: string[] }) {
    return this.ai.applyListingCopy(user.sub, listingId, body);
  }
}
