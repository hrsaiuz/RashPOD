import { PodProviderMode, PodProviderType } from "@prisma/client";
import { PrintfulProviderAdapter } from "../src/modules/pod/provider-adapters/printful-provider.adapter";
import { PrintifyProviderAdapter } from "../src/modules/pod/provider-adapters/printify-provider.adapter";

function providerConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: "provider-1",
    provider: PodProviderType.PRINTFUL,
    mode: PodProviderMode.TEST,
    displayName: "Printful test",
    isEnabled: true,
    credentialEnvVar: "PRINTFUL_API_TOKEN",
    credentialSecretRef: null,
    webhookSecretEnvVar: null,
    webhookSecretRef: null,
    apiBaseUrl: null,
    storeId: null,
    defaultCurrency: "USD",
    defaultCountryCode: null,
    defaultRegion: null,
    fulfillmentRegion: null,
    sellingRegion: null,
    shippingPreference: null,
    lastCatalogSyncStatus: null,
    lastCatalogSyncAt: null,
    lastCatalogSyncError: null,
    metadataJson: null,
    createdById: null,
    updatedById: null,
    createdAt: new Date("2026-05-22T00:00:00.000Z"),
    updatedAt: new Date("2026-05-22T00:00:00.000Z"),
    ...overrides,
  } as any;
}

describe("POD provider adapters", () => {
  const originalToken = process.env.PRINTFUL_API_TOKEN;

  afterEach(() => {
    if (originalToken === undefined) delete process.env.PRINTFUL_API_TOKEN;
    else process.env.PRINTFUL_API_TOKEN = originalToken;
  });

  it("reports Printful missing credentials without exposing a token", () => {
    delete process.env.PRINTFUL_API_TOKEN;
    const result = new PrintfulProviderAdapter().validateConfig(providerConfig());

    expect(result.configured).toBe(false);
    expect(result.message).toContain("PRINTFUL_API_TOKEN");
    expect(JSON.stringify(result)).not.toContain("Bearer");
  });

  it("accepts Printful env-token configuration", () => {
    process.env.PRINTFUL_API_TOKEN = "secret-token";
    const result = new PrintfulProviderAdapter().validateConfig(providerConfig());

    expect(result.configured).toBe(true);
    expect(result.supportsCatalogSync).toBe(true);
  });

  it("keeps Printify as an explicit foundation stub", () => {
    const result = new PrintifyProviderAdapter().validateConfig(providerConfig({ provider: PodProviderType.PRINTIFY, credentialSecretRef: "projects/demo/secrets/printify" }));

    expect(result.configured).toBe(true);
    expect(result.supportsCatalogSync).toBe(false);
    expect(result.message).toContain("not implemented");
  });
});
