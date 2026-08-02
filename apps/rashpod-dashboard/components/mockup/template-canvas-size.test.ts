import { describe, expect, it } from "vitest";
import { resolveTemplateCanvasSize } from "./template-canvas-size";

describe("resolveTemplateCanvasSize", () => {
  it("uses uploaded image dimensions for local print-area coordinates", () => {
    expect(resolveTemplateCanvasSize({ contextWidthPx: 2000, contextHeightPx: 2000, naturalWidthPx: 1086, naturalHeightPx: 1448, useNaturalTemplateSize: true }))
      .toEqual({ width: 1086, height: 1448 });
  });

  it("keeps the provider canvas for Printful coordinates", () => {
    expect(resolveTemplateCanvasSize({ contextWidthPx: 2000, contextHeightPx: 2000, naturalWidthPx: 1086, naturalHeightPx: 1448, useNaturalTemplateSize: false }))
      .toEqual({ width: 2000, height: 2000 });
  });

  it("does not combine dimensions from different coordinate spaces", () => {
    expect(resolveTemplateCanvasSize({ contextWidthPx: 2000, contextHeightPx: 2000, naturalWidthPx: 1086, naturalHeightPx: 0, useNaturalTemplateSize: true }))
      .toEqual({ width: 2000, height: 2000 });
  });
});
