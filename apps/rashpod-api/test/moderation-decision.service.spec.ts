import { BadRequestException, Logger } from "@nestjs/common";
import { DesignStatus } from "@prisma/client";
import { DesignWorkflowService } from "../src/modules/design-workflow/design-workflow.service";
import { MarketplaceComplianceService } from "../src/modules/design-workflow/marketplace-compliance.service";
import { PlacementCalculationService } from "../src/modules/design-workflow/placement-calculation.service";

function createService(prismaOverrides: any = {}) {
  const prisma: any = {
    designAsset: { findUnique: jest.fn().mockResolvedValue({ id: "design_1", status: DesignStatus.SUBMITTED }) },
    platformSetting: { findUnique: jest.fn().mockResolvedValue(null) },
    ...prismaOverrides,
  };
  const audit = { log: jest.fn() } as any;
  const designStories = { syncWithDesignDecision: jest.fn().mockResolvedValue(null) } as any;
  const jobs = { enqueue: jest.fn() } as any;
  const storage = {
    isCloudStorageConfigured: jest.fn().mockReturnValue(false),
    buildPublicUrl: jest.fn(),
    createPublicSignedReadUrl: jest.fn(),
    createSignedReadUrl: jest.fn(),
  } as any;
  return { service: new DesignWorkflowService(prisma, audit, designStories, jobs, new PlacementCalculationService(), new MarketplaceComplianceService(), storage, {} as any, {} as any, {} as any, {} as any), prisma, audit, designStories, jobs };
}

