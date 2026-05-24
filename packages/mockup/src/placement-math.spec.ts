import assert from "node:assert/strict";
import test from "node:test";
import { clampPlacementToPrintArea, presetToInitialPlacement, snapPlacementToCenter, toLocalSelectionPosition } from "./placement-math";

const printArea = {
  x: 100,
  y: 200,
  width: 800,
  height: 900,
  safeX: 150,
  safeY: 250,
  safeWidth: 700,
  safeHeight: 700,
  widthCm: 40,
  heightCm: 45,
};

test("presetToInitialPlacement centers in safe zone", () => {
  const placement = presetToInitialPlacement({ alignment: "CENTER" }, printArea);
  assert.equal(placement.x, 150 + Math.round((700 - placement.width) / 2));
  assert.equal(placement.y, 250 + Math.round((700 - placement.height) / 2));
});

test("clampPlacementToPrintArea keeps design inside safe zone", () => {
  const clamped = clampPlacementToPrintArea(
    { x: 0, y: 0, width: 400, height: 400, scale: 1, rotation: 0 },
    printArea,
  );
  assert.ok(clamped.x >= printArea.safeX);
  assert.ok(clamped.y >= printArea.safeY);
  assert.ok(clamped.x + clamped.width <= printArea.safeX + printArea.safeWidth);
});

test("snapPlacementToCenter aligns to safe zone center", () => {
  const snapped = snapPlacementToCenter({ x: 10, y: 10, width: 200, height: 200, scale: 1, rotation: 0 }, printArea);
  assert.equal(snapped.x, 150 + Math.round((700 - 200) / 2));
});

test("toLocalSelectionPosition converts px payload", () => {
  const payload = toLocalSelectionPosition({ x: 160, y: 260, width: 300, height: 300, scale: 1, rotation: 0 }, printArea, "PX");
  assert.deepEqual(payload, { xPx: 160, yPx: 260, widthPx: 300, heightPx: 300, scale: 1, rotation: 0 });
});
