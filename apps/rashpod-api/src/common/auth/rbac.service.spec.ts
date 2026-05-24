import { RbacService } from "./rbac.service";
import { permissions } from "./permissions";

describe("RbacService", () => {
  const prisma = {
    platformSetting: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  let service: RbacService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RbacService(prisma as never);
  });

  it("returns default roles when no overrides exist", () => {
    expect(service.getAllowedRoles("pipeline-config:read")).toEqual(permissions["pipeline-config:read"]);
  });

  it("merges overrides over defaults", async () => {
    (prisma.platformSetting.findUnique as jest.Mock).mockResolvedValue({
      key: "rbac.permissionOverrides",
      value: { "pipeline-config:read": ["CUSTOMER"] },
    });
    await service.reload();
    expect(service.getAllowedRoles("pipeline-config:read")).toEqual(["CUSTOMER"]);
    expect(service.getAllowedRoles("design:create")).toEqual(permissions["design:create"]);
  });

  it("rejects unknown permission keys on update", async () => {
    await expect(service.updateOverrides("actor", { "not-a-permission": ["ADMIN"] } as never)).rejects.toThrow(
      "Unknown permission",
    );
  });
});
