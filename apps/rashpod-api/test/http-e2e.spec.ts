import request = require("supertest");
import { INestApplication } from "@nestjs/common";
import { createTestApp } from "./helpers/test-app";

jest.setTimeout(30000);

describe("HTTP e2e", () => {
  let app: INestApplication;
  let authToken = "";
  let moderatorToken = "";

  beforeAll(async () => {
    const setup = await createTestApp();
    app = setup.app;

    const reg = await request(app.getHttpServer()).post("/auth/register").send({
      email: "e2e-designer@test.local",
      password: "Password123!",
      displayName: "E2E Designer",
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
      .send({ title: "E2E Design", description: "desc" });
    expect(createDesign.status).toBe(201);
    const designId = createDesign.body.id;

    const upload = await request(app.getHttpServer())
      .post("/files/upload-url")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ filename: "x.png", mimeType: "image/png", sizeBytes: 1000 });
    expect(upload.status).toBe(201);

    const complete = await request(app.getHttpServer())
      .post("/files/complete-upload")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ fileId: upload.body.fileId, uploadedSizeBytes: 1000, uploadedMimeType: "image/png" });
    expect(complete.status).toBe(201);

    const version = await request(app.getHttpServer())
      .post(`/designs/${designId}/versions`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ fileId: upload.body.fileId, widthPx: 1200, heightPx: 1200, dpi: 300 });
    expect(version.status).toBe(201);
  });

  it("allows design submit", async () => {
    const createDesign = await request(app.getHttpServer())
      .post("/designs")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ title: "Submit Design", description: "desc" });
    const designId = createDesign.body.id;

    const submit = await request(app.getHttpServer())
      .post(`/designs/${designId}/submit`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({});
    expect(submit.status).toBe(201);
    expect(submit.body.status).toBe("SUBMITTED");
  });

  it("rejects moderation endpoints for non-moderator users", async () => {
    const res = await request(app.getHttpServer())
      .get("/moderation/designs")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(403);
  });
});
