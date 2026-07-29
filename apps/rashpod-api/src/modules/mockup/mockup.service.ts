import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { JobDispatcherService } from "../worker-jobs/job-dispatcher.service";
import { StorageService } from "../files/storage.service";
import { CreatePlacementDto } from "./dto/create-placement.dto";
import { UpdatePlacementDto } from "./dto/update-placement.dto";

@Injectable()
export class MockupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly jobs: JobDispatcherService,
    private readonly storage: StorageService,
  ) {}

  private async assertDesignOwner(designAssetId: string, userId: string) {
    const design = await this.prisma.designAsset.findUnique({ where: { id: designAssetId } });
    if (!design) throw new NotFoundException("Design not found");
    if (design.designerId !== userId) throw new ForbiddenException("Not your design");
  }

  private validatePlacementGeometry(
    position: { x: number; y: number; width: number; height: number; scale: number; rotation: number },
    area: {
      safeX: number;
      safeY: number;
      safeWidth: number;
      safeHeight: number;
      minScale: number;
      maxScale: number;
      allowRotate: boolean;
    },
  ) {
    if (position.width <= 0 || position.height <= 0) {
      throw new BadRequestException("INVALID_PLACEMENT_SIZE");
    }
    if (position.scale < area.minScale || position.scale > area.maxScale) {
      throw new BadRequestException("INVALID_PLACEMENT_SCALE");
    }
    if (!area.allowRotate && position.rotation !== 0) {
      throw new BadRequestException("PLACEMENT_ROTATION_NOT_ALLOWED");
    }

    const radians = position.rotation * Math.PI / 180;
    const scaledWidth = position.width * position.scale;
    const scaledHeight = position.height * position.scale;
    const rotatedWidth = Math.abs(scaledWidth * Math.cos(radians)) + Math.abs(scaledHeight * Math.sin(radians));
    const rotatedHeight = Math.abs(scaledWidth * Math.sin(radians)) + Math.abs(scaledHeight * Math.cos(radians));
    const left = position.x - (rotatedWidth - scaledWidth) / 2;
    const top = position.y - (rotatedHeight - scaledHeight) / 2;
    const safeRight = area.safeX + area.safeWidth;
    const safeBottom = area.safeY + area.safeHeight;
    if (
      left < area.safeX
      || top < area.safeY
      || left + rotatedWidth > safeRight
      || top + rotatedHeight > safeBottom
    ) {
      throw new BadRequestException("POSITION_OUTSIDE_SAFE_ZONE");
    }
  }

  async createPlacement(userId: string, dto: CreatePlacementDto) {
    await this.assertDesignOwner(dto.designAssetId, userId);
    const [designVersion, template, printArea] = await Promise.all([
      this.prisma.designVersion.findUnique({ where: { id: dto.designVersionId } }),
      this.prisma.mockupTemplate.findUnique({
        where: { id: dto.mockupTemplateId },
        include: { baseProduct: true },
      }),
      this.prisma.printArea.findUnique({
        where: { id: dto.printAreaId },
        include: { mockupView: true },
      }),
    ]);
    if (!designVersion || designVersion.designAssetId !== dto.designAssetId) {
      throw new BadRequestException("DESIGN_VERSION_MISMATCH");
    }
    if (!template?.isActive || !template.baseProduct?.isActive) {
      throw new BadRequestException("MOCKUP_TEMPLATE_UNAVAILABLE");
    }
    if (!printArea?.isActive || printArea.mockupTemplateId !== template.id) {
      throw new BadRequestException("PRINT_AREA_MISMATCH");
    }
    if (
      printArea.mockupView
      && (!printArea.mockupView.isActive || printArea.mockupView.mockupTemplateId !== template.id)
    ) {
      throw new BadRequestException("MOCKUP_VIEW_UNAVAILABLE");
    }
    this.validatePlacementGeometry(dto, printArea);
    const placement = await this.prisma.mockupPlacement.create({
      data: {
        designAssetId: dto.designAssetId,
        designVersionId: dto.designVersionId,
        mockupTemplateId: dto.mockupTemplateId,
        printAreaId: dto.printAreaId,
        x: dto.x,
        y: dto.y,
        width: dto.width,
        height: dto.height,
        scale: dto.scale,
        rotation: dto.rotation,
      },
    });
    await this.audit.log({
      actorId: userId,
      action: "mockup.placement.create",
      entityType: "MockupPlacement",
      entityId: placement.id,
      metadata: {
        designAssetId: dto.designAssetId,
        designVersionId: dto.designVersionId,
        mockupTemplateId: dto.mockupTemplateId,
        mockupViewId: printArea.mockupViewId,
        printAreaId: dto.printAreaId,
      },
    });
    return placement;
  }

  async getPlacement(userId: string, id: string) {
    const placement = await this.prisma.mockupPlacement.findUnique({
      where: { id },
      include: {
        mockupTemplate: { include: { printAreas: true, baseProduct: true } },
        printArea: { include: { mockupView: true } },
        designAsset: true,
        designVersion: true,
        generatedAssets: { orderBy: { createdAt: "desc" }, take: 12 },
      },
    });
    if (!placement) return null;
    if (placement.designAsset.designerId !== userId) throw new ForbiddenException("Not your design");
    // attach signed-read URLs for canvas rendering
    const templateImageKey = placement.printArea?.mockupView?.blankImageKey ?? placement.mockupTemplate?.baseImageKey;
    const templateBgUrl = templateImageKey
      ? await this.safeSignedUrl(templateImageKey)
      : null;
    const designUrl = placement.designVersion?.fileKey
      ? await this.safeSignedUrl(placement.designVersion.fileKey)
      : null;
    const generatedUrls = await Promise.all(
      (placement.generatedAssets ?? []).map(async (g) => ({
        ...g,
        url: g.fileKey ? await this.safeSignedUrl(g.fileKey) : null,
      })),
    );
    return { ...placement, templateBgUrl, designUrl, generatedAssets: generatedUrls };
  }

  private async safeSignedUrl(key: string) {
    try {
      return await this.storage.createSignedReadUrl({ objectKey: key, expiresSeconds: 60 * 60 });
    } catch {
      return null;
    }
  }

  async updatePlacement(userId: string, id: string, dto: UpdatePlacementDto) {
    const placement = await this.prisma.mockupPlacement.findUnique({
      where: { id },
      include: { printArea: true },
    });
    if (!placement) throw new NotFoundException("Placement not found");
    await this.assertDesignOwner(placement.designAssetId, userId);
    this.validatePlacementGeometry(
      {
        x: dto.x ?? placement.x,
        y: dto.y ?? placement.y,
        width: dto.width ?? placement.width,
        height: dto.height ?? placement.height,
        scale: dto.scale ?? placement.scale,
        rotation: dto.rotation ?? placement.rotation,
      },
      placement.printArea,
    );
    const updated = await this.prisma.mockupPlacement.update({ where: { id }, data: dto });
    await this.audit.log({
      actorId: userId,
      action: "mockup.placement.update",
      entityType: "MockupPlacement",
      entityId: id,
      metadata: { changedFields: Object.keys(dto) },
    });
    return updated;
  }

  async approvePlacement(userId: string, id: string) {
    const placement = await this.prisma.mockupPlacement.findUnique({ where: { id } });
    if (!placement) throw new NotFoundException("Placement not found");
    await this.assertDesignOwner(placement.designAssetId, userId);
    const updated = await this.prisma.mockupPlacement.update({
      where: { id },
      data: { approvedByDesigner: true, approvedAt: new Date() },
    });
    await this.audit.log({
      actorId: userId,
      action: "mockup.placement.approve",
      entityType: "MockupPlacement",
      entityId: id,
    });
    return updated;
  }

  async generatePreview(userId: string, id: string) {
    const placement = await this.prisma.mockupPlacement.findUnique({ where: { id } });
    if (!placement) throw new NotFoundException("Placement not found");
    await this.assertDesignOwner(placement.designAssetId, userId);
    const asset = await this.prisma.generatedAsset.create({
      data: {
        sourcePlacementId: id,
        type: "PREVIEW",
        status: "PENDING",
      },
    });
    await this.jobs.enqueue("GENERATE_PRODUCT_MOCKUPS", { placementId: id, generatedAssetId: asset.id, type: "PREVIEW" });
    return asset;
  }

  async generateListingImages(userId: string, id: string) {
    const placement = await this.prisma.mockupPlacement.findUnique({ where: { id } });
    if (!placement) throw new NotFoundException("Placement not found");
    await this.assertDesignOwner(placement.designAssetId, userId);

    const types = ["LISTING_MAIN", "LISTING_LIFESTYLE", "LISTING_CLOSEUP"] as const;
    const assets = [];
    for (const type of types) {
      const asset = await this.prisma.generatedAsset.create({
        data: { sourcePlacementId: id, type, status: "PENDING" },
      });
      assets.push(asset);
    }

    await this.jobs.enqueue("GENERATE_LISTING_IMAGE_PACK", {
      placementId: id,
      generatedAssetIds: assets.map((a) => a.id),
    });
    return assets;
  }

  async generateFilmPreview(userId: string, id: string) {
    const placement = await this.prisma.mockupPlacement.findUnique({ where: { id } });
    if (!placement) throw new NotFoundException("Placement not found");
    await this.assertDesignOwner(placement.designAssetId, userId);
    const asset = await this.prisma.generatedAsset.create({
      data: {
        sourcePlacementId: id,
        type: "FILM_PREVIEW",
        status: "PENDING",
      },
    });
    await this.jobs.enqueue("GENERATE_FILM_PREVIEW", {
      placementId: id,
      generatedAssetId: asset.id,
      type: "FILM_PREVIEW",
    });
    return asset;
  }

  async generateProductionFile(userId: string, id: string) {
    const placement = await this.prisma.mockupPlacement.findUnique({ where: { id } });
    if (!placement) throw new NotFoundException("Placement not found");
    await this.assertDesignOwner(placement.designAssetId, userId);
    const asset = await this.prisma.generatedAsset.create({
      data: {
        sourcePlacementId: id,
        type: "PRODUCTION_FILE",
        status: "PENDING",
      },
    });
    await this.jobs.enqueue("GENERATE_PRODUCTION_FILE", {
      placementId: id,
      generatedAssetId: asset.id,
      type: "PRODUCTION_FILE",
    });
    return asset;
  }
}
