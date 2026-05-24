import { DesignStatus } from "@prisma/client";
import { DesignWorkflowService } from "../src/modules/design-workflow/design-workflow.service";

function createService() {
  const prisma = {
    designAsset: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const service = new DesignWorkflowService(
    prisma as any,
    { log: jest.fn() } as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );
  return { service, prisma };
}

describe("DesignWorkflowService.moderationQueue", () => {
  it("includes legacy NEEDS_FIX designs in the pending tab", async () => {
    const { service, prisma } = createService();
    await service.moderationQueue({ status: "PENDING_MODERATION" });
    expect(prisma.designAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: [DesignStatus.SUBMITTED, DesignStatus.PENDING_MODERATION, DesignStatus.NEEDS_FIX] },
        }),
      }),
    );
  });

  it("includes legacy APPROVED designs in the approved local tab", async () => {
    const { service, prisma } = createService();
    await service.moderationQueue({ status: "APPROVED_LOCAL" });
    expect(prisma.designAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: [DesignStatus.APPROVED_LOCAL, DesignStatus.APPROVED] },
        }),
      }),
    );
  });

  it("filters rejected designs on the rejected tab", async () => {
    const { service, prisma } = createService();
    await service.moderationQueue({ status: "REJECTED" });
    expect(prisma.designAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: DesignStatus.REJECTED,
        }),
      }),
    );
  });

  it("passes search query to title, description, and designer fields", async () => {
    const { service, prisma } = createService();
    await service.moderationQueue({ status: "APPROVED_GLOBAL", q: "skyline" });
    expect(prisma.designAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: DesignStatus.APPROVED_GLOBAL,
          OR: expect.arrayContaining([
            { title: { contains: "skyline", mode: "insensitive" } },
            { description: { contains: "skyline", mode: "insensitive" } },
            { designer: { displayName: { contains: "skyline", mode: "insensitive" } } },
            { designer: { email: { contains: "skyline", mode: "insensitive" } } },
          ]),
        }),
      }),
    );
  });
});
