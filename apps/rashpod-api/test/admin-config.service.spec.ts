import { Prisma } from "@prisma/client";
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
  it("gets product type by id and throws when missing", async () => {
    const prisma: any = {
      productType: { findUnique: jest.fn().mockResolvedValueOnce({ id: "pt_1" }).mockResolvedValueOnce(null) },
    };
    const service = new AdminConfigService(prisma, { log: jest.fn() } as any);

    await expect(service.getProductType("pt_1")).resolves.toEqual({ id: "pt_1" });
    await expect(service.getProductType("missing")).rejects.toThrow("Product type not found");
  });

  it("updates and deletes base product with audit log", async () => {
    const prisma: any = {
      baseProduct: {
        update: jest.fn().mockResolvedValue({ id: "bp_1" }),
        delete: jest.fn().mockResolvedValue({ id: "bp_1" }),
      },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new AdminConfigService(prisma, audit);

    await service.updateBaseProduct("admin_1", "bp_1", { name: "Updated" });
    await service.deleteBaseProduct("admin_1", "bp_1");

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "base-product.update", entityType: "BaseProduct", entityId: "bp_1" }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "base-product.delete", entityType: "BaseProduct", entityId: "bp_1" }),
    );
  });
});
