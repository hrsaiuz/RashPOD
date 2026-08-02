import { DesignProductSelectionStatus, GeneratedAssetStatus, IntegrationLogStatus, ListingStatus, ListingType, MarketplaceKind, MarketplacePublicationStatus, NotificationDeliveryStatus, PipelineType, PlacementAlignment, PlacementKind, PlacementUnits, PodProviderType, Prisma, ProductionJobStatus, ProviderType } from "@prisma/client";
import { parsePrintfulSettings } from "@rashpod/printful";
import { getPrismaClient } from "./db";
import { AiJobRecord, GeneratedAssetRecord, MarketplacePublicationPublishContext, MarketplacePublicationRecord, MockupAssetRecord, PipelineSelectionRecord, PipelineSelectionStatus, PrintfulSettingsRecord, ProductionJobRecord, WorkerRepository } from "./repository";

export class PrismaAssetRepository implements WorkerRepository {
  private readonly prisma = getPrismaClient();

  async getNotificationDelivery(id: string) {
    const row = await this.prisma.notificationDelivery.findUnique({ where: { id } });
    if (!row) return null;
    return {
      id: row.id,
      channel: row.channel,
      status: row.status,
      destination: row.destination,
      payloadJson: row.payloadJson,
    };
  }

  async updateNotificationDelivery(id: string, data: { status?: string; providerRef?: string | null; errorMessage?: string | null; attemptedAt?: Date | null; deliveredAt?: Date | null }) {
    const row = await this.prisma.notificationDelivery.update({
      where: { id },
      data: {
        status: data.status as NotificationDeliveryStatus | undefined,
        providerRef: data.providerRef,
        errorMessage: data.errorMessage,
        attemptedAt: data.attemptedAt,
        deliveredAt: data.deliveredAt,
      },
    });
    return {
      id: row.id,
      channel: row.channel,
      status: row.status,
      destination: row.destination,
      payloadJson: row.payloadJson,
    };
  }

  async getGeneratedAsset(id: string): Promise<GeneratedAssetRecord | null> {
    const row = await this.prisma.generatedAsset.findUnique({ where: { id } });
    if (!row) return null;
    return {
      id: row.id,
      status: row.status,
      fileKey: row.fileKey ?? undefined,
      objectKey: row.objectKey ?? undefined,
      contentType: row.contentType ?? undefined,
      format: row.format ?? undefined,
      errorMessage: row.errorMessage ?? undefined,
      widthPx: row.widthPx ?? undefined,
      heightPx: row.heightPx ?? undefined,
    };
  }

  async getAiJob(id: string): Promise<AiJobRecord | null> {
    const row = await this.prisma.aiJob.findUnique({ where: { id } });
    if (!row) return null;
    return {
      id: row.id,
      workflow: row.workflow,
      entityType: row.entityType,
      entityId: row.entityId,
      provider: row.provider,
      model: row.model,
      status: row.status,
      inputSummary: row.inputSummary,
      inputSnapshot: row.inputSnapshot,
      promptVersion: row.promptVersion,
      outputSummary: row.outputSummary,
      tokenUsageJson: row.tokenUsageJson,
      costEstimateUsd: row.costEstimateUsd == null ? null : Number(row.costEstimateUsd),
      failureReason: row.failureReason,
    };
  }

  async updateAiJob(id: string, data: { status?: string; outputSummary?: unknown; tokenUsageJson?: unknown; costEstimateUsd?: number | null; failureReason?: string | null; completedAt?: Date | null }): Promise<AiJobRecord> {
    await this.prisma.aiJob.update({
      where: { id },
      data: {
        status: data.status as any,
        outputSummary: data.outputSummary === undefined ? undefined : data.outputSummary as Prisma.InputJsonValue,
        tokenUsageJson: data.tokenUsageJson === undefined ? undefined : data.tokenUsageJson as Prisma.InputJsonValue,
        costEstimateUsd: data.costEstimateUsd === undefined ? undefined : data.costEstimateUsd,
        failureReason: data.failureReason,
        completedAt: data.completedAt === undefined ? undefined : data.completedAt,
      },
    });
    const updated = await this.getAiJob(id);
    if (!updated) throw new Error(`AI job ${id} not found`);
    return updated;
  }

  async createAiSuggestion(data: { aiJobId: string; suggestionType: string; confidence?: number | null; severity?: string | null; payload: unknown }) {
    const row = await this.prisma.aiSuggestion.create({
      data: {
        aiJobId: data.aiJobId,
        suggestionType: data.suggestionType as any,
        confidence: data.confidence,
        severity: (data.severity ?? "INFO") as any,
        payload: data.payload as Prisma.InputJsonValue,
      },
    });
    return { id: row.id };
  }

