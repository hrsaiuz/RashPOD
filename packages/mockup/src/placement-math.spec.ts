import assert from "node:assert/strict";
import test from "node:test";
import { renderedPlacementBounds } from "./placement-geometry";
import { clampPlacementToPrintArea, computeCompositeBox, presetToInitialPlacement, snapPlacementToCenter, toLocalSelectionPosition } from "./placement-math";
import { validatePrintAreaConstraints } from "./placement-validation";

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

test("preset-free placement preserves the source design aspect ratio", () => {
  const placement = presetToInitialPlacement(null, printArea, 2);
  assert.equal(placement.width / placement.height, 2);
  assert.ok(placement.width <= printArea.safeWidth);
  assert.ok(placement.height <= printArea.safeHeight);
});

test("a one-dimensional preset derives the other dimension from the design aspect ratio", () => {
  const placement = presetToInitialPlacement({ defaultWidthCm: 20 }, printArea, 2);
  assert.equal(placement.width / placement.height, 2);
});

test("scaled placement is clamped by its rendered dimensions", () => {
  const clamped = clampPlacementToPrintArea(
    { x: 800, y: 800, width: 600, height: 600, scale: 2, rotation: 0 },
    printArea,
  );
  assert.ok(clamped.x + clamped.width * clamped.scale <= printArea.safeX + printArea.safeWidth);
  assert.ok(clamped.y + clamped.height * clamped.scale <= printArea.safeY + printArea.safeHeight);
});

test("editor clamping enforces administrator scale and rotation constraints", () => {
  const clamped = clampPlacementToPrintArea(
    { x: 150, y: 250, width: 100, height: 100, scale: 9, rotation: 45 },
    printArea,
    { minScale: 0.25, maxScale: 2, allowRotate: false },
  );

  assert.equal(clamped.scale, 2);
  assert.equal(clamped.rotation, 0);
});

test("Printful validation respects non-zero printable-area offsets", () => {
  assert.equal(
    validatePrintAreaConstraints(
      { left: 0.5, top: 1, width: 12, height: 16, scale: 1, rotation: 0 },
      { xIn: 0.5, yIn: 1, widthIn: 12, heightIn: 16 },
      "INCH",
    ),
    true,
  );

  assert.throws(
    () => validatePrintAreaConstraints(
      { left: 0, top: 1, width: 12, height: 16, scale: 1, rotation: 0 },
      { xIn: 0.5, yIn: 1, widthIn: 12, heightIn: 16 },
      "INCH",
    ),
    /POSITION_OUTSIDE_PRINT_AREA/,
  );
});

test("placement validation rejects a zero scale", () => {
  assert.throws(
    () => validatePrintAreaConstraints(
      { x: 150, y: 250, width: 100, height: 100, scale: 0, rotation: 0 },
      { xPx: 100, yPx: 200, widthPx: 800, heightPx: 900 },
      "PX",
    ),
    /scale must be greater than zero/,
  );
});

test("placement validation rejects non-finite coordinates", () => {
  assert.throws(
    () => validatePrintAreaConstraints(
      { x: Number.NaN, y: 250, width: 100, height: 100, scale: 1, rotation: 0 },
      { xPx: 100, yPx: 200, widthPx: 800, heightPx: 900 },
      "PX",
    ),
    /placement values must be finite numbers/,
  );
});

test("scaled placement is centered by its rendered dimensions", () => {
  const placement = presetToInitialPlacement(
    { defaultWidthCm: 10, defaultHeightCm: 10, defaultScale: 2, alignment: "CENTER" },
    printArea,
  );
  assert.equal(
    placement.x,
    Math.round(printArea.safeX + (printArea.safeWidth - placement.width * placement.scale) / 2),
  );
  assert.equal(
    placement.y,
    Math.round(printArea.safeY + (printArea.safeHeight - placement.height * placement.scale) / 2),
  );
});

test("close-up crop uses the rendered dimensions of scaled artwork", () => {
  const crop = computeCompositeBox(
    { position: { x: 100, y: 200, width: 300, height: 400, scale: 2 } },
    "closeup",
  );
  assert.ok(crop.width > 600);
  assert.ok(crop.height > 800);
});

