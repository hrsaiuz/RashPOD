import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
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
import { resolvePrintfulPrintArea, type PrintfulPrintAreasMap } from "@rashpod/printful";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly jobs: JobDispatcherService,
    private readonly placementCalculation: PlacementCalculationService,
    private readonly marketplaceCompliance: MarketplaceComplianceService,
    private readonly storage: StorageService,
    private readonly printfulFiles: PrintfulFilesService,
    private readonly printfulMockup: PrintfulMockupService,
    private readonly printfulClient: PrintfulClient,
    private readonly podPlacementTransform: PodPlacementTransformService,
  ) {}

  moderationQueue(filters?: { status?: string; q?: string }) {
    const statuses = this.resolveModerationTabStatuses(filters?.status);
    return this.prisma.designAsset.findMany({
      where: {
        status: statuses.length === 1 ? statuses[0] : { in: statuses },
        ...(filters?.q
          ? {
              OR: [
                { title: { contains: filters.q, mode: "insensitive" } },
                { description: { contains: filters.q, mode: "insensitive" } },
                { designer: { displayName: { contains: filters.q, mode: "insensitive" } } },
                { designer: { email: { contains: filters.q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: { designer: { select: { id: true, email: true, displayName: true } }, versions: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { updatedAt: "asc" },
      take: 200,
    });
  }

  async moderationDetail(id: string) {
    const [design, aiJobs] = await Promise.all([
      this.prisma.designAsset.findUnique({
        where: { id },
        include: {
          designer: { select: { id: true, email: true, displayName: true, handle: true } },
          versions: { orderBy: { createdAt: "desc" }, take: 5 },
          moderationCases: { orderBy: { createdAt: "desc" }, take: 10 },
          moderationAudits: { orderBy: { createdAt: "desc" }, take: 10 },
          productSelections: { include: { mockupAssets: true, localBaseProduct: true, printfulProductTemplate: true, placementPreset: true } },
          listings: { include: { marketplacePublications: true } },
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
    const latestVersion = design.versions[0];
    const previewImageUrl = await this.safeSignedUrl(latestVersion?.fileKey);
    return { ...design, previewImageUrl, ai: { jobs: aiJobs, suggestions: aiJobs.flatMap((job) => job.suggestions) } };
  }

  workflow(id: string) {
    return this.moderationDetail(id);
  }

  async mockupEditorContext(
    designId: string,
    query: { localBaseProductId: string; mockupTemplateId: string; printAreaId: string; placementPresetId: string },
  ) {
    const [design, baseProduct, template, printArea, preset] = await Promise.all([
      this.prisma.designAsset.findUnique({
        where: { id: designId },
        include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } },
      }),
      this.prisma.baseProduct.findUnique({ where: { id: query.localBaseProductId } }),
      this.prisma.mockupTemplate.findUnique({ where: { id: query.mockupTemplateId } }),
      this.prisma.printArea.findUnique({ where: { id: query.printAreaId } }),
      this.prisma.placementPreset.findUnique({ where: { id: query.placementPresetId } }),
    ]);

    if (!design) throw new NotFoundException("Design not found");
    const latestVersion = design.versions[0];
    if (!latestVersion?.fileKey) throw new BadRequestException("DESIGN_FILE_MISSING");

    if (!baseProduct?.isActive) throw new BadRequestException("PRODUCT_SELECTION_REQUIRED: local base product is not active");
    if (!template?.isActive || template.baseProductId !== baseProduct.id) {
      throw new BadRequestException("INVALID_PLACEMENT: mockup template is not active for local product");
    }
    if (!printArea?.isActive || printArea.mockupTemplateId !== template.id) {
      throw new BadRequestException("INVALID_PLACEMENT: printable area is not active");
    }
    if (!preset?.active || preset.pipeline !== PipelineType.LOCAL) {
      throw new BadRequestException("INVALID_PLACEMENT: placement preset is not active for local pipeline");
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

    const templateImageUrl = this.storage.isCloudStorageConfigured()
      ? this.storage.buildPublicUrl(template.baseImageKey)
      : await this.storage.createPublicSignedReadUrl({ objectKey: template.baseImageKey, expiresSeconds: 60 * 60 });
    const designImageUrl = await this.safeSignedUrl(latestVersion.fileKey);

    const initialPlacement = presetToInitialPlacement(
      {
        defaultWidthCm: preset.defaultWidthCm,
        defaultHeightCm: preset.defaultHeightCm,
        defaultX: preset.defaultX,
        defaultY: preset.defaultY,
        defaultScale: preset.defaultScale,
        alignment: typeof preset.alignment === "string" ? preset.alignment : null,
      },
      printAreaRect,
    );

    return {
      templateWidthPx: 2000,
      templateHeightPx: 2000,
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
      preset: { id: preset.id, name: preset.name, alignment: preset.alignment },
    };
  }

  async printfulMockupEditorContext(
    designId: string,
    query: { printfulProductTemplateId: string; placementPresetId: string; placement: string },
  ) {
    const [design, template, preset] = await Promise.all([
      this.prisma.designAsset.findUnique({
        where: { id: designId },
        include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } },
      }),
      this.prisma.printfulProductTemplate.findUnique({ where: { id: query.printfulProductTemplateId } }),
      this.prisma.placementPreset.findUnique({ where: { id: query.placementPresetId } }),
    ]);

    if (!design) throw new NotFoundException("Design not found");
    const latestVersion = design.versions[0];
    if (!latestVersion?.fileKey) throw new BadRequestException("DESIGN_FILE_MISSING");
    if (!template?.active) throw new BadRequestException("PRODUCT_SELECTION_REQUIRED: Printful product template is not active");
    if (!preset?.active || preset.pipeline !== PipelineType.GLOBAL_PRINTFUL) {
      throw new BadRequestException("INVALID_PLACEMENT: placement preset is not active for Printful pipeline");
    }
    if (preset.productTemplateId && preset.productTemplateId !== template.id) {
      throw new BadRequestException("INVALID_PLACEMENT: preset does not belong to Printful template");
    }

    const placementKey = query.placement.trim().toLowerCase().replace(/[\s-]+/g, "_");
    const areaInches = this.resolveTemplatePrintArea(template, placementKey);
    const printAreaRect = printAreaInchesToPixelRect(areaInches, PRINTFUL_EDITOR_CANVAS);
    const designImageUrl = await this.safeSignedUrl(latestVersion.fileKey);

    const initialPlacement = presetToInitialPrintfulPlacement(
      {
        defaultWidthIn: preset.defaultWidthIn,
        defaultHeightIn: preset.defaultHeightIn,
        defaultX: preset.defaultX,
        defaultY: preset.defaultY,
        defaultScale: preset.defaultScale,
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
                width: dto.position.widthPx ?? dto.position.width,
                height: dto.position.heightPx ?? dto.position.height,
                x: dto.position.xPx ?? dto.position.x,
                y: dto.position.yPx ?? dto.position.y,
                scale: dto.position.scale ?? 1,
                rotation: dto.position.rotation ?? 0,
                units: PlacementUnits.PX,
              }
            : {
                width: dto.position.widthCm ?? dto.position.width,
                height: dto.position.heightCm ?? dto.position.height,
                x: dto.position.xCm ?? dto.position.x,
                y: dto.position.yCm ?? dto.position.y,
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
    const sourceWidth = unit === "PX" ? (dto.position.widthPx ?? dto.position.width ?? localWidth * 0.8) : (dto.position.widthCm ?? dto.position.width ?? localWidth * 0.8);
    const sourceHeight = unit === "PX" ? (dto.position.heightPx ?? dto.position.height ?? localHeight * 0.8) : (dto.position.heightCm ?? dto.position.height ?? localHeight * 0.8);
    const sourceX = unit === "PX" ? (dto.position.xPx ?? dto.position.x ?? printArea?.safeX ?? 0) : (dto.position.xCm ?? dto.position.x ?? 0);
    const sourceY = unit === "PX" ? (dto.position.yPx ?? dto.position.y ?? printArea?.safeY ?? 0) : (dto.position.yCm ?? dto.position.y ?? 0);

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
    this.placementCalculation.validatePositionWithinArea(position, { widthIn: areaInches.printAreaWidthIn, heightIn: areaInches.printAreaHeightIn }, "INCH");

    const fileMapping = await this.printfulFiles.ensurePrintfulFileForDesign(designId);
    if (!fileMapping.printfulFileId) throw new BadRequestException("PRINTFUL_FILE_UPLOAD_FAILED");

    const task = await this.printfulMockup.createMockupTask({
      template,
      fileId: fileMapping.printfulFileId,
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
    const design = await this.prisma.designAsset.findUnique({ where: { id: designId } });
    if (!design) throw new NotFoundException("Design not found");
    this.assertModeratable(design.status, moderator.role);
    this.validateDecisionPayload(dto);

    if (dto.decision === "REJECT") {
      const updated = await this.rejectDesign(moderator, design, dto);
      return this.moderationDetail(updated.id);
    }

    const allowGlobalWithoutLocal = await this.allowGlobalWithoutLocal();
    if (dto.decision === "APPROVE_GLOBAL" && !allowGlobalWithoutLocal && !(dto.localSelections?.length ?? 0)) {
      throw new BadRequestException("PRODUCT_SELECTION_REQUIRED: global approval requires at least one local selection");
    }

    const afterStatus = dto.decision === "APPROVE_LOCAL" ? DesignStatus.APPROVED_LOCAL : DesignStatus.APPROVED_GLOBAL;
    const localSelections = dto.localSelections ?? [];
    const globalSelections = dto.globalPrintfulSelections ?? [];

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.designAsset.update({
        where: { id: design.id },
        data: {
          status: afterStatus,
          moderationDecision: dto.decision,
          moderationStatus: "APPROVED",
          moderatedById: moderator.sub,
          moderatedAt: new Date(),
          rejectionReasons: Prisma.JsonNull,
          customRejectionReason: null,
        },
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
      return row;
    });

    const pendingSelections = await this.prisma.designProductSelection.findMany({
      where: { designId: design.id, status: DesignProductSelectionStatus.MOCKUP_PENDING },
    });
    for (const selection of pendingSelections) {
      await this.jobs.enqueue(selection.pipeline === PipelineType.LOCAL ? "GENERATE_LOCAL_MOCKUPS" : "GENERATE_PRINTFUL_MOCKUPS", {
        designProductSelectionId: selection.id,
      });
    }

    await this.audit.log({
      actorId: moderator.sub,
      action: `moderation.pipeline.${dto.decision.toLowerCase()}`,
      entityType: "DesignAsset",
      entityId: design.id,
      metadata: { from: design.status, to: afterStatus, localSelections: localSelections.length, globalSelections: globalSelections.length },
    });

    return this.moderationDetail(updated.id);
  }

  async retryMockup(actorId: string, selectionId: string) {
    const selection = await this.prisma.designProductSelection.findUnique({ where: { id: selectionId } });
    if (!selection) throw new NotFoundException("Design product selection not found");
    await this.prisma.designProductSelection.update({
      where: { id: selection.id },
      data: { status: DesignProductSelectionStatus.MOCKUP_PENDING, errorMessage: null },
    });
    await this.prisma.mockupAsset.updateMany({
      where: { designProductSelectionId: selection.id },
      data: { status: MockupAssetStatus.PENDING, imageUrl: null, thumbnailUrl: null },
    });
    const job = await this.jobs.enqueue(selection.pipeline === PipelineType.LOCAL ? "GENERATE_LOCAL_MOCKUPS" : "GENERATE_PRINTFUL_MOCKUPS", {
      designProductSelectionId: selection.id,
    });
    await this.audit.log({ actorId, action: "design-product-selection.retry-mockup", entityType: "DesignProductSelection", entityId: selection.id });
    return job;
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
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.designAsset.update({
        where: { id: design.id },
        data: {
          status: DesignStatus.REJECTED,
          moderationDecision: dto.decision,
          moderationStatus: "REJECTED",
          moderatedById: moderator.sub,
          moderatedAt: new Date(),
          rejectionReasons: reasons as Prisma.InputJsonValue,
          customRejectionReason: dto.customRejectionReason,
        },
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
      return row;
    });

    await this.audit.log({
      actorId: moderator.sub,
      action: "moderation.pipeline.reject",
      entityType: "DesignAsset",
      entityId: design.id,
      metadata: { from: design.status, to: DesignStatus.REJECTED, reasons, customReason: dto.customRejectionReason },
    });
    return updated;
  }

  private async createLocalSelection(tx: Prisma.TransactionClient, moderatorId: string, designId: string, selection: LocalSelectionDto) {
    const [baseProduct, preset] = await Promise.all([
      tx.baseProduct.findUnique({
        where: { id: selection.localBaseProductId },
        include: { productType: true, mockupTemplates: { include: { printAreas: true } } },
      }),
      tx.placementPreset.findUnique({ where: { id: selection.placementPresetId } }),
    ]);
    if (!baseProduct || !baseProduct.isActive) throw new BadRequestException("PRODUCT_SELECTION_REQUIRED: local base product is not active");
    if (!baseProduct.productType.isActive) throw new BadRequestException("PRODUCT_SELECTION_REQUIRED: product type is not active");
    if (!preset || !preset.active || preset.pipeline !== PipelineType.LOCAL) throw new BadRequestException("INVALID_PLACEMENT: placement preset is not active for local pipeline");
    if (preset.localBaseProductId && preset.localBaseProductId !== baseProduct.id) throw new BadRequestException("INVALID_PLACEMENT: preset does not belong to local product");

    const placement = this.normalizePlacement(selection.placement);
    const selectedTemplate = selection.mockupTemplateId
      ? baseProduct.mockupTemplates.find((template) => template.id === selection.mockupTemplateId)
      : baseProduct.mockupTemplates.find((template) => template.isActive && template.printAreas.some((item) => item.isActive && item.placement === placement));
    if (!selectedTemplate || !selectedTemplate.isActive) throw new BadRequestException("INVALID_PLACEMENT: mockup template is not active for local product");

    const area = selection.printAreaId
      ? selectedTemplate.printAreas.find((item) => item.id === selection.printAreaId)
      : selectedTemplate.printAreas.find((item) => item.isActive && item.placement === placement);
    if (!area) throw new BadRequestException("INVALID_PLACEMENT: printable area not found for local product");
    if (!area.isActive) throw new BadRequestException("INVALID_PLACEMENT: printable area is not active");
    if (area.placement !== placement) throw new BadRequestException("INVALID_PLACEMENT: printable area placement does not match selection");

    const unit = selection.unit === "PX" ? PlacementUnits.PX : PlacementUnits.CM;
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
    const placementConfig = this.localPlacementConfig({ template: selectedTemplate, area, preset, unit, anchor, position });
    const positionHash = this.selectionHash({ pipeline: PipelineType.LOCAL, localBaseProductId: baseProduct.id, presetId: preset.id, placement, placementConfig });

    const row = await tx.designProductSelection.upsert({
      where: { designId_pipeline_positionHash: { designId, pipeline: PipelineType.LOCAL, positionHash } },
      create: {
        designId,
        pipeline: PipelineType.LOCAL,
        localBaseProductId: baseProduct.id,
        placementPresetId: preset.id,
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
        placementPresetId: preset.id,
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

    const placement = this.normalizePlacement(selection.placement);
    const placementText = selection.placement.toLowerCase();
    const allowedPlacements = this.jsonStringArray(template.allowedPlacements);
    if (!allowedPlacements.includes(placementText)) throw new BadRequestException("INVALID_PLACEMENT: Printful placement is not allowed for this template");
    const technique = selection.technique ?? template.defaultTechnique;
    const allowedTechniques = this.jsonStringArray(template.allowedTechniques);
    if (!allowedTechniques.includes(technique)) throw new BadRequestException("INVALID_PLACEMENT: Printful technique is not allowed for this template");

    const position = this.placementCalculation.calculatePrintfulPosition(selection.position);
    const areaInches = this.resolveTemplatePrintArea(template, placementText);
    this.placementCalculation.validatePositionWithinArea(
      position,
      { widthIn: areaInches.printAreaWidthIn, heightIn: areaInches.printAreaHeightIn },
      "INCH",
    );
    const selectedVariantIds = selection.selectedVariantIds?.filter(Boolean) ?? [];
    const placementConfigJson = {
      version: 1,
      selectedVariantIds,
      printAreaInches: areaInches,
    };
    const marketplaces = this.normalizeMarketplaces(selection.targetMarketplaces ?? []);
    const positionHash = this.selectionHash({
      pipeline: PipelineType.GLOBAL_PRINTFUL,
      templateId: template.id,
      presetId: preset.id,
      placement,
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
        placement,
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
    template: { id: string; name: string; baseImageKey: string; lifestyleImageKey: string | null; closeupImageKey: string | null };
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
    };
    preset: { id: string; name: string; alignment: unknown };
    unit: PlacementUnits;
    anchor: string;
    position: { width?: number; height?: number; x?: number; y?: number; scale: number; rotation: number };
  }) {
    return {
      version: 1,
      mockupTemplate: {
        id: input.template.id,
        name: input.template.name,
        baseImageKey: input.template.baseImageKey,
        lifestyleImageKey: input.template.lifestyleImageKey,
        closeupImageKey: input.template.closeupImageKey,
      },
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
      placementPreset: { id: input.preset.id, name: input.preset.name, alignment: input.preset.alignment },
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
