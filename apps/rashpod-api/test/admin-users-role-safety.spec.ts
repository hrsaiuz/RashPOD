import { BadRequestException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { AdminUsersService } from "../src/modules/admin-users/admin-users.service";

describe("AdminUsersService super admin role safety", () => {
  const prisma = {
    user: { findUnique: jest.fn(), count: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  };
  const audit = { log: jest.fn() };
  let service: AdminUsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) => callback(prisma));
    service = new AdminUsersService(prisma as never, audit as never, {} as never);
  });

  it("prevents non-super-admin staff from changing a super admin account", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "super", role: UserRole.SUPER_ADMIN });
    await expect(service.updateUserRole("admin", "super", { role: UserRole.ADMIN }, UserRole.ADMIN)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("uses the final-super-admin invariant on the alternate admin endpoint", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "super", role: UserRole.SUPER_ADMIN });
    prisma.user.count.mockResolvedValue(1);
    await expect(
      service.updateUserRole("other-super", "super", { role: UserRole.ADMIN }, UserRole.SUPER_ADMIN),
    ).rejects.toThrow("The final super admin account cannot be demoted");
  });
});
