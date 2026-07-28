import { Injectable, NotFoundException } from "@nestjs/common";
import { DesignStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { DesignStoriesService, type DesignStoryModerationSyncResult } from "../design-stories/design-stories.service";
import { statusToDecision } from "./moderation-policy";

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly designStories: DesignStoriesService,
  ) {}

  async reviewQueue() {
    return this.prisma.designAsset.findMany({
      where: { status: { in: [DesignStatus.SUBMITTED, DesignStatus.PENDING_MODERATION] } },
      orderBy: { updatedAt: "asc" },
    });
  }

  async history(designId: string) {
    return this.prisma.designModerationCase.findMany({
      where: { designAssetId: designId },
      orderBy: { createdAt: "desc" },
    });
  }

  async decision(reviewerId: string, designId: string, status: DesignStatus, reason?: string) {
    const design = await this.prisma.designAsset.findUnique({ where: { id: designId } });
    if (!design) throw new NotFoundException("Design not found");
    const decision = statusToDecision(status);
    const { updated, storyModeration } = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.designAsset.update({
        where: { id: designId },
        data: { status },
      });
      if (!decision) return { updated, storyModeration: null };
      const latestVersion = await tx.designVersion.findFirst({
        where: { designAssetId: designId },
        orderBy: { createdAt: "desc" },
      });
      await tx.designModerationCase.create({
        data: {
          designAssetId: designId,
          designVersionId: latestVersion?.id,
          reviewerId,
          decision,
          reason,
        },
      });
      const storyModeration = await this.designStories.syncWithDesignDecision(
        tx,
        reviewerId,
        designId,
        status === DesignStatus.APPROVED ? "APPROVE" : "REJECT",
        reason,
      );
      return { updated, storyModeration };
    });
    await this.audit.log({
      actorId: reviewerId,
      action: `moderation.${status.toLowerCase()}`,
      entityType: "DesignAsset",
      entityId: designId,
      metadata: { reason, from: design.status, to: status },
    });
    await this.auditStoryModeration(reviewerId, designId, storyModeration);
    return updated;
  }

  private async auditStoryModeration(
    actorId: string,
    designId: string,
    result: DesignStoryModerationSyncResult | null,
  ) {
    if (!result) return;
    await this.audit.log({
      actorId,
      action: result.action === "approved"
        ? "design-story.publish.approved"
        : result.action === "unpublished"
          ? "design-story.unpublished"
          : "design-story.publish.rejected",
      entityType: "DesignStory",
      entityId: result.storyId,
      metadata: {
        designAssetId: designId,
        slug: result.slug,
        synchronizedWithDesignDecision: true,
        ...(result.notes ? { notes: result.notes } : {}),
      },
    });
  }
}
