import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AssetPurpose, DesignStatus, PlacementKind } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { StorageService } from "../files/storage.service";
import { CreateDesignDto } from "./dto/create-design.dto";
import { CreateDesignVersionDto } from "./dto/create-design-version.dto";
import { selectPrimaryDesignVersion } from "./design-version-selection";

const EDITABLE_DESIGN_STATUSES = new Set<DesignStatus>([
  DesignStatus.DRAFT,
  DesignStatus.NEEDS_FIX,
  DesignStatus.REJECTED,
]);

@Injectable()
export class DesignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  async create(designerId: string, dto: CreateDesignDto, tenantId?: string) {
    const requestedBaseProduct = await this.prisma.baseProduct.findFirst({
      where: {
        id: dto.requestedBaseProductId,
        isActive: true,
        ...this.tenantScope(tenantId),
        productType: {
          isActive: true,
          availableForDesigners: true,
          ...this.tenantScope(tenantId),
        },
      },
      select: { id: true, productTypeId: true },
    });
    if (!requestedBaseProduct) {
      throw new BadRequestException("Choose an active base product that is available to designers");
    }
    const configuredPlacements = await this.allowedPlacementsForBaseProduct(requestedBaseProduct.id);
    if (configuredPlacements.size === 0) {
      throw new BadRequestException("This base product has no active designer placement configuration");
    }

    const design = await this.prisma.designAsset.create({
      data: {
        designerId,
        tenantId,
        requestedBaseProductId: requestedBaseProduct.id,
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
      tenantId,
      metadata: {
        requestedBaseProductId: requestedBaseProduct.id,
        requestedProductTypeId: requestedBaseProduct.productTypeId,
      },
    });
    return design;
  }