  async updateGeneratedAsset(
    id: string,
    data: Partial<Pick<GeneratedAssetRecord, "status" | "fileKey" | "objectKey" | "contentType" | "format" | "errorMessage" | "widthPx" | "heightPx">>,
  ): Promise<GeneratedAssetRecord> {
    const row = await this.prisma.generatedAsset.update({
      where: { id },
      data: {
        status: data.status as GeneratedAssetStatus | undefined,
        fileKey: data.fileKey,
        objectKey: data.objectKey,
        contentType: data.contentType,
        format: data.format,
        errorMessage: data.errorMessage,
        widthPx: data.widthPx,
        heightPx: data.heightPx,
      },
    });
    if (data.status === "READY") {
      await this.prisma.productionJob.updateMany({
        where: { productionFileAssetId: id },
        data: { productionFileStatus: "READY", productionFileObjectKey: data.objectKey, status: ProductionJobStatus.READY_FOR_PRINT, failureReason: null },
      });
    }
    if (data.status === "FAILED") {
      await this.prisma.productionJob.updateMany({
        where: { productionFileAssetId: id },
        data: { productionFileStatus: "FAILED", failureReason: data.errorMessage, status: ProductionJobStatus.WAITING_FOR_FILE },
      });
    }
    return {
      id: row.id,
      status: row.status,
      fileKey: row.fileKey ?? undefined,
      objectKey: row.objectKey ?? undefined,
      contentType: row.contentType ?? undefined,
      format: row.format ?? undefined,
      errorMessage: row.errorMessage ?? undefined,
      widthPx: row.widthPx ?? undefined,
      heightPx: row.heightPx ?? undefined,
    };
  }

  async getProductionJob(id: string): Promise<ProductionJobRecord | null> {
    const row = await this.prisma.productionJob.findUnique({ where: { id } });
    if (!row) return null;
    return {
      id: row.id,
      orderId: row.orderId,
      orderItemId: row.orderItemId,
      status: row.status,
      queueType: row.queueType,
      productionFileStatus: row.productionFileStatus,
      productionFileObjectKey: row.productionFileObjectKey,
      productionFileUrl: row.productionFileUrl,
      productSnapshotJson: row.productSnapshotJson,
      assetSnapshotJson: row.assetSnapshotJson,
      gangSheetSnapshotJson: row.gangSheetSnapshotJson,
      selectedOptionsJson: row.selectedOptionsJson,
      notes: row.notes,
    };
  }

  async updateProductionJob(
    id: string,
    data: { productionFileStatus?: string | null; productionFileObjectKey?: string | null; productionFileUrl?: string | null; status?: string; failureReason?: string | null },
  ): Promise<ProductionJobRecord> {
    await this.prisma.productionJob.update({
      where: { id },
      data: {
        productionFileStatus: data.productionFileStatus,
        productionFileObjectKey: data.productionFileObjectKey,
        productionFileUrl: data.productionFileUrl,
        status: data.status as ProductionJobStatus | undefined,
        failureReason: data.failureReason,
      },
    });
    const updated = await this.getProductionJob(id);
    if (!updated) throw new Error(`Production job ${id} not found`);
    return updated;
  }