describe("DesignWorkflowService moderation validation", () => {
  it("requires rejection reason or custom reason", async () => {
    const { service } = createService();

    await expect(
      service.submitModerationDecision({ sub: "mod_1", role: "MODERATOR" }, "design_1", { decision: "REJECT" }),
    ).rejects.toThrow("REJECTION_REASON_REQUIRED");
  });

  it("requires local selections for local approval", async () => {
    const { service } = createService();

    await expect(
      service.submitModerationDecision({ sub: "mod_1", role: "MODERATOR" }, "design_1", { decision: "APPROVE_LOCAL" }),
    ).rejects.toThrow("PRODUCT_SELECTION_REQUIRED");
  });

  it("requires Printful selections for global approval", async () => {
    const { service } = createService();

    await expect(
      service.submitModerationDecision({ sub: "mod_1", role: "MODERATOR" }, "design_1", {
        decision: "APPROVE_GLOBAL",
        localSelections: [
          {
            localBaseProductId: "bp_1",
            placementPresetId: "preset_1",
            placement: "FRONT",
            position: { widthCm: 5, heightCm: 5, xCm: 1, yCm: 1 },
          },
        ],
      }),
    ).rejects.toThrow("PRODUCT_SELECTION_REQUIRED");
  });

  it("blocks re-moderation for moderators when design is not pending", async () => {
    const { service } = createService({
      designAsset: { findUnique: jest.fn().mockResolvedValue({ id: "design_1", status: DesignStatus.APPROVED_LOCAL }) },
    });

    await expect(
      service.submitModerationDecision({ sub: "mod_1", role: "MODERATOR" }, "design_1", {
        decision: "REJECT",
        rejectionReasons: ["OTHER"],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("accepts a legacy placement-agnostic print area for the selected preset", async () => {
    const area = {
      id: "area_1",
      mockupTemplateId: "template_1",
      name: "Front print area",
      placement: null,
      widthCm: 30,
      heightCm: 36,
      x: 0,
      y: 0,
      width: 1000,
      height: 1000,
      safeX: 0,
      safeY: 0,
      safeWidth: 1000,
      safeHeight: 1000,
      allowMove: true,
      allowResize: true,
      allowRotate: false,
      minScale: 0.1,
      maxScale: 2,
      isActive: true,
      mockupView: {
        id: "view_front",
        viewKey: "front",
        placementCode: "front",
        name: "Front",
        blankImageKey: "mockups/front-view.png",
      },
    };
    const tx = {
      baseProduct: {
        findUnique: jest.fn().mockResolvedValue({
          id: "product_1",
          isActive: true,
          productType: { isActive: true },
          mockupTemplates: [{
            id: "template_1",
            isActive: true,
            baseImageKey: "mockups/front.png",
            lifestyleImageKey: null,
            closeupImageKey: null,
            galleryAssets: [
              { id: "lifestyle_global", mockupViewId: null, role: "LIFESTYLE", imageKey: "mockups/lifestyle-global.png", sortOrder: 0 },
              { id: "lifestyle_front", mockupViewId: "view_front", role: "LIFESTYLE", imageKey: "mockups/lifestyle-front.png", sortOrder: 1 },
              { id: "detail_global", mockupViewId: null, role: "DETAIL", imageKey: "mockups/detail-global.png", sortOrder: 0 },
            ],
            printAreas: [area],
          }],
        }),
      },
      placementPreset: {
        findUnique: jest.fn().mockResolvedValue({
          id: "preset_1",
          active: true,
          pipeline: "LOCAL",
          localBaseProductId: "product_1",
          placement: "FRONT",
        }),
      },
      designProductSelection: {
        upsert: jest.fn().mockResolvedValue({ id: "selection_1" }),
      },
    };
    const { service } = createService();
    jest.spyOn(service as any, "ensurePendingMockupAssets").mockResolvedValue(undefined);

    await expect((service as any).createLocalSelection(tx, "mod_1", "design_1", {
      localBaseProductId: "product_1",
      mockupTemplateId: "template_1",
      printAreaId: "area_1",
      placementPresetId: "preset_1",
      placement: "FRONT",
      unit: "PX",
      anchor: "TOP_LEFT",
      position: {
        widthPx: 500,
        heightPx: 500,
        xPx: 100,
        yPx: 100,
        scale: 1,
        rotation: 0,
      },
    })).resolves.toBeUndefined();

    expect(tx.designProductSelection.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          placement: "FRONT",
          placementConfigJson: expect.objectContaining({
            mockupTemplate: expect.objectContaining({
              baseImageKey: "mockups/front-view.png",
              lifestyleImageKey: "mockups/lifestyle-front.png",
              closeupImageKey: "mockups/detail-global.png",
            }),
            mockupView: expect.objectContaining({ id: "view_front", blankImageKey: "mockups/front-view.png" }),
            galleryAssets: expect.arrayContaining([
              expect.objectContaining({ id: "lifestyle_front", role: "LIFESTYLE" }),
              expect.objectContaining({ id: "detail_global", role: "DETAIL" }),
            ]),
          }),
        }),
      }),
    );
  });

  it("creates a local selection from the admin print area without a placement preset", async () => {
    const area = {
      id: "area_1",
      mockupTemplateId: "template_1",
      name: "Front print area",
      placement: "FRONT",
      widthCm: 30,
      heightCm: 36,
      x: 300,
      y: 200,
      width: 600,
      height: 800,
      safeX: 330,
      safeY: 240,
      safeWidth: 540,
      safeHeight: 720,
      allowMove: true,
      allowResize: true,
      allowRotate: false,
      minScale: 0.1,
      maxScale: 2,
      isActive: true,
      mockupView: {
        id: "view_front",
        viewKey: "front",
        placementCode: "front",
        name: "Front",
        blankImageKey: "mockups/front-view.png",
        isActive: true,
      },
    };
    const tx = {
      baseProduct: {
        findUnique: jest.fn().mockResolvedValue({
          id: "product_1",
          isActive: true,
          productType: { isActive: true },
          mockupTemplates: [{
            id: "template_1",
            name: "Black tee",
            isActive: true,
            baseImageKey: "mockups/front.png",
            lifestyleImageKey: null,
            closeupImageKey: null,
            galleryAssets: [],
            printAreas: [area],
          }],
        }),
      },
      placementPreset: { findUnique: jest.fn() },
      designProductSelection: {
        upsert: jest.fn().mockResolvedValue({ id: "selection_1" }),
      },
    };
    const { service } = createService();
    jest.spyOn(service as any, "ensurePendingMockupAssets").mockResolvedValue(undefined);

    await expect((service as any).createLocalSelection(tx, "mod_1", "design_1", {
      localBaseProductId: "product_1",
      mockupTemplateId: "template_1",
      printAreaId: "area_1",
      placement: "FRONT",
      unit: "PX",
      anchor: "TOP_LEFT",
      position: {
        widthPx: 400,
        heightPx: 500,
        xPx: 400,
        yPx: 300,
        scale: 1,
        rotation: 0,
      },
    })).resolves.toBeUndefined();

    expect(tx.placementPreset.findUnique).not.toHaveBeenCalled();
    expect(tx.designProductSelection.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          placementPresetId: null,
          placement: "FRONT",
          placementConfigJson: expect.objectContaining({
            printArea: expect.objectContaining({ id: "area_1", safeX: 330, safeY: 240 }),
            placementPreset: null,
          }),
        }),
      }),
    );
  });

  it("rejects a stale placement preset id instead of silently using print-area defaults", async () => {
    const tx = {
      baseProduct: {
        findUnique: jest.fn().mockResolvedValue({
          id: "product_1",
          isActive: true,
          productType: { isActive: true },
          mockupTemplates: [],
        }),
      },
      placementPreset: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const { service } = createService();

    await expect((service as any).createLocalSelection(tx, "mod_1", "design_1", {
      localBaseProductId: "product_1",
      placementPresetId: "deleted_preset",
      placement: "FRONT",
      unit: "PX",
      position: { widthPx: 100, heightPx: 100, xPx: 0, yPx: 0 },
    })).rejects.toThrow("placement preset was not found");
  });

  it("rejects centimeter placement when the print area has no physical dimensions", async () => {
    const tx = {
      baseProduct: {
        findUnique: jest.fn().mockResolvedValue({
          id: "product_1",
          isActive: true,
          productType: { isActive: true },
          mockupTemplates: [{
            id: "template_1",
            name: "Legacy tee",
            isActive: true,
            baseImageKey: "mockups/front.png",
            lifestyleImageKey: null,
            closeupImageKey: null,
            galleryAssets: [],
            printAreas: [{
              id: "area_1",
              mockupTemplateId: "template_1",
              name: "Front",
              placement: "FRONT",
              widthCm: null,
              heightCm: null,
              x: 100,
              y: 100,
              width: 800,
              height: 900,
              safeX: 140,
              safeY: 140,
              safeWidth: 720,
              safeHeight: 820,
              allowMove: true,
              allowResize: true,
              allowRotate: false,
              minScale: 0.1,
              maxScale: 2,
              isActive: true,
              mockupView: null,
            }],
          }],
        }),
      },
      placementPreset: { findUnique: jest.fn() },
    };
    const { service } = createService();

    await expect((service as any).createLocalSelection(tx, "mod_1", "design_1", {
      localBaseProductId: "product_1",
      mockupTemplateId: "template_1",
      printAreaId: "area_1",
      placement: "FRONT",
      unit: "CM",
      position: { widthCm: 10, heightCm: 10, xCm: 0, yCm: 0 },
    })).rejects.toThrow("physical print-area dimensions are not configured");
  });

  it("still rejects an explicitly mismatched print-area placement", async () => {
    const tx = {
      baseProduct: {
        findUnique: jest.fn().mockResolvedValue({
          id: "product_1",
          isActive: true,
          productType: { isActive: true },
          mockupTemplates: [{
            id: "template_1",
            isActive: true,
            printAreas: [{
              id: "area_1",
              placement: "BACK",
              isActive: true,
            }],
          }],
        }),
      },
      placementPreset: {
        findUnique: jest.fn().mockResolvedValue({
          id: "preset_1",
          active: true,
          pipeline: "LOCAL",
          localBaseProductId: "product_1",
          placement: "FRONT",
        }),
      },
    };
    const { service } = createService();

    await expect((service as any).createLocalSelection(tx, "mod_1", "design_1", {
      localBaseProductId: "product_1",
      mockupTemplateId: "template_1",
      printAreaId: "area_1",
      placementPresetId: "preset_1",
      placement: "FRONT",
      unit: "PX",
      position: { widthPx: 100, heightPx: 100, xPx: 0, yPx: 0 },
    })).rejects.toThrow("printable area placement does not match selection");
  });

  it("rejects a print area whose linked product view is inactive", async () => {
    const tx = {
      baseProduct: {
        findUnique: jest.fn().mockResolvedValue({
          id: "product_1",
          isActive: true,
          productType: { isActive: true },
          mockupTemplates: [{
            id: "template_1",
            isActive: true,
            printAreas: [{
              id: "area_1",
              placement: "FRONT",
              isActive: true,
              mockupView: { id: "view_front", isActive: false },
            }],
          }],
        }),
      },
      placementPreset: {
        findUnique: jest.fn().mockResolvedValue({
          id: "preset_1",
          active: true,
          pipeline: "LOCAL",
          localBaseProductId: "product_1",
          placement: "FRONT",
        }),
      },
    };
    const { service } = createService();

    await expect((service as any).createLocalSelection(tx, "mod_1", "design_1", {
      localBaseProductId: "product_1",
      mockupTemplateId: "template_1",
      printAreaId: "area_1",
      placementPresetId: "preset_1",
      placement: "FRONT",
      unit: "PX",
      position: { widthPx: 100, heightPx: 100, xPx: 0, yPx: 0 },
    })).rejects.toThrow("product view is not active");
  });

  it("rejects a mismatched print area before opening the mockup editor", async () => {
    const { service } = createService({
      designAsset: {
        findUnique: jest.fn().mockResolvedValue({
          id: "design_1",
          versions: [{ id: "version_1", fileKey: "designs/design.png" }],
        }),
      },
      baseProduct: {
        findUnique: jest.fn().mockResolvedValue({ id: "product_1", isActive: true }),
      },
      mockupTemplate: {
        findUnique: jest.fn().mockResolvedValue({
          id: "template_1",
          baseProductId: "product_1",
          isActive: true,
        }),
      },
      printArea: {
        findUnique: jest.fn().mockResolvedValue({
          id: "area_1",
          mockupTemplateId: "template_1",
          placement: "BACK",
          isActive: true,
        }),
      },
      placementPreset: {
        findUnique: jest.fn().mockResolvedValue({
          id: "preset_1",
          pipeline: "LOCAL",
          localBaseProductId: "product_1",
          placement: "FRONT",
          active: true,
        }),
      },
    });

    await expect(service.mockupEditorContext("design_1", {
      localBaseProductId: "product_1",
      mockupTemplateId: "template_1",
      printAreaId: "area_1",
      placementPresetId: "preset_1",
    })).rejects.toThrow("printable area placement does not match preset");
  });

  it("opens the mockup editor from the configured print area when no preset exists", async () => {
    const placementPreset = { findUnique: jest.fn() };
    const { service } = createService({
      designAsset: {
        findUnique: jest.fn().mockResolvedValue({
          id: "design_1",
          versions: [{ id: "version_1", fileKey: "designs/design.png" }],
        }),
      },
      baseProduct: {
        findUnique: jest.fn().mockResolvedValue({ id: "product_1", isActive: true }),
      },
      mockupTemplate: {
        findUnique: jest.fn().mockResolvedValue({
          id: "template_1",
          baseProductId: "product_1",
          baseImageKey: "mockups/front.png",
          isActive: true,
        }),
      },
      printArea: {
        findUnique: jest.fn().mockResolvedValue({
          id: "area_1",
          mockupTemplateId: "template_1",
          placement: "FRONT",
          x: 300,
          y: 200,
          width: 600,
          height: 800,
          safeX: 330,
          safeY: 240,
          safeWidth: 540,
          safeHeight: 720,
          widthCm: 30,
          heightCm: 36,
          allowMove: true,
          allowResize: true,
          allowRotate: false,
          minScale: 0.1,
          maxScale: 2,
          isActive: true,
          mockupView: {
            id: "view_front",
            blankImageKey: "mockups/front-view.png",
            isActive: true,
          },
        }),
      },
      placementPreset,
    });

    await expect(service.mockupEditorContext("design_1", {
      localBaseProductId: "product_1",
      mockupTemplateId: "template_1",
      printAreaId: "area_1",
    })).resolves.toEqual(expect.objectContaining({
      printArea: expect.objectContaining({ x: 300, y: 200, safeX: 330, safeY: 240 }),
      initialPlacement: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
      preset: null,
    }));
    expect(placementPreset.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a stale placement preset id before opening the mockup editor", async () => {
    const { service } = createService({
      designAsset: {
        findUnique: jest.fn().mockResolvedValue({
          id: "design_1",
          versions: [{ id: "version_1", fileKey: "designs/design.png" }],
        }),
      },
      baseProduct: {
        findUnique: jest.fn().mockResolvedValue({ id: "product_1", isActive: true }),
      },
      mockupTemplate: {
        findUnique: jest.fn().mockResolvedValue({
          id: "template_1",
          baseProductId: "product_1",
          isActive: true,
        }),
      },
      printArea: {
        findUnique: jest.fn().mockResolvedValue({
          id: "area_1",
          mockupTemplateId: "template_1",
          isActive: true,
        }),
      },
      placementPreset: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(service.mockupEditorContext("design_1", {
      localBaseProductId: "product_1",
      mockupTemplateId: "template_1",
      printAreaId: "area_1",
      placementPresetId: "deleted_preset",
    })).rejects.toThrow("placement preset was not found");
  });

  it("rejects a Printful editor context whose preset placement does not match", async () => {
    const { service } = createService({
      designAsset: {
        findUnique: jest.fn().mockResolvedValue({
          id: "design_1",
          versions: [{ id: "version_1", fileKey: "designs/design.png" }],
        }),
      },
      printfulProductTemplate: {
        findUnique: jest.fn().mockResolvedValue({
          id: "printful_template_1",
          active: true,
        }),
      },
      placementPreset: {
        findUnique: jest.fn().mockResolvedValue({
          id: "global_preset_1",
          active: true,
          pipeline: "GLOBAL_PRINTFUL",
          placement: "FRONT",
          productTemplateId: "printful_template_1",
        }),
      },
    });

    await expect(service.printfulMockupEditorContext("design_1", {
      printfulProductTemplateId: "printful_template_1",
      placementPresetId: "global_preset_1",
      placement: "BACK",
    })).rejects.toThrow("Printful preset placement does not match selection");
  });

  it("rejects a mismatched Printful preset when creating a global selection", async () => {
    const tx = {
      printfulProductTemplate: {
        findUnique: jest.fn().mockResolvedValue({
          id: "printful_template_1",
          active: true,
        }),
      },
      placementPreset: {
        findUnique: jest.fn().mockResolvedValue({
          id: "global_preset_1",
          active: true,
          pipeline: "GLOBAL_PRINTFUL",
          placement: "FRONT",
          productTemplateId: "printful_template_1",
        }),
      },
    };
    const { service } = createService();

    await expect((service as any).createGlobalSelection(tx, "mod_1", "design_1", {
      printfulProductTemplateId: "printful_template_1",
      placementPresetId: "global_preset_1",
      placement: "BACK",
      position: { widthIn: 4, heightIn: 4, leftIn: 0, topIn: 0, scale: 1 },
    })).rejects.toThrow("Printful preset placement does not match selection");
  });

  it("rejects Printful variants that are not configured on the selected template", async () => {
    const tx = {
      printfulProductTemplate: {
        findUnique: jest.fn().mockResolvedValue({
          id: "printful_template_1",
          active: true,
          allowedPlacements: ["front"],
          allowedTechniques: ["dtg"],
          defaultTechnique: "dtg",
          printfulVariantIds: ["variant_valid"],
        }),
      },
      placementPreset: {
        findUnique: jest.fn().mockResolvedValue({
          id: "global_preset_1",
          active: true,
          pipeline: "GLOBAL_PRINTFUL",
          placement: "FRONT",
          productTemplateId: "printful_template_1",
        }),
      },
    };
    const { service } = createService();

    await expect((service as any).createGlobalSelection(tx, "mod_1", "design_1", {
      printfulProductTemplateId: "printful_template_1",
      placementPresetId: "global_preset_1",
      placement: "FRONT",
      technique: "dtg",
      selectedVariantIds: ["variant_from_another_template"],
      position: { widthIn: 4, heightIn: 4, leftIn: 0, topIn: 0, scale: 1 },
    })).rejects.toThrow("INVALID_PRINTFUL_VARIANT");
  });

  it("returns the linked pending story when the design is rejected", async () => {
    const tx = {
      designAsset: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue({ id: "design_1", status: DesignStatus.REJECTED }),
      },
      moderationAudit: { create: jest.fn().mockResolvedValue({ id: "audit_1" }) },
      designModerationCase: { create: jest.fn().mockResolvedValue({ id: "case_1" }) },
    };
    const { service, designStories, audit } = createService({
      designAsset: {
        findUnique: jest.fn().mockResolvedValue({ id: "design_1", status: DesignStatus.PENDING_MODERATION }),
      },
      $transaction: jest.fn(async (operation: (client: typeof tx) => unknown) => operation(tx)),
    });
    designStories.syncWithDesignDecision.mockResolvedValue({
      storyId: "story_1",
      action: "rejected",
      slug: "story",
      notes: "Artwork needs revision.",
    });
    audit.log.mockRejectedValue(new Error("secondary audit unavailable"));
    const loggerError = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    jest.spyOn(service, "moderationDetail").mockResolvedValue({ id: "design_1" } as never);

    await service.submitModerationDecision(
      { sub: "mod_1", role: "MODERATOR" },
      "design_1",
      {
        decision: "REJECT",
        rejectionReasons: ["POOR_IMAGE_QUALITY"],
        moderatorNotes: "Artwork needs revision.",
      },
    );
    loggerError.mockRestore();

    expect(designStories.syncWithDesignDecision).toHaveBeenCalledWith(
      tx,
      "mod_1",
      "design_1",
      "REJECT",
      "Artwork needs revision.",
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "design-story.publish.rejected",
        entityId: "story_1",
      }),
    );
  });

  it("publishes the linked pending story when the design is approved", async () => {
    const tx = {
      designAsset: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue({ id: "design_1", status: DesignStatus.APPROVED_LOCAL }),
      },
      moderationAudit: { create: jest.fn().mockResolvedValue({ id: "audit_1" }) },
      designModerationCase: { create: jest.fn().mockResolvedValue({ id: "case_1" }) },
    };
    const selectionUpdate = jest.fn().mockResolvedValue({ id: "selection_1" });
    const { service, designStories, audit, jobs } = createService({
      designAsset: {
        findUnique: jest.fn().mockResolvedValue({ id: "design_1", status: DesignStatus.PENDING_MODERATION }),
      },
      designProductSelection: {
        findMany: jest.fn().mockResolvedValue([{ id: "selection_1", pipeline: "LOCAL" }]),
        update: selectionUpdate,
      },
      $transaction: jest.fn(async (operation: (client: typeof tx) => unknown) => operation(tx)),
    });
    jobs.enqueue.mockRejectedValueOnce(new Error("queue unavailable"));
    designStories.syncWithDesignDecision.mockResolvedValue({
      storyId: "story_1",
      action: "approved",
      slug: "story",
    });
    jest.spyOn(service as any, "createLocalSelection").mockResolvedValue(undefined);
    jest.spyOn(service, "moderationDetail").mockResolvedValue({ id: "design_1" } as never);

    await service.submitModerationDecision(
      { sub: "mod_1", role: "MODERATOR" },
      "design_1",
      {
        decision: "APPROVE_LOCAL",
        localSelections: [{
          localBaseProductId: "product_1",
          placementPresetId: "preset_1",
          placement: "FRONT",
          position: { widthCm: 5, heightCm: 5, xCm: 1, yCm: 1 },
        }],
      },
    );

    expect(designStories.syncWithDesignDecision).toHaveBeenCalledWith(
      tx,
      "mod_1",
      "design_1",
      "APPROVE",
      undefined,
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "design-story.publish.approved",
        entityId: "story_1",
      }),
    );
    expect(selectionUpdate).toHaveBeenCalledWith({
      where: { id: "selection_1" },
      data: {
        status: "MOCKUP_FAILED",
        errorMessage: "queue unavailable",
      },
    });
  });

  it("prevents two moderators from committing decisions from the same stale state", async () => {
    const tx = {
      designAsset: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn(),
      },
      moderationAudit: { create: jest.fn() },
      designModerationCase: { create: jest.fn() },
    };
    const { service, designStories } = createService({
      designAsset: {
        findUnique: jest.fn().mockResolvedValue({ id: "design_1", status: DesignStatus.PENDING_MODERATION }),
      },
      $transaction: jest.fn(async (operation: (client: typeof tx) => unknown) => operation(tx)),
    });

    await expect(service.submitModerationDecision(
      { sub: "mod_2", role: "MODERATOR" },
      "design_1",
      {
        decision: "APPROVE_LOCAL",
        localSelections: [{
          localBaseProductId: "product_1",
          placement: "FRONT",
          position: { widthPx: 100, heightPx: 100, xPx: 0, yPx: 0 },
        }],
      },
    )).rejects.toThrow("DESIGN_ALREADY_MODERATED");

    expect(tx.moderationAudit.create).not.toHaveBeenCalled();
    expect(designStories.syncWithDesignDecision).not.toHaveBeenCalled();
  });
});
