import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  AIEntityType,
  DesignProductSelectionStatus,
  DesignStatus,
  ListingStatus,
  MarketplaceKind,
  MarketplacePublicationStatus,
  MockupAssetStatus,
  MockupAssetType,
  ModerationPipelineDecision,
  PipelineType,
  PlacementKind,
  PlacementUnits,
  Prisma,
  ProviderType,
} from "@prisma/client";
import { createHash } from "crypto";
import { presetToInitialPlacement, presetToInitialPrintfulPlacement, printAreaInchesToPixelRect, PRINTFUL_EDITOR_CANVAS, type PrintAreaRect } from "@rashpod/mockup";
import { isPrintfulFailureRetryable, resolvePrintfulPrintArea, type PrintfulPrintAreasMap } from "@rashpod/printful";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { DesignStoriesService, type DesignStoryModerationSyncResult } from "../design-stories/design-stories.service";
import { StorageService } from "../files/storage.service";
import { JobDispatcherService } from "../worker-jobs/job-dispatcher.service";
import { PrintfulFilesService } from "../printful/printful-files.service";
import { PrintfulMockupService } from "../printful/printful-mockup.service";
import { PrintfulClient } from "../printful/printful.client";
import { PodPlacementTransformService } from "../pod/placement-transform.service";
import { MarketplaceComplianceService } from "./marketplace-compliance.service";
import { PlacementCalculationService } from "./placement-calculation.service";
import { GlobalPrintfulSelectionDto, LocalSelectionDto, SubmitModerationDecisionDto } from "./dto/moderation-decision.dto";
import { PrintfulMockupPreviewDto } from "./dto/printful-mockup-preview.dto";
import { SuggestPrintfulPlacementDto } from "./dto/suggest-printful-placement.dto";
import { selectPrimaryDesignVersion } from "../designs/design-version-selection";

const REJECTION_REASONS = new Set([
  "COPYRIGHT_RISK",
  "OFFENSIVE_CONTENT",
  "POLITICAL_SENSITIVE_CONTENT",
  "LOW_IMAGE_RESOLUTION",
  "POOR_IMAGE_QUALITY",
  "WRONG_FILE_FORMAT",
  "TRANSPARENCY_OR_BACKGROUND_ISSUE",
  "NOT_SUITABLE_FOR_PRODUCTION",
  "DUPLICATE_OR_SPAM",
  "MARKETPLACE_COMPLIANCE_RISK",
  "OTHER",
]);

const MODERATION_QUEUE_TAB_STATUSES: Record<string, DesignStatus[]> = {
  PENDING_MODERATION: [DesignStatus.SUBMITTED, DesignStatus.PENDING_MODERATION, DesignStatus.NEEDS_FIX],
  REJECTED: [DesignStatus.REJECTED],
  APPROVED_LOCAL: [DesignStatus.APPROVED_LOCAL, DesignStatus.APPROVED],
  APPROVED_GLOBAL: [DesignStatus.APPROVED_GLOBAL],
};

@Injectable()
export class DesignWorkflowService {
  private readonly logger = new Logger(DesignWorkflowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly designStories: DesignStoriesService,
    private readonly jobs: JobDispatcherService,
    private readonly placementCalculation: PlacementCalculationService,
    private readonly marketplaceCompliance: MarketplaceComplianceService,
    private readonly storage: StorageService,
    private readonly printfulFiles: PrintfulFilesService,
    private readonly printfulMockup: PrintfulMockupService,
    private readonly printfulClient: PrintfulClient,
    private readonly podPlacementTransform: PodPlacementTransformService,
  ) {}

