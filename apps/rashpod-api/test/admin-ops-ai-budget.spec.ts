import { AdminOpsService } from "../src/modules/admin-ops/admin-ops.service";
import { AuditService } from "../src/modules/audit/audit.service";

describe("AdminOpsService AI budget", () => {
  it("tracks monthly AI usage and enforces spend checks", async () => {
    const prisma: any = { auditLog: { findMany: jest.fn(), findUnique: jest.fn() } };
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const service = new AdminOpsService(prisma, audit);

    await service.updateAiSettings("admin-1", { enabled: true, monthlyBudgetUsd: 0.01 });
    expect(service.canSpendAi(0.005)).toBe(true);

    await service.registerAiUsage("admin-1", 0.006, "test-op");
    expect(service.canSpendAi(0.005)).toBe(false);
    expect((service.getAiSettings() as any).usageUsdMonth).toBeGreaterThan(0);
  });
});
