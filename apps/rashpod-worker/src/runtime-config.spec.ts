import { validateWorkerEnvironment } from "./runtime-config";

describe("worker runtime config", () => {
  it("fails production readiness when database and storage config are missing", () => {
    const result = validateWorkerEnvironment({ NODE_ENV: "production", APP_ENV: "production" });
    expect(result.errors.map((error) => error.key)).toEqual(expect.arrayContaining(["DATABASE_URL", "GCS_BUCKET_ASSETS", "GCS_BUCKET_PRIVATE", "GCS_PROJECT"]));
  });

  it("allows local development fallbacks as warnings", () => {
    const result = validateWorkerEnvironment({ NODE_ENV: "development" });
    expect(result.errors).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
