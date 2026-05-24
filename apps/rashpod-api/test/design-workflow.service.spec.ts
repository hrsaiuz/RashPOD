import { AIEntityType, DesignStatus } from "@prisma/client";
import { NotFoundException } from "@nestjs/common";
import { DesignWorkflowService } from "../src/modules/design-workflow/design-workflow.service";

function createService(overrides?: { prisma?: Record<string, unknown> }) {
  const prisma = {
    designAsset: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
    },
    aiJob: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    ...overrides?.prisma,
  };
  const storage = {
    createSignedReadUrl: jest.fn().mockResolvedValue("https://storage.example/preview.png"),
  };
  const service = new DesignWorkflowService(
    prisma as any,
    { log: jest.fn() } as any,
    {} as any,
    {} as any,
    {} as any,
    storage as any,
  );
  return { service, prisma, storage };
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

describe("DesignWorkflowService.moderationDetail", () => {
  it("returns design with ai suggestions when found", async () => {
    const design = { id: "design-1", title: "Test", versions: [{ fileKey: "designs/test.png", widthPx: 1000, heightPx: 800 }] };
    const aiJobs = [{ id: "job-1", suggestions: [{ id: "suggestion-1" }] }];
    const { service, prisma, storage } = createService();
    prisma.designAsset.findUnique = jest.fn().mockResolvedValue(design);
    prisma.aiJob.findMany = jest.fn().mockResolvedValue(aiJobs);

    const result = await service.moderationDetail("design-1");

    expect(storage.createSignedReadUrl).toHaveBeenCalledWith({ objectKey: "designs/test.png", expiresSeconds: 60 * 60 });
    expect(prisma.designAsset.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "design-1" } }),
    );
    expect(prisma.aiJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { entityType: AIEntityType.DESIGN, entityId: "design-1" },
      }),
    );
    expect(result).toEqual({
      ...design,
      previewImageUrl: "https://storage.example/preview.png",
      ai: { jobs: aiJobs, suggestions: [{ id: "suggestion-1" }] },
    });
  });

  it("throws NotFoundException when design is missing", async () => {
    const { service, prisma } = createService();
    prisma.designAsset.findUnique = jest.fn().mockResolvedValue(null);
    prisma.aiJob.findMany = jest.fn().mockResolvedValue([]);

    await expect(service.moderationDetail("missing-id")).rejects.toBeInstanceOf(NotFoundException);
  });
});
