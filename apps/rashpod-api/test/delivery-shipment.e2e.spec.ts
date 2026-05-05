import request = require("supertest");
import { INestApplication } from "@nestjs/common";
import { createTestApp } from "./helpers/test-app";

jest.setTimeout(30000);

describe("Delivery shipment e2e", () => {
  let app: INestApplication;
  let fakePrisma: any;
  let adminToken = "";
  let customerId = "";

  beforeAll(async () => {
    const setup = await createTestApp();
    app = setup.app;
    fakePrisma = setup.fakePrisma;

    await request(app.getHttpServer()).post("/auth/register").send({
      email: "admin-ship@test.local",
      password: "Password123!",
      displayName: "Admin Ship",
    });
    const adminUser = fakePrisma.__state.users.find((u: any) => u.email === "admin-ship@test.local");
    adminUser.role = "ADMIN";

    const adminLogin = await request(app.getHttpServer()).post("/auth/login").send({
      email: "admin-ship@test.local",
      password: "Password123!",
    });
    adminToken = adminLogin.body.accessToken;

    await request(app.getHttpServer()).post("/auth/register").send({
      email: "customer-ship@test.local",
      password: "Password123!",
      displayName: "Customer Ship",
    });
    customerId = fakePrisma.__state.users.find((u: any) => u.email === "customer-ship@test.local").id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates shipment using dto.providerType when provided", async () => {
    const order = await fakePrisma.order.create({
      data: {
        customerId,
        subtotal: 100000,
        deliveryFee: 25000,
        total: 125000,
        deliveryType: "YANDEX",
        deliveryZone: "TASHKENT",
      },
    });

    const createShipment = await request(app.getHttpServer())
      .post("/delivery/create-shipment")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ orderId: order.id, providerType: "UZPOST" });

    expect(createShipment.status).toBe(201);
    expect(createShipment.body.providerType).toBe("UZPOST");
    expect(createShipment.body.shipmentRef).toMatch(/^SHP-UZPOST-/);

    const status = await request(app.getHttpServer())
      .get(`/delivery/shipments/${order.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(status.status).toBe(200);
    expect(status.body.status).toBe("CREATED");
    expect(status.body.providerType).toBe("UZPOST");
    expect(status.body.shipmentRef).toMatch(/^SHP-UZPOST-/);
  });

  it("falls back to order.deliveryType when dto.providerType is absent", async () => {
    const order = await fakePrisma.order.create({
      data: {
        customerId,
        subtotal: 100000,
        deliveryFee: 25000,
        total: 125000,
        deliveryType: "YANDEX",
        deliveryZone: "TASHKENT",
      },
    });

    const createShipment = await request(app.getHttpServer())
      .post("/delivery/create-shipment")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ orderId: order.id });

    expect(createShipment.status).toBe(201);
    expect(createShipment.body.providerType).toBe("YANDEX");
    expect(createShipment.body.shipmentRef).toMatch(/^SHP-YANDEX-/);

    const status = await request(app.getHttpServer())
      .get(`/delivery/shipments/${order.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(status.status).toBe(200);
    expect(status.body.status).toBe("CREATED");
    expect(status.body.shipmentRef).toMatch(/^SHP-YANDEX-/);
  });

  it("returns NOT_CREATED when shipment was not created yet", async () => {
    const order = await fakePrisma.order.create({
      data: {
        customerId,
        subtotal: 100000,
        deliveryFee: 25000,
        total: 125000,
        deliveryType: "YANDEX",
        deliveryZone: "TASHKENT",
      },
    });

    const status = await request(app.getHttpServer())
      .get(`/delivery/shipments/${order.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(status.status).toBe(200);
    expect(status.body.status).toBe("NOT_CREATED");
    expect(status.body.shipmentRef).toBeNull();
  });
});