test("rotated placement is clamped using its rendered bounding box", () => {
  const clamped = clampPlacementToPrintArea(
    { x: 150, y: 250, width: 600, height: 600, scale: 1, rotation: 45 },
    printArea,
  );
  const rendered = renderedPlacementBounds(clamped);
  assert.ok(rendered.left >= printArea.safeX - 1);
  assert.ok(rendered.top >= printArea.safeY - 1);
  assert.ok(rendered.left + rendered.width <= printArea.safeX + printArea.safeWidth + 1);
  assert.ok(rendered.top + rendered.height <= printArea.safeY + printArea.safeHeight + 1);
  assert.equal(validatePrintAreaConstraints(
    clamped,
    {
      xPx: printArea.x,
      yPx: printArea.y,
      widthPx: printArea.width,
      heightPx: printArea.height,
      safeX: printArea.safeX,
      safeY: printArea.safeY,
      safeWidth: printArea.safeWidth,
      safeHeight: printArea.safeHeight,
      allowRotate: true,
    },
    "PX",
  ), true);
});

test("rejects rotation that pushes artwork outside the safe zone", () => {
  assert.throws(
    () => validatePrintAreaConstraints(
      { x: 330, y: 240, width: 500, height: 500, scale: 1, rotation: 45 },
      {
        xPx: 300,
        yPx: 200,
        widthPx: 600,
        heightPx: 800,
        safeX: 330,
        safeY: 240,
        safeWidth: 540,
        safeHeight: 720,
        allowRotate: true,
      },
      "PX",
    ),
    /POSITION_OUTSIDE_PRINT_AREA|POSITION_OUTSIDE_SAFE_ZONE/,
  );
});

test("tiny safe zones do not produce placement outside their bounds", () => {
  const tinyArea = {
    ...printArea,
    safeWidth: 8,
    safeHeight: 6,
  };
  const clamped = clampPlacementToPrintArea(
    { x: 0, y: 0, width: 100, height: 100, scale: 1, rotation: 0 },
    tinyArea,
  );
  assert.equal(clamped.x, tinyArea.safeX);
  assert.equal(clamped.y, tinyArea.safeY);
  assert.equal(clamped.width, tinyArea.safeWidth);
  assert.equal(clamped.height, tinyArea.safeHeight);
});

test("validates absolute pixel placement for an offset print area", () => {
  assert.equal(validatePrintAreaConstraints(
    { x: 400, y: 300, width: 400, height: 500, scale: 1, rotation: 0 },
    {
      xPx: 300,
      yPx: 200,
      widthPx: 600,
      heightPx: 800,
      safeX: 330,
      safeY: 240,
      safeWidth: 540,
      safeHeight: 720,
    },
    "PX",
  ), true);
});

test("fixed editor controls still accept a safe configured placement", () => {
  assert.equal(validatePrintAreaConstraints(
    { x: 400, y: 300, width: 300, height: 400, scale: 1, rotation: 0 },
    {
      xPx: 300,
      yPx: 200,
      widthPx: 600,
      heightPx: 800,
      safeX: 330,
      safeY: 240,
      safeWidth: 540,
      safeHeight: 720,
      allowMove: false,
      allowResize: false,
    },
    "PX",
  ), true);
});

test("centimeter placement is validated against the pixel-defined safe zone", () => {
  const bounds = {
    xPx: 100,
    yPx: 200,
    widthPx: 800,
    heightPx: 900,
    widthCm: 40,
    heightCm: 45,
    safeX: 150,
    safeY: 250,
    safeWidth: 700,
    safeHeight: 700,
  };
  assert.equal(validatePrintAreaConstraints(
    { x: 2.5, y: 2.5, width: 30, height: 30, scale: 1, rotation: 0 },
    bounds,
    "CM",
  ), true);
  assert.throws(
    () => validatePrintAreaConstraints(
      { x: 0, y: 0, width: 30, height: 30, scale: 1, rotation: 0 },
      bounds,
      "CM",
    ),
    /POSITION_OUTSIDE_SAFE_ZONE/,
  );
});

test("rejects placement whose rendered scale exceeds the safe zone", () => {
  assert.throws(
    () => validatePrintAreaConstraints(
      { x: 330, y: 240, width: 400, height: 400, scale: 2, rotation: 0 },
      {
        xPx: 300,
        yPx: 200,
        widthPx: 600,
        heightPx: 800,
        safeX: 330,
        safeY: 240,
        safeWidth: 540,
        safeHeight: 720,
      },
      "PX",
    ),
    /POSITION_OUTSIDE_PRINT_AREA|POSITION_OUTSIDE_SAFE_ZONE/,
  );
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
