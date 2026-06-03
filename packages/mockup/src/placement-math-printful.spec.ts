import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PRINTFUL_EDITOR_CANVAS,
  editorStateToPrintfulPosition,
  presetToInitialPrintfulPlacement,
  printAreaInchesToPixelRect,
  printfulInchesToEditorState,
} from "./placement-math-printful";

describe("printful placement math", () => {
  const areaInches = { printAreaWidthIn: 12, printAreaHeightIn: 16, areaLeftIn: 0, areaTopIn: 0 };
  const printArea = printAreaInchesToPixelRect(areaInches, PRINTFUL_EDITOR_CANVAS);

  it("round-trips inch placement through editor coordinates", () => {
    const initial = presetToInitialPrintfulPlacement(
      { defaultWidthIn: 6, defaultHeightIn: 8, alignment: "CENTER", defaultScale: 1 },
      printArea,
      areaInches,
    );
    const inches = editorStateToPrintfulPosition(initial, printArea, areaInches);
    const restored = printfulInchesToEditorState(inches, printArea, areaInches);

    assert.ok(Math.abs(restored.width - initial.width) <= 2);
    assert.ok(Math.abs(restored.height - initial.height) <= 2);
    assert.ok(Math.abs(restored.x - initial.x) <= 2);
    assert.ok(Math.abs(restored.y - initial.y) <= 2);
  });
});
