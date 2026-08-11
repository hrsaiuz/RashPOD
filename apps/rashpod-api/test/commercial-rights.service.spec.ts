import { UserRole } from "@prisma/client";
import { CommercialRightsService } from "../src/modules/commercial-rights/commercial-rights.service";
import { BulkFilmSalesAction } from "../src/modules/commercial-rights/dto/bulk-update-rights.dto";

describe("CommercialRightsService consent boundaries", () => {
  it("does not disclose commercial rights to a different designer", async () => {
    const findRights = jest.fn();
    const service = new CommercialRightsService({
      designAsset: { findUnique: jest.fn().mockResolvedValue({ id: "design-1", designerId: "designer-owner" }) },
      commercialRights: { findUnique: findRights },
    } as never, { log: jest.fn() } as never);

    await expect(service.getByDesign(
      "design-1",
      { sub: "designer-other", role: UserRole.DESIGNER } as never,
    )).rejects.toThrow("Not your design");
    expect(findRights).not.toHaveBeenCalled();
  });

  it("requires a concrete design version before granting film consent", async () => {
    const updateRights = jest.fn();
    const prisma = {
      designAsset: { findUnique: jest.fn().mockResolvedValue({ id: "design-1", designerId: "designer-1" }) },
      designVersion: { findFirst: jest.fn().mockResolvedValue(null) },
      commercialRights: { update: updateRights },
      filmSaleSettings: { findFirst: jest.fn() },
      filmConsentEvent: { create: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    const transaction = jest.fn(async (operation: (tx: typeof prisma) => unknown) => operation(prisma));
    const service = new CommercialRightsService({ ...prisma, $transaction: transaction } as never, { log: jest.fn() } as never);

    await expect(service.enableFilmSales(
      "design-1",
      { sub: "designer-1", role: UserRole.DESIGNER } as never,
    )).rejects.toThrow("Upload a verified design version");
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(updateRights).not.toHaveBeenCalled();
  });

  it("records the version-bound consent event and audit with the rights update in one transaction", async () => {
    const rights = { id: "rights-1", filmRoyaltyRate: 12.5 };
    const tx = {
      designVersion: { findFirst: jest.fn().mockResolvedValue({ id: "version-2" }) },
      filmSaleSettings: { findFirst: jest.fn().mockResolvedValue({ id: "settings-1", settingsVersion: 3 }) },
      commercialRights: { update: jest.fn().mockResolvedValue(rights) },
      filmConsentEvent: { create: jest.fn().mockResolvedValue({ id: "consent-1" }) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) },
    };
    const transaction = jest.fn(async (operation: (client: typeof tx) => unknown) => operation(tx));
    const service = new CommercialRightsService({
      designAsset: { findUnique: jest.fn().mockResolvedValue({ id: "design-1", designerId: "designer-1", tenantId: "tenant-1" }) },
      $transaction: transaction,
    } as never, { log: jest.fn() } as never);

    await expect(service.enableFilmSales(
      "design-1",
      { sub: "designer-1", email: "designer@example.com", role: UserRole.DESIGNER } as never,
      "Designer consent",
    )).resolves.toBe(rights);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.commercialRights.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ allowFilmSales: true, filmConsentVersionId: "version-2" }),
    }));
    expect(tx.filmConsentEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ designVersionId: "version-2", reason: "Designer consent" }),
    }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "rights.enable-film", entityId: "rights-1" }),
    }));
  });

  it("updates ordinary rights without mutating version-bound film consent", async () => {
    const rights = {
      id: "rights-1",
      designAssetId: "design-1",
      allowProductSales: false,
      allowMarketplacePublishing: false,
      allowFilmSales: true,
      allowCorporateBidding: false,
      filmConsentVersionId: "version-1",
      filmConsentGrantedAt: new Date("2026-08-01T00:00:00.000Z"),
      filmConsentRevokedAt: null,
      filmRoyaltyRate: 10,
    };
    const update = jest.fn().mockResolvedValue({
      ...rights,
      allowProductSales: true,
      allowMarketplacePublishing: true,
      allowCorporateBidding: true,
      filmRoyaltyRate: 12.5,
    });
    const prisma = {
      designAsset: {
        findUnique: jest.fn().mockResolvedValue({ id: "design-1", designerId: "designer-1" }),
      },
      commercialRights: {
        findUnique: jest.fn().mockResolvedValue(rights),
        update,
      },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new CommercialRightsService(prisma as never, audit as never);

    await service.updateByDesign(
      "design-1",
      { sub: "designer-1", role: UserRole.DESIGNER } as never,
      {
        allowProductSales: true,
        allowMarketplacePublishing: true,
        allowCorporateBidding: true,
        filmRoyaltyRate: 12.5,
      },
    );

    expect(update).toHaveBeenCalledWith({
      where: { designAssetId: "design-1" },
      data: {
        allowProductSales: true,
        allowMarketplacePublishing: true,
        allowCorporateBidding: true,
        filmRoyaltyRate: 12.5,
      },
    });
    expect(update.mock.calls[0][0].data).not.toHaveProperty("allowFilmSales");
    expect(update.mock.calls[0][0].data).not.toHaveProperty("filmConsentVersionId");
  });

  it("rejects a bulk update before writing when any selected design is not owned", async () => {
    const update = jest.fn();
    const tx = {
      designAsset: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "design-foreign",
            designerId: "designer-other",
            commercialRights: { id: "rights-foreign" },
            versions: [],
          },
        ]),
      },
      commercialRights: { update },
    };
    const transaction = jest.fn(async (operation: (client: typeof tx) => unknown) => operation(tx));
    const service = new CommercialRightsService({ $transaction: transaction } as never, { log: jest.fn() } as never);

    await expect(service.updateBulk(
      { sub: "designer-1", role: UserRole.DESIGNER } as never,
      { designIds: ["design-foreign"], allowProductSales: true },
    )).rejects.toThrow("cannot be managed by this account");
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(update).not.toHaveBeenCalled();
  });

  it("updates selected rights atomically and records film consent only where it changes", async () => {
    const rightsByDesign = new Map([
      ["design-1", {
        id: "rights-1",
        designAssetId: "design-1",
        allowProductSales: false,
        allowMarketplacePublishing: false,
        allowFilmSales: false,
        allowCorporateBidding: false,
        filmConsentGrantedAt: null,
        filmConsentRevokedAt: null,
        filmConsentVersionId: null,
        filmRoyaltyRate: 12.5,
      }],
      ["design-2", {
        id: "rights-2",
        designAssetId: "design-2",
        allowProductSales: true,
        allowMarketplacePublishing: false,
        allowFilmSales: true,
        allowCorporateBidding: false,
        filmConsentGrantedAt: new Date("2026-08-01T00:00:00.000Z"),
        filmConsentRevokedAt: null,
        filmConsentVersionId: "version-2",
        filmRoyaltyRate: 10,
      }],
    ]);
    const update = jest.fn().mockImplementation(({ where, data }) => ({
      ...rightsByDesign.get(where.designAssetId),
      ...data,
    }));
    const tx = {
      designAsset: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "design-1",
            designerId: "designer-1",
            tenantId: "tenant-1",
            commercialRights: rightsByDesign.get("design-1"),
            versions: [{ id: "version-1" }],
          },
          {
            id: "design-2",
            designerId: "designer-1",
            tenantId: "tenant-1",
            commercialRights: rightsByDesign.get("design-2"),
            versions: [{ id: "version-2" }],
          },
        ]),
      },
      filmSaleSettings: {
        findFirst: jest.fn().mockResolvedValue({ id: "settings-1", settingsVersion: 4 }),
      },
      commercialRights: { update },
      filmConsentEvent: { create: jest.fn().mockResolvedValue({ id: "event-1" }) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) },
    };
    const transaction = jest.fn(async (operation: (client: typeof tx) => unknown) => operation(tx));
    const service = new CommercialRightsService({ $transaction: transaction } as never, { log: jest.fn() } as never);

    const result = await service.updateBulk(
      { sub: "designer-1", email: "designer@example.com", role: UserRole.DESIGNER } as never,
      {
        designIds: ["design-1", "design-2"],
        allowProductSales: true,
        allowMarketplacePublishing: true,
        filmSalesAction: BulkFilmSalesAction.ENABLE,
        reason: "Bulk designer consent",
      },
    );

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
    expect(result).toEqual(expect.objectContaining({ requestedCount: 2, updatedCount: 2, unchangedCount: 0 }));
    expect(update).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { designAssetId: "design-1" },
      data: expect.objectContaining({
        allowProductSales: true,
        allowMarketplacePublishing: true,
        allowFilmSales: true,
        filmConsentVersionId: "version-1",
      }),
    }));
    expect(tx.filmConsentEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.filmConsentEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        designAssetId: "design-1",
        designVersionId: "version-1",
        reason: "Bulk designer consent",
      }),
    }));
    expect(tx.auditLog.create).toHaveBeenCalledTimes(3);
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "rights.enable-film", entityId: "rights-1" }),
    }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "rights.update-own", entityId: "rights-2" }),
    }));
  });

  it("rejects bulk film consent before writing when a selected design has no version", async () => {
    const update = jest.fn();
    const tx = {
      designAsset: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "design-1",
            designerId: "designer-1",
            commercialRights: { id: "rights-1" },
            versions: [],
          },
        ]),
      },
      commercialRights: { update },
    };
    const transaction = jest.fn(async (operation: (client: typeof tx) => unknown) => operation(tx));
    const service = new CommercialRightsService({ $transaction: transaction } as never, { log: jest.fn() } as never);

    await expect(service.updateBulk(
      { sub: "designer-1", role: UserRole.DESIGNER } as never,
      { designIds: ["design-1"], filmSalesAction: BulkFilmSalesAction.ENABLE },
    )).rejects.toThrow("no verified version");
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(update).not.toHaveBeenCalled();
  });

  it("keeps tenant administrators inside their active workspace", async () => {
    const update = jest.fn();
    const tx = {
      designAsset: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "design-foreign-tenant",
            designerId: "designer-2",
            tenantId: "tenant-2",
            commercialRights: { id: "rights-foreign-tenant" },
            versions: [],
          },
        ]),
      },
      commercialRights: { update },
    };
    const transaction = jest.fn(async (operation: (client: typeof tx) => unknown) => operation(tx));
    const service = new CommercialRightsService({ $transaction: transaction } as never, { log: jest.fn() } as never);

    await expect(service.updateBulk(
      { sub: "admin-1", role: UserRole.ADMIN, tenantId: "tenant-1" } as never,
      { designIds: ["design-foreign-tenant"], allowProductSales: true },
    )).rejects.toThrow("outside the active workspace");
    expect(update).not.toHaveBeenCalled();
  });

  it("allows an unambiguous legacy design in the admin workspace and scopes its audit", async () => {
    const rights = {
      id: "rights-legacy",
      designAssetId: "design-legacy",
      allowProductSales: false,
      allowMarketplacePublishing: false,
      allowFilmSales: false,
      allowCorporateBidding: false,
    };
    const update = jest.fn().mockResolvedValue({ ...rights, allowProductSales: true });
    const tx = {
      designAsset: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "design-legacy",
            designerId: "designer-1",
            tenantId: null,
            designer: { tenantMemberships: [{ tenantId: "tenant-1" }] },
            commercialRights: rights,
            versions: [],
          },
        ]),
      },
      commercialRights: { update },
      auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) },
    };
    const transaction = jest.fn(async (operation: (client: typeof tx) => unknown) => operation(tx));
    const service = new CommercialRightsService({ $transaction: transaction } as never, { log: jest.fn() } as never);

    await expect(service.updateBulk(
      { sub: "admin-1", email: "admin@example.com", role: UserRole.ADMIN, tenantId: "tenant-1" } as never,
      { designIds: ["design-legacy"], allowProductSales: true },
    )).resolves.toEqual(expect.objectContaining({ updatedCount: 1 }));

    expect(update).toHaveBeenCalledTimes(1);
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "rights.admin-override",
        tenantId: "tenant-1",
      }),
    }));
  });

  it("retries serializable write conflicts before returning a bulk result", async () => {
    const rights = {
      id: "rights-1",
      designAssetId: "design-1",
      allowProductSales: false,
      allowMarketplacePublishing: false,
      allowFilmSales: false,
      allowCorporateBidding: false,
    };
    const tx = {
      designAsset: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "design-1",
            designerId: "designer-1",
            tenantId: "tenant-1",
            commercialRights: rights,
            versions: [],
          },
        ]),
      },
      commercialRights: {
        update: jest.fn().mockResolvedValue({ ...rights, allowProductSales: true }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) },
    };
    let attempt = 0;
    const transaction = jest.fn(async (operation: (client: typeof tx) => unknown) => {
      attempt += 1;
      if (attempt < 3) throw Object.assign(new Error("serialization conflict"), { code: "P2034" });
      return operation(tx);
    });
    const service = new CommercialRightsService({ $transaction: transaction } as never, { log: jest.fn() } as never);

    await expect(service.updateBulk(
      { sub: "designer-1", email: "designer@example.com", role: UserRole.DESIGNER } as never,
      { designIds: ["design-1"], allowProductSales: true },
    )).resolves.toEqual(expect.objectContaining({ updatedCount: 1 }));

    expect(transaction).toHaveBeenCalledTimes(3);
    expect(transaction).toHaveBeenLastCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });

  it("bulk-revokes active film consent without creating events for already-disabled designs", async () => {
    const enabledRights = {
      id: "rights-enabled",
      designAssetId: "design-enabled",
      allowProductSales: false,
      allowMarketplacePublishing: false,
      allowFilmSales: true,
      allowCorporateBidding: false,
      filmConsentGrantedAt: new Date("2026-08-01T00:00:00.000Z"),
      filmConsentRevokedAt: null,
      filmConsentVersionId: "version-enabled",
      filmRoyaltyRate: 11,
    };
    const disabledRights = {
      ...enabledRights,
      id: "rights-disabled",
      designAssetId: "design-disabled",
      allowFilmSales: false,
      filmConsentGrantedAt: null,
      filmConsentVersionId: null,
    };
    const update = jest.fn().mockImplementation(({ data }) => ({ ...enabledRights, ...data }));
    const tx = {
      designAsset: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "design-enabled",
            designerId: "designer-1",
            tenantId: "tenant-1",
            commercialRights: enabledRights,
            versions: [{ id: "version-enabled" }],
          },
          {
            id: "design-disabled",
            designerId: "designer-1",
            tenantId: "tenant-1",
            commercialRights: disabledRights,
            versions: [{ id: "version-disabled" }],
          },
        ]),
      },
      filmSaleSettings: { findFirst: jest.fn().mockResolvedValue({ id: "settings-1", settingsVersion: 2 }) },
      commercialRights: { update },
      filmConsentEvent: { create: jest.fn().mockResolvedValue({ id: "event-1" }) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) },
    };
    const transaction = jest.fn(async (operation: (client: typeof tx) => unknown) => operation(tx));
    const service = new CommercialRightsService({ $transaction: transaction } as never, { log: jest.fn() } as never);

    const result = await service.updateBulk(
      { sub: "designer-1", email: "designer@example.com", role: UserRole.DESIGNER } as never,
      {
        designIds: ["design-enabled", "design-disabled"],
        filmSalesAction: BulkFilmSalesAction.DISABLE,
        reason: "  Designer bulk revocation  ",
      },
    );

    expect(result).toEqual(expect.objectContaining({ requestedCount: 2, updatedCount: 1, unchangedCount: 1 }));
    expect(result.items.map((item) => item.designAssetId)).toEqual(["design-enabled", "design-disabled"]);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { designAssetId: "design-enabled" },
      data: expect.objectContaining({ allowFilmSales: false, filmConsentRevokedAt: expect.any(Date) }),
    }));
    expect(tx.filmConsentEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.filmConsentEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        designAssetId: "design-enabled",
        designVersionId: "version-enabled",
        action: "REVOKED",
        reason: "Designer bulk revocation",
      }),
    }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "rights.disable-film", entityId: "rights-enabled" }),
    }));
  });

  it("rebinds stale film consent to the latest version and skips current consent", async () => {
    const staleRights = {
      id: "rights-stale",
      designAssetId: "design-stale",
      allowProductSales: false,
      allowMarketplacePublishing: false,
      allowFilmSales: true,
      allowCorporateBidding: false,
      filmConsentGrantedAt: new Date("2026-08-01T00:00:00.000Z"),
      filmConsentRevokedAt: null,
      filmConsentVersionId: "version-old",
      filmRoyaltyRate: 9,
    };
    const currentRights = {
      ...staleRights,
      id: "rights-current",
      designAssetId: "design-current",
      filmConsentVersionId: "version-current",
    };
    const update = jest.fn().mockImplementation(({ data }) => ({ ...staleRights, ...data }));
    const tx = {
      designAsset: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "design-stale",
            designerId: "designer-1",
            tenantId: "tenant-1",
            commercialRights: staleRights,
            versions: [{ id: "version-new" }],
          },
          {
            id: "design-current",
            designerId: "designer-1",
            tenantId: "tenant-1",
            commercialRights: currentRights,
            versions: [{ id: "version-current" }],
          },
        ]),
      },
      filmSaleSettings: { findFirst: jest.fn().mockResolvedValue(null) },
      commercialRights: { update },
      filmConsentEvent: { create: jest.fn().mockResolvedValue({ id: "event-1" }) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) },
    };
    const transaction = jest.fn(async (operation: (client: typeof tx) => unknown) => operation(tx));
    const service = new CommercialRightsService({ $transaction: transaction } as never, { log: jest.fn() } as never);

    const result = await service.updateBulk(
      { sub: "designer-1", email: "designer@example.com", role: UserRole.DESIGNER } as never,
      {
        designIds: ["design-stale", "design-current"],
        filmSalesAction: BulkFilmSalesAction.ENABLE,
      },
    );

    expect(result).toEqual(expect.objectContaining({ requestedCount: 2, updatedCount: 1, unchangedCount: 1 }));
    expect(result.items.map((item) => item.designAssetId)).toEqual(["design-stale", "design-current"]);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { designAssetId: "design-stale" },
      data: expect.objectContaining({ filmConsentVersionId: "version-new" }),
    }));
    expect(tx.filmConsentEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
  });
});
