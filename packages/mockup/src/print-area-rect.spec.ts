import assert from "node:assert/strict";
import test from "node:test";
import {
  clampRectToBounds,
  clampSafeRectToPrintArea,
  normalizePrintAreaRects,
  suggestDefaultPrintAreaRects,
} from "./print-area-rect";

test("clampRectToBounds keeps rect inside canvas with minimum size", () => {
  const clamped = clampRectToBounds({ x: 980, y: 980, width: 100, height: 100 }, 1000, 1000);
  assert.equal(clamped.x, 900);
  assert.equal(clamped.y, 900);
  assert.equal(clamped.width, 100);
  assert.equal(clamped.height, 100);
});

test("clampRectToBounds enforces minimum size", () => {
  const clamped = clampRectToBounds({ x: 0, y: 0, width: 5, height: 5 }, 1000, 1000);
  assert.equal(clamped.width, 20);
  assert.equal(clamped.height, 20);
});

test("clampSafeRectToPrintArea keeps safe zone inside print area", () => {
  const print = { x: 100, y: 200, width: 800, height: 900 };
  const safe = clampSafeRectToPrintArea({ x: 50, y: 150, width: 900, height: 950 }, print);
  assert.equal(safe.x, 100);
  assert.equal(safe.y, 200);
  assert.equal(safe.width, 800);
  assert.equal(safe.height, 900);
});

test("normalizePrintAreaRects applies print then safe constraints", () => {
  const { print, safe } = normalizePrintAreaRects(
    { x: 950, y: 950, width: 200, height: 200 },
    { x: 940, y: 940, width: 300, height: 300 },
    1000,
    1000,
  );
  assert.ok(print.x + print.width <= 1000);
  assert.ok(print.y + print.height <= 1000);
  assert.ok(safe.x >= print.x);
  assert.ok(safe.y >= print.y);
  assert.ok(safe.x + safe.width <= print.x + print.width);
  assert.ok(safe.y + safe.height <= print.y + print.height);
});

test("suggestDefaultPrintAreaRects creates centered margins", () => {
  const { print, safe } = suggestDefaultPrintAreaRects(1000, 1200);
  assert.equal(print.x, 100);
  assert.equal(print.y, 120);
  assert.equal(print.width, 800);
  assert.equal(print.height, 960);
  assert.ok(safe.x >= print.x);
  assert.ok(safe.y >= print.y);
  assert.ok(safe.x + safe.width <= print.x + print.width);
  assert.ok(safe.y + safe.height <= print.y + print.height);
});
