import { permissions } from "../src/common/auth/permissions";
import { PERMISSION_KEY } from "../src/common/auth/permission.decorator";
import { PrintfulController } from "../src/modules/printful/printful.controller";

describe("permissions matrix", () => {
  it("keeps film-rights permissions owned by designer/admin only", () => {
    expect(permissions["rights:enable-film-own"]).toEqual(["DESIGNER", "ADMIN", "SUPER_ADMIN"]);
    expect(permissions["rights:disable-film-own"]).toEqual(["DESIGNER", "ADMIN", "SUPER_ADMIN"]);
  });

  it("requires moderation permission for moderation actions", () => {
    expect(permissions["design:moderate"]).toContain("MODERATOR");
  });

  it("gates tenant administration behind admin and operations roles", () => {
    expect(permissions["tenant:settings:manage"]).toEqual(["ADMIN", "SUPER_ADMIN", "OPERATIONS_MANAGER"]);
    expect(permissions["tenant:members:manage"]).toEqual(["ADMIN", "SUPER_ADMIN", "OPERATIONS_MANAGER"]);
    expect(permissions["tenants:read-all"]).toEqual(["SUPER_ADMIN"]);
    expect(permissions["entitlements:override"]).toEqual(["SUPER_ADMIN"]);
  });

  it("limits designer invitation management to admin roles", () => {
    expect(permissions["designer-invitations:manage"]).toEqual(["ADMIN", "SUPER_ADMIN"]);
  });

  it("requires template-management permission when preparing a shared Printful product", () => {
    expect(Reflect.getMetadata(PERMISSION_KEY, PrintfulController.prototype.prepareProduct)).toBe("printful-template:manage");
    expect(permissions["printful-template:manage"]).not.toContain("MODERATOR");
  });
});
