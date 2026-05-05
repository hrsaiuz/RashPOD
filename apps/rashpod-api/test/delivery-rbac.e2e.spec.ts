import request = require("supertest");
import { INestApplication } from "@nestjs/common";
import { createTestApp } from "./helpers/test-app";

jest.setTimeout(30000);

describe("Delivery RBAC e2e", () => {
  let app: INestApplication;
  let fakePrisma: any;
  let adminToken = "";
  let customerToken = "";
  let financeToken = "";
  let orderId = "";
  let deliverySettingId = "";

  beforeAll(async () => {
    const setup = await createTestApp();
    app = setup.app;
    fakePrisma = setup.fakePrisma;

    await request(app.getHttpServer()).post("/auth/register").send({
      email: "admin-rbac@test.local",
      password: "Password123!",
      displayName: "Admin RBAC",
    });
    const adminUser = fakePrisma.__state.users.find((u: any) => u.email === "admin-rbac@test.local");
    adminUser.role = "ADMIN";
    const adminLogin = await request(app.getHttpServer()).post("/auth/login").send({
      email: "admin-rbac@test.local",
      password: "Password123!",
    });
    adminToken = adminLogin.body.accessToken;

    const customerReg = await request(app.getHttpServer()).post("/auth/register").send({
      email: "customer-rbac@test.local",
      password: "Password123!",
      displayName: "Customer RBAC",
    });
    customerToken = customerReg.body.accessToken;

    await request(app.getHttpServer()).post("/auth/register").send({
      email: "finance-rbac@test.local",
      password: "Password123!",
      displayName: "Finance RBAC",
    });
    const financeUser = fakePrisma.__state.users.find((u: any) => u.email === "finance-rbac@test.local");
    financeUser.role = "FINANCE_STAFF";
    const financeLogin = await request(app.getHttpServer()).post("/auth/login").send({
      email: "finance-rbac@test.local",
      password: "Password123!",
    });
    financeToken = financeLogin.body.accessToken;

    const customerUserId = fakePrisma.__state.users.find((u: any) => u.email === "customer-rbac@test.local").id;
    const order = await fakePrisma.order.create({
      data: {
        customerId: customerUserId,
        subtotal: 100000,
        deliveryFee: 20000,
        total: 120000,
        deliveryType: "YANDEX",
        deliveryZone: "TASHKENT",
      },
    });
    orderId = order.id;

    const setting = await fakePrisma.deliverySetting.create({
      data: {
        providerType: "YANDEX",
        displayName: "Yandex",
        zone: "TASHKENT",
        isActive: true,
        price: 25000,
      },
    });
    deliverySettingId = setting.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("forbids customer from creating shipment", async () => {
    const res = await request(app.getHttpServer())
      .post("/delivery/create-shipment")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ orderId, providerType: "YANDEX" });

    expect(res.status).toBe(403);
  });

  it("allows finance staff to create shipment", async () => {
    const res = await request(app.getHttpServer())
      .post("/delivery/create-shipment")
      .set("Authorization", `Bearer ${financeToken}`)
      .send({ orderId, providerType: "YANDEX" });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("CREATED");
  });

  it("forbids customer from reading shipment status", async () => {
    const res = await request(app.getHttpServer())
      .get(`/delivery/shipments/${orderId}`)
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
  });

  it("allows finance staff to read shipment status", async () => {
    const res = await request(app.getHttpServer())
      .get(`/delivery/shipments/${orderId}`)
      .set("Authorization", `Bearer ${financeToken}`);

    expect(res.status).toBe(200);
    expect(["CREATED", "NOT_CREATED"]).toContain(res.body.status);
  });

  it("forbids finance staff from toggling provider status", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/delivery/admin/providers/${deliverySettingId}`)
      .set("Authorization", `Bearer ${financeToken}`)
      .send({ isActive: false });

    expect(res.status).toBe(403);
  });

  it("allows admin to toggle provider status", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/delivery/admin/providers/${deliverySettingId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);
  });
});
