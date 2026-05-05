import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { DesignStatus } from "@prisma/client";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { ModerationService } from "./moderation.service";

@Controller("moderation/designs")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission("design:moderate")
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get()
  queue() {
    return this.moderationService.reviewQueue();
  }

  @Get(":id/history")
  history(@Param("id") id: string) {
    return this.moderationService.history(id);
  }

  @Post(":id/approve")
  approve(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.moderationService.decision(user.sub, id, DesignStatus.APPROVED);
  }

  @Post(":id/reject")
  reject(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body("reason") reason?: string) {
    return this.moderationService.decision(user.sub, id, DesignStatus.REJECTED, reason);
  }

  @Post(":id/request-changes")
  requestChanges(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body("reason") reason?: string) {
    return this.moderationService.decision(user.sub, id, DesignStatus.NEEDS_FIX, reason);
  }

  @Post(":id/suspend")
  suspend(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body("reason") reason?: string) {
    return this.moderationService.decision(user.sub, id, DesignStatus.SUSPENDED, reason);
  }
}
