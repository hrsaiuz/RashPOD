import request = require("supertest");
import { INestApplication } from "@nestjs/common";
import { createTestApp } from "./helpers/test-app";

jest.setTimeout(30000);

describe("Security e2e", () => {
  let app: INestApplication;
  let fakePrisma: any;
  let tokenA = "";
  let tokenB = "";
  let adminToken = "";

  beforeAll(async () => {
    const setup = await createTestApp();
    app = setup.app;
    fakePrisma = setup.fakePrisma;

    const regA = await request(app.getHttpServer()).post("/auth/register").send({
      email: "owner-a@test.local",
      password: "Password123!",
      displayName: "Owner A",
    });
    tokenA = regA.body.accessToken;

    const regB = await request(app.getHttpServer()).post("/auth/register").send({
      email: "owner-b@test.local",
      password: "Password123!",
      displayName: "Owner B",
    });
    tokenB = regB.body.accessToken;

    await request(app.getHttpServer()).post("/auth/register").send({
      email: "admin-sec@test.local",
      password: "Password123!",
      displayName: "Admin Sec",
    });

    const adminUser = fakePrisma.__state.users.find((u: any) => u.email === "admin-sec@test.local");
    adminUser.role = "ADMIN";

    const adminLogin = await request(app.getHttpServer()).post("/auth/login").send({
      email: "admin-sec@test.local",
      password: "Password123!",
    });
    adminToken = adminLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("blocks non-owner from completing someone else's upload", async () => {
    const upload = await request(app.getHttpServer())
      .post("/files/upload-url")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ filename: "private-a.png", mimeType: "image/png", sizeBytes: 1200 });
    expect(upload.status).toBe(201);

    const forbidden = await request(app.getHttpServer())
      .post("/files/complete-upload")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ fileId: upload.body.fileId, uploadedSizeBytes: 1200, uploadedMimeType: "image/png" });
    expect(forbidden.status).toBe(403);
  });

  it("blocks non-owner from creating design version using someone else's file", async () => {
    const designB = await request(app.getHttpServer())
      .post("/designs")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ title: "B Design", description: "B" });
    expect(designB.status).toBe(201);

    const uploadA = await request(app.getHttpServer())
      .post("/files/upload-url")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ filename: "a-only.png", mimeType: "image/png", sizeBytes: 1600 });
    expect(uploadA.status).toBe(201);

    await request(app.getHttpServer())
      .post("/files/complete-upload")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ fileId: uploadA.body.fileId, uploadedSizeBytes: 1600, uploadedMimeType: "image/png" });

    const forbidden = await request(app.getHttpServer())
      .post(`/designs/${designB.body.id}/versions`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ fileId: uploadA.body.fileId, widthPx: 1000, heightPx: 1000, dpi: 300 });
    expect(forbidden.status).toBe(403);
  });

  it("records audit entry on admin commercial-rights override", async () => {
    const designA = await request(app.getHttpServer())
      .post("/designs")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ title: "Rights Target", description: "x" });
    expect(designA.status).toBe(201);

    const res = await request(app.getHttpServer())
      .patch(`/designs/${designA.body.id}/commercial-rights`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ allowFilmSales: true, filmRoyaltyRate: 12.5 });
    expect(res.status).toBe(200);

    const overrideAudit = fakePrisma.__state.audits.find(
      (a: any) => a.action === "rights.admin-override" && a.entityType === "CommercialRights",
    );
    expect(overrideAudit).toBeTruthy();
  });
});
