import assert from "node:assert/strict";
import test from "node:test";
import { mapPlacementToVariantRegion, parseVariantRenderRegion } from "./variant-render-region";

test("parses a bounded gallery render region", () => {
  assert.deepEqual(parseVariantRenderRegion({ renderRegion: { canvasWidth: 1600, canvasHeight: 2000, x: 600, y: 500, width: 400, height: 700 } }), {
    canvasWidth: 1600,
    canvasHeight: 2000,
    x: 600,
    y: 500,
    width: 400,
    height: 700,
    rotation: 0,
  });
  assert.equal(parseVariantRenderRegion({ renderRegion: { canvasWidth: 100, canvasHeight: 100, x: 80, y: 0, width: 30, height: 30 } }), null);
});

test("maps moderator placement proportionally into a different lifestyle canvas", () => {
  const mapped = mapPlacementToVariantRegion(
    { x: 200, y: 300, width: 200, height: 300, scale: 0.5, rotation: 3 },
    { x: 100, y: 100, width: 500, height: 800, safeX: 120, safeY: 120, safeWidth: 460, safeHeight: 760 },
    { canvasWidth: 1600, canvasHeight: 2000, x: 700, y: 400, width: 300, height: 600 },
  );
  assert.deepEqual(mapped, { x: 760, y: 550, width: 60, height: 113, scale: 1, rotation: 3 });
});

test("rotates placement position around a tilted lifestyle region", () => {
  const mapped = mapPlacementToVariantRegion(
    { x: 0, y: 0, width: 20, height: 20, scale: 1, rotation: 0 },
    { x: 0, y: 0, width: 100, height: 100, safeX: 0, safeY: 0, safeWidth: 100, safeHeight: 100 },
    { canvasWidth: 400, canvasHeight: 400, x: 100, y: 100, width: 200, height: 200, rotation: 90 },
  );
  assert.deepEqual(mapped, { x: 260, y: 100, width: 40, height: 40, scale: 1, rotation: 90 });
});
