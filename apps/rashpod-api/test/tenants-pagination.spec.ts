import { TenantsService } from "../src/modules/tenants/tenants.service";

describe("TenantsService platform pagination", () => {
  it("returns bounded tenant pages with an explicit total", async () => {
    const prisma = {
      tenant: {
        findMany: jest.fn().mockResolvedValue([{ id: "tenant-1" }]),
        count: jest.fn().mockResolvedValue(61),
      },
    };
    const service = new TenantsService(prisma as never, {} as never, {} as never);

    await expect(service.listTenants({ page: 2, limit: 25, search: "rash" })).resolves.toEqual({
      items: [{ id: "tenant-1" }],
      pagination: { page: 2, limit: 25, total: 61, totalPages: 3 },
    });
    expect(prisma.tenant.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 25, take: 25 }));
  });

  it("atomically cancels the prior subscription before assigning a new plan", async () => {
    const tx = {
      saaSPlan: { findUnique: jest.fn().mockResolvedValue({ status: "ACTIVE" }) },
      subscription: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({ id: "subscription-2" }),
      },
      tenant: { update: jest.fn().mockResolvedValue({ id: "tenant-1" }) },
    };
    const prisma = { $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) };
    const audit = { log: jest.fn() };
    const service = new TenantsService(prisma as never, {} as never, audit as never);

    await service.assignPlan("actor", "tenant-1", { planId: "plan-2" });

    expect(tx.subscription.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId: "tenant-1", status: { in: ["TRIALING", "ACTIVE", "PAST_DUE"] } },
      data: expect.objectContaining({ status: "CANCELED" }),
    }));
    expect(tx.subscription.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: "tenant-1", planId: "plan-2" }),
    }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      action: "tenant.plan.assign",
      metadata: expect.objectContaining({ tenantId: "tenant-1", planId: "plan-2" }),
    }));
  });
});