  async moderationQueue(filters?: { status?: string; q?: string; page?: number; limit?: number }) {
    const statuses = this.resolveModerationTabStatuses(filters?.status);
    const page = Math.max(Math.trunc(filters?.page ?? 1), 1);
    const limit = Math.min(Math.max(Math.trunc(filters?.limit ?? 25), 1), 100);
    const query = filters?.q?.trim();
    const where: Prisma.DesignAssetWhereInput = {
      status: statuses.length === 1 ? statuses[0] : { in: statuses },
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { designer: { displayName: { contains: query, mode: "insensitive" } } },
              { designer: { email: { contains: query, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.designAsset.findMany({
        where,
        include: { designer: { select: { id: true, email: true, displayName: true } }, versions: { orderBy: { createdAt: "desc" }, take: 1 } },
        orderBy: { updatedAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.designAsset.count({ where }),
    ]);
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async moderationDetail(id: string) {
    const [design, aiJobs] = await Promise.all([
      this.prisma.designAsset.findUnique({
        where: { id },
        include: {
          designer: { select: { id: true, email: true, displayName: true, handle: true } },
          // A design can have dedicated artwork for every configured placement.
          // Keep enough history to resolve all placement-specific source versions.
          versions: { orderBy: { createdAt: "desc" }, take: 20 },
          commercialRights: true,
          moderationCases: { orderBy: { createdAt: "desc" }, take: 10 },
          moderationAudits: { orderBy: { createdAt: "desc" }, take: 10 },
          productSelections: { include: { mockupAssets: true, localBaseProduct: true, printfulProductTemplate: true, placementPreset: true } },
          listings: { include: { marketplacePublications: true } },
          story: true,
        },
      }),
      this.prisma.aiJob.findMany({
        where: { entityType: AIEntityType.DESIGN, entityId: id },
        include: { suggestions: { orderBy: { createdAt: "desc" } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);
    if (!design) throw new NotFoundException("Design not found");
    const primaryVersion = selectPrimaryDesignVersion(design.versions);
    const previewImageUrl = await this.safeSignedUrl(primaryVersion?.fileKey);
    const productSelections = design.productSelections?.map((selection) => ({
      ...selection,
      mockupAssets: (selection.mockupAssets ?? []).map((asset) => ({
        ...asset,
        imageUrl: this.mockupAssetUrl(asset),
        thumbnailUrl: this.mockupAssetUrl(asset),
      })),
    }));
    return {
      ...design,
      ...(productSelections ? { productSelections } : {}),
      previewImageUrl,
      ai: { jobs: aiJobs, suggestions: aiJobs.flatMap((job) => job.suggestions) },
    };
  }

  async mockupAssetContent(assetId: string) {
    const asset = await this.prisma.mockupAsset.findUnique({ where: { id: assetId } });
    if (!asset?.objectKey) throw new NotFoundException("Mockup asset not found");
    return {
      buffer: await this.storage.readAssetObject(asset.objectKey),
      contentType: asset.contentType ?? "image/png",
    };
  }

  private mockupAssetUrl(asset: { id: string; imageUrl: string | null; thumbnailUrl: string | null; objectKey: string | null }) {
    const current = asset.imageUrl ?? asset.thumbnailUrl;
    if (current && /^https?:\/\//i.test(current)) return current;
    if (asset.objectKey) return `/api/proxy/admin/designs/mockup-assets/${asset.id}/content`;
    return current;
  }

  private versionForPlacement<T extends { placement?: unknown }>(versions: T[], placement?: string | null) {
    const normalized = placement?.trim().toUpperCase().replace(/[\s-]+/g, "_");
    const exact = versions.find((version) => normalized && version.placement === normalized);
    const defaultVersion = versions.find((version) => !version.placement);
    // Never borrow artwork from another explicit placement. Legacy/default
    // versions remain a valid fallback for existing designs.
    return exact ?? defaultVersion ?? (normalized ? undefined : versions[0]);
  }

  async mockupStatus(id: string) {
    const design = await this.prisma.designAsset.findUnique({
      where: { id },
      select: {
        id: true,
        productSelections: {
          select: { id: true, status: true, updatedAt: true },
        },
      },
    });
    if (!design) throw new NotFoundException("Design not found");
    return {
      designId: design.id,
      pending: design.productSelections.some((selection) =>
        selection.status === DesignProductSelectionStatus.MOCKUP_PENDING ||
        selection.status === DesignProductSelectionStatus.MOCKUP_GENERATING,
      ),
      selections: design.productSelections,
    };
  }

  workflow(id: string) {
    return this.moderationDetail(id);
  }

  async mockupEditorContext(
    designId: string,
    query: { localBaseProductId: string; mockupTemplateId: string; printAreaId: string; placementPresetId?: string },
  ) {
    const [design, baseProduct, template, printArea, preset] = await Promise.all([
      this.prisma.designAsset.findUnique({
        where: { id: designId },
        include: { versions: { orderBy: { createdAt: "desc" }, take: 20 } },
      }),
      this.prisma.baseProduct.findUnique({ where: { id: query.localBaseProductId } }),
      this.prisma.mockupTemplate.findUnique({ where: { id: query.mockupTemplateId } }),
      this.prisma.printArea.findUnique({ where: { id: query.printAreaId }, include: { mockupView: true } }),
      query.placementPresetId
        ? this.prisma.placementPreset.findUnique({ where: { id: query.placementPresetId } })
        : Promise.resolve(null),
    ]);

    if (!design) throw new NotFoundException("Design not found");
    const latestVersion = this.versionForPlacement(design.versions, printArea?.placement);
    if (!latestVersion?.fileKey) throw new BadRequestException("DESIGN_FILE_MISSING");

    if (!baseProduct?.isActive) throw new BadRequestException("PRODUCT_SELECTION_REQUIRED: local base product is not active");
    if (!template?.isActive || template.baseProductId !== baseProduct.id) {
      throw new BadRequestException("INVALID_PLACEMENT: mockup template is not active for local product");
    }
    if (!printArea?.isActive || printArea.mockupTemplateId !== template.id) {
      throw new BadRequestException("INVALID_PLACEMENT: printable area is not active");
    }
    if (query.placementPresetId && !preset) {
      throw new BadRequestException("INVALID_PLACEMENT: placement preset was not found");
    }
    if (printArea.mockupView?.isActive === false) {
      throw new BadRequestException("INVALID_PLACEMENT: printable area's product view is not active");
    }
    if (preset && (!preset.active || preset.pipeline !== PipelineType.LOCAL)) {
      throw new BadRequestException("INVALID_PLACEMENT: placement preset is not active for local pipeline");
    }
    if (preset?.localBaseProductId && preset.localBaseProductId !== baseProduct.id) {
      throw new BadRequestException("INVALID_PLACEMENT: preset does not belong to local product");
    }
    if (preset && printArea.placement && printArea.placement !== preset.placement) {
      throw new BadRequestException("INVALID_PLACEMENT: printable area placement does not match preset");
    }

    const printAreaRect: PrintAreaRect = {
      x: printArea.x,
      y: printArea.y,
      width: printArea.width,
      height: printArea.height,
      safeX: printArea.safeX,
      safeY: printArea.safeY,
      safeWidth: printArea.safeWidth,
      safeHeight: printArea.safeHeight,
      widthCm: printArea.widthCm,
      heightCm: printArea.heightCm,
    };

    const templateImageKey = printArea.mockupView?.blankImageKey ?? template.baseImageKey;
    const templateMedia = await this.prisma.mediaAsset.findFirst({
      where: { OR: [{ objectKey: templateImageKey }, { key: templateImageKey }] },
      select: { width: true, height: true },
      orderBy: { updatedAt: "desc" },
    });
    const templateImageUrl = this.storage.isCloudStorageConfigured()
      ? this.storage.buildPublicUrl(templateImageKey)
      : await this.storage.createPublicSignedReadUrl({ objectKey: templateImageKey, expiresSeconds: 60 * 60 });
    const designImageUrl = await this.safeSignedUrl(latestVersion.fileKey);

    const initialScale = Math.max(
      printArea.minScale,
      Math.min(printArea.maxScale, preset?.defaultScale ?? 1),
    );
    const initialPlacement = presetToInitialPlacement(
      {
        defaultWidthCm: preset?.defaultWidthCm,
        defaultHeightCm: preset?.defaultHeightCm,
        defaultX: preset?.defaultX,
        defaultY: preset?.defaultY,
        defaultScale: initialScale,
        alignment: typeof preset?.alignment === "string" ? preset.alignment : null,
      },
      printAreaRect,
      latestVersion.widthPx && latestVersion.heightPx
        ? latestVersion.widthPx / latestVersion.heightPx
        : null,
    );

    return {
      templateWidthPx: templateMedia?.width ?? 2000,
      templateHeightPx: templateMedia?.height ?? 2000,
      templateImageUrl,
      designImageUrl,
      printArea: printAreaRect,
      constraints: {
        allowMove: printArea.allowMove,
        allowResize: printArea.allowResize,
        allowRotate: printArea.allowRotate,
        minScale: printArea.minScale,
        maxScale: printArea.maxScale,
      },
      initialPlacement,
      preset: preset ? { id: preset.id, name: preset.name, alignment: preset.alignment } : null,
    };
  }

  async printfulMockupEditorContext(
    designId: string,
    query: { printfulProductTemplateId: string; placementPresetId: string; placement: string },
  ) {
    const [design, template, preset] = await Promise.all([
      this.prisma.designAsset.findUnique({
        where: { id: designId },
        include: { versions: { orderBy: { createdAt: "desc" }, take: 20 } },
      }),
      this.prisma.printfulProductTemplate.findUnique({ where: { id: query.printfulProductTemplateId } }),
      this.prisma.placementPreset.findUnique({ where: { id: query.placementPresetId } }),
    ]);

    if (!design) throw new NotFoundException("Design not found");
    const latestVersion = this.versionForPlacement(design.versions, query.placement);
    if (!latestVersion?.fileKey) throw new BadRequestException("DESIGN_FILE_MISSING");
    if (!template?.active) throw new BadRequestException("PRODUCT_SELECTION_REQUIRED: Printful product template is not active");
    if (!preset?.active || preset.pipeline !== PipelineType.GLOBAL_PRINTFUL) {
      throw new BadRequestException("INVALID_PLACEMENT: placement preset is not active for Printful pipeline");
    }
    if (preset.productTemplateId && preset.productTemplateId !== template.id) {
      throw new BadRequestException("INVALID_PLACEMENT: preset does not belong to Printful template");
    }

    const placementKey = query.placement.trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (this.providerPlacementForPreset(preset) !== placementKey) {
      throw new BadRequestException("INVALID_PLACEMENT: Printful preset placement does not match selection");
    }
    const areaInches = this.resolveTemplatePrintArea(template, placementKey);
    const printAreaRect = printAreaInchesToPixelRect(areaInches, PRINTFUL_EDITOR_CANVAS);
    const designImageUrl = await this.safeSignedUrl(latestVersion.fileKey);

    const initialScale = Math.max(0.1, Math.min(2, preset.defaultScale));
    const initialPlacement = presetToInitialPrintfulPlacement(
      {
        defaultWidthIn: preset.defaultWidthIn,
        defaultHeightIn: preset.defaultHeightIn,
        defaultX: preset.defaultX,
        defaultY: preset.defaultY,
        defaultScale: initialScale,
        alignment: typeof preset.alignment === "string" ? preset.alignment : null,
      },
      printAreaRect,
      areaInches,
    );

    return {
      templateWidthPx: PRINTFUL_EDITOR_CANVAS,
      templateHeightPx: PRINTFUL_EDITOR_CANVAS,
      templateImageUrl: template.previewImageUrl,
      designImageUrl,
      printArea: printAreaRect,
      printAreaInches: areaInches,
      constraints: {
        allowMove: true,
        allowResize: true,
        allowRotate: false,
        minScale: 0.1,
        maxScale: 2,
      },
      initialPlacement,
      preset: { id: preset.id, name: preset.name, alignment: preset.alignment },
    };
  }

  async suggestPrintfulPlacement(designId: string, dto: SuggestPrintfulPlacementDto) {
    const [template, printArea] = await Promise.all([
      this.prisma.printfulProductTemplate.findUnique({ where: { id: dto.printfulProductTemplateId } }),
      dto.printAreaId ? this.prisma.printArea.findUnique({ where: { id: dto.printAreaId } }) : Promise.resolve(null),
    ]);
    if (!template?.active) throw new BadRequestException("PRODUCT_SELECTION_REQUIRED: Printful product template is not active");

    const placementKey = dto.placement.trim().toLowerCase().replace(/[\s-]+/g, "_");
    const areaInches = this.resolveTemplatePrintArea(template, placementKey);
    const unit = dto.unit ?? "PX";

    if (printArea && dto.printAreaId) {
      const mapping = await this.prisma.podPrintAreaMapping.findFirst({
        where: {
          printAreaId: dto.printAreaId,
          isActive: true,
          providerProduct: { providerProductId: template.printfulCatalogProductId },
        },
      });
      if (mapping?.providerWidth && mapping.providerHeight) {
        try {
          const localPosition = unit === "PX"
            ? {
                width: dto.position.widthPx ?? 0,
                height: dto.position.heightPx ?? 0,
                x: dto.position.xPx ?? 0,
                y: dto.position.yPx ?? 0,
                scale: dto.position.scale ?? 1,
                rotation: dto.position.rotation ?? 0,
                units: PlacementUnits.PX,
              }
            : {
                width: dto.position.widthCm ?? 0,
                height: dto.position.heightCm ?? 0,
                x: dto.position.xCm ?? 0,
                y: dto.position.yCm ?? 0,
                scale: dto.position.scale ?? 1,
                rotation: dto.position.rotation ?? 0,
                units: PlacementUnits.CM,
              };
          const transformed = this.podPlacementTransform.transform({
            position: localPosition,
            localPrintArea: printArea,
            mapping: {
              id: mapping.id,
              providerUnits: mapping.providerUnits,
              providerDpi: mapping.providerDpi,
              providerWidth: mapping.providerWidth,
              providerHeight: mapping.providerHeight,
              offsetX: mapping.offsetX,
              offsetY: mapping.offsetY,
              supportsRotation: mapping.supportsRotation,
              minScale: mapping.minScale,
              maxScale: mapping.maxScale,
              providerPlacement: mapping.providerPlacement,
              technique: mapping.technique,
            },
          });
          const pos = transformed.payload.position;
          return {
            widthIn: pos.width ?? pos.left,
            heightIn: pos.height ?? pos.top,
            leftIn: pos.left ?? pos.x,
            topIn: pos.top ?? pos.y,
            scale: pos.scale ?? 1,
            source: "pod_mapping",
          };
        } catch {
          // fall through to proportional mapping
        }
      }
    }

    const localWidth = unit === "PX" ? printArea?.width ?? 2000 : printArea?.widthCm ?? 30;
    const localHeight = unit === "PX" ? printArea?.height ?? 2000 : printArea?.heightCm ?? 40;
    const sourceWidth = unit === "PX" ? (dto.position.widthPx ?? localWidth * 0.8) : (dto.position.widthCm ?? localWidth * 0.8);
    const sourceHeight = unit === "PX" ? (dto.position.heightPx ?? localHeight * 0.8) : (dto.position.heightCm ?? localHeight * 0.8);
    const sourceX = unit === "PX" ? (dto.position.xPx ?? printArea?.safeX ?? 0) : (dto.position.xCm ?? 0);
    const sourceY = unit === "PX" ? (dto.position.yPx ?? printArea?.safeY ?? 0) : (dto.position.yCm ?? 0);

    const safeX = printArea?.safeX ?? 0;
    const safeY = printArea?.safeY ?? 0;
    const safeWidth = printArea?.safeWidth ?? localWidth;
    const safeHeight = printArea?.safeHeight ?? localHeight;

    const widthRatio = sourceWidth / safeWidth;
    const heightRatio = sourceHeight / safeHeight;
    const xRatio = (sourceX - safeX) / safeWidth;
    const yRatio = (sourceY - safeY) / safeHeight;

    return {
      widthIn: Math.round(areaInches.printAreaWidthIn * widthRatio * 100) / 100,
      heightIn: Math.round(areaInches.printAreaHeightIn * heightRatio * 100) / 100,
      leftIn: Math.round((areaInches.areaLeftIn ?? 0) + areaInches.printAreaWidthIn * xRatio * 100) / 100,
      topIn: Math.round((areaInches.areaTopIn ?? 0) + areaInches.printAreaHeightIn * yRatio * 100) / 100,
      scale: dto.position.scale ?? 1,
      source: "proportional",
    };
  }

  async createPrintfulMockupPreview(designId: string, dto: PrintfulMockupPreviewDto) {
    const template = await this.prisma.printfulProductTemplate.findUnique({ where: { id: dto.printfulProductTemplateId } });
    if (!template?.active) throw new BadRequestException("PRODUCT_SELECTION_REQUIRED: Printful product template is not active");

    const position = this.placementCalculation.calculatePrintfulPosition(dto.position);
    const placementKey = dto.placement.trim().toLowerCase().replace(/[\s-]+/g, "_");
    const areaInches = this.resolveTemplatePrintArea(template, placementKey);
    this.placementCalculation.validatePrintAreaConstraints(
      position,
      {
        xIn: areaInches.areaLeftIn,
        yIn: areaInches.areaTopIn,
        widthIn: areaInches.printAreaWidthIn,
        heightIn: areaInches.printAreaHeightIn,
        allowRotate: false,
        minScale: 0.1,
        maxScale: 2,
      },
      "INCH",
    );

    const fileMapping = await this.printfulFiles.ensurePrintfulFileForDesign(designId, dto.placement);
    const printfulMockupUrl = fileMapping.printfulUrl ?? fileMapping.originalUrl;
    if (!printfulMockupUrl) throw new BadRequestException("PRINTFUL_FILE_UPLOAD_FAILED");

    const task = await this.printfulMockup.createMockupTask({
      template,
      fileUrl: printfulMockupUrl,
      placement: dto.placement,
      technique: dto.technique ?? template.defaultTechnique,
      variantIds: dto.selectedVariantIds,
      position: {
        width: position.width,
        height: position.height,
        left: position.left,
        top: position.top,
        scale: position.scale,
      },
      printArea: {
        width: areaInches.printAreaWidthIn,
        height: areaInches.printAreaHeightIn,
        left: areaInches.areaLeftIn,
        top: areaInches.areaTopIn,
      },
    });

    const taskKey = task.result?.task_key;
    if (!taskKey) throw new BadRequestException("PRINTFUL_MOCKUP_TASK_FAILED");
    return { taskKey, status: task.result?.status ?? "pending" };
  }

  async getPrintfulMockupTask(taskKey: string) {
    const response = await this.printfulClient.getMockupTask(taskKey);
    const result = (response.result ?? {}) as Record<string, unknown>;
    const status = String(result.status ?? "pending").toLowerCase();
    const mockups = Array.isArray(result.mockups) ? result.mockups : [];
    const urls: string[] = [];
    for (const mockup of mockups) {
      const record = mockup && typeof mockup === "object" ? (mockup as Record<string, unknown>) : {};
      if (typeof record.mockup_url === "string") urls.push(record.mockup_url);
      const extra = Array.isArray(record.extra) ? record.extra : [];
      for (const item of extra) {
        const url = item && typeof item === "object" ? (item as Record<string, unknown>).url : null;
        if (typeof url === "string" && url) urls.push(url);
      }
    }
    return { taskKey, status, mockupUrls: [...new Set(urls)], raw: result };
  }

  private async safeSignedUrl(key?: string | null) {
    if (!key) return null;
    try {
      return await this.storage.createSignedReadUrl({ objectKey: key, expiresSeconds: 60 * 60 });
    } catch {
      return null;
    }
  }

  async submitModerationDecision(moderator: { sub: string; role: string; email?: string }, designId: string, dto: SubmitModerationDecisionDto) {
    const design = await this.prisma.designAsset.findUnique({ where: { id: designId }, include: { commercialRights: true } });
    if (!design) throw new NotFoundException("Design not found");
    this.assertModeratable(design.status, moderator.role);
    this.validateDecisionPayload(dto);

    if (dto.decision === "REJECT") {
      const updated = await this.rejectDesign(moderator, design, dto);
      return this.moderationDetail(updated.id);
    }

    if (!design.commercialRights?.allowProductSales) {
      throw new BadRequestException("PRODUCT_SALES_RIGHTS_REQUIRED: the designer must allow product sales before approval");
    }
    if (dto.decision === "APPROVE_GLOBAL" && !design.commercialRights.allowMarketplacePublishing) {
      throw new BadRequestException("MARKETPLACE_RIGHTS_REQUIRED: the designer must allow marketplace publishing before global approval");
    }

    const allowGlobalWithoutLocal = await this.allowGlobalWithoutLocal();
    if (dto.decision === "APPROVE_GLOBAL" && !allowGlobalWithoutLocal && !(dto.localSelections?.length ?? 0)) {
      throw new BadRequestException("PRODUCT_SELECTION_REQUIRED: global approval requires at least one local selection");
    }

    const afterStatus = dto.decision === "APPROVE_LOCAL" ? DesignStatus.APPROVED_LOCAL : DesignStatus.APPROVED_GLOBAL;
    const localSelections = dto.localSelections ?? [];
    const globalSelections = dto.globalPrintfulSelections ?? [];

    const { updated, storyModeration } = await this.prisma.$transaction(async (tx) => {
      const row = await this.claimModerationState(tx, design, {
          status: afterStatus,
          moderationDecision: dto.decision,
          moderationStatus: "APPROVED",
          moderatedById: moderator.sub,
          moderatedAt: new Date(),
          rejectionReasons: Prisma.JsonNull,
          customRejectionReason: null,
      });

      await tx.moderationAudit.create({
        data: {
          designId: design.id,
          moderatorId: moderator.sub,
          decision: dto.decision as ModerationPipelineDecision,
          notes: dto.moderatorNotes,
          beforeStatus: design.status,
          afterStatus,
        },
      });

      await tx.designModerationCase.create({
        data: {
          designAssetId: design.id,
          reviewerId: moderator.sub,
          decision: dto.decision === "APPROVE_LOCAL" ? "APPROVE" : "APPROVE",
          reason: dto.moderatorNotes,
        },
      });

      for (const selection of localSelections) {
        await this.createLocalSelection(tx, moderator.sub, design.id, selection);
      }
      for (const selection of globalSelections) {
        await this.createGlobalSelection(tx, moderator.sub, design.id, selection);
      }
      const storyModeration = await this.designStories.syncWithDesignDecision(
        tx,
        moderator.sub,
        design.id,
        "APPROVE",
        dto.moderatorNotes,
      );
      return { updated: row, storyModeration };
    });

    const pendingSelections = await this.prisma.designProductSelection.findMany({
      where: { designId: design.id, status: DesignProductSelectionStatus.MOCKUP_PENDING },
    });
    for (const selection of pendingSelections) {
      await this.enqueueMockupSelection(moderator.sub, selection);
    }

    await this.safePostCommitAudit({
      actorId: moderator.sub,
      action: `moderation.pipeline.${dto.decision.toLowerCase()}`,
      entityType: "DesignAsset",
      entityId: design.id,
      metadata: { from: design.status, to: afterStatus, localSelections: localSelections.length, globalSelections: globalSelections.length },
    });
    await this.auditStoryModeration(moderator.sub, design.id, storyModeration);

    return this.moderationDetail(updated.id);
  }

  async retryMockup(actorId: string, selectionId: string) {
    const selection = await this.prisma.designProductSelection.findUnique({ where: { id: selectionId } });
    if (!selection) throw new NotFoundException("Design product selection not found");
    if (selection.status !== DesignProductSelectionStatus.MOCKUP_FAILED) {
      throw new BadRequestException("MOCKUP_RETRY_NOT_ALLOWED: only failed mockups can be retried");
    }
    if (selection.errorMessage?.startsWith("PRINTFUL_REQUEST_FAILED:") && !isPrintfulFailureRetryable(selection.errorMessage)) {
      throw new BadRequestException("MOCKUP_CONFIGURATION_REQUIRED: fix the Printful product configuration before generating again");
    }

    const claimed = await this.prisma.designProductSelection.updateMany({
      where: { id: selection.id, status: DesignProductSelectionStatus.MOCKUP_FAILED },
      data: { status: DesignProductSelectionStatus.MOCKUP_PENDING, errorMessage: null },
    });
    if (claimed.count !== 1) {
      throw new ConflictException("MOCKUP_RETRY_IN_PROGRESS: this mockup retry was already started");
    }
    await this.prisma.mockupAsset.updateMany({
      where: { designProductSelectionId: selection.id },
      data: { status: MockupAssetStatus.PENDING, imageUrl: null, thumbnailUrl: null },
    });
    const queued = await this.enqueueMockupSelection(actorId, selection);
    if (!queued.job) throw new BadRequestException(`MOCKUP_QUEUE_FAILED: ${queued.error}`);
    await this.audit.log({ actorId, action: "design-product-selection.retry-mockup", entityType: "DesignProductSelection", entityId: selection.id });
    return queued.job;
  }

  async publishListing(actorId: string, listingId: string) {
    const listing = await this.prisma.commerceListing.findUnique({
      where: { id: listingId },
      include: { marketplacePublications: true },
    });
    if (!listing) throw new NotFoundException("Product listing not found");
    const publications = this.marketplaceCompliance.assertListingReady(listing);
    await this.prisma.commerceListing.update({ where: { id: listing.id }, data: { status: ListingStatus.READY_TO_PUBLISH } });
    for (const publication of publications) {
      await this.prisma.marketplacePublication.update({
        where: { id: publication.id },
        data: { status: MarketplacePublicationStatus.QUEUED, errorMessage: null },
      });
      await this.jobs.enqueue("PUBLISH_MARKETPLACE_LISTING", { marketplacePublicationId: publication.id });
    }
    await this.audit.log({ actorId, action: "product-listing.publish.queue", entityType: "CommerceListing", entityId: listing.id });
    return this.prisma.commerceListing.findUnique({ where: { id: listing.id }, include: { marketplacePublications: true } });
  }

  async retryMarketplacePublication(actorId: string, publicationId: string) {
    const publication = await this.prisma.marketplacePublication.findUnique({ where: { id: publicationId }, include: { productListing: true } });
    if (!publication) throw new NotFoundException("Marketplace publication not found");
    this.marketplaceCompliance.assertPublicationReady(publication.productListing, publication);
    const updated = await this.prisma.marketplacePublication.update({
      where: { id: publication.id },
      data: { status: MarketplacePublicationStatus.QUEUED, errorMessage: null },
    });
    const job = await this.jobs.enqueue("PUBLISH_MARKETPLACE_LISTING", { marketplacePublicationId: publication.id });
    await this.audit.log({ actorId, action: "marketplace-publication.retry", entityType: "MarketplacePublication", entityId: publication.id });
    return { publication: updated, job };
  }

  private async rejectDesign(moderator: { sub: string }, design: { id: string; status: DesignStatus }, dto: SubmitModerationDecisionDto) {
    const reasons = dto.rejectionReasons ?? [];
    const { updated, storyModeration } = await this.prisma.$transaction(async (tx) => {
      const row = await this.claimModerationState(tx, design, {
          status: DesignStatus.REJECTED,
          moderationDecision: dto.decision,
          moderationStatus: "REJECTED",
          moderatedById: moderator.sub,
          moderatedAt: new Date(),
          rejectionReasons: reasons as Prisma.InputJsonValue,
          customRejectionReason: dto.customRejectionReason,
      });
      await tx.moderationAudit.create({
        data: {
          designId: design.id,
          moderatorId: moderator.sub,
          decision: ModerationPipelineDecision.REJECT,
          predefinedReasons: reasons as Prisma.InputJsonValue,
          customReason: dto.customRejectionReason,
          notes: dto.moderatorNotes,
          beforeStatus: design.status,
          afterStatus: DesignStatus.REJECTED,
        },
      });
      await tx.designModerationCase.create({
        data: { designAssetId: design.id, reviewerId: moderator.sub, decision: "REJECT", reason: dto.customRejectionReason ?? reasons.join(", ") },
      });
      const storyModeration = await this.designStories.syncWithDesignDecision(
        tx,
        moderator.sub,
        design.id,
        "REJECT",
        dto.moderatorNotes ?? dto.customRejectionReason ?? reasons.join(", "),
      );
      return { updated: row, storyModeration };
    });

    await this.safePostCommitAudit({
      actorId: moderator.sub,
      action: "moderation.pipeline.reject",
      entityType: "DesignAsset",
      entityId: design.id,
      metadata: { from: design.status, to: DesignStatus.REJECTED, reasons, customReason: dto.customRejectionReason },
    });
    await this.auditStoryModeration(moderator.sub, design.id, storyModeration);
    return updated;
  }

  private async auditStoryModeration(
    actorId: string,
    designId: string,
    result: DesignStoryModerationSyncResult | null,
  ) {
    if (!result) return;
    await this.safePostCommitAudit({
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

  private async safePostCommitAudit(entry: Parameters<AuditService["log"]>[0]) {
    try {
      await this.audit.log(entry);
    } catch (error) {
      // The transactional moderation audit is already persisted. A secondary
      // audit outage must not report a committed design/story decision as failed.
      this.logger.error(
        `Secondary moderation audit failed for ${entry.entityType}:${entry.entityId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async claimModerationState(
    tx: Prisma.TransactionClient,
    design: { id: string; status: DesignStatus },
    data: Prisma.DesignAssetUpdateManyMutationInput,
  ) {
    const claimed = await tx.designAsset.updateMany({
      where: { id: design.id, status: design.status },
      data,
    });
    if (claimed.count !== 1) {
      throw new ConflictException("DESIGN_ALREADY_MODERATED: the design changed while this decision was being submitted");
    }
    const updated = await tx.designAsset.findUnique({ where: { id: design.id } });
    if (!updated) throw new NotFoundException("Design not found");
    return updated;
  }

  private async enqueueMockupSelection(
    actorId: string,
    selection: { id: string; pipeline: PipelineType },
  ): Promise<{ job: unknown | null; error: string | null }> {
    try {
      const job = await this.jobs.enqueue(
        selection.pipeline === PipelineType.LOCAL ? "GENERATE_LOCAL_MOCKUPS" : "GENERATE_PRINTFUL_MOCKUPS",
        { designProductSelectionId: selection.id },
      );
      return { job, error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to queue mockup generation";
      await this.prisma.designProductSelection.update({
        where: { id: selection.id },
        data: {
          status: DesignProductSelectionStatus.MOCKUP_FAILED,
          errorMessage: message,
        },
      });
      try {
        await this.audit.log({
          actorId,
          action: "design-product-selection.mockup-enqueue-failed",
          entityType: "DesignProductSelection",
          entityId: selection.id,
          metadata: { error: message },
        });
      } catch {
        // The selection is already retryable; an audit outage must not hide that recovery state.
      }
      return { job: null, error: message };
    }
  }

  private async createLocalSelection(tx: Prisma.TransactionClient, moderatorId: string, designId: string, selection: LocalSelectionDto) {
    const [baseProduct, preset] = await Promise.all([
      tx.baseProduct.findUnique({
        where: { id: selection.localBaseProductId },
        include: {
          productType: true,
          mockupTemplates: {
            include: {
              printAreas: { include: { mockupView: true } },
              galleryAssets: {
                where: { isActive: true },
                orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
              },
            },
          },
        },
      }),
      selection.placementPresetId
        ? tx.placementPreset.findUnique({ where: { id: selection.placementPresetId } })
        : Promise.resolve(null),
    ]);
    if (!baseProduct || !baseProduct.isActive) throw new BadRequestException("PRODUCT_SELECTION_REQUIRED: local base product is not active");
    if (!baseProduct.productType.isActive) throw new BadRequestException("PRODUCT_SELECTION_REQUIRED: product type is not active");
    if (selection.placementPresetId && !preset) throw new BadRequestException("INVALID_PLACEMENT: placement preset was not found");
    const placement = this.normalizePlacement(selection.placement);
    if (preset && (!preset.active || preset.pipeline !== PipelineType.LOCAL)) throw new BadRequestException("INVALID_PLACEMENT: placement preset is not active for local pipeline");
    if (preset?.localBaseProductId && preset.localBaseProductId !== baseProduct.id) throw new BadRequestException("INVALID_PLACEMENT: preset does not belong to local product");
    if (preset && preset.placement !== placement) throw new BadRequestException("INVALID_PLACEMENT: preset placement does not match selection");

    const selectedTemplate = selection.mockupTemplateId
      ? baseProduct.mockupTemplates.find((template) => template.id === selection.mockupTemplateId)
      : baseProduct.mockupTemplates.find((template) => template.isActive && template.printAreas.some((item) => item.isActive && item.placement === placement));
    if (!selectedTemplate || !selectedTemplate.isActive) throw new BadRequestException("INVALID_PLACEMENT: mockup template is not active for local product");

    const area = selection.printAreaId
      ? selectedTemplate.printAreas.find((item) => item.id === selection.printAreaId)
      : selectedTemplate.printAreas.find((item) => item.isActive && item.placement === placement);
    if (!area) throw new BadRequestException("INVALID_PLACEMENT: printable area not found for local product");
    if (!area.isActive) throw new BadRequestException("INVALID_PLACEMENT: printable area is not active");
    if (area.mockupView?.isActive === false) {
      throw new BadRequestException("INVALID_PLACEMENT: printable area's product view is not active");
    }
    // Older/admin-created print areas are intentionally placement-agnostic because
    // the admin DTO did not historically expose a placement field. Treat null as
    // compatible with the selected preset; only reject an explicit mismatch.
    if (area.placement && area.placement !== placement) {
      throw new BadRequestException("INVALID_PLACEMENT: printable area placement does not match selection");
    }

    const unit = selection.unit === "PX" ? PlacementUnits.PX : PlacementUnits.CM;
    if (unit === PlacementUnits.CM && (!(area.widthCm && area.widthCm > 0) || !(area.heightCm && area.heightCm > 0))) {
      throw new BadRequestException("INVALID_PLACEMENT: physical print-area dimensions are not configured; use PX placement");
    }
    const anchor = selection.anchor ?? "TOP_LEFT";
    const position = unit === PlacementUnits.PX
      ? {
          width: selection.position.widthPx,
          height: selection.position.heightPx,
          x: selection.position.xPx,
          y: selection.position.yPx,
          scale: selection.position.scale ?? 1,
          rotation: selection.position.rotation ?? 0,
        }
      : this.placementCalculation.calculateLocalPosition(selection.position);
    this.placementCalculation.validatePrintAreaConstraints(
      position,
      {
        widthCm: area.widthCm,
        heightCm: area.heightCm,
        xPx: area.x,
        yPx: area.y,
        widthPx: area.width,
        heightPx: area.height,
        safeX: area.safeX,
        safeY: area.safeY,
        safeWidth: area.safeWidth,
        safeHeight: area.safeHeight,
        allowMove: area.allowMove,
        allowResize: area.allowResize,
        allowRotate: area.allowRotate,
        minScale: area.minScale,
        maxScale: area.maxScale,
      },
      unit === PlacementUnits.PX ? "PX" : "CM",
    );
    const sourceVersion = this.versionForPlacement(
      await tx.designVersion.findMany({ where: { designAssetId: designId }, orderBy: { createdAt: "desc" }, take: 20 }),
      placement,
    );
    if (!sourceVersion) throw new BadRequestException("DESIGN_FILE_MISSING");
    const compositionKey = selection.compositionKey?.trim()
      || createHash("sha256").update(`${baseProduct.id}:${selectedTemplate.id}`).digest("hex");
    const composition = await tx.productComposition.upsert({
      where: { designId_pipeline_compositionKey: { designId, pipeline: PipelineType.LOCAL, compositionKey } },
      create: {
        designId,
        pipeline: PipelineType.LOCAL,
        compositionKey,
        localBaseProductId: baseProduct.id,
        mockupTemplateId: selectedTemplate.id,
        selectedByModeratorId: moderatorId,
      },
      update: { selectedByModeratorId: moderatorId },
    });
    if (composition.localBaseProductId !== baseProduct.id || composition.mockupTemplateId !== selectedTemplate.id) {
      throw new BadRequestException("INVALID_PRODUCT_COMPOSITION: all placements in a composition must use the same local product and mockup template");
    }
    const placementConfig = this.localPlacementConfig({ template: selectedTemplate, area, preset, unit, anchor, position });
    const positionHash = this.selectionHash({ pipeline: PipelineType.LOCAL, compositionKey, localBaseProductId: baseProduct.id, presetId: preset?.id ?? null, placement, placementConfig });

    const row = await tx.designProductSelection.upsert({
      where: { designId_pipeline_positionHash: { designId, pipeline: PipelineType.LOCAL, positionHash } },
      create: {
        designId,
        pipeline: PipelineType.LOCAL,
        localBaseProductId: baseProduct.id,
        placementPresetId: preset?.id ?? null,
        sourceDesignVersionId: sourceVersion.id,
        productCompositionId: composition.id,
        placement,
        width: position.width,
        height: position.height,
        x: position.x,
        y: position.y,
        scale: position.scale,
        rotation: position.rotation,
        units: unit,
        positionHash,
        placementConfigJson: placementConfig as Prisma.InputJsonValue,
        selectedByModeratorId: moderatorId,
        status: DesignProductSelectionStatus.MOCKUP_PENDING,
      },
      update: {
        placementPresetId: preset?.id ?? null,
        sourceDesignVersionId: sourceVersion.id,
        productCompositionId: composition.id,
        width: position.width,
        height: position.height,
        x: position.x,
        y: position.y,
        scale: position.scale,
        rotation: position.rotation,
        units: unit,
        placementConfigJson: placementConfig as Prisma.InputJsonValue,
        selectedByModeratorId: moderatorId,
        status: DesignProductSelectionStatus.MOCKUP_PENDING,
        errorMessage: null,
      },
    });

    await this.ensurePendingMockupAssets(tx, designId, row.id, PipelineType.LOCAL, ProviderType.RASHPOD);
  }

  private async createGlobalSelection(tx: Prisma.TransactionClient, moderatorId: string, designId: string, selection: GlobalPrintfulSelectionDto) {
    const [template, preset] = await Promise.all([
      tx.printfulProductTemplate.findUnique({ where: { id: selection.printfulProductTemplateId } }),
      tx.placementPreset.findUnique({ where: { id: selection.placementPresetId } }),
    ]);
    if (!template || !template.active) throw new BadRequestException("PRODUCT_SELECTION_REQUIRED: Printful product template is not active");
    if (!preset || !preset.active || preset.pipeline !== PipelineType.GLOBAL_PRINTFUL) throw new BadRequestException("INVALID_PLACEMENT: placement preset is not active for Printful pipeline");
    if (preset.productTemplateId && preset.productTemplateId !== template.id) throw new BadRequestException("INVALID_PLACEMENT: preset does not belong to Printful template");

    const providerPlacement = this.normalizeProviderPlacement(selection.placement);
    const placement = this.placementKindForProvider(providerPlacement);
    if (this.providerPlacementForPreset(preset) !== providerPlacement) {
      throw new BadRequestException("INVALID_PLACEMENT: Printful preset placement does not match selection");
    }
    const placementText = providerPlacement;
    const allowedPlacements = this.jsonStringArray(template.allowedPlacements);
    if (!allowedPlacements.includes(placementText)) throw new BadRequestException("INVALID_PLACEMENT: Printful placement is not allowed for this template");
    const technique = selection.technique ?? template.defaultTechnique;
    const allowedTechniques = this.jsonStringArray(template.allowedTechniques);
    if (!allowedTechniques.includes(technique)) throw new BadRequestException("INVALID_PLACEMENT: Printful technique is not allowed for this template");

    const selectedVariantIds = [...new Set((selection.selectedVariantIds ?? []).map((id) => id.trim()).filter(Boolean))];
    if (!selectedVariantIds.length) {
      throw new BadRequestException("PRODUCT_SELECTION_REQUIRED: select at least one Printful variant");
    }
    const configuredVariantIds = new Set(this.jsonStringArray(template.printfulVariantIds));
    if (selectedVariantIds.some((id) => !configuredVariantIds.has(id))) {
      throw new BadRequestException("INVALID_PRINTFUL_VARIANT: selected variant does not belong to this template");
    }

    const position = this.placementCalculation.calculatePrintfulPosition(selection.position);
    const areaInches = this.resolveTemplatePrintArea(template, placementText);
    this.placementCalculation.validatePrintAreaConstraints(
      position,
      {
        xIn: areaInches.areaLeftIn,
        yIn: areaInches.areaTopIn,
        widthIn: areaInches.printAreaWidthIn,
        heightIn: areaInches.printAreaHeightIn,
        allowRotate: false,
        minScale: 0.1,
        maxScale: 2,
      },
      "INCH",
    );
    const sourceVersion = this.versionForPlacement(
      await tx.designVersion.findMany({ where: { designAssetId: designId }, orderBy: { createdAt: "desc" }, take: 20 }),
      placement,
    );
    if (!sourceVersion) throw new BadRequestException("DESIGN_FILE_MISSING");
    const compositionKey = selection.compositionKey?.trim()
      || createHash("sha256").update(`${template.id}:${selectedVariantIds.slice().sort().join(",")}`).digest("hex");
    const composition = await tx.productComposition.upsert({
      where: { designId_pipeline_compositionKey: { designId, pipeline: PipelineType.GLOBAL_PRINTFUL, compositionKey } },
      create: {
        designId,
        pipeline: PipelineType.GLOBAL_PRINTFUL,
        compositionKey,
        printfulProductTemplateId: template.id,
        selectedByModeratorId: moderatorId,
      },
      update: { selectedByModeratorId: moderatorId },
    });
    if (composition.printfulProductTemplateId !== template.id) {
      throw new BadRequestException("INVALID_PRODUCT_COMPOSITION: all placements in a composition must use the same Printful product template");
    }
    const placementConfigJson = {
      version: 1,
      selectedVariantIds,
      printAreaInches: areaInches,
    };
    const marketplaces = this.normalizeMarketplaces(selection.targetMarketplaces ?? []);
    const positionHash = this.selectionHash({
      pipeline: PipelineType.GLOBAL_PRINTFUL,
      compositionKey,
      templateId: template.id,
      presetId: preset.id,
      placement,
      providerPlacement,
      technique,
      position,
      marketplaces,
      selectedVariantIds,
    });

    const row = await tx.designProductSelection.upsert({
      where: { designId_pipeline_positionHash: { designId, pipeline: PipelineType.GLOBAL_PRINTFUL, positionHash } },
      create: {
        designId,
        pipeline: PipelineType.GLOBAL_PRINTFUL,
        printfulProductTemplateId: template.id,
        placementPresetId: preset.id,
        sourceDesignVersionId: sourceVersion.id,
        productCompositionId: composition.id,
        placement,
        providerPlacement,
        technique,
        width: position.width,
        height: position.height,
        left: position.left,
        top: position.top,
        scale: position.scale,
        units: PlacementUnits.INCH,
        positionHash,
        placementConfigJson: placementConfigJson as Prisma.InputJsonValue,
        targetMarketplaces: marketplaces as Prisma.InputJsonValue,
        selectedByModeratorId: moderatorId,
        status: DesignProductSelectionStatus.MOCKUP_PENDING,
      },
      update: {
        placementPresetId: preset.id,
        sourceDesignVersionId: sourceVersion.id,
        productCompositionId: composition.id,
        providerPlacement,
        technique,
        width: position.width,
        height: position.height,
        left: position.left,
        top: position.top,
        scale: position.scale,
        placementConfigJson: placementConfigJson as Prisma.InputJsonValue,
        targetMarketplaces: marketplaces as Prisma.InputJsonValue,
        selectedByModeratorId: moderatorId,
        status: DesignProductSelectionStatus.MOCKUP_PENDING,
        errorMessage: null,
      },
    });

    await this.ensurePendingMockupAssets(tx, designId, row.id, PipelineType.GLOBAL_PRINTFUL, ProviderType.PRINTFUL);
  }

  private async ensurePendingMockupAssets(tx: Prisma.TransactionClient, designId: string, selectionId: string, pipeline: PipelineType, provider: ProviderType) {
    for (const mockupType of [MockupAssetType.MAIN, MockupAssetType.LIFESTYLE, MockupAssetType.DETAIL, MockupAssetType.PRINT_AREA_PREVIEW]) {
      const existing = await tx.mockupAsset.findFirst({ where: { designProductSelectionId: selectionId, mockupType } });
      if (!existing) {
        await tx.mockupAsset.create({
          data: {
            designId,
            designProductSelectionId: selectionId,
            pipeline,
            provider,
            mockupType,
            status: MockupAssetStatus.PENDING,
          },
        });
      }
    }
  }

  private validateDecisionPayload(dto: SubmitModerationDecisionDto) {
    if (dto.decision === "REJECT") {
      const reasons = dto.rejectionReasons ?? [];
      if (reasons.length === 0 && !dto.customRejectionReason?.trim()) throw new BadRequestException("REJECTION_REASON_REQUIRED");
      for (const reason of reasons) {
        if (!REJECTION_REASONS.has(reason)) throw new BadRequestException(`Invalid rejection reason: ${reason}`);
      }
      return;
    }
    if (dto.decision === "APPROVE_LOCAL" && !(dto.localSelections?.length ?? 0)) {
      throw new BadRequestException("PRODUCT_SELECTION_REQUIRED: local approval requires at least one local selection");
    }
    if (dto.decision === "APPROVE_GLOBAL" && !(dto.globalPrintfulSelections?.length ?? 0)) {
      throw new BadRequestException("PRODUCT_SELECTION_REQUIRED: global approval requires at least one Printful selection");
    }
  }

  private assertModeratable(status: DesignStatus, role: string) {
    const allowed: DesignStatus[] = [DesignStatus.SUBMITTED, DesignStatus.PENDING_MODERATION];
    if (allowed.includes(status)) return;
    if (["ADMIN", "SUPER_ADMIN"].includes(role)) return;
    throw new BadRequestException("DESIGN_NOT_APPROVED: design cannot be moderated in its current status");
  }

  private async allowGlobalWithoutLocal() {
    const setting = await this.prisma.platformSetting.findUnique({ where: { key: "pipeline.allowGlobalWithoutLocal" } });
    return setting?.value === true;
  }

  private resolveModerationTabStatuses(status?: string) {
    if (!status) return MODERATION_QUEUE_TAB_STATUSES.PENDING_MODERATION;
    return MODERATION_QUEUE_TAB_STATUSES[status] ?? MODERATION_QUEUE_TAB_STATUSES.PENDING_MODERATION;
  }

  private normalizePlacement(value: string): PlacementKind {
    const normalized = value.trim().toUpperCase().replace(/[-\s]+/g, "_");
    if (normalized in PlacementKind) return normalized as PlacementKind;
    throw new BadRequestException("INVALID_PLACEMENT");
  }

  private normalizeProviderPlacement(value: string) {
    const normalized = value.trim().toLowerCase().replace(/[-\s]+/g, "_");
    if (!normalized) throw new BadRequestException("INVALID_PLACEMENT");
    return normalized;
  }

  private providerPlacementForPreset(preset: { placement: PlacementKind; providerPlacement?: string | null }) {
    return preset.providerPlacement
      ? this.normalizeProviderPlacement(preset.providerPlacement)
      : preset.placement.toLowerCase();
  }

  private placementKindForProvider(providerPlacement: string): PlacementKind {
    const normalized = providerPlacement.toUpperCase();
    if (normalized === "FRONT") return PlacementKind.FRONT;
    if (normalized === "BACK") return PlacementKind.BACK;
    if (normalized.includes("LEFT_CHEST") || normalized.includes("CHEST_LEFT")) return PlacementKind.LEFT_CHEST;
    if (normalized.includes("RIGHT_CHEST") || normalized.includes("CHEST_RIGHT")) return PlacementKind.RIGHT_CHEST;
    if (normalized.includes("LEFT_SLEEVE") || normalized.includes("SLEEVE_LEFT")) return PlacementKind.LEFT_SLEEVE;
    if (normalized.includes("RIGHT_SLEEVE") || normalized.includes("SLEEVE_RIGHT")) return PlacementKind.RIGHT_SLEEVE;
    if (normalized.includes("WRAP") || normalized.includes("ALL_OVER")) return PlacementKind.FULL_WRAP;
    return PlacementKind.OTHER;
  }

  private normalizeMarketplaces(values: string[]) {
    return values.map((value) => value.trim().toUpperCase()).filter((value): value is MarketplaceKind => value in MarketplaceKind);
  }

  private jsonStringArray(value: Prisma.JsonValue | null | undefined) {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  }

  private selectionHash(input: unknown) {
    return createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 32);
  }

  private localPlacementConfig(input: {
    template: {
      id: string;
      name: string;
      baseImageKey: string;
      lifestyleImageKey: string | null;
      closeupImageKey: string | null;
      galleryAssets?: Array<{
        id: string;
        mockupViewId: string | null;
        role: "LIFESTYLE" | "DETAIL";
        imageKey: string;
        sortOrder: number;
      }>;
    };
    area: {
      id: string;
      name: string;
      placement: PlacementKind | null;
      x: number;
      y: number;
      width: number;
      height: number;
      widthCm: number | null;
      heightCm: number | null;
      safeX: number;
      safeY: number;
      safeWidth: number;
      safeHeight: number;
      allowMove: boolean;
      allowResize: boolean;
      allowRotate: boolean;
      minScale: number;
      maxScale: number;
      mockupView: {
        id: string;
        viewKey: string;
        placementCode: string;
        name: string;
        blankImageKey: string;
      } | null;
    };
    preset?: { id: string; name: string; alignment: unknown } | null;
    unit: PlacementUnits;
    anchor: string;
    position: { width?: number; height?: number; x?: number; y?: number; scale: number; rotation: number };
  }) {
    const galleryAsset = (role: "LIFESTYLE" | "DETAIL") => {
      const forRole = (input.template.galleryAssets ?? []).filter((asset) => asset.role === role);
      return (
        forRole.find((asset) => asset.mockupViewId === input.area.mockupView?.id)
        ?? forRole.find((asset) => asset.mockupViewId === null)
        ?? forRole[0]
      );
    };
    const lifestyleAsset = galleryAsset("LIFESTYLE");
    const detailAsset = galleryAsset("DETAIL");

    return {
      version: 1,
      mockupTemplate: {
        id: input.template.id,
        name: input.template.name,
        baseImageKey: input.area.mockupView?.blankImageKey ?? input.template.baseImageKey,
        lifestyleImageKey: lifestyleAsset?.imageKey ?? input.template.lifestyleImageKey,
        closeupImageKey: detailAsset?.imageKey ?? input.template.closeupImageKey,
      },
      mockupView: input.area.mockupView
        ? {
            id: input.area.mockupView.id,
            viewKey: input.area.mockupView.viewKey,
            placementCode: input.area.mockupView.placementCode,
            name: input.area.mockupView.name,
            blankImageKey: input.area.mockupView.blankImageKey,
          }
        : null,
      galleryAssets: [lifestyleAsset, detailAsset]
        .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset))
        .map((asset) => ({
          id: asset.id,
          mockupViewId: asset.mockupViewId,
          role: asset.role,
          imageKey: asset.imageKey,
          sortOrder: asset.sortOrder,
        })),
      printArea: {
        id: input.area.id,
        name: input.area.name,
        placement: input.area.placement,
        x: input.area.x,
        y: input.area.y,
        width: input.area.width,
        height: input.area.height,
        widthCm: input.area.widthCm,
        heightCm: input.area.heightCm,
        safeX: input.area.safeX,
        safeY: input.area.safeY,
        safeWidth: input.area.safeWidth,
        safeHeight: input.area.safeHeight,
      },
      placementPreset: input.preset
        ? { id: input.preset.id, name: input.preset.name, alignment: input.preset.alignment }
        : null,
      unit: input.unit,
      anchor: input.anchor,
      position: input.position,
    };
  }

  private parsePrintAreasJson(value: unknown): PrintfulPrintAreasMap | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as PrintfulPrintAreasMap;
  }

  private resolveTemplatePrintArea(
    template: { printAreasJson: unknown; metadataJson: unknown; defaultTechnique: string },
    placement: string,
  ) {
    const fromColumn = this.parsePrintAreasJson(template.printAreasJson);
    const metadata = template.metadataJson && typeof template.metadataJson === "object" && !Array.isArray(template.metadataJson)
      ? (template.metadataJson as Record<string, unknown>)
      : {};
    const fromMetadata = this.parsePrintAreasJson(metadata.printAreasJson);
    return resolvePrintfulPrintArea(fromColumn ?? fromMetadata ?? {}, placement, template.defaultTechnique);
  }
}
