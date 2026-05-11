import { AdminOpsService } from "../src/modules/admin-ops/admin-ops.service";
import { AuditService } from "../src/modules/audit/audit.service";
import { MailerService } from "../src/modules/mailer/mailer.service";

describe("AdminOpsService AI budget", () => {
  it("tracks monthly AI usage and enforces spend checks", async () => {
    const store = new Map<string, { value: unknown }>();
    const prisma: any = {
      auditLog: { findMany: jest.fn(), findUnique: jest.fn() },
      platformSetting: {
        findUnique: jest.fn(async ({ where: { key } }: any) => store.get(`ps:${key}`) ?? null),
        create: jest.fn(async ({ data }: any) => {
          store.set(`ps:${data.key}`, { value: data.value });
          return data;
        }),
        upsert: jest.fn(async ({ where: { key }, create, update }: any) => {
          const existing = store.get(`ps:${key}`);
          const value = existing ? update.value : create.value;
          store.set(`ps:${key}`, { value });
          return { key, value };
        }),
      },
      aiSetting: {
        findUnique: jest.fn(async ({ where: { key } }: any) => store.get(`ai:${key}`) ?? null),
        create: jest.fn(async ({ data }: any) => {
          store.set(`ai:${data.key}`, { value: data.value });
          return data;
        }),
        upsert: jest.fn(async ({ where: { key }, create, update }: any) => {
          const existing = store.get(`ai:${key}`);
          const value = existing ? update.value : create.value;
          store.set(`ai:${key}`, { value });
          return { key, value };
        }),
      },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const mailer = { send: jest.fn(), isConfigured: () => false } as unknown as MailerService;
    const service = new AdminOpsService(prisma, audit, mailer);
    await service.onModuleInit();

    await service.updateAiSettings("admin-1", { enabled: true, monthlyBudgetUsd: 0.01 });
    expect(await service.canSpendAi(0.005)).toBe(true);

    await service.registerAiUsage("admin-1", 0.006, "test-op");
    expect(await service.canSpendAi(0.005)).toBe(false);
    expect((await service.getAiSettings()).usageUsdMonth).toBeGreaterThan(0);
  });
});
