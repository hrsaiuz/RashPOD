import request = require("supertest");
import { INestApplication } from "@nestjs/common";
import { createTestApp } from "./helpers/test-app";

jest.setTimeout(30000);

describe("Worker jobs dead-letter e2e", () => {
  let app: INestApplication;
  let fakePrisma: any;
  let adminToken = "";

  beforeAll(async () => {
    const setup = await createTestApp();
    app = setup.app;
    fakePrisma = setup.fakePrisma;

    await request(app.getHttpServer()).post("/auth/register").send({
      email: "admin-deadletter@test.local",
      password: "Password123!",
      displayName: "Admin Dead Letter",
    });
    const adminUser = fakePrisma.__state.users.find((u: any) => u.email === "admin-deadletter@test.local");
    adminUser.role = "ADMIN";
    const adminLogin = await request(app.getHttpServer()).post("/auth/login").send({
      email: "admin-deadletter@test.local",
      password: "Password123!",
    });
    adminToken = adminLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("lists only retry-saturated failed jobs and supports dead-letter batch retry", async () => {
    const sat = await fakePrisma.workerJob.create({
      data: { type: "GENERATE_PRODUCT_MOCKUPS", payloadJson: { placementId: "p1", generatedAssetId: "g1" } },
    });
    await fakePrisma.workerJob.update({
      where: { id: sat.id },
      data: { status: "FAILED", attempts: 3, maxAttempts: 3, errorMessage: "hard fail" },
    });
    const unsat = await fakePrisma.workerJob.create({
      data: { type: "GENERATE_PRODUCT_MOCKUPS", payloadJson: { placementId: "p2", generatedAssetId: "g2" } },
    });
    await fakePrisma.workerJob.update({
      where: { id: unsat.id },
      data: { status: "FAILED", attempts: 1, maxAttempts: 3, errorMessage: "temp fail" },
    });

    const listDead = await request(app.getHttpServer())
      .get("/admin/worker-jobs/dead-letter")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(listDead.status).toBe(200);
    expect(Array.isArray(listDead.body)).toBe(true);
    expect(listDead.body).toHaveLength(1);
    expect(listDead.body[0]?.id).toBe(sat.id);

    const retryDead = await request(app.getHttpServer())
      .post("/admin/worker-jobs/dead-letter/retry")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ids: [sat.id, unsat.id] });
    expect(retryDead.status).toBe(201);
    expect(retryDead.body.retriedCount).toBe(1);
    expect(retryDead.body.retriedIds).toEqual([sat.id]);

    const satAfter = await fakePrisma.workerJob.findUnique({ where: { id: sat.id } });
    const unsatAfter = await fakePrisma.workerJob.findUnique({ where: { id: unsat.id } });
    expect(satAfter.status).toBe("PENDING");
    expect(satAfter.attempts).toBe(0);
    expect(unsatAfter.status).toBe("FAILED");
  });
});
