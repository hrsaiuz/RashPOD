import { Body, Controller, Get, Param, Post, Query, Res, StreamableFile, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { DesignStoriesService } from "../design-stories/design-stories.service";
import { RejectDesignStoryDto } from "../design-stories/dto/design-story.dto";
import { DesignWorkflowService } from "./design-workflow.service";
import { MockupEditorContextQueryDto } from "./dto/mockup-editor-context-query.dto";
import { PrintfulMockupEditorContextQueryDto } from "./dto/printful-mockup-editor-context-query.dto";
import { PrintfulMockupPreviewDto } from "./dto/printful-mockup-preview.dto";
import { SubmitModerationDecisionDto } from "./dto/moderation-decision.dto";
import { SuggestPrintfulPlacementDto } from "./dto/suggest-printful-placement.dto";

@Controller("admin/designs")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DesignWorkflowController {
  constructor(
    private readonly workflow: DesignWorkflowService,
    private readonly designStories: DesignStoriesService,
  ) {}

  @Get("moderation-queue")
  @RequirePermission("design:moderate")
  moderationQueue(
    @Query("status") status?: string,
    @Query("q") q?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const parsedPage = page ? Number.parseInt(page, 10) : undefined;
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    return this.workflow.moderationQueue({
      status,
      q,
      page: Number.isFinite(parsedPage) ? parsedPage : undefined,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });
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

  @Get("mockup-assets/:assetId/content")
  @RequirePermission("design:moderate")
  async mockupAssetContent(@Param("assetId") assetId: string, @Res({ passthrough: true }) response: Response) {
    const asset = await this.workflow.mockupAssetContent(assetId);
    response.setHeader("Content-Type", asset.contentType);
    response.setHeader("Cache-Control", "private, max-age=300");
    return new StreamableFile(asset.buffer);
  }

  @Get(":id/mockup-status")
  @RequirePermission("design:moderate")
  mockupStatus(@Param("id") id: string) {
    return this.workflow.mockupStatus(id);
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

  @Get(":id/story-review")
  @RequirePermission("design:moderate")
  storyReview(@Param("id") id: string) {
    return this.designStories.getReviewStory(id);
  }

  @Post(":id/story-approve")
  @RequirePermission("design:moderate")
  approveStory(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.designStories.approvePublish(user.sub, id);
  }

  @Post(":id/story-reject")
  @RequirePermission("design:moderate")
  rejectStory(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: RejectDesignStoryDto) {
    return this.designStories.rejectPublish(user.sub, id, dto.notes);
  }

  @Post(":id/story-unpublish")
  @RequirePermission("design:moderate")
  unpublishStory(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.designStories.unpublish(user.sub, id);
  }
}
