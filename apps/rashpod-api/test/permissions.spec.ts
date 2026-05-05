import { permissions } from "../src/common/auth/permissions";

describe("permissions matrix", () => {
  it("keeps film-rights permissions owned by designer/admin only", () => {
    expect(permissions["rights:enable-film-own"]).toEqual(["DESIGNER", "ADMIN", "SUPER_ADMIN"]);
    expect(permissions["rights:disable-film-own"]).toEqual(["DESIGNER", "ADMIN", "SUPER_ADMIN"]);
  });

  it("requires moderation permission for moderation actions", () => {
    expect(permissions["design:moderate"]).toContain("MODERATOR");
  });
});
