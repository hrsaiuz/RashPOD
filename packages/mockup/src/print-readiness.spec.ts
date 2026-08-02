import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assessPrintReadiness } from "./print-readiness";

describe("assessPrintReadiness", () => {
  it("uses effective DPI at the placed physical size", () => {
    const result = assessPrintReadiness({ sourceWidthPx: 1800, sourceHeightPx: 2400, placedWidthIn: 10, placedHeightIn: 12, minimumDpi: 150 });
    assert.equal(result.dpi, 180);
    assert.equal(result.ready, true);
  });

  it("rejects artwork below the configured minimum", () => {
    const result = assessPrintReadiness({ sourceWidthPx: 800, sourceHeightPx: 800, placedWidthIn: 8, placedHeightIn: 8, minimumDpi: 150 });
    assert.equal(result.dpi, 100);
    assert.equal(result.ready, false);
  });

  it("does not treat an arbitrary pixel dimension as printable readiness", () => {
    const result = assessPrintReadiness({ sourceWidthPx: 2000, sourceHeightPx: 2000, placedWidthIn: null, placedHeightIn: null });
    assert.equal(result.verifiable, false);
    assert.equal(result.ready, false);
  });
});
