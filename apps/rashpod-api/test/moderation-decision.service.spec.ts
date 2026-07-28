import { BadRequestException } from "@nestjs/common";
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

  it("returns the linked pending story when the design is rejected", async () => {
    const tx = {
      designAsset: {
        update: jest.fn().mockResolvedValue({ id: "design_1", status: DesignStatus.REJECTED }),
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
        update: jest.fn().mockResolvedValue({ id: "design_1", status: DesignStatus.APPROVED_LOCAL }),
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
});
