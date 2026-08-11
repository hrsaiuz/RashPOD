import request = require("supertest");
import { INestApplication } from "@nestjs/common";
import { PlacementKind } from "@prisma/client";
import { createTestApp } from "./helpers/test-app";

jest.setTimeout(30000);

describe("HTTP e2e", () => {
  let app: INestApplication;
  let authToken = "";
  let moderatorToken = "";
  let baseProductId = "";

  beforeAll(async () => {
    const setup = await createTestApp();
    app = setup.app;
    const productType = await setup.fakePrisma.productType.create({
      data: {
        tenantId: null,
        name: "E2E T-shirt",
        slug: "e2e-t-shirt",
        category: "APPAREL",
        productionMethod: "DTF",
        isActive: true,
        availableForDesigners: true,
      },
    });
    const baseProduct = await setup.fakePrisma.baseProduct.create({
      data: {
        id: "11111111-1111-4111-8111-111111111111",
        tenantId: null,
        productTypeId: productType.id,
        name: "E2E Classic tee",
        skuPrefix: "E2E-TEE",
        isActive: true,
      },
    });
    baseProductId = baseProduct.id;
    const template = await setup.fakePrisma.mockupTemplate.create({
      data: {
        tenantId: null,
        baseProductId,
        name: "E2E tee front",
        baseImageKey: "mockups/e2e-tee-front.png",
        isActive: true,
      },
    });
    await setup.fakePrisma.printArea.create({
      data: {
        mockupTemplateId: template.id,
        name: "Front",
        placement: PlacementKind.FRONT,
        x: 100,
        y: 100,
        width: 800,
        height: 1000,
        safeX: 120,
        safeY: 120,
        safeWidth: 760,
        safeHeight: 960,
        isActive: true,
      },
    });

    const reg = await request(app.getHttpServer()).post("/auth/register").send({
      email: "e2e-designer@test.local",
      password: "Password123!",
      displayName: "E2E Designer",
      role: "DESIGNER",
    });
    authToken = reg.body.accessToken;

    await request(app.getHttpServer()).post("/auth/register").send({
      email: "e2e-moderator@test.local",
      password: "Password123!",
      displayName: "E2E Moderator",
    });

    // Promote to moderator in fake store through auth/me lookup then direct in-memory patch.
    const meRes = await request(app.getHttpServer())
      .get("/auth/me")
      .set("Authorization", `Bearer ${authToken}`);
    expect(meRes.status).toBe(200);
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 401 without token on protected route", async () => {
    const res = await request(app.getHttpServer()).get("/designs");
    expect(res.status).toBe(401);
  });

  it("supports upload -> complete -> create design version flow", async () => {
    const createDesign = await request(app.getHttpServer())
      .post("/designs")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ title: "E2E Design", description: "desc", requestedBaseProductId: baseProductId });
    expect(createDesign.status).toBe(201);
    const designId = createDesign.body.id;

    const upload = await request(app.getHttpServer())
      .post("/files/upload-url")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ filename: "x.png", mimeType: "image/png", sizeBytes: 1000, designId });
    expect(upload.status).toBe(201);

    const complete = await request(app.getHttpServer())
      .post("/files/complete-upload")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ fileId: upload.body.fileId, uploadedSizeBytes: 1000, uploadedMimeType: "image/png" });
    expect(complete.status).toBe(201);

    const version = await request(app.getHttpServer())
      .post(`/designs/${designId}/versions`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ fileId: upload.body.fileId, widthPx: 1200, heightPx: 1200, dpi: 300, placement: PlacementKind.FRONT });
    expect(version.status).toBe(201);
  });

  it("allows design submit", async () => {
    const createDesign = await request(app.getHttpServer())
      .post("/designs")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ title: "Submit Design", description: "desc", requestedBaseProductId: baseProductId });
    const designId = createDesign.body.id;

    const upload = await request(app.getHttpServer())
      .post("/files/upload-url")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ filename: "submit.png", mimeType: "image/png", sizeBytes: 1000, designId });
    expect(upload.status).toBe(201);
    const complete = await request(app.getHttpServer())
      .post("/files/complete-upload")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ fileId: upload.body.fileId, uploadedSizeBytes: 1000, uploadedMimeType: "image/png" });
    expect(complete.status).toBe(201);
    const version = await request(app.getHttpServer())
      .post(`/designs/${designId}/versions`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ fileId: upload.body.fileId, widthPx: 1200, heightPx: 1200, dpi: 300, placement: PlacementKind.FRONT });
    expect(version.status).toBe(201);

    const submit = await request(app.getHttpServer())
      .post(`/designs/${designId}/submit`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({});
    expect(submit.status).toBe(201);
    expect(submit.body.status).toBe("PENDING_MODERATION");
  });

  it("rejects moderation endpoints for non-moderator users", async () => {
    const res = await request(app.getHttpServer())
      .get("/moderation/designs")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(403);
  });
});
