import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractMockupUrls, mapCatalogProductToTemplate, parsePrintfulSettings } from "./catalog-mapper";

describe("printful catalog mapper", () => {
  it("maps catalog product and printfiles into template upsert input", () => {
    const mapped = mapCatalogProductToTemplate({
      allowlistItem: { catalogProductId: 71, rashpodProductType: "classic_crew_neck_tshirt", defaultTechnique: "dtg", defaultPlacement: "front" },
      product: { id: 71, title: "Unisex Staple T-Shirt", image: "https://example.com/tee.jpg", variants: [{ id: 4011 }, { id: 4012 }] },
      printfiles: { variant_printfiles: [{ printfiles: [{ placement: "front" }] }], available_techniques: { dtg: {} } },
      storeId: "12345",
    });

    assert.equal(mapped.printfulCatalogProductId, "71");
    assert.deepEqual(mapped.printfulVariantIds, ["4011", "4012"]);
    assert.equal(mapped.defaultPlacement, "front");
    assert.equal(mapped.previewImageUrl, "https://example.com/tee.jpg");
  });

  it("parses catalog allowlist from platform settings", () => {
    const parsed = parsePrintfulSettings({
      enabled: true,
      catalogAllowlist: [{ catalogProductId: 71, rashpodProductType: "classic_crew_neck_tshirt" }],
    });
    assert.equal(parsed.catalogAllowlist.length, 1);
    assert.equal(parsed.catalogAllowlist[0]?.catalogProductId, 71);
  });

  it("extracts mockup urls from completed task payload", () => {
    const urls = extractMockupUrls({
      mockups: [{ mockup_url: "https://example.com/main.jpg", extra: [{ url: "https://example.com/alt.jpg" }] }],
    });
    assert.deepEqual(new Set(urls), new Set(["https://example.com/main.jpg", "https://example.com/alt.jpg"]));
  });
});