  async uploadOptions(tenantId?: string) {
    const productTypes = await this.prisma.productType.findMany({
      where: {
        isActive: true,
        availableForDesigners: true,
        ...this.tenantScope(tenantId),
      },
      orderBy: { name: "asc" },
      include: {
        baseProducts: {
          where: { isActive: true, ...this.tenantScope(tenantId) },
          orderBy: { name: "asc" },
          include: {
            mockupTemplates: {
              where: { isActive: true, ...this.tenantScope(tenantId) },
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
              include: {
                views: {
                  where: { isActive: true },
                  orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
                },
                printAreas: {
                  where: { isActive: true },
                  orderBy: { createdAt: "asc" },
                  include: {
                    mockupView: {
                      select: {
                        id: true,
                        name: true,
                        placementCode: true,
                        blankImageKey: true,
                        isActive: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const imageKeys = [...new Set(productTypes.flatMap((productType) =>
      productType.baseProducts.flatMap((baseProduct) =>
        baseProduct.mockupTemplates.flatMap((template) => [
          template.baseImageKey,
          ...template.views.map((view) => view.blankImageKey),
        ]),
      ),
    ).filter(Boolean))];
    const mediaRows = imageKeys.length
      ? await this.prisma.mediaAsset.findMany({
          where: {
            isActive: true,
            OR: [{ objectKey: { in: imageKeys } }, { key: { in: imageKeys } }],
          },
          select: { key: true, objectKey: true, publicUrl: true },
        })
      : [];
    const mediaByKey = new Map<string, { objectKey: string; publicUrl: string | null }>();
    mediaRows.forEach((media) => {
      mediaByKey.set(media.key, media);
      mediaByKey.set(media.objectKey, media);
    });

    const options = productTypes.map((productType) => ({
      id: productType.id,
      name: productType.name,
      slug: productType.slug,
      category: productType.category,
      baseProducts: productType.baseProducts.map((baseProduct) => {
        const placements = new Map<PlacementKind, {
          code: PlacementKind;
          name: string;
          mockupTemplateId: string;
          mockupViewId: string | null;
          printAreaId: string;
        }>();
        baseProduct.mockupTemplates.forEach((template) => {
          template.printAreas.forEach((area) => {
            if (area.mockupView?.isActive === false) return;
            const code = this.placementKind(area.placement ?? area.mockupView?.placementCode);
            if (!code) return;
            if (placements.has(code)) return;
            placements.set(code, {
              code,
              name: area.mockupView?.name || area.name || this.placementLabel(code),
              mockupTemplateId: template.id,
              mockupViewId: area.mockupViewId,
              printAreaId: area.id,
            });
          });
        });
        const primaryTemplate = baseProduct.mockupTemplates[0];
        const primaryView = primaryTemplate?.views.find((view) => view.isPrimary) ?? primaryTemplate?.views[0];
        const imageKey = primaryView?.blankImageKey ?? primaryTemplate?.baseImageKey;
        const media = imageKey ? mediaByKey.get(imageKey) : undefined;
        const imageUrl = baseProduct.imageUrl
          || media?.publicUrl
          || (media?.objectKey ? this.storage.buildPublicUrl(media.objectKey) : imageKey ? this.storage.buildPublicUrl(imageKey) : null);
        return {
          id: baseProduct.id,
          name: baseProduct.name,
          description: baseProduct.description,
          imageUrl,
          placements: [...placements.values()],
        };
      }),
    }));
    return options
      .map((productType) => ({
        ...productType,
        baseProducts: productType.baseProducts.filter((baseProduct) => baseProduct.placements.length > 0),
      }))
      .filter((productType) => productType.baseProducts.length > 0);
  }

  async listOwn(designerId: string, tenantId?: string) {
    return this.prisma.designAsset.findMany({
      where: { designerId, ...this.tenantScope(tenantId) },
      include: {
        commercialRights: true,
        requestedBaseProduct: { select: { id: true, name: true, imageUrl: true, productType: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getOwn(designerId: string, designId: string, tenantId?: string) {
    const design = await this.prisma.designAsset.findUnique({
      where: { id: designId },
      include: {
        requestedBaseProduct: { include: { productType: true } },
        versions: { orderBy: { createdAt: "desc" }, take: 20 },
        moderationAudits: { orderBy: { createdAt: "desc" }, take: 10 },
        productSelections: { include: { mockupAssets: true, localBaseProduct: true, printfulProductTemplate: true, placementPreset: true } },
        listings: { include: { marketplacePublications: true } },
      },
    });
    if (!design) throw new NotFoundException("Design not found");
    if (design.designerId !== designerId) throw new ForbiddenException("Not your design");
    if (!this.tenantVisible(design.tenantId, tenantId)) throw new ForbiddenException("Design belongs to another workspace");
    const primaryVersion = selectPrimaryDesignVersion(design.versions);
    const previewImageUrl = await this.resolvePreviewUrl(primaryVersion?.fileKey);
    return {
      ...design,
      previewImageUrl,
      versions: design.versions.map((version) => ({
        id: version.id,
        designAssetId: version.designAssetId,
        widthPx: version.widthPx,
        heightPx: version.heightPx,
        dpi: version.dpi,
        hasTransparency: version.hasTransparency,
        placement: version.placement,
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

  async submit(designerId: string, designId: string, tenantId?: string) {
    const design = await this.prisma.designAsset.findUnique({ where: { id: designId }, include: { versions: { orderBy: { createdAt: "desc" }, take: 20 } } });
    if (!design) throw new NotFoundException("Design not found");
    if (design.designerId !== designerId) throw new ForbiddenException("Not your design");
    if (!this.tenantVisible(design.tenantId, tenantId)) throw new ForbiddenException("Design belongs to another workspace");
    if (!EDITABLE_DESIGN_STATUSES.has(design.status)) {
      throw new BadRequestException("Only editable designs can be submitted for moderation");
    }
    if (design.versions.length === 0) throw new BadRequestException("Upload a verified design file before submitting for moderation");
    if (design.requestedBaseProductId) {
      const allowedPlacements = await this.allowedPlacementsForBaseProduct(design.requestedBaseProductId);
      if (!design.versions.some((version) => version.placement && allowedPlacements.has(version.placement))) {
        throw new BadRequestException("Upload artwork for at least one configured placement before submitting for moderation");
      }
    }
    const updated = await this.prisma.designAsset.update({
      where: { id: designId },
      data: { status: DesignStatus.PENDING_MODERATION, moderationStatus: "PENDING" },
    });
    await this.audit.log({
      actorId: designerId,
      action: "design.submit",
      entityType: "DesignAsset",
      entityId: designId,
      tenantId: design.tenantId ?? tenantId,
      metadata: { from: design.status, to: DesignStatus.PENDING_MODERATION },
    });
    return updated;
  }

  async createVersion(designerId: string, designId: string, dto: CreateDesignVersionDto, tenantId?: string) {
    const design = await this.prisma.designAsset.findUnique({ where: { id: designId } });
    if (!design) throw new NotFoundException("Design not found");
    if (design.designerId !== designerId) throw new ForbiddenException("Not your design");
    if (!this.tenantVisible(design.tenantId, tenantId)) throw new ForbiddenException("Design belongs to another workspace");
    if (!EDITABLE_DESIGN_STATUSES.has(design.status)) {
      throw new BadRequestException("Artwork can only be changed while the design is editable");
    }

    const file = await this.prisma.fileAsset.findUnique({ where: { id: dto.fileId } });
    if (!file) throw new NotFoundException("File not found");
    if (file.ownerId !== designerId) throw new ForbiddenException("File ownership mismatch");
    if (file.uploadStatus !== "READY") throw new ForbiddenException("File is not ready");
    if (file.purpose !== AssetPurpose.DESIGN_ORIGINAL) throw new ForbiddenException("File is not design artwork");
    if (file.designId !== designId) throw new ForbiddenException("File is not attached to this design");
    if (!this.tenantVisible(file.tenantId, tenantId) || (design.tenantId && file.tenantId !== design.tenantId)) {
      throw new ForbiddenException("File belongs to another workspace");
    }
    if (design.requestedBaseProductId) {
      if (!dto.placement) throw new BadRequestException("Choose a configured product placement for this artwork");
      const allowedPlacements = await this.allowedPlacementsForBaseProduct(design.requestedBaseProductId);
      if (!allowedPlacements.has(dto.placement)) {
        throw new BadRequestException("This placement is not configured for the selected base product");
      }
    }

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
        placement: dto.placement,
      },
    });

    await this.audit.log({
      actorId: designerId,
      action: "design.version.create",
      entityType: "DesignVersion",
      entityId: version.id,
      tenantId: design.tenantId ?? tenantId,
      metadata: { designId, previousVersionId: latestVersion?.id, fileId: dto.fileId, placement: dto.placement ?? "DEFAULT" },
    });

    return version;
  }

  private async resolvePreviewUrl(fileKey?: string | null) {
    if (!fileKey) return null;
    try {
      return await this.storage.createSignedReadUrl({ objectKey: fileKey, expiresSeconds: 60 * 60 });
    } catch {
      return null;
    }
  }

  private tenantScope(tenantId?: string): { OR: Array<{ tenantId: string | null }> } | { tenantId: null } {
    return tenantId ? { OR: [{ tenantId }, { tenantId: null }] } : { tenantId: null };
  }

  private tenantVisible(resourceTenantId: string | null | undefined, actorTenantId?: string) {
    return !resourceTenantId || resourceTenantId === actorTenantId;
  }

  private async allowedPlacementsForBaseProduct(baseProductId: string) {
    const areas = await this.prisma.printArea.findMany({
      where: {
        isActive: true,
        mockupTemplate: {
          isActive: true,
          baseProduct: {
            id: baseProductId,
            isActive: true,
            productType: { isActive: true, availableForDesigners: true },
          },
        },
      },
      select: {
        placement: true,
        mockupView: { select: { placementCode: true, isActive: true } },
      },
    });
    return new Set(areas.flatMap((area) => {
      if (area.mockupView?.isActive === false) return [];
      const placement = this.placementKind(area.placement ?? area.mockupView?.placementCode);
      return placement ? [placement] : [];
    }));
  }

  private placementKind(value: string | null | undefined): PlacementKind | null {
    const normalized = value?.trim().toUpperCase().replace(/[\s-]+/g, "_");
    return normalized && Object.values(PlacementKind).includes(normalized as PlacementKind)
      ? normalized as PlacementKind
      : null;
  }

  private placementLabel(value: PlacementKind) {
    return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
