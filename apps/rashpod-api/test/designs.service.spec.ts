import { DesignsService } from "../src/modules/designs/designs.service";

describe("DesignsService", () => {
  it("includes commercial rights in the designer designs table response", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new DesignsService(
      { designAsset: { findMany } } as never,
      { log: jest.fn() } as never,
      {} as never,
    );

    await service.listOwn("designer-1");

    expect(findMany).toHaveBeenCalledWith({
      where: { designerId: "designer-1" },
      include: { commercialRights: true },
      orderBy: { createdAt: "desc" },
    });
  });

  it("stores the active tenant on newly uploaded designs", async () => {
    const createDesign = jest.fn().mockResolvedValue({ id: "design-1" });
    const createRights = jest.fn().mockResolvedValue({ id: "rights-1" });
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new DesignsService(
      {
        designAsset: { create: createDesign },
        commercialRights: { create: createRights },
      } as never,
      audit as never,
      {} as never,
    );

    await service.create("designer-1", { title: "Tenant artwork" }, "tenant-1");

    expect(createDesign).toHaveBeenCalledWith({
      data: {
        designerId: "designer-1",
        tenantId: "tenant-1",
        title: "Tenant artwork",
        description: undefined,
      },
    });
    expect(createRights).toHaveBeenCalledWith({
      data: { designAssetId: "design-1", allowProductSales: false, allowFilmSales: false },
    });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "tenant-1" }));
  });
});
