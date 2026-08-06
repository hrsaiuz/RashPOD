import { UserRole } from "@prisma/client";
import { CommercialRightsService } from "../src/modules/commercial-rights/commercial-rights.service";

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
});
