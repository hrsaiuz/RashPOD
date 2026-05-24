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
  const jobs = { enqueue: jest.fn() } as any;
  const storage = {
    isCloudStorageConfigured: jest.fn().mockReturnValue(false),
    buildPublicUrl: jest.fn(),
    createPublicSignedReadUrl: jest.fn(),
    createSignedReadUrl: jest.fn(),
  } as any;
  return { service: new DesignWorkflowService(prisma, audit, jobs, new PlacementCalculationService(), new MarketplaceComplianceService(), storage), prisma, audit, jobs };
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
});
