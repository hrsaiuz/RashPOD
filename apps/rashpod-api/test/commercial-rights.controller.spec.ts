import { UserRole } from "@prisma/client";
import { BulkCommercialRightsController } from "../src/modules/commercial-rights/commercial-rights.controller";
import { BulkFilmSalesAction } from "../src/modules/commercial-rights/dto/bulk-update-rights.dto";

describe("BulkCommercialRightsController permissions", () => {
  it.each([
    [BulkFilmSalesAction.ENABLE, "rights:enable-film-own"],
    [BulkFilmSalesAction.DISABLE, "rights:disable-film-own"],
  ] as const)("requires the dedicated permission for %s", (filmSalesAction, permission) => {
    const service = { updateBulk: jest.fn() };
    const rbac = { getAllowedRoles: jest.fn().mockReturnValue([]) };
    const controller = new BulkCommercialRightsController(service as never, rbac as never);

    expect(() => controller.update(
      { sub: "designer-1", role: UserRole.DESIGNER } as never,
      { designIds: ["design-1"], filmSalesAction },
    )).toThrow(`Missing permission: ${permission}`);
    expect(rbac.getAllowedRoles).toHaveBeenCalledWith(permission);
    expect(service.updateBulk).not.toHaveBeenCalled();
  });

  it("dispatches an allowed film update to the service", () => {
    const service = { updateBulk: jest.fn().mockReturnValue({ updatedCount: 1 }) };
    const rbac = { getAllowedRoles: jest.fn().mockReturnValue([UserRole.DESIGNER]) };
    const controller = new BulkCommercialRightsController(service as never, rbac as never);
    const user = { sub: "designer-1", role: UserRole.DESIGNER } as never;
    const dto = { designIds: ["design-1"], filmSalesAction: BulkFilmSalesAction.ENABLE };

    expect(controller.update(user, dto)).toEqual({ updatedCount: 1 });
    expect(service.updateBulk).toHaveBeenCalledWith(user, dto);
  });
});