  async getLegacyPlacementRenderContext(placementId: string) {
    const placement = await this.prisma.mockupPlacement.findUnique({
      where: { id: placementId },
      include: {
        designVersion: true,
        mockupTemplate: {
          include: {
            baseProduct: true,
            galleryAssets: {
              where: { isActive: true },
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            },
          },
        },
        printArea: { include: { mockupView: true } },
      },
    });
    if (!placement) return null;

    const viewId = placement.printArea.mockupView?.id;
    const galleryAsset = (role: "LIFESTYLE" | "DETAIL") => {
      const assets = placement.mockupTemplate.galleryAssets.filter((asset) => asset.role === role);
      return assets.find((asset) => asset.mockupViewId === viewId)
        ?? assets.find((asset) => asset.mockupViewId === null)
        ?? assets[0];
    };
    const lifestyle = galleryAsset("LIFESTYLE");
    const detail = galleryAsset("DETAIL");
    const view = placement.printArea.mockupView;

    return {
      id: placement.id,
      pipeline: "LOCAL" as const,
      placement: placement.printArea.placement ?? undefined,
      latestDesignVersion: {
        fileKey: placement.designVersion.fileKey,
        widthPx: placement.designVersion.widthPx,
        heightPx: placement.designVersion.heightPx,
        dpi: placement.designVersion.dpi,
        hasTransparency: placement.designVersion.hasTransparency,
      },
      width: placement.width,
      height: placement.height,
      x: placement.x,
      y: placement.y,
      scale: placement.scale,
      rotation: placement.rotation,
      units: "PX" as const,
      localBaseProduct: { name: placement.mockupTemplate.baseProduct.name },
      placementConfigJson: {
        version: 1,
        mockupTemplate: {
          id: placement.mockupTemplate.id,
          name: placement.mockupTemplate.name,
          baseImageKey: view?.blankImageKey ?? placement.mockupTemplate.baseImageKey,
          lifestyleImageKey: lifestyle?.imageKey ?? placement.mockupTemplate.lifestyleImageKey,
          closeupImageKey: detail?.imageKey ?? placement.mockupTemplate.closeupImageKey,
        },
        mockupView: view
          ? {
              id: view.id,
              viewKey: view.viewKey,
              placementCode: view.placementCode,
              name: view.name,
              blankImageKey: view.blankImageKey,
            }
          : null,
        galleryAssets: [lifestyle, detail]
          .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset))
          .map((asset) => ({
            id: asset.id,
            mockupViewId: asset.mockupViewId,
            role: asset.role,
            imageKey: asset.imageKey,
            sortOrder: asset.sortOrder,
          })),
        printArea: {
          id: placement.printArea.id,
          name: placement.printArea.name,
          placement: placement.printArea.placement,
          x: placement.printArea.x,
          y: placement.printArea.y,
          width: placement.printArea.width,
          height: placement.printArea.height,
          safeX: placement.printArea.safeX,
          safeY: placement.printArea.safeY,
          safeWidth: placement.printArea.safeWidth,
          safeHeight: placement.printArea.safeHeight,
        },
        unit: "PX",
        position: {
          x: placement.x,
          y: placement.y,
          width: placement.width,
          height: placement.height,
          scale: placement.scale,
          rotation: placement.rotation,
        },
      },
    };
  }

  async getPrintfulFulfillmentOrderContext(orderId: string, storeId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        productionJobs: {
          where: { providerType: PodProviderType.PRINTFUL },
          include: { orderItem: true },
        },
      },
    });
    if (!order) return null;
    const record = (value: unknown): Record<string, unknown> =>
      value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
    const jobs = order.productionJobs
      .filter((job) => String(record(job.providerPayloadSnapshotJson).providerStoreId ?? "") === storeId)
      .filter((job) => Boolean(job.orderItem?.providerVariantId))
      .map((job) => ({
        id: job.id,
        quantity: job.orderItem!.quantity,
        providerVariantId: String(job.orderItem!.providerVariantId),
        retailPrice: job.orderItem!.unitPrice.toString(),
      }));
    const delivery = record(order.deliverySnapshotJson);
    const recipient = record(delivery.recipient);
    return {
      orderId: order.id,
      storeId,
      currency: order.currency,
      recipient,
      existingProviderOrderId: order.productionJobs.find((job) => job.providerOrderId)?.providerOrderId ?? null,
      jobs,
    };
  }

  async updatePrintfulFulfillmentJobs(
    jobIds: string[],
    data: {
      providerOrderId?: string | null;
      providerStatus?: string | null;
      status?: string;
      failureReason?: string | null;
      providerResponse?: unknown;
    },
  ) {
    const rows = await this.prisma.productionJob.findMany({ where: { id: { in: jobIds } } });
    await this.prisma.$transaction(rows.map((row) => {
      const metadata = row.providerPayloadSnapshotJson && typeof row.providerPayloadSnapshotJson === "object" && !Array.isArray(row.providerPayloadSnapshotJson)
        ? row.providerPayloadSnapshotJson as Record<string, unknown>
        : {};
      return this.prisma.productionJob.update({
        where: { id: row.id },
        data: {
          providerOrderId: data.providerOrderId,
          providerStatus: data.providerStatus,
          status: data.status as ProductionJobStatus | undefined,
          failureReason: data.failureReason,
          providerPayloadSnapshotJson: {
            ...metadata,
            ...(data.providerResponse === undefined ? {} : { providerResponse: data.providerResponse }),
            providerUpdatedAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        },
      });
    }));
  }

  async getPipelineSelection(id: string): Promise<PipelineSelectionRecord | null> {
    const row = await this.prisma.designProductSelection.findUnique({
      where: { id },
      include: {
        design: { include: { versions: { orderBy: { createdAt: "desc" }, take: 20 } } },
        sourceDesignVersion: true,
        localBaseProduct: true,
        printfulProductTemplate: true,
      },
    });
    if (!row) return null;
    const sourceVersion = row.sourceDesignVersion
      ?? row.design.versions.find((version) => version.placement === row.placement)
      ?? row.design.versions.find((version) => !version.placement)
      ?? (row.placement ? undefined : row.design.versions[0]);
    return {
      id: row.id,
      designId: row.designId,
      pipeline: row.pipeline,
      status: row.status,
      errorMessage: row.errorMessage ?? undefined,
      productCompositionId: row.productCompositionId,
      targetMarketplaces: row.targetMarketplaces,
      placement: row.placement,
      providerPlacement: row.providerPlacement,
      technique: row.technique,
      width: row.width,
      height: row.height,
      x: row.x,
      y: row.y,
      top: row.top,
      left: row.left,
      scale: row.scale,
      rotation: row.rotation,
      units: row.units,
      placementConfigJson: row.placementConfigJson,
      design: { id: row.design.id, title: row.design.title, designerId: row.design.designerId },
      latestDesignVersion: sourceVersion
        ? {
            id: sourceVersion.id,
            fileKey: sourceVersion.fileKey,
            widthPx: sourceVersion.widthPx,
            heightPx: sourceVersion.heightPx,
            dpi: sourceVersion.dpi,
            hasTransparency: sourceVersion.hasTransparency,
          }
        : null,
      localBaseProduct: row.localBaseProduct
        ? {
            id: row.localBaseProduct.id,
            name: row.localBaseProduct.name,
            imageUrl: row.localBaseProduct.imageUrl ?? undefined,
            defaultPrice: row.localBaseProduct.defaultPrice,
            baseCost: row.localBaseProduct.baseCost,
            currency: row.localBaseProduct.currency,
          }
        : null,
      printfulProductTemplate: row.printfulProductTemplate
        ? {
            id: row.printfulProductTemplate.id,
            displayName: row.printfulProductTemplate.displayName,
            printfulCatalogProductId: row.printfulProductTemplate.printfulCatalogProductId,
            printfulVariantIds: row.printfulProductTemplate.printfulVariantIds,
            allowedPlacements: row.printfulProductTemplate.allowedPlacements,
            allowedTechniques: row.printfulProductTemplate.allowedTechniques,
            defaultPlacement: row.printfulProductTemplate.defaultPlacement,
            defaultTechnique: row.printfulProductTemplate.defaultTechnique,
            defaultRetailPrice: row.printfulProductTemplate.defaultRetailPrice,
            estimatedBaseCost: row.printfulProductTemplate.estimatedBaseCost,
            currency: row.printfulProductTemplate.currency,
          }
        : null,
    };
  }

  async updatePipelineSelection(id: string, data: { status?: PipelineSelectionStatus; errorMessage?: string | null }) {
    await this.prisma.designProductSelection.update({
      where: { id },
      data: { status: data.status as DesignProductSelectionStatus | undefined, errorMessage: data.errorMessage },
    });
    const updated = await this.getPipelineSelection(id);
    if (!updated) throw new Error(`Pipeline selection ${id} not found`);
    return updated;
  }

  async listMockupAssets(selectionId: string): Promise<MockupAssetRecord[]> {
    const rows = await this.prisma.mockupAsset.findMany({
      where: { designProductSelectionId: selectionId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      mockupType: row.mockupType,
      status: row.status,
      imageUrl: row.imageUrl,
      objectKey: row.objectKey,
      failureReason: row.failureReason,
      metadataJson: row.metadataJson,
    }));
  }

  async updateMockupAsset(
    id: string,
    data: {
      status?: "PENDING" | "PROCESSING" | "GENERATED" | "READY" | "FAILED" | "REPLACED" | "ARCHIVED";
      imageUrl?: string | null;
      thumbnailUrl?: string | null;
      objectKey?: string | null;
      contentType?: string | null;
      format?: string | null;
      widthPx?: number | null;
      heightPx?: number | null;
      dpi?: number | null;
      placementSnapshotJson?: unknown;
      renderJobId?: string | null;
      failureReason?: string | null;
      providerTaskId?: string | null;
      metadataJson?: unknown;
    },
  ): Promise<MockupAssetRecord> {
    const row = await this.prisma.mockupAsset.update({
      where: { id },
      data: {
        status: data.status,
        imageUrl: data.imageUrl,
        thumbnailUrl: data.thumbnailUrl,
        objectKey: data.objectKey,
        contentType: data.contentType,
        format: data.format,
        widthPx: data.widthPx,
        heightPx: data.heightPx,
        dpi: data.dpi,
        placementSnapshotJson: data.placementSnapshotJson as Prisma.InputJsonValue | undefined,
        renderJobId: data.renderJobId,
        failureReason: data.failureReason,
        providerTaskId: data.providerTaskId,
        metadataJson: data.metadataJson as Prisma.InputJsonValue | undefined,
      },
    });
    return { id: row.id, mockupType: row.mockupType, status: row.status, imageUrl: row.imageUrl, objectKey: row.objectKey };
  }

  async createListingDraftForSelection(selectionId: string) {
    const selection = await this.prisma.designProductSelection.findUnique({
      where: { id: selectionId },
      include: { design: true, localBaseProduct: true, printfulProductTemplate: true, mockupAssets: true },
    });
    if (!selection || selection.status !== DesignProductSelectionStatus.MOCKUP_READY) return null;
    if (selection.productCompositionId) return this.createListingDraftForComposition(selection.productCompositionId);
    const existing = await this.prisma.commerceListing.findUnique({ where: { designProductSelectionId: selection.id } });
    if (existing) return { id: existing.id, status: existing.status };

    const isLocal = selection.pipeline === PipelineType.LOCAL;
    const title = isLocal
      ? `${selection.design.title} ${selection.localBaseProduct?.name ?? "Local product"}`
      : `${selection.design.title} ${selection.printfulProductTemplate?.displayName ?? "Global product"}`;
    const slug = `${selection.design.title}-${selection.id}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const price = isLocal ? (selection.localBaseProduct?.defaultPrice ?? new Prisma.Decimal(0)) : (selection.printfulProductTemplate?.defaultRetailPrice ?? new Prisma.Decimal(0));
    const cost = isLocal ? selection.localBaseProduct?.baseCost : selection.printfulProductTemplate?.estimatedBaseCost;
    const royalty = await this.calculateRoyalty(price, cost ?? null);

    const listing = await this.prisma.commerceListing.create({
      data: {
        type: ListingType.PRODUCT,
        status: ListingStatus.DRAFT,
        designerId: selection.design.designerId,
        designAssetId: selection.designId,
        pipeline: selection.pipeline,
        title,
        slug,
        price,
        currency: isLocal ? selection.localBaseProduct?.currency ?? "UZS" : selection.printfulProductTemplate?.currency ?? "USD",
        cost,
        designerRoyalty: royalty.amount,
        localBaseProductId: selection.localBaseProductId,
        printfulProductTemplateId: selection.printfulProductTemplateId,
        designProductSelectionId: selection.id,
        mockupAssetIds: selection.mockupAssets.filter((asset) => asset.status === "GENERATED" || asset.status === "READY").map((asset) => asset.id),
        imagesJson: selection.mockupAssets
          .filter((asset) => asset.status === "GENERATED" || asset.status === "READY")
          .map((asset) => asset.imageUrl)
          .filter(Boolean),
        metadataJson: {
          ...(royalty.rule ? { royaltyRuleId: royalty.rule.id, royaltyBasis: royalty.rule.basis, royaltyValue: royalty.rule.value.toString() } : {}),
          renderAssets: selection.mockupAssets
            .filter((asset) => asset.status === "GENERATED" || asset.status === "READY")
            .map((asset) => ({ id: asset.id, objectKey: asset.objectKey, contentType: asset.contentType, widthPx: asset.widthPx, heightPx: asset.heightPx, mockupType: asset.mockupType })),
        },
      },
    });

    const marketplaces = this.marketplacesForSelection(selection.pipeline, selection.targetMarketplaces);
    for (const marketplace of marketplaces) {
      await this.prisma.marketplacePublication.upsert({
        where: {
          productListingId_marketplace_publicationKey: {
            productListingId: listing.id,
            marketplace,
            publicationKey: "default",
          },
        },
        create: {
          productListingId: listing.id,
          marketplace,
          publicationKey: "default",
          provider: marketplace === MarketplaceKind.RASHPOD_LOCAL || marketplace === MarketplaceKind.LOCAL_MARKETPLACE ? ProviderType.RASHPOD : ProviderType.PRINTFUL,
          status: marketplace === MarketplaceKind.AMAZON ? MarketplacePublicationStatus.NEEDS_REVIEW : MarketplacePublicationStatus.DRAFT,
        },
        update: {},
      });
    }

    await this.prisma.designProductSelection.update({ where: { id: selection.id }, data: { status: DesignProductSelectionStatus.LISTING_DRAFT } });
    return { id: listing.id, status: listing.status };
  }

  private async createListingDraftForComposition(compositionId: string) {
    const composition = await this.prisma.productComposition.findUnique({
      where: { id: compositionId },
      include: {
        design: true,
        localBaseProduct: true,
        printfulProductTemplate: true,
        selections: { include: { mockupAssets: true }, orderBy: { createdAt: "asc" } },
      },
    });
    if (!composition) return null;
    if (!compositionReadyForListing(composition.selections)) return null;

    const primary = composition.selections.find((item) => item.placement === PlacementKind.FRONT) ?? composition.selections[0]!;
    const generatedAssets = composition.selections.flatMap((item) => item.mockupAssets.map((asset) => ({ ...asset, selection: item })))
      .filter((asset) => asset.status === "GENERATED" || asset.status === "READY");
    const publicAssets = selectCompositionGallery(generatedAssets, primary.id);
    if (publicAssets.length < 3) return null;

    const isLocal = composition.pipeline === PipelineType.LOCAL;
    const title = isLocal
      ? `${composition.design.title} ${composition.localBaseProduct?.name ?? "Local product"}`
      : `${composition.design.title} ${composition.printfulProductTemplate?.displayName ?? "Global product"}`;
    const slug = `${composition.design.title}-${composition.id}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const price = isLocal ? (composition.localBaseProduct?.defaultPrice ?? new Prisma.Decimal(0)) : (composition.printfulProductTemplate?.defaultRetailPrice ?? new Prisma.Decimal(0));
    const cost = isLocal ? composition.localBaseProduct?.baseCost : composition.printfulProductTemplate?.estimatedBaseCost;
    const royalty = await this.calculateRoyalty(price, cost ?? null);

    const listing = await this.prisma.commerceListing.upsert({
      where: { productCompositionId: composition.id },
      create: {
        type: ListingType.PRODUCT,
        status: ListingStatus.DRAFT,
        designerId: composition.design.designerId,
        designAssetId: composition.designId,
        pipeline: composition.pipeline,
        title,
        slug,
        price,
        currency: isLocal ? composition.localBaseProduct?.currency ?? "UZS" : composition.printfulProductTemplate?.currency ?? "USD",
        cost,
        designerRoyalty: royalty.amount,
        localBaseProductId: composition.localBaseProductId,
        printfulProductTemplateId: composition.printfulProductTemplateId,
        designProductSelectionId: primary.id,
        productCompositionId: composition.id,
        mockupAssetIds: generatedAssets.map((asset) => asset.id),
        imagesJson: publicAssets.map((asset) => asset.imageUrl).filter(Boolean),
        metadataJson: {
          ...(royalty.rule ? { royaltyRuleId: royalty.rule.id, royaltyBasis: royalty.rule.basis, royaltyValue: royalty.rule.value.toString() } : {}),
          productCompositionId: composition.id,
          placements: composition.selections.map((item) => ({
            selectionId: item.id,
            placement: item.placement,
            providerPlacement: item.providerPlacement,
            sourceDesignVersionId: item.sourceDesignVersionId,
            placementConfigJson: item.placementConfigJson,
          })),
          renderAssets: generatedAssets.map((asset) => ({ id: asset.id, selectionId: asset.selection.id, placement: asset.selection.placement, objectKey: asset.objectKey, contentType: asset.contentType, widthPx: asset.widthPx, heightPx: asset.heightPx, mockupType: asset.mockupType })),
        },
      },
      update: {},
    });

    const targets = [...new Set(composition.selections.flatMap((item) => this.marketplacesForSelection(item.pipeline, item.targetMarketplaces)))];
    for (const marketplace of targets) {
      await this.prisma.marketplacePublication.upsert({
        where: {
          productListingId_marketplace_publicationKey: {
            productListingId: listing.id,
            marketplace,
            publicationKey: "default",
          },
        },
        create: {
          productListingId: listing.id,
          marketplace,
          publicationKey: "default",
          provider: marketplace === MarketplaceKind.RASHPOD_LOCAL || marketplace === MarketplaceKind.LOCAL_MARKETPLACE ? ProviderType.RASHPOD : ProviderType.PRINTFUL,
          status: marketplace === MarketplaceKind.AMAZON ? MarketplacePublicationStatus.NEEDS_REVIEW : MarketplacePublicationStatus.DRAFT,
        },
        update: {},
      });
    }
    await this.prisma.designProductSelection.updateMany({
      where: { productCompositionId: composition.id },
      data: { status: DesignProductSelectionStatus.LISTING_DRAFT },
    });
    return { id: listing.id, status: listing.status };
  }

  async getMarketplacePublication(id: string): Promise<MarketplacePublicationRecord | null> {
    const row = await this.prisma.marketplacePublication.findUnique({
      where: { id },
      include: { productListing: true },
    });
    if (!row) return null;
    return {
      id: row.id,
      marketplace: row.marketplace,
      publicationKey: row.publicationKey,
      provider: row.provider,
      providerStoreId: row.providerStoreId,
      status: row.status,
      providerSyncProductId: row.providerSyncProductId,
      providerExternalListingId: row.providerExternalListingId,
      metadataJson: row.metadataJson,
      productListing: {
        id: row.productListing.id,
        status: row.productListing.status,
        title: row.productListing.title,
        price: row.productListing.price,
        currency: row.productListing.currency,
        pipeline: row.productListing.pipeline,
        mockupAssetIds: row.productListing.mockupAssetIds,
        designProductSelectionId: row.productListing.designProductSelectionId,
        productCompositionId: row.productListing.productCompositionId,
        printfulProductTemplateId: row.productListing.printfulProductTemplateId,
      },
    };
  }

  async getMarketplacePublicationPublishContext(id: string): Promise<MarketplacePublicationPublishContext | null> {
    const publication = await this.getMarketplacePublication(id);
    if (!publication?.productListing.designProductSelectionId) return publication;
    const selection = await this.getPipelineSelection(publication.productListing.designProductSelectionId);
    const compositionRows = publication.productListing.productCompositionId
      ? await this.prisma.designProductSelection.findMany({ where: { productCompositionId: publication.productListing.productCompositionId }, orderBy: { createdAt: "asc" } })
      : [];
    const compositionSelections = (await Promise.all(compositionRows.map((item) => this.getPipelineSelection(item.id))))
      .filter((item): item is PipelineSelectionRecord => Boolean(item));
    const mockupIds = Array.isArray(publication.productListing.mockupAssetIds) ? publication.productListing.mockupAssetIds.filter((item): item is string => typeof item === "string") : [];
    const mockupAssets = mockupIds.length
      ? await this.prisma.mockupAsset.findMany({ where: { id: { in: mockupIds } } })
      : selection
        ? await this.prisma.mockupAsset.findMany({ where: { designProductSelectionId: selection.id } })
        : [];
    const mapping = selection
      ? await this.prisma.printfulFileMapping.findFirst({ where: { designId: selection.designId, status: "READY" }, orderBy: { updatedAt: "desc" } })
      : null;
    return {
      ...publication,
      selection,
      compositionSelections,
      printfulFileId: mapping?.printfulFileId ?? null,
      mockupAssets: mockupAssets.map((asset) => ({ id: asset.id, mockupType: asset.mockupType, status: asset.status, imageUrl: asset.imageUrl, objectKey: asset.objectKey })),
      printfulProductTemplate: selection?.printfulProductTemplate ?? null,
    };
  }

  async getMockupAsset(id: string): Promise<MockupAssetRecord | null> {
    const row = await this.prisma.mockupAsset.findUnique({ where: { id } });
    if (!row) return null;
    return { id: row.id, mockupType: row.mockupType, status: row.status, imageUrl: row.imageUrl, objectKey: row.objectKey };
  }

  async countProcessingMockupAssets(selectionId: string) {
    return this.prisma.mockupAsset.count({ where: { designProductSelectionId: selectionId, status: { in: ["PENDING", "PROCESSING"] } } });
  }

  async getPrintfulSettings(): Promise<PrintfulSettingsRecord> {
    const setting = await this.prisma.platformSetting.findUnique({ where: { key: "integrations.printful" } });
    const parsed = parsePrintfulSettings(setting?.value);
    return {
      enabled: parsed.enabled || process.env.PRINTFUL_ENABLED === "true",
      defaultStoreId: parsed.defaultStoreId ?? process.env.PRINTFUL_STORE_ID ?? null,
      catalogAllowlist: parsed.catalogAllowlist,
    };
  }

  async upsertPrintfulProductTemplate(input: {
    rashpodProductType: string;
    displayName: string;
    printfulCatalogProductId: string;
    printfulProductName: string;
    printfulVariantIds: string[];
    allowedColorVariantIds?: string[];
    allowedSizeVariantIds?: string[];
    allowedPlacements: string[];
    allowedTechniques: string[];
    defaultTechnique: string;
    defaultPlacement: string;
    defaultRetailPrice?: string | null;
    estimatedBaseCost?: string | null;
    currency: string;
    previewImageUrl?: string | null;
    printfulStoreId?: string | null;
    printAreasJson?: unknown;
    metadataJson?: unknown;
  }) {
    const item = await this.prisma.printfulProductTemplate.upsert({
      where: {
        provider_printfulCatalogProductId_displayName: {
          provider: ProviderType.PRINTFUL,
          printfulCatalogProductId: input.printfulCatalogProductId,
          displayName: input.displayName,
        },
      },
      create: {
        rashpodProductType: input.rashpodProductType,
        displayName: input.displayName,
        provider: ProviderType.PRINTFUL,
        printfulCatalogProductId: input.printfulCatalogProductId,
        printfulProductName: input.printfulProductName,
        printfulVariantIds: input.printfulVariantIds,
        allowedColorVariantIds: input.allowedColorVariantIds ?? input.printfulVariantIds,
        allowedSizeVariantIds: input.allowedSizeVariantIds ?? input.printfulVariantIds,
        allowedPlacements: input.allowedPlacements,
        allowedTechniques: input.allowedTechniques,
        defaultTechnique: input.defaultTechnique,
        defaultPlacement: input.defaultPlacement,
        defaultRetailPrice: input.defaultRetailPrice ?? undefined,
        estimatedBaseCost: input.estimatedBaseCost ?? undefined,
        currency: input.currency,
        previewImageUrl: input.previewImageUrl ?? undefined,
        printfulStoreId: input.printfulStoreId ?? undefined,
        printAreasJson: input.printAreasJson as Prisma.InputJsonValue | undefined,
        metadataJson: input.metadataJson as Prisma.InputJsonValue | undefined,
        active: true,
      },
      update: {
        rashpodProductType: input.rashpodProductType,
        printfulProductName: input.printfulProductName,
        printfulVariantIds: input.printfulVariantIds,
        allowedColorVariantIds: input.allowedColorVariantIds ?? input.printfulVariantIds,
        allowedSizeVariantIds: input.allowedSizeVariantIds ?? input.printfulVariantIds,
        allowedPlacements: input.allowedPlacements,
        allowedTechniques: input.allowedTechniques,
        defaultTechnique: input.defaultTechnique,
        defaultPlacement: input.defaultPlacement,
        defaultRetailPrice: input.defaultRetailPrice ?? undefined,
        estimatedBaseCost: input.estimatedBaseCost ?? undefined,
        currency: input.currency,
        previewImageUrl: input.previewImageUrl ?? undefined,
        printfulStoreId: input.printfulStoreId ?? undefined,
        printAreasJson: input.printAreasJson as Prisma.InputJsonValue | undefined,
        metadataJson: input.metadataJson as Prisma.InputJsonValue | undefined,
        active: true,
      },
    });
    return { id: item.id, displayName: item.displayName };
  }

  async ensurePrintfulPlacementPreset(productTemplateId: string, rashpodProductType: string) {
    const existing = await this.prisma.placementPreset.findFirst({
      where: { pipeline: PipelineType.GLOBAL_PRINTFUL, productTemplateId, name: "Center front" },
    });
    if (existing) return { created: false };
    await this.prisma.placementPreset.create({
      data: {
        name: "Center front",
        pipeline: PipelineType.GLOBAL_PRINTFUL,
        productTemplateId,
        placement: rashpodProductType === "mug" ? PlacementKind.FULL_WRAP : PlacementKind.FRONT,
        defaultWidthIn: rashpodProductType === "mug" ? 3.5 : 10,
        defaultHeightIn: rashpodProductType === "mug" ? 3 : 12,
        defaultScale: 1,
        alignment: PlacementAlignment.CENTER,
        units: PlacementUnits.INCH,
        active: true,
      },
    });
    return { created: true };
  }

  async ensurePrintfulFileForDesign(
    designId: string,
    uploadFromUrl: (url: string) => Promise<{ fileId: string; printfulUrl?: string | null }>,
    sourceVersion?: { id: string; fileKey: string } | null,
  ) {
    if (!sourceVersion) {
      const existing = await this.prisma.printfulFileMapping.findFirst({
        where: { designId, status: "READY", printfulFileId: { not: null } },
        orderBy: { updatedAt: "desc" },
      });
      if (existing?.printfulFileId && existing.printfulUrl) return { printfulFileId: existing.printfulFileId, printfulUrl: existing.printfulUrl };
    }

    const design = await this.prisma.designAsset.findUnique({
      where: { id: designId },
      include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (!sourceVersion && !design?.versions[0]?.fileKey) throw new Error("DESIGN_FILE_MISSING");

    const mapping = await this.prisma.printfulFileMapping.create({
      data: { designId, status: "PENDING" },
    });
    try {
      const sourceFileKey = sourceVersion?.fileKey ?? design?.versions[0]?.fileKey;
      if (!sourceFileKey) throw new Error("DESIGN_FILE_MISSING");
      const signedUrl = await import("./gcs-signing").then((mod) => mod.createSignedReadUrl(sourceFileKey, 3600));
      const uploaded = await uploadFromUrl(signedUrl);
      await this.prisma.printfulFileMapping.update({
        where: { id: mapping.id },
        data: { status: "READY", printfulFileId: uploaded.fileId, originalUrl: signedUrl, printfulUrl: uploaded.printfulUrl ?? null },
      });
      return { printfulFileId: uploaded.fileId, printfulUrl: uploaded.printfulUrl ?? signedUrl };
    } catch (error) {
      await this.prisma.printfulFileMapping.update({ where: { id: mapping.id }, data: { status: "FAILED" } });
      throw error;
    }
  }

  async enqueueWorkerJob(input: { type: string; payload: Record<string, unknown>; nextRunAt?: Date; idempotencyKey?: string }) {
    if (input.idempotencyKey) {
      const existing = await this.prisma.workerJob.findFirst({ where: { idempotencyKey: input.idempotencyKey, status: { in: ["PENDING", "PROCESSING"] } } });
      if (existing) return { jobId: existing.id };
    }
    const job = await this.prisma.workerJob.create({
      data: {
        type: input.type as any,
        payloadJson: input.payload as Prisma.InputJsonValue,
        status: "PENDING",
        nextRunAt: input.nextRunAt ?? new Date(),
        idempotencyKey: input.idempotencyKey,
      },
    });
    return { jobId: job.id };
  }

  async updateMarketplacePublication(
    id: string,
    data: { status?: MarketplacePublicationRecord["status"]; errorMessage?: string | null; providerExternalListingId?: string | null; providerSyncProductId?: string | null; lastSyncedAt?: Date | null; metadataJson?: unknown },
  ): Promise<MarketplacePublicationRecord> {
    await this.prisma.marketplacePublication.update({
      where: { id },
      data: {
        status: data.status as MarketplacePublicationStatus | undefined,
        errorMessage: data.errorMessage,
        providerExternalListingId: data.providerExternalListingId,
        providerSyncProductId: data.providerSyncProductId,
        lastSyncedAt: data.lastSyncedAt,
        metadataJson: data.metadataJson as Prisma.InputJsonValue | undefined,
      },
    });
    const updated = await this.getMarketplacePublication(id);
    if (!updated) throw new Error(`Marketplace publication ${id} not found`);
    return updated;
  }

  async markListingPublishedIfComplete(listingId: string) {
    const listing = await this.prisma.commerceListing.findUnique({
      where: { id: listingId },
      include: { marketplacePublications: true },
    });
    if (!listing) throw new Error(`Listing ${listingId} not found`);
    const publishable = listing.marketplacePublications.filter((publication) =>
      publication.status !== MarketplacePublicationStatus.NEEDS_REVIEW
      && publication.status !== MarketplacePublicationStatus.DRAFT
      && publication.status !== MarketplacePublicationStatus.NOT_SELECTED,
    );
    const allPublished = publishable.length > 0 && publishable.every((publication) => publication.status === MarketplacePublicationStatus.PUBLISHED);
    if (!allPublished) return { id: listing.id, status: listing.status };

    const updated = await this.prisma.commerceListing.update({
      where: { id: listing.id },
      data: { status: ListingStatus.PUBLISHED, publishedAt: listing.publishedAt ?? new Date() },
    });
    if (listing.designProductSelectionId) {
      await this.prisma.designProductSelection.update({
        where: { id: listing.designProductSelectionId },
        data: { status: DesignProductSelectionStatus.PUBLISHED, errorMessage: null },
      });
    }
    return { id: updated.id, status: updated.status };
  }

  async createIntegrationLog(data: {
    productListingId?: string | null;
    marketplacePublicationId?: string | null;
    action: string;
    status: "PENDING" | "SUCCESS" | "FAILED" | "SKIPPED";
    errorCode?: string | null;
    errorMessage?: string | null;
    responseSummaryJson?: unknown;
  }): Promise<void> {
    await this.prisma.integrationLog.create({
      data: {
        productListingId: data.productListingId,
        marketplacePublicationId: data.marketplacePublicationId,
        action: data.action,
        status: data.status as IntegrationLogStatus,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
        responseSummaryJson: data.responseSummaryJson as Prisma.InputJsonValue | undefined,
      },
    });
  }

  private marketplacesForSelection(pipeline: PipelineType, targetMarketplaces: Prisma.JsonValue | null) {
    if (pipeline === PipelineType.LOCAL) return [MarketplaceKind.RASHPOD_LOCAL];
    if (!Array.isArray(targetMarketplaces)) return [];
    return targetMarketplaces.filter((item): item is MarketplaceKind => typeof item === "string" && item in MarketplaceKind);
  }

  private async calculateRoyalty(price: Prisma.Decimal | number, cost: Prisma.Decimal | number | null) {
    const rule = await this.prisma.royaltyRule.findFirst({
      where: { isActive: true, effectiveAt: { lte: new Date() } },
      orderBy: [{ scope: "asc" }, { effectiveAt: "desc" }],
    });
    if (!rule) return { amount: undefined, rule: null };

    const priceDecimal = new Prisma.Decimal(price);
    const costDecimal = cost == null ? new Prisma.Decimal(0) : new Prisma.Decimal(cost);
    const rate = new Prisma.Decimal(rule.value);
    const basisAmount = rule.basis === "NET_PROFIT_PERCENT" && priceDecimal.gt(costDecimal) ? priceDecimal.minus(costDecimal) : priceDecimal;
    const amount = rule.basis === "FIXED_AMOUNT" ? rate : basisAmount.mul(rate).div(100);
    return { amount: amount.toDecimalPlaces(2), rule };
  }
}

export function compositionReadyForListing(selections: Array<{ status: string }>) {
  return selections.length > 0 && selections.every((item) => item.status === DesignProductSelectionStatus.MOCKUP_READY);
}

export function selectCompositionGallery<T extends { selection: { id: string }; mockupType: string }>(assets: T[], primarySelectionId: string): T[] {
  const primaryAssets = assets.filter((asset) => asset.selection.id === primarySelectionId);
  const complementaryMain = assets.find((asset) => asset.selection.id !== primarySelectionId && asset.mockupType === "MAIN");
  return [
    primaryAssets.find((asset) => asset.mockupType === "MAIN"),
    complementaryMain ?? primaryAssets.find((asset) => asset.mockupType === "LIFESTYLE" || asset.mockupType === "SECONDARY"),
    primaryAssets.find((asset) => asset.mockupType === "DETAIL"),
  ].filter((asset, index, all): asset is T => Boolean(asset) && all.indexOf(asset) === index);
}
