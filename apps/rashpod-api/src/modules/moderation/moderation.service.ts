import { Injectable, NotFoundException } from "@nestjs/common";
import { DesignStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { statusToDecision } from "./moderation-policy";

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async reviewQueue() {
    return this.prisma.designAsset.findMany({
      where: { status: DesignStatus.SUBMITTED },
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
    const updated = await this.prisma.designAsset.update({
      where: { id: designId },
      data: { status },
    });
    const latestVersion = await this.prisma.designVersion.findFirst({
      where: { designAssetId: designId },
      orderBy: { createdAt: "desc" },
    });
    const decision = statusToDecision(status);
    if (!decision) return updated;
    await this.prisma.designModerationCase.create({
      data: {
        designAssetId: designId,
        designVersionId: latestVersion?.id,
        reviewerId,
        decision,
        reason,
      },
    });
    await this.audit.log({
      actorId: reviewerId,
      action: `moderation.${status.toLowerCase()}`,
      entityType: "DesignAsset",
      entityId: designId,
      metadata: { reason, from: design.status, to: status },
    });
    return updated;
  }
}
