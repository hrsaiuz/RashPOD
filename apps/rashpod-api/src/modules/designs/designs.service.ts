import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { DesignStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateDesignDto } from "./dto/create-design.dto";
import { CreateDesignVersionDto } from "./dto/create-design-version.dto";

@Injectable()
export class DesignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(designerId: string, dto: CreateDesignDto) {
    const design = await this.prisma.designAsset.create({
      data: {
        designerId,
        title: dto.title,
        description: dto.description,
      },
    });
    await this.prisma.commercialRights.create({
      data: { designAssetId: design.id, allowProductSales: false, allowFilmSales: false },
    });
    await this.audit.log({
      actorId: designerId,
      action: "design.create",
      entityType: "DesignAsset",
      entityId: design.id,
    });
    return design;
  }

  async listOwn(designerId: string) {
    return this.prisma.designAsset.findMany({
      where: { designerId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getOwn(designerId: string, designId: string) {
    const design = await this.prisma.designAsset.findUnique({
      where: { id: designId },
      include: {
        versions: { orderBy: { createdAt: "desc" }, take: 5 },
        moderationAudits: { orderBy: { createdAt: "desc" }, take: 10 },
        productSelections: { include: { mockupAssets: true, localBaseProduct: true, printfulProductTemplate: true, placementPreset: true } },
        listings: { include: { marketplacePublications: true } },
      },
    });
    if (!design) throw new NotFoundException("Design not found");
    if (design.designerId !== designerId) throw new ForbiddenException("Not your design");
    return {
      ...design,
      versions: design.versions.map((version) => ({
        id: version.id,
        designAssetId: version.designAssetId,
        widthPx: version.widthPx,
        heightPx: version.heightPx,
        dpi: version.dpi,
        hasTransparency: version.hasTransparency,
        createdAt: version.createdAt,
      })),
      moderationAudits: design.moderationAudits.map((audit) => ({
        id: audit.id,
        designId: audit.designId,
        decision: audit.decision,
        predefinedReasons: audit.predefinedReasons,
        customReason: audit.customReason,
        beforeStatus: audit.beforeStatus,
        afterStatus: audit.afterStatus,
        createdAt: audit.createdAt,
      })),
      productSelections: design.productSelections.map((selection) => ({
        ...selection,
        mockupAssets: selection.mockupAssets.map((asset) => ({
          id: asset.id,
          mockupType: asset.mockupType,
          status: asset.status,
          imageUrl: asset.imageUrl,
          thumbnailUrl: asset.thumbnailUrl,
          failureReason: asset.failureReason,
          createdAt: asset.createdAt,
          updatedAt: asset.updatedAt,
        })),
      })),
    };
  }

  async submit(designerId: string, designId: string) {
    const design = await this.prisma.designAsset.findUnique({ where: { id: designId }, include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } } });
    if (!design) throw new NotFoundException("Design not found");
    if (design.designerId !== designerId) throw new ForbiddenException("Not your design");
    if (design.versions.length === 0) throw new BadRequestException("Upload a verified design file before submitting for moderation");
    const updated = await this.prisma.designAsset.update({
      where: { id: designId },
      data: { status: DesignStatus.PENDING_MODERATION, moderationStatus: "PENDING" },
    });
    await this.audit.log({
      actorId: designerId,
      action: "design.submit",
      entityType: "DesignAsset",
      entityId: designId,
      metadata: { from: design.status, to: DesignStatus.PENDING_MODERATION },
    });
    return updated;
  }

  async createVersion(designerId: string, designId: string, dto: CreateDesignVersionDto) {
    const design = await this.prisma.designAsset.findUnique({ where: { id: designId } });
    if (!design) throw new NotFoundException("Design not found");
    if (design.designerId !== designerId) throw new ForbiddenException("Not your design");

    const file = await this.prisma.fileAsset.findUnique({ where: { id: dto.fileId } });
    if (!file) throw new NotFoundException("File not found");
    if (file.ownerId !== designerId) throw new ForbiddenException("File ownership mismatch");
    if (file.uploadStatus !== "READY") throw new ForbiddenException("File is not ready");

    const latestVersion = await this.prisma.designVersion.findFirst({
      where: { designAssetId: designId },
      orderBy: { createdAt: "desc" },
    });

    const version = await this.prisma.designVersion.create({
      data: {
        designAssetId: designId,
        fileKey: file.objectKey,
        widthPx: dto.widthPx,
        heightPx: dto.heightPx,
        dpi: dto.dpi,
        hasTransparency: true,
      },
    });

    await this.audit.log({
      actorId: designerId,
      action: "design.version.create",
      entityType: "DesignVersion",
      entityId: version.id,
      metadata: { designId, previousVersionId: latestVersion?.id, fileId: dto.fileId },
    });

    return version;
  }
}
