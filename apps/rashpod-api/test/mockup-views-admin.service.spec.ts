import { BadRequestException, ConflictException } from "@nestjs/common";
import { MockupGalleryAssetRole } from "@prisma/client";
import { AdminConfigService } from "../src/modules/admin-config/admin-config.service";

describe("AdminConfigService multi-view mockup administration", () => {
  it("requires an active primary view before a V2 template can be activated", async () => {
    const tx = {
      mockupView: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const prisma: any = {
      mockupTemplate: {
        findUnique: jest.fn().mockResolvedValue({ id: "template_1", configurationVersion: "MULTI_VIEW_V2" }),
      },
      $transaction: jest.fn(async (operation: (client: typeof tx) => unknown) => operation(tx)),
    };
    const service = new AdminConfigService(prisma, { log: jest.fn() } as any);

    await expect(service.updateMockupTemplate("admin_1", "template_1", {
      isActive: true,
    })).rejects.toThrow("requires an active primary view");
    expect(tx.mockupView.findFirst).toHaveBeenCalledWith({
      where: { mockupTemplateId: "template_1", isPrimary: true, isActive: true },
      select: { id: true },
    });
  });

  it("requires gallery endpoints for V2 lifestyle and detail edits", async () => {
    const prisma: any = {
      mockupTemplate: {
        findUnique: jest.fn().mockResolvedValue({ id: "template_1", configurationVersion: "MULTI_VIEW_V2" }),
      },
      $transaction: jest.fn(),
    };
    const service = new AdminConfigService(prisma, { log: jest.fn() } as any);

    await expect(service.updateMockupTemplate("admin_1", "template_1", {
      lifestyleImageKey: "mockups/lifestyle-new.png",
    })).rejects.toThrow("gallery asset endpoints");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("synchronizes a V2 legacy base-image edit to its primary view", async () => {
    const tx = {
      mockupTemplate: {
        update: jest.fn().mockResolvedValue({ id: "template_1", baseImageKey: "mockups/front-new.png" }),
      },
      mockupView: {
        findFirst: jest.fn().mockResolvedValue({ id: "view_primary" }),
        update: jest.fn().mockResolvedValue({ id: "view_primary" }),
      },
    };
    const prisma: any = {
      mockupTemplate: {
        findUnique: jest.fn().mockResolvedValue({ id: "template_1", configurationVersion: "MULTI_VIEW_V2" }),
      },
      $transaction: jest.fn(async (operation: (client: typeof tx) => unknown) => operation(tx)),
    };
    const service = new AdminConfigService(prisma, { log: jest.fn().mockResolvedValue(undefined) } as any);

    await service.updateMockupTemplate("admin_1", "template_1", {
      baseImageKey: " mockups/front-new.png ",
    });

    expect(tx.mockupView.update).toHaveBeenCalledWith({
      where: { id: "view_primary" },
      data: { blankImageKey: "mockups/front-new.png" },
    });
  });

  it("creates a V2 template with a primary front view and normalizes legacy gallery inputs", async () => {
    const tx = {
      mockupTemplate: {
        create: jest.fn().mockResolvedValue({ id: "template_1" }),
      },
      mockupView: {
        create: jest.fn().mockResolvedValue({ id: "view_1" }),
      },
      mockupGalleryAsset: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    const prisma: any = {
      $transaction: jest.fn(async (operation: (client: typeof tx) => unknown) => operation(tx)),
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new AdminConfigService(prisma, audit);
    jest.spyOn(service as any, "syncLegacyGalleryRole").mockResolvedValue(undefined);

    await service.createMockupTemplate("admin_1", {
      baseProductId: "product_1",
      name: "Classic tee",
      baseImageKey: "mockups/front.png",
      lifestyleImageKey: "mockups/lifestyle.png",
      closeupImageKey: "mockups/detail.png",
      isActive: false,
    });

    expect(tx.mockupTemplate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ configurationVersion: "MULTI_VIEW_V2", isActive: false }),
    });
    expect(tx.mockupView.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        mockupTemplateId: "template_1",
        placementCode: "front",
        blankImageKey: "mockups/front.png",
        isPrimary: true,
        isActive: true,
      }),
    });
    expect(tx.mockupGalleryAsset.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ role: "LIFESTYLE", imageKey: "mockups/lifestyle.png", mockupViewId: "view_1", isActive: true }),
        expect.objectContaining({ role: "DETAIL", imageKey: "mockups/detail.png", mockupViewId: "view_1", isActive: true }),
      ]),
    });
  });

  it("creates the first view as primary and upgrades the template configuration version", async () => {
    const created = {
      id: "view_1",
      mockupTemplateId: "template_1",
      viewKey: "front_primary",
      placementCode: "front",
      isPrimary: true,
    };
    const tx = {
      mockupView: {
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue(created),
      },
      mockupTemplate: { update: jest.fn().mockResolvedValue({ id: "template_1" }) },
    };
    const prisma: any = {
      mockupTemplate: { findUnique: jest.fn().mockResolvedValue({ id: "template_1" }) },
      mockupView: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(async (operation: (client: typeof tx) => unknown) => operation(tx)),
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new AdminConfigService(prisma, audit);
    jest.spyOn(service as any, "syncLegacyGalleryRole").mockResolvedValue(undefined);

    await expect(service.createMockupView("admin_1", "template_1", {
      viewKey: " Front Primary ",
      placementCode: " Front ",
      name: "Front",
      blankImageKey: "mockup-templates/shirt/front.png",
    })).resolves.toEqual(created);

    expect(tx.mockupView.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        viewKey: "front_primary",
        placementCode: "front",
        isPrimary: true,
      }),
    });
    expect(tx.mockupTemplate.update).toHaveBeenCalledWith({
      where: { id: "template_1" },
      data: {
        configurationVersion: "MULTI_VIEW_V2",
        baseImageKey: "mockup-templates/shirt/front.png",
      },
    });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      action: "mockup-view.create",
      entityType: "MockupView",
      entityId: "view_1",
    }));
  });

  it("keeps only one primary view when another view is promoted", async () => {
    const existing = {
      id: "view_2",
      mockupTemplateId: "template_1",
      viewKey: "back",
      blankImageKey: "mockups/back.png",
      isPrimary: false,
      isActive: true,
    };
    const tx = {
      mockupView: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({ ...existing, isPrimary: true }),
      },
      mockupTemplate: {
        update: jest.fn().mockResolvedValue({ id: "template_1" }),
      },
    };
    const prisma: any = {
      mockupView: {
        findUnique: jest.fn().mockResolvedValue(existing),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn(async (operation: (client: typeof tx) => unknown) => operation(tx)),
    };
    const service = new AdminConfigService(prisma, { log: jest.fn().mockResolvedValue(undefined) } as any);
    jest.spyOn(service as any, "syncLegacyGalleryRole").mockResolvedValue(undefined);

    await service.updateMockupView("admin_1", "view_2", { isPrimary: true });

    expect(tx.mockupView.updateMany).toHaveBeenCalledWith({
      where: { mockupTemplateId: "template_1", isPrimary: true, NOT: { id: "view_2" } },
      data: { isPrimary: false },
    });
    expect(tx.mockupTemplate.update).toHaveBeenCalledWith({
      where: { id: "template_1" },
      data: {
        configurationVersion: "MULTI_VIEW_V2",
        baseImageKey: "mockups/back.png",
      },
    });
  });

  it("does not allow the primary view to be deactivated or unmarked directly", async () => {
    const existing = {
      id: "view_1",
      mockupTemplateId: "template_1",
      viewKey: "front",
      blankImageKey: "mockups/front.png",
      isPrimary: true,
      isActive: true,
    };
    const prisma: any = {
      mockupView: {
        findUnique: jest.fn().mockResolvedValue(existing),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn(),
    };
    const service = new AdminConfigService(prisma, { log: jest.fn() } as any);

    await expect(service.updateMockupView("admin_1", "view_1", { isActive: false }))
      .rejects.toThrow("primary mockup view must be active");
    await expect(service.updateMockupView("admin_1", "view_1", { isPrimary: false }))
      .rejects.toThrow("Promote another view");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects attaching a gallery asset to a view from another template", async () => {
    const prisma: any = {
      mockupTemplate: { findUnique: jest.fn().mockResolvedValue({ id: "template_1" }) },
      mockupView: { findUnique: jest.fn().mockResolvedValue({ id: "view_2", mockupTemplateId: "template_2" }) },
      mockupGalleryAsset: { create: jest.fn() },
    };
    const service = new AdminConfigService(prisma, { log: jest.fn() } as any);

    await expect(service.createMockupGalleryAsset("admin_1", "template_1", {
      mockupViewId: "view_2",
      role: MockupGalleryAssetRole.LIFESTYLE,
      imageKey: "mockup-templates/shirt/lifestyle-1.jpg",
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.mockupGalleryAsset.create).not.toHaveBeenCalled();
  });

  it("allows repeatable lifestyle assets for the same template", async () => {
    const create = jest.fn()
      .mockResolvedValueOnce({ id: "asset_1", role: "LIFESTYLE" })
      .mockResolvedValueOnce({ id: "asset_2", role: "LIFESTYLE" });
    const prisma: any = {
      mockupTemplate: { findUnique: jest.fn().mockResolvedValue({ id: "template_1" }) },
      mockupGalleryAsset: { create },
    };
    prisma.$transaction = jest.fn(async (operation: (client: typeof prisma) => unknown) => operation(prisma));
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new AdminConfigService(prisma, audit);
    jest.spyOn(service as any, "syncLegacyGalleryRole").mockResolvedValue(undefined);

    await service.createMockupGalleryAsset("admin_1", "template_1", {
      role: MockupGalleryAssetRole.LIFESTYLE,
      imageKey: "mockup-templates/shirt/lifestyle-1.jpg",
    });
    await service.createMockupGalleryAsset("admin_1", "template_1", {
      role: MockupGalleryAssetRole.LIFESTYLE,
      imageKey: "mockup-templates/shirt/lifestyle-2.jpg",
    });

    expect(create).toHaveBeenCalledTimes(2);
  });

  it("synchronizes the legacy lifestyle key from the primary view's first active asset", async () => {
    const created = {
      id: "asset_primary",
      mockupTemplateId: "template_1",
      mockupViewId: "view_primary",
      role: "LIFESTYLE",
      imageKey: "mockups/lifestyle-primary.png",
    };
    const tx = {
      mockupView: {
        findFirst: jest.fn().mockResolvedValue({ id: "view_primary" }),
      },
      mockupGalleryAsset: {
        create: jest.fn().mockResolvedValue(created),
        findFirst: jest.fn().mockResolvedValue({ imageKey: "mockups/lifestyle-primary.png" }),
      },
      mockupTemplate: {
        update: jest.fn().mockResolvedValue({ id: "template_1" }),
      },
    };
    const prisma: any = {
      mockupTemplate: { findUnique: jest.fn().mockResolvedValue({ id: "template_1" }) },
      mockupView: {
        findUnique: jest.fn().mockResolvedValue({ id: "view_primary", mockupTemplateId: "template_1" }),
      },
      $transaction: jest.fn(async (operation: (client: typeof tx) => unknown) => operation(tx)),
    };
    const service = new AdminConfigService(prisma, { log: jest.fn().mockResolvedValue(undefined) } as any);

    await service.createMockupGalleryAsset("admin_1", "template_1", {
      mockupViewId: "view_primary",
      role: MockupGalleryAssetRole.LIFESTYLE,
      imageKey: "mockups/lifestyle-primary.png",
    });

    expect(tx.mockupTemplate.update).toHaveBeenCalledWith({
      where: { id: "template_1" },
      data: { lifestyleImageKey: "mockups/lifestyle-primary.png" },
    });
  });

  it("clears the legacy detail key when the final active detail asset is deleted", async () => {
    const existing = {
      id: "asset_detail",
      mockupTemplateId: "template_1",
      mockupViewId: "view_primary",
      role: "DETAIL",
      imageKey: "mockups/detail.png",
    };
    const tx = {
      mockupView: {
        findFirst: jest.fn().mockResolvedValue({ id: "view_primary" }),
      },
      mockupGalleryAsset: {
        delete: jest.fn().mockResolvedValue(existing),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      mockupTemplate: {
        update: jest.fn().mockResolvedValue({ id: "template_1" }),
      },
    };
    const prisma: any = {
      mockupGalleryAsset: {
        findUnique: jest.fn().mockResolvedValue(existing),
      },
      $transaction: jest.fn(async (operation: (client: typeof tx) => unknown) => operation(tx)),
    };
    const service = new AdminConfigService(prisma, { log: jest.fn().mockResolvedValue(undefined) } as any);

    await service.deleteMockupGalleryAsset("admin_1", "asset_detail");

    expect(tx.mockupTemplate.update).toHaveBeenCalledWith({
      where: { id: "template_1" },
      data: { closeupImageKey: null },
    });
  });

  it("blocks deleting a view while print areas still reference it", async () => {
    const prisma: any = {
      mockupView: {
        findUnique: jest.fn().mockResolvedValue({
          id: "view_1",
          mockupTemplateId: "template_1",
          isPrimary: true,
        }),
      },
      printArea: { count: jest.fn().mockResolvedValue(2) },
      $transaction: jest.fn(),
    };
    const service = new AdminConfigService(prisma, { log: jest.fn() } as any);

    await expect(service.deleteMockupView("admin_1", "view_1")).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("keeps an active template from losing its final active primary view", async () => {
    const existing = {
      id: "view_1",
      mockupTemplateId: "template_1",
      isPrimary: true,
      isActive: true,
    };
    const tx = {
      mockupView: {
        delete: jest.fn().mockResolvedValue(existing),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      mockupTemplate: {
        findUnique: jest.fn().mockResolvedValue({ isActive: true }),
      },
    };
    const prisma: any = {
      mockupView: { findUnique: jest.fn().mockResolvedValue(existing) },
      printArea: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn(async (operation: (client: typeof tx) => unknown) => operation(tx)),
    };
    const service = new AdminConfigService(prisma, { log: jest.fn() } as any);

    await expect(service.deleteMockupView("admin_1", "view_1"))
      .rejects.toThrow("active mockup template must keep an active primary view");
  });
});
