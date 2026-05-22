import { validateEnvironment, redactSecrets } from "../src/common/config/platform-config.service";
import { createRateLimitMiddleware, resetRateLimitBuckets } from "../src/common/security/rate-limit.middleware";

function mockResponse() {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined,
    setHeader: jest.fn((key: string, value: string) => { res.headers[key] = value; }),
    status: jest.fn((code: number) => { res.statusCode = code; return res; }),
    json: jest.fn((body: unknown) => { res.body = body; return res; }),
  };
  return res;
}

describe("platform hardening", () => {
  afterEach(() => resetRateLimitBuckets());

  it("fails production env validation when critical API secrets are missing", () => {
    const result = validateEnvironment("api", { NODE_ENV: "production", APP_ENV: "production", CORS_ORIGINS: "https://rashpod.uz" });
    expect(result.errors.map((error) => error.key)).toEqual(expect.arrayContaining(["DATABASE_URL", "JWT_SECRET", "CLICK_WEBHOOK_SECRET", "GCS_BUCKET_ASSETS", "GCS_BUCKET_PRIVATE"]));
  });

  it("allows local fallbacks as warnings outside production", () => {
    const result = validateEnvironment("api", { NODE_ENV: "development" });
    expect(result.errors).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("redacts secret-shaped config values recursively", () => {
    const value = redactSecrets({ nested: { jwtSecret: "abc", safe: "ok" }, apiToken: "token" });
    expect(value).toEqual({ nested: { jwtSecret: "[REDACTED]", safe: "ok" }, apiToken: "[REDACTED]" });
  });

  it("rate limits configured high-risk routes", () => {
    const middleware = createRateLimitMiddleware([{ id: "test", method: "POST", path: /^\/auth\/login/, max: 1, windowMs: 60_000 }]);
    const req: any = { method: "POST", path: "/auth/login", ip: "127.0.0.1", socket: {}, header: jest.fn() };
    const first = mockResponse();
    const second = mockResponse();
    const next = jest.fn();

    middleware(req, first, next);
    middleware(req, second, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(second.status).toHaveBeenCalledWith(429);
    expect(second.body).toMatchObject({ code: "RATE_LIMITED" });
  });
});
