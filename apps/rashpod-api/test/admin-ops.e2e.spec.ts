import request = require("supertest");
import { INestApplication } from "@nestjs/common";
import { createTestApp } from "./helpers/test-app";

describe("Admin ops e2e", () => {
  let app: INestApplication;
  let fakePrisma: any;
  let adminToken = "";
  let financeToken = "";

  beforeAll(async () => {
    const setup = await createTestApp();
    app = setup.app;
    fakePrisma = setup.fakePrisma;

    await request(app.getHttpServer()).post("/auth/register").send({
      email: "admin-ops@test.local",
      password: "Password123!",
      displayName: "Admin Ops",
    });
    const adminUser = fakePrisma.__state.users.find((u: any) => u.email === "admin-ops@test.local");
    adminUser.role = "ADMIN";
    const adminLogin = await request(app.getHttpServer()).post("/auth/login").send({
      email: "admin-ops@test.local",
      password: "Password123!",
    });
    adminToken = adminLogin.body.accessToken;

    await request(app.getHttpServer()).post("/auth/register").send({
      email: "finance-ops@test.local",
      password: "Password123!",
      displayName: "Finance Ops",
    });
    const financeUser = fakePrisma.__state.users.find((u: any) => u.email === "finance-ops@test.local");
    financeUser.role = "FINANCE_STAFF";
    const financeLogin = await request(app.getHttpServer()).post("/auth/login").send({
      email: "finance-ops@test.local",
      password: "Password123!",
    });
    financeToken = financeLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("supports settings/email-template/ai-settings CRUD-ish flows", async () => {
    const updateSettings = await request(app.getHttpServer())
      .patch("/admin/settings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ supportEmail: "ops@rashpod.local", companyName: "RashPOD Ops" });
    expect(updateSettings.status).toBe(200);

    const createTpl = await request(app.getHttpServer())
      .post("/admin/email-templates")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: "order_paid", subject: "Order Paid", body: "Thanks" });
    expect(createTpl.status).toBe(201);

    const patchTpl = await request(app.getHttpServer())
      .patch(`/admin/email-templates/${createTpl.body.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ subject: "Order Paid Updated" });
    expect(patchTpl.status).toBe(200);

    const testTpl = await request(app.getHttpServer())
      .post(`/admin/email-templates/${createTpl.body.id}/test`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: "order_paid", to: "user@test.local" });
    expect(testTpl.status).toBe(201);

    const aiPatch = await request(app.getHttpServer())
      .patch("/admin/ai-settings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ enabled: true, monthlyBudgetUsd: 300 });
    expect(aiPatch.status).toBe(200);
  });

  it("allows finance staff to read audit logs and forbids template write", async () => {
    const auditList = await request(app.getHttpServer())
      .get("/admin/audit-logs")
      .set("Authorization", `Bearer ${financeToken}`);
    expect(auditList.status).toBe(200);

    const forbidCreate = await request(app.getHttpServer())
      .post("/admin/email-templates")
      .set("Authorization", `Bearer ${financeToken}`)
      .send({ key: "x", subject: "x", body: "x" });
    expect(forbidCreate.status).toBe(403);
  });
});
