import request = require("supertest");
import { INestApplication } from "@nestjs/common";
import { createTestApp } from "./helpers/test-app";

jest.setTimeout(30000);

describe("Delivery quote e2e", () => {
  let app: INestApplication;
  let adminToken = "";
  let customerToken = "";

  beforeAll(async () => {
    const setup = await createTestApp();
    app = setup.app;
    const fakePrisma = setup.fakePrisma as any;

    await request(app.getHttpServer()).post("/auth/register").send({
      email: "admin-quote@test.local",
      password: "Password123!",
      displayName: "Admin Quote",
    });
    const adminUser = fakePrisma.__state.users.find((u: any) => u.email === "admin-quote@test.local");
    adminUser.role = "ADMIN";

    const adminLogin = await request(app.getHttpServer()).post("/auth/login").send({
      email: "admin-quote@test.local",
      password: "Password123!",
    });
    adminToken = adminLogin.body.accessToken;

    const customerReg = await request(app.getHttpServer()).post("/auth/register").send({
      email: "customer-quote@test.local",
      password: "Password123!",
      displayName: "Customer Quote",
    });
    customerToken = customerReg.body.accessToken;

    await request(app.getHttpServer())
      .post("/admin/delivery-settings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        providerType: "YANDEX",
        displayName: "Yandex Delivery",
        zone: "TASHKENT",
        price: 25000,
        freeDeliveryThreshold: 200000,
        etaText: "1-2 days",
      });

    await request(app.getHttpServer())
      .post("/admin/delivery-settings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        providerType: "UZPOST",
        displayName: "UzPost",
        zone: "TASHKENT",
        price: 15000,
        freeDeliveryThreshold: 100000,
        etaText: "2-4 days",
      });
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 404 when zone has no active provider", async () => {
    const res = await request(app.getHttpServer())
      .post("/delivery/quote")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ zone: "NUKUS", subtotal: 50000 });

    expect(res.status).toBe(404);
  });

  it("applies delivery fee when subtotal is below threshold", async () => {
    const res = await request(app.getHttpServer())
      .post("/delivery/quote")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ zone: "TASHKENT", providerType: "YANDEX", subtotal: 90000 });

    expect(res.status).toBe(201);
    expect(res.body.providerType).toBe("YANDEX");
    expect(res.body.deliveryPrice).toBe(25000);
    expect(res.body.total).toBe(115000);
  });

  it("sets delivery fee to zero when subtotal reaches free threshold", async () => {
    const res = await request(app.getHttpServer())
      .post("/delivery/quote")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ zone: "TASHKENT", providerType: "YANDEX", subtotal: 200000 });

    expect(res.status).toBe(201);
    expect(res.body.deliveryPrice).toBe(0);
    expect(res.body.total).toBe(200000);
  });

  it("respects providerType filter when multiple providers share a zone", async () => {
    const res = await request(app.getHttpServer())
      .post("/delivery/quote")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ zone: "TASHKENT", providerType: "UZPOST", subtotal: 50000 });

    expect(res.status).toBe(201);
    expect(res.body.providerType).toBe("UZPOST");
    expect(res.body.providerName).toBe("UzPost");
    expect(res.body.deliveryPrice).toBe(15000);
    expect(res.body.total).toBe(65000);
  });
});
