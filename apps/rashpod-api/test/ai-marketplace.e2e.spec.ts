import request = require("supertest");
import { INestApplication } from "@nestjs/common";
import { createTestApp } from "./helpers/test-app";

jest.setTimeout(30000);

describe("AI + Marketplace e2e", () => {
  let app: INestApplication;
  let fakePrisma: any;
  let adminToken = "";
  let designerToken = "";

  beforeAll(async () => {
    const setup = await createTestApp();
    app = setup.app;
    fakePrisma = setup.fakePrisma;

    const adminReg = await request(app.getHttpServer()).post("/auth/register").send({
      email: "admin-aimk@test.local",
      password: "Password123!",
      displayName: "Admin AIMK",
    });
    const adminUser = fakePrisma.__state.users.find((u: any) => u.email === "admin-aimk@test.local");
    adminUser.role = "ADMIN";
    const adminLogin = await request(app.getHttpServer()).post("/auth/login").send({
      email: "admin-aimk@test.local",
      password: "Password123!",
    });
    adminToken = adminLogin.body.accessToken;

    const designerReg = await request(app.getHttpServer()).post("/auth/register").send({
      email: "designer-aimk@test.local",
      password: "Password123!",
      displayName: "Designer AIMK",
    });
    designerToken = designerReg.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("serves AI assist endpoint with governance payload", async () => {
    const res = await request(app.getHttpServer())
      .post("/ai/listing-copy")
      .set("Authorization", `Bearer ${designerToken}`)
      .send({ titleHint: "Blue Hoodie" });
    expect(res.status).toBe(201);
    expect(res.body.requiresApproval).toBe(true);
    expect(res.body.governance.autoPublish).toBe(false);
  });

  it("exports published listings via admin marketplace endpoint", async () => {
    const designer = fakePrisma.__state.users.find((u: any) => u.email === "designer-aimk@test.local");
    await fakePrisma.commerceListing.create({
      data: {
        type: "PRODUCT",
        status: "PUBLISHED",
        designerId: designer.id,
        designAssetId: "dsg_export_1",
        title: "Export Tee",
        slug: "export-tee",
        description: "desc",
        price: 129000,
        currency: "UZS",
        publishedAt: new Date(),
      },
    });

    const exportRes = await request(app.getHttpServer())
      .get("/admin/marketplace/export")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(exportRes.status).toBe(200);
    expect(exportRes.body.total).toBeGreaterThanOrEqual(1);
    expect(exportRes.body.items[0]).toEqual(expect.objectContaining({ listingId: expect.any(String) }));

    const csvRes = await request(app.getHttpServer())
      .get("/admin/marketplace/export/csv")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(csvRes.status).toBe(200);
    expect(csvRes.body.csv).toContain("listingId,type,title");
  });
});
