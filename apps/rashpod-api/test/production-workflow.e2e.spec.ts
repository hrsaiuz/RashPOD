import request = require("supertest");
import { INestApplication } from "@nestjs/common";
import { createTestApp } from "./helpers/test-app";

jest.setTimeout(30000);

describe("Production workflow e2e", () => {
  let app: INestApplication;
  let fakePrisma: any;
  let adminToken = "";

  beforeAll(async () => {
    const setup = await createTestApp();
    app = setup.app;
    fakePrisma = setup.fakePrisma;

    await request(app.getHttpServer()).post("/auth/register").send({
      email: "admin-prod@test.local",
      password: "Password123!",
      displayName: "Admin Prod",
    });
    const adminUser = fakePrisma.__state.users.find((u: any) => u.email === "admin-prod@test.local");
    adminUser.role = "ADMIN";
    const login = await request(app.getHttpServer()).post("/auth/login").send({
      email: "admin-prod@test.local",
      password: "Password123!",
    });
    adminToken = login.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("assigns a production job and submits QC result", async () => {
    const order = await fakePrisma.order.create({
      data: { customerId: "cust-1", subtotal: 100, deliveryFee: 0, total: 100, currency: "UZS" },
    });
    const job = await fakePrisma.productionJob.create({
      data: { orderId: order.id, status: "QC", queueType: "POD", notes: null },
    });

    const assign = await request(app.getHttpServer())
      .post(`/production/jobs/${job.id}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ assigneeId: "staff-22", note: "priority" });
    expect(assign.status).toBe(201);
    expect(assign.body.notes).toContain("[ASSIGN]");

    const qc = await request(app.getHttpServer())
      .post(`/production/jobs/${job.id}/qc`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        passed: true,
        note: "approved",
        checklist: { printQuality: true, sizeAccuracy: true, placementAccuracy: true, packagingReady: true },
      });
    expect(qc.status).toBe(201);
    expect(qc.body.status).toBe("PACKING");
    expect(qc.body.notes).toContain("[QC] result=PASS");
  });
});
