import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
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

  async submit(designerId: string, designId: string) {
    const design = await this.prisma.designAsset.findUnique({ where: { id: designId } });
    if (!design) throw new NotFoundException("Design not found");
    if (design.designerId !== designerId) throw new ForbiddenException("Not your design");
    const updated = await this.prisma.designAsset.update({
      where: { id: designId },
      data: { status: DesignStatus.SUBMITTED },
    });
    await this.audit.log({
      actorId: designerId,
      action: "design.submit",
      entityType: "DesignAsset",
      entityId: designId,
      metadata: { from: design.status, to: DesignStatus.SUBMITTED },
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
