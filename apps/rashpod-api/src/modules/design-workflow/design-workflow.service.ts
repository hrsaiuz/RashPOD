import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
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
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { JobDispatcherService } from "../worker-jobs/job-dispatcher.service";
import { MarketplaceComplianceService } from "./marketplace-compliance.service";
import { PlacementCalculationService } from "./placement-calculation.service";
import { GlobalPrintfulSelectionDto, LocalSelectionDto, SubmitModerationDecisionDto } from "./dto/moderation-decision.dto";

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

@Injectable()
export class DesignWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly jobs: JobDispatcherService,
    private readonly placementCalculation: PlacementCalculationService,
    private readonly marketplaceCompliance: MarketplaceComplianceService,
  ) {}

  moderationQueue(filters?: { status?: string; q?: string }) {
    const status = this.mapStatusFilter(filters?.status);
    return this.prisma.designAsset.findMany({
      where: {
        status: status ? status : { in: [DesignStatus.SUBMITTED, DesignStatus.PENDING_MODERATION] },
        ...(filters?.q
          ? {
              OR: [
                { title: { contains: filters.q, mode: "insensitive" } },
                { description: { contains: filters.q, mode: "insensitive" } },
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
    const design = await this.prisma.designAsset.findUnique({
      where: { id },
      include: {
        designer: { select: { id: true, email: true, displayName: true, handle: true } },
        versions: { orderBy: { createdAt: "desc" }, take: 5 },
        moderationCases: { orderBy: { createdAt: "desc" }, take: 10 },
        moderationAudits: { orderBy: { createdAt: "desc" }, take: 10 },
        productSelections: { include: { mockupAssets: true, localBaseProduct: true, printfulProductTemplate: true, placementPreset: true } },
        listings: { include: { marketplacePublications: true } },
      },
    });
    if (!design) throw new NotFoundException("Design not found");
    return design;
  }

  workflow(id: string) {
    return this.moderationDetail(id);
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
        include: { mockupTemplates: { include: { printAreas: true } } },
      }),
      tx.placementPreset.findUnique({ where: { id: selection.placementPresetId } }),
    ]);
    if (!baseProduct || !baseProduct.isActive) throw new BadRequestException("PRODUCT_SELECTION_REQUIRED: local base product is not active");
    if (!preset || !preset.active || preset.pipeline !== PipelineType.LOCAL) throw new BadRequestException("INVALID_PLACEMENT: placement preset is not active for local pipeline");
    if (preset.localBaseProductId && preset.localBaseProductId !== baseProduct.id) throw new BadRequestException("INVALID_PLACEMENT: preset does not belong to local product");

    const placement = this.normalizePlacement(selection.placement);
    const area = baseProduct.mockupTemplates.flatMap((template) => template.printAreas).find((item) => item.isActive && item.placement === placement);
    if (!area) throw new BadRequestException("INVALID_PLACEMENT: printable area not found for local product");

    const position = this.placementCalculation.calculateLocalPosition(selection.position);
    this.placementCalculation.validatePositionWithinArea(position, { widthCm: area.widthCm, heightCm: area.heightCm, widthPx: area.width, heightPx: area.height }, "CM");
    const positionHash = this.selectionHash({ pipeline: PipelineType.LOCAL, localBaseProductId: baseProduct.id, presetId: preset.id, placement, position });

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
        units: PlacementUnits.CM,
        positionHash,
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
    this.placementCalculation.validatePositionWithinArea(position, { widthIn: preset.defaultWidthIn, heightIn: preset.defaultHeightIn }, "INCH");
    const marketplaces = this.normalizeMarketplaces(selection.targetMarketplaces ?? []);
    const positionHash = this.selectionHash({ pipeline: PipelineType.GLOBAL_PRINTFUL, templateId: template.id, presetId: preset.id, placement, technique, position, marketplaces });

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
        targetMarketplaces: marketplaces as Prisma.InputJsonValue,
        selectedByModeratorId: moderatorId,
        status: DesignProductSelectionStatus.MOCKUP_PENDING,
        errorMessage: null,
      },
    });

    await this.ensurePendingMockupAssets(tx, designId, row.id, PipelineType.GLOBAL_PRINTFUL, ProviderType.PRINTFUL);
  }

  private async ensurePendingMockupAssets(tx: Prisma.TransactionClient, designId: string, selectionId: string, pipeline: PipelineType, provider: ProviderType) {
    for (const mockupType of [MockupAssetType.MAIN, MockupAssetType.SECONDARY, MockupAssetType.PRINT_AREA_PREVIEW]) {
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

  private mapStatusFilter(status?: string) {
    if (!status || status === "PENDING_MODERATION") return undefined;
    if (status in DesignStatus) return status as DesignStatus;
    return undefined;
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
}
