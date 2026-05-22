import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AIEntityType } from "@prisma/client";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { AiService } from "./ai.service";

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AiModerationController {
  constructor(private readonly ai: AiService) {}

  @Post("moderation/designs/:designId/ai/qa")
  @RequirePermission("ai:moderation-assist-run")
  designQa(@CurrentUser() user: RequestUser, @Param("designId") designId: string) {
    return this.ai.designQa(user.sub, designId);
  }

  @Post("moderation/designs/:designId/ai/moderation-assist")
  @RequirePermission("ai:moderation-assist-run")
  moderationAssist(@CurrentUser() user: RequestUser, @Param("designId") designId: string, @Body() body: { title?: string; description?: string }) {
    return this.ai.moderationAssist(user.sub, { ...body, designId });
  }

  @Get("moderation/designs/:designId/ai/suggestions")
  @RequirePermission("ai:jobs-read")
  suggestions(@Param("designId") designId: string) {
    return this.ai.suggestionsForEntity(AIEntityType.DESIGN, designId);
  }

  @Post("moderation/designs/:designId/ai/suggestions/:suggestionId/accept")
  @RequirePermission("ai:suggestions-apply")
  acceptSuggestion(@CurrentUser() user: RequestUser, @Param("suggestionId") suggestionId: string, @Body() body: { reason?: string }) {
    return this.ai.acceptSuggestion(user.sub, suggestionId, body.reason);
  }

  @Post("moderation/designs/:designId/ai/suggestions/:suggestionId/reject")
  @RequirePermission("ai:suggestions-reject")
  rejectSuggestion(@CurrentUser() user: RequestUser, @Param("suggestionId") suggestionId: string, @Body() body: { reason?: string }) {
    return this.ai.rejectSuggestion(user.sub, suggestionId, body.reason);
  }

  @Get("designer/designs/:designId/ai-hints")
  @RequirePermission("designer:designs-read-own")
  designerHints(@Param("designId") designId: string) {
    return this.ai.suggestionsForEntity(AIEntityType.DESIGN, designId, true);
  }
}
