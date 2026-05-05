import request = require("supertest");
import { INestApplication } from "@nestjs/common";
import { createTestApp } from "./helpers/test-app";

describe("Auth lifecycle e2e", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const setup = await createTestApp();
    app = setup.app;
  });

  afterAll(async () => {
    await app.close();
  });

  it("supports verify-email and password reset flows", async () => {
    const reg = await request(app.getHttpServer()).post("/auth/register").send({
      email: "auth-life@test.local",
      password: "Password123!",
      displayName: "Auth Life",
    });
    expect(reg.status).toBe(201);

    const verifyReq = await request(app.getHttpServer()).post("/auth/verify-email").send({ email: "auth-life@test.local" });
    expect(verifyReq.status).toBe(201);
    expect(verifyReq.body.token).toBeDefined();

    const verifyConfirm = await request(app.getHttpServer())
      .post("/auth/verify-email/confirm")
      .send({ token: verifyReq.body.token });
    expect(verifyConfirm.status).toBe(201);

    const forgot = await request(app.getHttpServer()).post("/auth/forgot-password").send({ email: "auth-life@test.local" });
    expect(forgot.status).toBe(201);
    expect(forgot.body.token).toBeDefined();

    const reset = await request(app.getHttpServer())
      .post("/auth/reset-password")
      .send({ token: forgot.body.token, password: "Password456!" });
    expect(reset.status).toBe(201);

    const resetReuse = await request(app.getHttpServer())
      .post("/auth/reset-password")
      .send({ token: forgot.body.token, password: "Password789!" });
    expect(resetReuse.status).toBe(400);

    const loginNew = await request(app.getHttpServer()).post("/auth/login").send({
      email: "auth-life@test.local",
      password: "Password456!",
    });
    expect(loginNew.status).toBe(201);

    const meBeforeLogout = await request(app.getHttpServer())
      .get("/auth/me")
      .set("Authorization", `Bearer ${loginNew.body.accessToken}`);
    expect(meBeforeLogout.status).toBe(200);

    const logout = await request(app.getHttpServer())
      .post("/auth/logout")
      .set("Authorization", `Bearer ${loginNew.body.accessToken}`);
    expect(logout.status).toBe(201);

    const meAfterLogout = await request(app.getHttpServer())
      .get("/auth/me")
      .set("Authorization", `Bearer ${loginNew.body.accessToken}`);
    expect(meAfterLogout.status).toBe(401);
  });
});
