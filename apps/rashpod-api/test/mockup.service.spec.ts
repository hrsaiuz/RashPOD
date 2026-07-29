import { MockupService } from "../src/modules/mockup/mockup.service";

describe("MockupService multi-view placement reads", () => {
  it("rejects a print area that belongs to another template", async () => {
    const prisma = {
      designAsset: {
        findUnique: jest.fn().mockResolvedValue({ id: "design_1", designerId: "designer_1" }),
      },
      designVersion: {
        findUnique: jest.fn().mockResolvedValue({ id: "version_1", designAssetId: "design_1" }),
      },
      mockupTemplate: {
        findUnique: jest.fn().mockResolvedValue({
          id: "template_front",
          isActive: true,
          baseProduct: { isActive: true },
        }),
      },
      printArea: {
        findUnique: jest.fn().mockResolvedValue({
          id: "area_back",
          mockupTemplateId: "template_back",
          isActive: true,
          mockupView: null,
        }),
      },
      mockupPlacement: { create: jest.fn() },
    };
    const service = new MockupService(
      prisma as any,
      { log: jest.fn() } as any,
      {} as any,
      {} as any,
    );

    await expect(service.createPlacement("designer_1", {
      designAssetId: "design_1",
      designVersionId: "version_1",
      mockupTemplateId: "template_front",
      printAreaId: "area_back",
      x: 10,
      y: 10,
      width: 100,
      height: 100,
      scale: 1,
      rotation: 0,
    })).rejects.toThrow("PRINT_AREA_MISMATCH");
    expect(prisma.mockupPlacement.create).not.toHaveBeenCalled();
  });

  it("rejects a design version owned by another design", async () => {
    const prisma = {
      designAsset: {
        findUnique: jest.fn().mockResolvedValue({ id: "design_1", designerId: "designer_1" }),
      },
      designVersion: {
        findUnique: jest.fn().mockResolvedValue({ id: "version_other", designAssetId: "design_other" }),
      },
      mockupTemplate: {
        findUnique: jest.fn().mockResolvedValue({
          id: "template_1",
          isActive: true,
          baseProduct: { isActive: true },
        }),
      },
      printArea: {
        findUnique: jest.fn().mockResolvedValue({
          id: "area_1",
          mockupTemplateId: "template_1",
          isActive: true,
          mockupView: null,
        }),
      },
      mockupPlacement: { create: jest.fn() },
    };
    const service = new MockupService(
      prisma as any,
      { log: jest.fn() } as any,
      {} as any,
      {} as any,
    );

    await expect(service.createPlacement("designer_1", {
      designAssetId: "design_1",
      designVersionId: "version_other",
      mockupTemplateId: "template_1",
      printAreaId: "area_1",
      x: 10,
      y: 10,
      width: 100,
      height: 100,
      scale: 1,
      rotation: 0,
    })).rejects.toThrow("DESIGN_VERSION_MISMATCH");
    expect(prisma.mockupPlacement.create).not.toHaveBeenCalled();
  });

  it("rejects placement geometry outside the selected safe zone", async () => {
    const prisma = {
      designAsset: {
        findUnique: jest.fn().mockResolvedValue({ id: "design_1", designerId: "designer_1" }),
      },
      designVersion: {
        findUnique: jest.fn().mockResolvedValue({ id: "version_1", designAssetId: "design_1" }),
      },
      mockupTemplate: {
        findUnique: jest.fn().mockResolvedValue({
          id: "template_1",
          isActive: true,
          baseProduct: { isActive: true },
        }),
      },
      printArea: {
        findUnique: jest.fn().mockResolvedValue({
          id: "area_1",
          mockupTemplateId: "template_1",
          mockupViewId: "view_1",
          isActive: true,
          mockupView: { id: "view_1", mockupTemplateId: "template_1", isActive: true },
          safeX: 100,
          safeY: 100,
          safeWidth: 400,
          safeHeight: 500,
          minScale: 0.5,
          maxScale: 2,
          allowRotate: false,
        }),
      },
      mockupPlacement: { create: jest.fn() },
    };
    const service = new MockupService(
      prisma as any,
      { log: jest.fn() } as any,
      {} as any,
      {} as any,
    );

    await expect(service.createPlacement("designer_1", {
      designAssetId: "design_1",
      designVersionId: "version_1",
      mockupTemplateId: "template_1",
      printAreaId: "area_1",
      x: 450,
      y: 100,
      width: 100,
      height: 100,
      scale: 1,
      rotation: 0,
    })).rejects.toThrow("POSITION_OUTSIDE_SAFE_ZONE");
    expect(prisma.mockupPlacement.create).not.toHaveBeenCalled();
  });

  it("revalidates geometry when an existing placement is updated", async () => {
    const prisma = {
      designAsset: {
        findUnique: jest.fn().mockResolvedValue({ id: "design_1", designerId: "designer_1" }),
      },
      mockupPlacement: {
        findUnique: jest.fn().mockResolvedValue({
          id: "placement_1",
          designAssetId: "design_1",
          x: 120,
          y: 120,
          width: 100,
          height: 100,
          scale: 1,
          rotation: 0,
          printArea: {
            safeX: 100,
            safeY: 100,
            safeWidth: 400,
            safeHeight: 500,
            minScale: 0.5,
            maxScale: 2,
            allowRotate: false,
          },
        }),
        update: jest.fn(),
      },
    };
    const service = new MockupService(
      prisma as any,
      { log: jest.fn() } as any,
      {} as any,
      {} as any,
    );

    await expect(service.updatePlacement("designer_1", "placement_1", {
      rotation: 30,
    })).rejects.toThrow("PLACEMENT_ROTATION_NOT_ALLOWED");
    expect(prisma.mockupPlacement.update).not.toHaveBeenCalled();
  });

  it("signs the print area's linked view image instead of the legacy template image", async () => {
    const prisma = {
      mockupPlacement: {
        findUnique: jest.fn().mockResolvedValue({
          id: "placement_1",
          mockupTemplate: { id: "template_1", baseImageKey: "legacy/front.png" },
          printArea: {
            id: "area_back",
            mockupView: { id: "view_back", blankImageKey: "views/back.png" },
          },
          designAsset: { id: "design_1", designerId: "designer_1" },
          designVersion: { id: "version_1", fileKey: "designs/art.png" },
          generatedAssets: [],
        }),
      },
    };
    const storage = {
      createSignedReadUrl: jest.fn(({ objectKey }: { objectKey: string }) => Promise.resolve(`https://storage.example/${objectKey}`)),
    };
    const service = new MockupService(
      prisma as any,
      { log: jest.fn() } as any,
      {} as any,
      storage as any,
    );

    const result = await service.getPlacement("designer_1", "placement_1");

    expect(result?.templateBgUrl).toBe("https://storage.example/views/back.png");
    expect(storage.createSignedReadUrl).toHaveBeenCalledWith({
      objectKey: "views/back.png",
      expiresSeconds: 60 * 60,
    });
    await expect(service.getPlacement("designer_other", "placement_1")).rejects.toThrow("Not your design");
  });

  it("falls back to the legacy template image for an unlinked print area", async () => {
    const prisma = {
      mockupPlacement: {
        findUnique: jest.fn().mockResolvedValue({
          id: "placement_legacy",
          mockupTemplate: { id: "template_1", baseImageKey: "legacy/front.png" },
          printArea: { id: "area_legacy", mockupView: null },
          designAsset: { id: "design_1", designerId: "designer_1" },
          designVersion: null,
          generatedAssets: [],
        }),
      },
    };
    const storage = {
      createSignedReadUrl: jest.fn(({ objectKey }: { objectKey: string }) => Promise.resolve(`https://storage.example/${objectKey}`)),
    };
    const service = new MockupService(
      prisma as any,
      { log: jest.fn() } as any,
      {} as any,
      storage as any,
    );

    const result = await service.getPlacement("designer_1", "placement_legacy");

    expect(result?.templateBgUrl).toBe("https://storage.example/legacy/front.png");
  });
});
