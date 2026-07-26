import { BadRequestException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { SuperAdminPlatformService } from "../src/modules/super-admin-platform/super-admin-platform.service";

describe("SuperAdminPlatformService role safety", () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const audit = { log: jest.fn() };
  let service: SuperAdminPlatformService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) => callback(prisma));
    service = new SuperAdminPlatformService(
      prisma as never,
      {} as never,
      audit as never,
      {} as never,
      {} as never,
    );
  });

  it("blocks self-demotion", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "self", role: UserRole.SUPER_ADMIN });
    await expect(service.updateUserRole("self", "self", UserRole.ADMIN)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("blocks demotion of the final super admin", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "target", role: UserRole.SUPER_ADMIN });
    prisma.user.count.mockResolvedValue(1);
    await expect(service.updateUserRole("actor", "target", UserRole.ADMIN)).rejects.toThrow(
      "The final super admin account cannot be demoted",
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("allows another super admin to demote an account when a recovery account remains", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "target", role: UserRole.SUPER_ADMIN });
    prisma.user.count.mockResolvedValue(2);
    prisma.user.update.mockResolvedValue({ id: "target", role: UserRole.ADMIN });

    await expect(service.updateUserRole("actor", "target", UserRole.ADMIN)).resolves.toMatchObject({ role: UserRole.ADMIN });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      action: "user.role.update",
      metadata: { from: UserRole.SUPER_ADMIN, to: UserRole.ADMIN },
    }));
  });
});
