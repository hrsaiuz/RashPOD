import request = require("supertest");
import { INestApplication } from "@nestjs/common";
import { createTestApp } from "./helpers/test-app";

jest.setTimeout(30000);

describe("Worker jobs health check e2e", () => {
  let app: INestApplication;
  let fakePrisma: any;
  let adminToken = "";

  beforeAll(async () => {
    const setup = await createTestApp();
    app = setup.app;
    fakePrisma = setup.fakePrisma;

    await request(app.getHttpServer()).post("/auth/register").send({
      email: "admin-health@test.local",
      password: "Password123!",
      displayName: "Admin Health",
    });
    const adminUser = fakePrisma.__state.users.find((u: any) => u.email === "admin-health@test.local");
    adminUser.role = "ADMIN";
    const adminLogin = await request(app.getHttpServer()).post("/auth/login").send({
      email: "admin-health@test.local",
      password: "Password123!",
    });
    adminToken = adminLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("enqueues SEND_EMAIL payload with required fields on breach", async () => {
    const settings = await request(app.getHttpServer())
      .patch("/admin/settings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        metadata: {
          queueAlerts: {
            oldestPendingAgeSeconds: 1,
            failedRatePercent: 10,
            alertCooldownSeconds: 0,
            alertRecipients: ["ops-alert@test.local"],
          },
        },
      });
    expect(settings.status).toBe(200);

    await fakePrisma.workerJob.create({
      data: {
        type: "GENERATE_PRODUCT_MOCKUPS",
        payloadJson: { placementId: "p1", generatedAssetId: "g1" },
      },
    });
    const failed = await fakePrisma.workerJob.create({
      data: {
        type: "GENERATE_LISTING_IMAGE_PACK",
        payloadJson: { placementId: "p2", generatedAssetIds: ["g2"] },
      },
    });
    await fakePrisma.workerJob.update({
      where: { id: failed.id },
      data: { status: "FAILED", attempts: 3, maxAttempts: 3 },
    });

    const pending = fakePrisma.__state.workerJobs.find((j: any) => j.status === "PENDING");
    pending.createdAt = new Date(Date.now() - 3000);

    const check = await request(app.getHttpServer())
      .post("/admin/worker-jobs/health/check")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});
    expect(check.status).toBe(201);
    expect(check.body.ok).toBe(false);
    expect(check.body.alert.emitted).toBe(true);

    const emailJob = fakePrisma.__state.workerJobs.find((j: any) => j.type === "SEND_EMAIL");
    expect(emailJob).toBeTruthy();
    expect(emailJob.payloadJson).toEqual(
      expect.objectContaining({
        to: "ops-alert@test.local",
        templateKey: "worker_queue_alert",
        variables: expect.any(Object),
        idempotencyKey: expect.stringContaining("worker-queue-alert:"),
      }),
    );
  });
});
