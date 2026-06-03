import type { EditorPlacementState, PlacementPresetDefaults, PrintAreaRect } from "./types";
import { convertInToCm, round2 } from "./placement-math";

export type PrintAreaInches = {
  printAreaWidthIn: number;
  printAreaHeightIn: number;
  areaLeftIn?: number;
  areaTopIn?: number;
  dpi?: number;
};

export const PRINTFUL_EDITOR_CANVAS = 2000;

export function printAreaInchesToPixelRect(area: PrintAreaInches, canvasSize = PRINTFUL_EDITOR_CANVAS): PrintAreaRect {
  const padding = 80;
  const maxW = canvasSize - padding * 2;
  const maxH = canvasSize - padding * 2;
  const pxPerIn = Math.min(maxW / area.printAreaWidthIn, maxH / area.printAreaHeightIn);
  const width = Math.round(area.printAreaWidthIn * pxPerIn);
  const height = Math.round(area.printAreaHeightIn * pxPerIn);
  const x = Math.round((canvasSize - width) / 2);
  const y = Math.round((canvasSize - height) / 2);
  const safeMargin = Math.round(Math.min(width, height) * 0.05);

  return {
    x,
    y,
    width,
    height,
    safeX: x + safeMargin,
    safeY: y + safeMargin,
    safeWidth: Math.max(20, width - safeMargin * 2),
    safeHeight: Math.max(20, height - safeMargin * 2),
    widthCm: convertInToCm(area.printAreaWidthIn),
    heightCm: convertInToCm(area.printAreaHeightIn),
  };
}

export function editorStateToPrintfulPosition(
  state: EditorPlacementState,
  printArea: PrintAreaRect,
  areaInches: PrintAreaInches,
): { widthIn: number; heightIn: number; leftIn: number; topIn: number; scale: number } {
  const relX = state.x - printArea.x;
  const relY = state.y - printArea.y;
  const widthIn = round2((state.width / printArea.width) * areaInches.printAreaWidthIn);
  const heightIn = round2((state.height / printArea.height) * areaInches.printAreaHeightIn);
  const leftIn = round2((relX / printArea.width) * areaInches.printAreaWidthIn + (areaInches.areaLeftIn ?? 0));
  const topIn = round2((relY / printArea.height) * areaInches.printAreaHeightIn + (areaInches.areaTopIn ?? 0));
  return { widthIn, heightIn, leftIn, topIn, scale: state.scale ?? 1 };
}

export function printfulInchesToEditorState(
  position: { widthIn: number; heightIn: number; leftIn: number; topIn: number; scale?: number },
  printArea: PrintAreaRect,
  areaInches: PrintAreaInches,
): EditorPlacementState {
  const areaLeft = areaInches.areaLeftIn ?? 0;
  const areaTop = areaInches.areaTopIn ?? 0;
  const relLeft = position.leftIn - areaLeft;
  const relTop = position.topIn - areaTop;
  return {
    x: Math.round(printArea.x + (relLeft / areaInches.printAreaWidthIn) * printArea.width),
    y: Math.round(printArea.y + (relTop / areaInches.printAreaHeightIn) * printArea.height),
    width: Math.round((position.widthIn / areaInches.printAreaWidthIn) * printArea.width),
    height: Math.round((position.heightIn / areaInches.printAreaHeightIn) * printArea.height),
    scale: position.scale ?? 1,
    rotation: 0,
  };
}

export function presetToInitialPrintfulPlacement(
  preset: PlacementPresetDefaults | null | undefined,
  printArea: PrintAreaRect,
  areaInches: PrintAreaInches,
): EditorPlacementState {
  const defaultWidthIn = preset?.defaultWidthIn ?? areaInches.printAreaWidthIn * 0.8;
  const defaultHeightIn = preset?.defaultHeightIn ?? areaInches.printAreaHeightIn * 0.8;
  const alignment = typeof preset?.alignment === "string" ? preset.alignment : "CENTER";

  let leftIn = preset?.defaultX ?? 0;
  let topIn = preset?.defaultY ?? 0;

  if (alignment === "CENTER" || alignment === "TOP_CENTER") {
    leftIn = (areaInches.printAreaWidthIn - defaultWidthIn) / 2 + (areaInches.areaLeftIn ?? 0);
    topIn =
      alignment === "TOP_CENTER"
        ? areaInches.areaTopIn ?? 0
        : (areaInches.printAreaHeightIn - defaultHeightIn) / 2 + (areaInches.areaTopIn ?? 0);
  } else if (alignment === "LEFT_CHEST") {
    leftIn = areaInches.areaLeftIn ?? 0;
    topIn = areaInches.areaTopIn ?? 0;
  }

  return printfulInchesToEditorState(
    {
      widthIn: defaultWidthIn,
      heightIn: defaultHeightIn,
      leftIn,
      topIn,
      scale: preset?.defaultScale ?? 1,
    },
    printArea,
    areaInches,
  );
}
