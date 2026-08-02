import assert from "node:assert/strict";
import test from "node:test";
import { buildPrintfulMockupTaskBody, buildPrintfulSyncProductPayload } from "./mockup-payload";

test("builds the integer relative-position payload required by Printful", () => {
  const payload = buildPrintfulMockupTaskBody({
    template: {
      printfulCatalogProductId: "71",
      printfulVariantIds: ["401", "402"],
      allowedPlacements: ["front"],
      allowedTechniques: ["DTG"],
      defaultPlacement: "front",
      defaultTechnique: "DTG",
    },
    fileUrl: "https://files.printful.test/design.png",
    placement: "front",
    technique: "DTG",
    variantIds: ["401"],
    printArea: { width: 12, height: 16, left: 1, top: 2 },
    position: { width: 6, height: 8, left: 4, top: 6, scale: 1 },
  });

  assert.deepEqual(payload, {
    catalog_product_id: "71",
    variant_ids: [401],
    format: "jpg",
    files: [{
      placement: "front",
      image_url: "https://files.printful.test/design.png",
      position: { area_width: 1200, area_height: 1600, width: 600, height: 800, left: 300, top: 400 },
    }],
  });
});

test("publishes every placement file on each Printful sync variant", () => {
  const payload = buildPrintfulSyncProductPayload({
    title: "Multi-placement tee",
    variantIds: ["401"],
    retailPrice: "29.99",
    fileId: "file-front",
    placement: "front",
    files: [
      { fileId: "file-front", placement: "front" },
      { fileId: "file-sleeve", placement: "sleeve_left" },
    ],
  });

  assert.deepEqual(payload.sync_variants[0]?.files, [
    { type: "front", id: "file-front" },
    { type: "sleeve_left", id: "file-sleeve" },
  ]);
});
