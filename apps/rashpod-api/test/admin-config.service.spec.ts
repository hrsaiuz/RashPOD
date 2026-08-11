import { PlacementKind, Prisma } from "@prisma/client";
import { ConflictException } from "@nestjs/common";
import { AdminConfigService } from "../src/modules/admin-config/admin-config.service";

describe("AdminConfigService.updateDeliverySetting", () => {
  it("converts numeric fields to Decimal and writes audit log", async () => {
    const update = jest.fn().mockResolvedValue({ id: "ds_1", providerType: "YANDEX" });
    const prisma: any = {
      deliverySetting: { update },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new AdminConfigService(prisma, audit);

    await service.updateDeliverySetting("admin_1", "ds_1", {
      providerType: "YANDEX",
      displayName: "Yandex Express",
      zone: "TASHKENT",
      price: 32000,
      freeDeliveryThreshold: 280000,
      etaText: "same day",
      isActive: true,
    });

    const callArg = update.mock.calls[0][0];
    expect(callArg.where).toEqual({ id: "ds_1" });
    expect(callArg.data.price).toBeInstanceOf(Prisma.Decimal);
    expect(callArg.data.freeDeliveryThreshold).toBeInstanceOf(Prisma.Decimal);
    expect(callArg.data.price.toNumber()).toBe(32000);
    expect(callArg.data.freeDeliveryThreshold.toNumber()).toBe(280000);

    expect(audit.log).toHaveBeenCalledWith({
      actorId: "admin_1",
      action: "delivery-setting.update",
      entityType: "DeliverySetting",
      entityId: "ds_1",
    });
  });

  it("throws for negative values", async () => {
    const prisma: any = { deliverySetting: { update: jest.fn() } };
    const audit = { log: jest.fn() } as any;
    const service = new AdminConfigService(prisma, audit);

    await expect(
      service.updateDeliverySetting("admin_1", "ds_1", { price: -10 }),
    ).rejects.toThrow("price must be non-negative");

    await expect(
      service.updateDeliverySetting("admin_1", "ds_1", { freeDeliveryThreshold: -1 }),
    ).rejects.toThrow("freeDeliveryThreshold must be non-negative");
  });
});

describe("AdminConfigService catalog CRUD parity", () => {
  it("persists an explicit print-area placement", async () => {
    const create = jest.fn().mockResolvedValue({ id: "area_1", placement: "FRONT", defaultPresetId: "preset_1" });
    const createPreset = jest.fn().mockResolvedValue({ id: "preset_1" });
    const tx = {
      placementPreset: { create: createPreset },
      printArea: { create },
    };
    const prisma: any = {
      mockupTemplate: {
        findUnique: jest.fn().mockResolvedValue({ id: "template_1", baseProductId: "base_1", configurationVersion: "LEGACY_V1" }),
      },
      $transaction: jest.fn(async (operation: (client: typeof tx) => unknown) => operation(tx)),
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new AdminConfigService(prisma, audit);

    await service.createPrintArea("admin_1", {
      mockupTemplateId: "template_1",
      name: "Front",
      placement: PlacementKind.FRONT,
      x: 10,
      y: 20,
      width: 500,
      height: 600,
      safeX: 20,
      safeY: 30,
      safeWidth: 460,
      safeHeight: 540,
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ placement: "FRONT", defaultPresetId: "preset_1" }),
    });
    expect(createPreset).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Front default",
        pipeline: "LOCAL",
        localBaseProductId: "base_1",
        placement: "FRONT",
        alignment: "CENTER",
        units: "PX",
        active: true,
      }),
    });
  });

  it("requires an active product view for V2 print areas", async () => {
    const prisma: any = {
      mockupTemplate: {
        findUnique: jest.fn().mockResolvedValue({ id: "template_1", configurationVersion: "MULTI_VIEW_V2" }),
      },
      mockupView: {
        findUnique: jest.fn().mockResolvedValue({
          id: "view_back",
          mockupTemplateId: "template_1",
          isActive: false,
        }),
      },
      printArea: { create: jest.fn() },
    };
    const service = new AdminConfigService(prisma, { log: jest.fn() } as any);
    const input = {
      mockupTemplateId: "template_1",
      name: "Back",
      placement: PlacementKind.BACK,
      x: 10,
      y: 20,
      width: 500,
      height: 600,
      safeX: 20,
      safeY: 30,
      safeWidth: 460,
      safeHeight: 540,
    };

    await expect(service.createPrintArea("admin_1", input))
      .rejects.toThrow("product view is required");
    await expect(service.createPrintArea("admin_1", { ...input, mockupViewId: "view_back" }))
      .rejects.toThrow("active mockup view");
    expect(prisma.printArea.create).not.toHaveBeenCalled();
  });

  it("rejects safe zones outside the print-area rectangle", async () => {
    const prisma: any = {
      mockupTemplate: {
        findUnique: jest.fn().mockResolvedValue({ id: "template_1", configurationVersion: "MULTI_VIEW_V2" }),
      },
      mockupView: {
        findUnique: jest.fn().mockResolvedValue({
          id: "view_front",
          mockupTemplateId: "template_1",
          isActive: true,
        }),
      },
      printArea: { create: jest.fn() },
    };
    const service = new AdminConfigService(prisma, { log: jest.fn() } as any);

    await expect(service.createPrintArea("admin_1", {
      mockupTemplateId: "template_1",
      mockupViewId: "view_front",
      name: "Front",
      x: 100,
      y: 100,
      width: 500,
      height: 600,
      safeX: 90,
      safeY: 120,
      safeWidth: 460,
      safeHeight: 540,
    })).rejects.toThrow("Safe zone must stay inside");
    expect(prisma.printArea.create).not.toHaveBeenCalled();
  });

  it("validates the merged print-area geometry during partial updates", async () => {
    const prisma: any = {
      printArea: {
        findUnique: jest.fn().mockResolvedValue({
          id: "area_1",
          mockupTemplateId: "template_1",
          mockupViewId: "view_front",
          x: 100,
          y: 100,
          width: 500,
          height: 600,
          safeX: 120,
          safeY: 120,
          safeWidth: 460,
          safeHeight: 540,
          minScale: 0.5,
          maxScale: 2,
        }),
        update: jest.fn(),
      },
      mockupTemplate: {
        findUnique: jest.fn().mockResolvedValue({ id: "template_1", configurationVersion: "MULTI_VIEW_V2" }),
      },
      mockupView: {
        findUnique: jest.fn().mockResolvedValue({
          id: "view_front",
          mockupTemplateId: "template_1",
          isActive: true,
        }),
      },
    };
    const service = new AdminConfigService(prisma, { log: jest.fn() } as any);

    await expect(service.updatePrintArea("admin_1", "area_1", {
      safeWidth: 600,
    })).rejects.toThrow("Safe zone must stay inside");
    await expect(service.updatePrintArea("admin_1", "area_1", {
      minScale: 3,
    })).rejects.toThrow("Minimum scale cannot exceed maximum scale");
    expect(prisma.printArea.update).not.toHaveBeenCalled();
  });

  it("gets product type by id and throws when missing", async () => {
    const prisma: any = {
      productType: { findUnique: jest.fn().mockResolvedValueOnce({ id: "pt_1" }).mockResolvedValueOnce(null) },
    };
    const service = new AdminConfigService(prisma, { log: jest.fn() } as any);

    await expect(service.getProductType("pt_1")).resolves.toEqual({ id: "pt_1" });
    await expect(service.getProductType("missing")).rejects.toThrow("Product type not found");
  });

  it("updates and deletes base product with audit log", async () => {
    const tx = {
      mockupTemplate: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn(),
      },
      printArea: { deleteMany: jest.fn() },
      placementPreset: { deleteMany: jest.fn() },
      baseProduct: { delete: jest.fn().mockResolvedValue({ id: "bp_1" }) },
    };
    const prisma: any = {
      baseProduct: {
        update: jest.fn().mockResolvedValue({ id: "bp_1" }),
      },
      designAsset: { count: jest.fn().mockResolvedValue(0) },
      designProductSelection: { count: jest.fn().mockResolvedValue(0) },
      commerceListing: { count: jest.fn().mockResolvedValue(0) },
      marketplaceCategoryMapping: { count: jest.fn().mockResolvedValue(0) },
      podProductMapping: { count: jest.fn().mockResolvedValue(0) },
      externalOrderIntakeItem: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn(async (operation: (client: typeof tx) => unknown) => operation(tx)),
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new AdminConfigService(prisma, audit);

    await service.updateBaseProduct("admin_1", "bp_1", {
      name: "Updated",
      description: null,
      imageUrl: null,
      availableColors: [],
      availableSizes: [],
    });
    await service.deleteBaseProduct("admin_1", "bp_1");

    expect(prisma.baseProduct.update).toHaveBeenCalledWith({
      where: { id: "bp_1" },
      data: expect.objectContaining({
        name: "Updated",
        description: null,
        imageUrl: null,
        availableColors: [],
        availableSizes: [],
      }),
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "base-product.update", entityType: "BaseProduct", entityId: "bp_1" }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "base-product.delete", entityType: "BaseProduct", entityId: "bp_1" }),
    );
  });

  it("deletes an unused mockup template together with its print areas", async () => {
    const tx = {
      printArea: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
      mockupTemplate: { delete: jest.fn().mockResolvedValue({ id: "template_1" }) },
    };
    const prisma: any = {
      mockupPlacement: { count: jest.fn().mockResolvedValue(0) },
      podPrintAreaMapping: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn(async (operation: (client: typeof tx) => unknown) => operation(tx)),
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new AdminConfigService(prisma, audit);

    await expect(service.deleteMockupTemplate("admin_1", "template_1")).resolves.toEqual({ id: "template_1" });

    expect(tx.printArea.deleteMany).toHaveBeenCalledWith({ where: { mockupTemplateId: "template_1" } });
    expect(tx.mockupTemplate.delete).toHaveBeenCalledWith({ where: { id: "template_1" } });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "mockup-template.delete", entityId: "template_1" }),
    );
  });

  it("returns an actionable error instead of deleting mockup workflow history", async () => {
    const prisma: any = {
      mockupPlacement: { count: jest.fn().mockResolvedValue(1) },
      podPrintAreaMapping: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn(),
    };
    const service = new AdminConfigService(prisma, { log: jest.fn() } as any);

    await expect(service.deleteMockupTemplate("admin_1", "template_1")).rejects.toThrow(
      "Mockup template is used by workflow history and cannot be deleted. Deactivate it instead.",
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("normalizes base product JSON arrays for list responses", async () => {
    const prisma: any = {
      baseProduct: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "bp_1",
            productTypeId: "pt_1",
            name: "T-Shirt",
            skuPrefix: "TSH",
            isActive: true,
            baseCost: null,
            defaultPrice: null,
            imageUrl: null,
            description: null,
            availableColors: ["white", 123, "black"],
            availableSizes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            productType: { id: "pt_1", name: "Apparel", slug: "apparel", category: "wearables" },
          },
        ]),
      },
    };
    const service = new AdminConfigService(prisma, { log: jest.fn() } as any);

    const rows = await service.listBaseProducts();

    expect(rows[0].availableColors).toEqual(["white", "black"]);
    expect(rows[0].availableSizes).toEqual([]);
  });

  it("blocks deleting product types that are used by base products", async () => {
    const prisma: any = {
      baseProduct: { count: jest.fn().mockResolvedValue(1) },
      marketplaceCategoryMapping: { count: jest.fn().mockResolvedValue(0) },
      podProductMapping: { count: jest.fn().mockResolvedValue(0) },
      externalOrderIntakeItem: { count: jest.fn().mockResolvedValue(0) },
      productType: { delete: jest.fn() },
    };
    const service = new AdminConfigService(prisma, { log: jest.fn() } as any);

    await expect(service.deleteProductType("admin_1", "pt_1")).rejects.toMatchObject({
      constructor: ConflictException,
      message: expect.stringContaining("Product type is in use and cannot be deleted"),
    });
    expect(prisma.productType.delete).not.toHaveBeenCalled();
  });
});
