import { Test, TestingModule } from "@nestjs/testing";
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@prisma/client";
import { RolesGuard } from "./roles.guard";
import { PermissionGuard } from "./permission.guard";
import { permissions } from "./permissions";

describe("RBAC Guards", () => {
  describe("RolesGuard", () => {
    let guard: RolesGuard;
    let reflector: Reflector;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [RolesGuard, Reflector],
      }).compile();

      guard = module.get<RolesGuard>(RolesGuard);
      reflector = module.get<Reflector>(Reflector);
    });

    it("should allow access when no roles are required", () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);

      const mockContext = createMockContext({ role: UserRole.CUSTOMER });

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it("should allow ADMIN access to ADMIN-only endpoint", () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([UserRole.ADMIN]);

      const mockContext = createMockContext({ role: UserRole.ADMIN });

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it("should deny CUSTOMER access to ADMIN-only endpoint", () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([UserRole.ADMIN]);

      const mockContext = createMockContext({ role: UserRole.CUSTOMER });

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it("should allow SUPER_ADMIN access when SUPER_ADMIN and ADMIN are both required", () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([UserRole.ADMIN, UserRole.SUPER_ADMIN]);

      const mockContext = createMockContext({ role: UserRole.SUPER_ADMIN });

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it("should allow MODERATOR access when MODERATOR role is required", () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([UserRole.MODERATOR]);

      const mockContext = createMockContext({ role: UserRole.MODERATOR });

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it("should deny DESIGNER access to MODERATOR-only endpoint", () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([UserRole.MODERATOR]);

      const mockContext = createMockContext({ role: UserRole.DESIGNER });

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it("should allow access when user has one of multiple required roles", () => {
      jest
        .spyOn(reflector, "getAllAndOverride")
        .mockReturnValue([UserRole.ADMIN, UserRole.OPERATIONS_MANAGER, UserRole.FINANCE_STAFF]);

      const mockContext = createMockContext({ role: UserRole.FINANCE_STAFF });

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it("should deny access when user lacks all required roles", () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([UserRole.ADMIN, UserRole.SUPER_ADMIN]);

      const mockContext = createMockContext({ role: UserRole.DESIGNER });

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it("should throw when user object is missing", () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([UserRole.ADMIN]);

      const mockContext = createMockContext(undefined);

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it("should throw when user role is missing", () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([UserRole.ADMIN]);

      const mockContext = createMockContext({});

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });
  });

  describe("PermissionGuard", () => {
    let guard: PermissionGuard;
    let reflector: Reflector;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [PermissionGuard, Reflector],
      }).compile();

      guard = module.get<PermissionGuard>(PermissionGuard);
      reflector = module.get<Reflector>(Reflector);
    });

    it("should allow access when no permission is required", () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);

      const mockContext = createMockContext({ role: "CUSTOMER" });

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it("should allow ADMIN access to admin-settings:manage", () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue("admin-settings:manage");

      const mockContext = createMockContext({ role: "ADMIN" });

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it("should deny CUSTOMER access to admin-settings:manage", () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue("admin-settings:manage");

      const mockContext = createMockContext({ role: "CUSTOMER" });

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow("Missing permission: admin-settings:manage");
    });

    it("should allow MODERATOR access to design:moderate", () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue("design:moderate");

      const mockContext = createMockContext({ role: "MODERATOR" });

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it("should allow SUPER_ADMIN access to all permissions", () => {
      const allPermissions = Object.keys(permissions) as Array<keyof typeof permissions>;

      for (const permission of allPermissions) {
        jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(permission);
        const mockContext = createMockContext({ role: "SUPER_ADMIN" });

        if (permissions[permission].includes("SUPER_ADMIN" as never)) {
          expect(guard.canActivate(mockContext)).toBe(true);
        }
      }
    });

    it("should allow DESIGNER to create designs", () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue("design:create");

      const mockContext = createMockContext({ role: "DESIGNER" });

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it("should deny CUSTOMER from creating designs", () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue("design:create");

      const mockContext = createMockContext({ role: "CUSTOMER" });

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it("should allow OPERATIONS_MANAGER to manage royalty rules", () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue("royalty-rule:manage");

      const mockContext = createMockContext({ role: "OPERATIONS_MANAGER" });

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it("should deny DESIGNER from managing royalty rules", () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue("royalty-rule:manage");

      const mockContext = createMockContext({ role: "DESIGNER" });

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it("should allow FINANCE_STAFF to read audit logs", () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue("audit-logs:read");

      const mockContext = createMockContext({ role: "FINANCE_STAFF" });

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it("should deny DESIGNER from reading audit logs", () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue("audit-logs:read");

      const mockContext = createMockContext({ role: "DESIGNER" });

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it("should throw when role is missing", () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue("design:create");

      const mockContext = createMockContext({});

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow("Missing role");
    });

    it("should throw when user is missing", () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue("design:create");

      const mockContext = createMockContext(undefined);

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });
  });

  describe("Role Hierarchy Priority", () => {
    it("SUPER_ADMIN should have highest priority", () => {
      const roles = [
        "SUPER_ADMIN",
        "ADMIN",
        "OPERATIONS_MANAGER",
        "MODERATOR",
        "PRODUCTION_STAFF",
        "FINANCE_STAFF",
        "SUPPORT_STAFF",
        "DESIGNER",
        "CUSTOMER",
        "CORPORATE_CLIENT",
      ];

      expect(roles[0]).toBe("SUPER_ADMIN");
    });

    it("should verify role ordering matches expected priority", () => {
      const expectedOrder = [
        "SUPER_ADMIN",
        "ADMIN",
        "OPERATIONS_MANAGER",
        "FINANCE_STAFF",
        "MODERATOR",
        "PRODUCTION_STAFF",
        "SUPPORT_STAFF",
        "CORPORATE_CLIENT",
        "DESIGNER",
        "CUSTOMER",
      ];

      expect(expectedOrder[0]).toBe("SUPER_ADMIN");
      expect(expectedOrder[1]).toBe("ADMIN");
      expect(expectedOrder[expectedOrder.length - 1]).toBe("CUSTOMER");
    });
  });
});

function createMockContext(user: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}
