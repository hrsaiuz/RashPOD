import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { DesignWorkflowService } from "./design-workflow.service";
import { MockupEditorContextQueryDto } from "./dto/mockup-editor-context-query.dto";
import { PrintfulMockupEditorContextQueryDto } from "./dto/printful-mockup-editor-context-query.dto";
import { PrintfulMockupPreviewDto } from "./dto/printful-mockup-preview.dto";
import { SubmitModerationDecisionDto } from "./dto/moderation-decision.dto";
import { SuggestPrintfulPlacementDto } from "./dto/suggest-printful-placement.dto";

@Controller("admin/designs")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DesignWorkflowController {
  constructor(private readonly workflow: DesignWorkflowService) {}

  @Get("moderation-queue")
  @RequirePermission("design:moderate")
  moderationQueue(@Query("status") status?: string, @Query("q") q?: string) {
    return this.workflow.moderationQueue({ status, q });
  }

  @Get("printful/mockup-tasks/:taskKey")
  @RequirePermission("design:moderate")
  printfulMockupTask(@Param("taskKey") taskKey: string) {
    return this.workflow.getPrintfulMockupTask(taskKey);
  }

  @Get(":id/moderation-detail")
  @RequirePermission("design:moderate")
  moderationDetail(@Param("id") id: string) {
    return this.workflow.moderationDetail(id);
  }

  @Get(":id/mockup-editor-context")
  @RequirePermission("design:moderate")
  mockupEditorContext(@Param("id") id: string, @Query() query: MockupEditorContextQueryDto) {
    return this.workflow.mockupEditorContext(id, query);
  }

  @Get(":id/printful-mockup-editor-context")
  @RequirePermission("design:moderate")
  printfulMockupEditorContext(@Param("id") id: string, @Query() query: PrintfulMockupEditorContextQueryDto) {
    return this.workflow.printfulMockupEditorContext(id, query);
  }

  @Post(":id/suggest-printful-placement")
  @RequirePermission("design:moderate")
  suggestPrintfulPlacement(@Param("id") id: string, @Body() dto: SuggestPrintfulPlacementDto) {
    return this.workflow.suggestPrintfulPlacement(id, dto);
  }

  @Post(":id/printful-mockup-preview")
  @RequirePermission("design:moderate")
  printfulMockupPreview(@Param("id") id: string, @Body() dto: PrintfulMockupPreviewDto) {
    return this.workflow.createPrintfulMockupPreview(id, dto);
  }

  @Post(":id/moderation-decision")
  @RequirePermission("design:moderate")
  moderationDecision(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: SubmitModerationDecisionDto) {
    return this.workflow.submitModerationDecision(user, id, dto);
  }

  @Get(":id/workflow")
  @RequirePermission("design:moderate")
  workflowStatus(@Param("id") id: string) {
    return this.workflow.workflow(id);
  }
}
