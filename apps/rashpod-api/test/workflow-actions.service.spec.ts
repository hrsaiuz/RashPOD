import { BadRequestException } from "@nestjs/common";
import { DesignWorkflowService } from "../src/modules/design-workflow/design-workflow.service";
import { MarketplaceComplianceService } from "../src/modules/design-workflow/marketplace-compliance.service";
import { PlacementCalculationService } from "../src/modules/design-workflow/placement-calculation.service";

function createService(prismaOverrides: any = {}) {
  const prisma: any = {
    commerceListing: { findUnique: jest.fn(), update: jest.fn() },
    marketplacePublication: { update: jest.fn(), findUnique: jest.fn() },
    designProductSelection: { findUnique: jest.fn(), update: jest.fn() },
    mockupAsset: { updateMany: jest.fn() },
    ...prismaOverrides,
  };
  const audit = { log: jest.fn() } as any;
  const jobs = { enqueue: jest.fn().mockResolvedValue({ jobId: "job_1" }) } as any;
  const storage = {
    isCloudStorageConfigured: jest.fn().mockReturnValue(false),
    buildPublicUrl: jest.fn(),
    createPublicSignedReadUrl: jest.fn(),
    createSignedReadUrl: jest.fn(),
  } as any;
  return { service: new DesignWorkflowService(prisma, audit, jobs, new PlacementCalculationService(), new MarketplaceComplianceService(), storage, {} as any, {} as any, {} as any, {} as any), prisma, audit, jobs };
}

describe("DesignWorkflowService workflow actions", () => {
  it("blocks publishing listings without generated mockups", async () => {
    const { service } = createService({
      commerceListing: {
        findUnique: jest.fn().mockResolvedValue({ id: "listing_1", mockupAssetIds: [], marketplacePublications: [] }),
        update: jest.fn(),
      },
    });

    await expect(service.publishListing("admin_1", "listing_1")).rejects.toThrow(BadRequestException);
  });

  it("queues retry mockup job for local selections", async () => {
    const { service, prisma, jobs } = createService({
      designProductSelection: {
        findUnique: jest.fn().mockResolvedValue({ id: "sel_1", pipeline: "LOCAL" }),
        update: jest.fn().mockResolvedValue({ id: "sel_1" }),
      },
      mockupAsset: { updateMany: jest.fn().mockResolvedValue({ count: 3 }) },
    });

    await service.retryMockup("admin_1", "sel_1");

    expect(prisma.designProductSelection.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "sel_1" } }));
    expect(jobs.enqueue).toHaveBeenCalledWith("GENERATE_LOCAL_MOCKUPS", { designProductSelectionId: "sel_1" });
  });

  it("blocks publishing Amazon rows that were not held for review", async () => {
    const { service } = createService({
      commerceListing: {
        findUnique: jest.fn().mockResolvedValue({
          id: "listing_1",
          title: "Demo listing",
          price: 25,
          currency: "USD",
          mockupAssetIds: ["mockup_1"],
          marketplacePublications: [{ id: "pub_1", marketplace: "AMAZON", status: "DRAFT" }],
        }),
        update: jest.fn(),
      },
    });

    await expect(service.publishListing("admin_1", "listing_1")).rejects.toThrow("Amazon requires manual review");
  });
});
