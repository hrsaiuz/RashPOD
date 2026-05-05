import request = require("supertest");
import { INestApplication } from "@nestjs/common";
import { createTestApp } from "./helpers/test-app";

jest.setTimeout(30000);

describe("Admin delivery settings e2e", () => {
  let app: INestApplication;
  let fakePrisma: any;
  let adminToken = "";
  let customerToken = "";

  beforeAll(async () => {
    const setup = await createTestApp();
    app = setup.app;
    fakePrisma = setup.fakePrisma;

    await request(app.getHttpServer()).post("/auth/register").send({
      email: "admin-delivery@test.local",
      password: "Password123!",
      displayName: "Admin Delivery",
    });
    const adminUser = fakePrisma.__state.users.find((u: any) => u.email === "admin-delivery@test.local");
    adminUser.role = "ADMIN";

    const adminLogin = await request(app.getHttpServer()).post("/auth/login").send({
      email: "admin-delivery@test.local",
      password: "Password123!",
    });
    adminToken = adminLogin.body.accessToken;

    const customerReg = await request(app.getHttpServer()).post("/auth/register").send({
      email: "customer-delivery@test.local",
      password: "Password123!",
      displayName: "Customer Delivery",
    });
    customerToken = customerReg.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("allows admin to patch existing delivery setting", async () => {
    const created = await request(app.getHttpServer())
      .post("/admin/delivery-settings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        providerType: "YANDEX",
        displayName: "Yandex",
        zone: "TASHKENT",
        price: 25000,
        freeDeliveryThreshold: 200000,
        etaText: "1-2 days",
      });
    expect(created.status).toBe(201);

    const patched = await request(app.getHttpServer())
      .patch(`/admin/delivery-settings/${created.body.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        displayName: "Yandex Express",
        price: 30000,
        freeDeliveryThreshold: 250000,
        etaText: "same day",
      });

    expect(patched.status).toBe(200);
    expect(patched.body.displayName).toBe("Yandex Express");
    expect(patched.body.price).toBe(30000);
    expect(patched.body.freeDeliveryThreshold).toBe(250000);
    expect(patched.body.etaText).toBe("same day");
  });

  it("rejects invalid patch payload", async () => {
    const created = await request(app.getHttpServer())
      .post("/admin/delivery-settings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        providerType: "UZPOST",
        displayName: "UzPost",
        zone: "UZB",
      });
    expect(created.status).toBe(201);

    const badPatch = await request(app.getHttpServer())
      .patch(`/admin/delivery-settings/${created.body.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ price: -1 });

    expect(badPatch.status).toBe(400);
  });

  it("forbids non-admin users from patching delivery settings", async () => {
    const created = await request(app.getHttpServer())
      .post("/admin/delivery-settings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        providerType: "YANDEX",
        displayName: "Yandex",
        zone: "TASHKENT",
      });
    expect(created.status).toBe(201);

    const forbidden = await request(app.getHttpServer())
      .patch(`/admin/delivery-settings/${created.body.id}`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ displayName: "Not Allowed" });

    expect(forbidden.status).toBe(403);
  });
});
