import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "./app.module";
import { PrismaService } from "./prisma/prisma.service";
import { createFakePrisma } from "../test/helpers/fake-prisma";

describe("CORS Configuration (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.WEB_URL = "https://rashpod-web.test";
    process.env.DASHBOARD_URL = "https://rashpod-dashboard.test";
    process.env.PORT = "0";

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(createFakePrisma())
      .compile();

    app = moduleFixture.createNestApplication();
    const allowedOrigins = [
      process.env.WEB_URL,
      process.env.DASHBOARD_URL,
      "http://localhost:3000",
      "http://localhost:3001",
    ].filter((o): o is string => Boolean(o));
    app.enableCors({
      origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS: origin ${origin} not allowed`), false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("should allow request from WEB_URL origin", async () => {
    const response = await request(app.getHttpServer())
      .get("/health")
      .set("Origin", "https://rashpod-web.test")
      .expect(200);

    expect(response.headers["access-control-allow-origin"]).toBe("https://rashpod-web.test");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("should allow request from DASHBOARD_URL origin", async () => {
    const response = await request(app.getHttpServer())
      .get("/health")
      .set("Origin", "https://rashpod-dashboard.test")
      .expect(200);

    expect(response.headers["access-control-allow-origin"]).toBe("https://rashpod-dashboard.test");
  });

  it("should allow request from localhost:3000", async () => {
    const response = await request(app.getHttpServer())
      .get("/health")
      .set("Origin", "http://localhost:3000")
      .expect(200);

    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
  });

  it("should allow request from localhost:3001", async () => {
    const response = await request(app.getHttpServer())
      .get("/health")
      .set("Origin", "http://localhost:3001")
      .expect(200);

    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3001");
  });

  it("should block request from non-allowed origin", async () => {
    const response = await request(app.getHttpServer())
      .get("/health")
      .set("Origin", "https://evil-attacker.com");

    expect(response.status).not.toBe(200);
  });

  it("should handle preflight OPTIONS request", async () => {
    const response = await request(app.getHttpServer())
      .options("/auth/login")
      .set("Origin", "https://rashpod-web.test")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "Content-Type, Authorization");

    expect(response.headers["access-control-allow-methods"]).toContain("POST");
    expect(response.headers["access-control-allow-headers"]).toContain("Content-Type");
  });

  it("should allow request without origin header", async () => {
    const response = await request(app.getHttpServer()).get("/health");

    expect(response.status).toBe(200);
  });
});
