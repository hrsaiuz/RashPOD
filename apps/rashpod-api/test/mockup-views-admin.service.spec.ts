import { BadRequestException, ConflictException } from "@nestjs/common";
import { MockupGalleryAssetRole } from "@prisma/client";
import { AdminConfigService } from "../src/modules/admin-config/admin-config.service";

describe("AdminConfigService multi-view mockup administration", () => {
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
      data: { configurationVersion: "MULTI_VIEW_V2" },
    });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      action: "mockup-view.create",
      entityType: "MockupView",
      entityId: "view_1",
    }));
  });

  it("keeps only one primary view when another view is promoted", async () => {
    const existing = { id: "view_2", mockupTemplateId: "template_1", viewKey: "back", isPrimary: false };
    const tx = {
      mockupView: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({ ...existing, isPrimary: true }),
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

    await service.updateMockupView("admin_1", "view_2", { isPrimary: true });

    expect(tx.mockupView.updateMany).toHaveBeenCalledWith({
      where: { mockupTemplateId: "template_1", isPrimary: true, NOT: { id: "view_2" } },
      data: { isPrimary: false },
    });
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
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new AdminConfigService(prisma, audit);

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
});
