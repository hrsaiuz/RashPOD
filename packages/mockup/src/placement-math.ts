import type {
  EditorPlacementState,
  LocalSelectionPositionCm,
  LocalSelectionPositionPx,
  PlacementPresetDefaults,
  PlacementUnit,
  PrintAreaRect,
} from "./types";

export function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function convertCmToIn(value: number) {
  return round2(value / 2.54);
}

export function convertInToCm(value: number) {
  return round2(value * 2.54);
}

export function presetToInitialPlacement(
  preset: PlacementPresetDefaults | null | undefined,
  printArea: PrintAreaRect,
): EditorPlacementState {
  const targetWidth = preset?.defaultWidthCm && printArea.widthCm
    ? Math.round((preset.defaultWidthCm / printArea.widthCm) * printArea.width)
    : Math.round(printArea.safeWidth * 0.8);
  const targetHeight = preset?.defaultHeightCm && printArea.heightCm
    ? Math.round((preset.defaultHeightCm / printArea.heightCm) * printArea.height)
    : Math.round(printArea.safeHeight * 0.8);

  const width = Math.max(20, Math.min(targetWidth, printArea.safeWidth));
  const height = Math.max(20, Math.min(targetHeight, printArea.safeHeight));

  const alignment = typeof preset?.alignment === "string" ? preset.alignment : "CENTER";
  let x = printArea.safeX + (printArea.safeWidth - width) / 2;
  let y = printArea.safeY + (printArea.safeHeight - height) / 2;

  if (alignment === "TOP_CENTER") {
    y = printArea.safeY;
    x = printArea.safeX + (printArea.safeWidth - width) / 2;
  } else if (alignment === "LEFT_CHEST") {
    x = printArea.safeX;
    y = printArea.safeY;
  } else if (preset?.defaultX != null && preset?.defaultY != null && printArea.widthCm && printArea.heightCm) {
    x = printArea.x + Math.round((preset.defaultX / printArea.widthCm) * printArea.width);
    y = printArea.y + Math.round((preset.defaultY / printArea.heightCm) * printArea.height);
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    width,
    height,
    scale: preset?.defaultScale ?? 1,
    rotation: 0,
  };
}

export function clampPlacementToPrintArea(
  state: EditorPlacementState,
  printArea: PrintAreaRect,
  constraints: { allowOverflow?: boolean } = {},
): EditorPlacementState {
  const zone = constraints.allowOverflow
    ? { x: printArea.x, y: printArea.y, width: printArea.width, height: printArea.height }
    : { x: printArea.safeX, y: printArea.safeY, width: printArea.safeWidth, height: printArea.safeHeight };

  const minWidth = 20;
  const minHeight = 20;
  let { x, y, width, height, scale, rotation } = state;

  width = Math.max(minWidth, Math.min(width, zone.width));
  height = Math.max(minHeight, Math.min(height, zone.height));

  if (x < zone.x) x = zone.x;
  if (y < zone.y) y = zone.y;
  if (x + width > zone.x + zone.width) x = zone.x + zone.width - width;
  if (y + height > zone.y + zone.height) y = zone.y + zone.height - height;

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    scale,
    rotation,
  };
}

export function snapPlacementToCenter(state: EditorPlacementState, printArea: PrintAreaRect): EditorPlacementState {
  return {
    ...state,
    x: Math.round(printArea.safeX + (printArea.safeWidth - state.width) / 2),
    y: Math.round(printArea.safeY + (printArea.safeHeight - state.height) / 2),
  };
}

export function toLocalSelectionPosition(
  state: EditorPlacementState,
  printArea: PrintAreaRect,
  unit: PlacementUnit,
): LocalSelectionPositionPx | LocalSelectionPositionCm {
  if (unit === "PX") {
    return {
      widthPx: state.width,
      heightPx: state.height,
      xPx: state.x,
      yPx: state.y,
      scale: state.scale,
      rotation: state.rotation,
    };
  }

  const widthCm = printArea.widthCm ?? printArea.width;
  const heightCm = printArea.heightCm ?? printArea.height;
  const relX = state.x - printArea.x;
  const relY = state.y - printArea.y;

  return {
    widthCm: round2((state.width / printArea.width) * widthCm),
    heightCm: round2((state.height / printArea.height) * heightCm),
    xCm: round2((relX / printArea.width) * widthCm),
    yCm: round2((relY / printArea.height) * heightCm),
    scale: state.scale,
    rotation: state.rotation,
  };
}

export function editorStateFromLocalPosition(
  position: {
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    scale?: number;
    rotation?: number;
    widthCm?: number;
    heightCm?: number;
    xCm?: number;
    yCm?: number;
    widthPx?: number;
    heightPx?: number;
    xPx?: number;
    yPx?: number;
  },
  printArea: PrintAreaRect,
  unit: PlacementUnit,
): EditorPlacementState {
  if (unit === "PX") {
    return {
      x: position.xPx ?? position.x ?? printArea.safeX,
      y: position.yPx ?? position.y ?? printArea.safeY,
      width: position.widthPx ?? position.width ?? printArea.safeWidth,
      height: position.heightPx ?? position.height ?? printArea.safeHeight,
      scale: position.scale ?? 1,
      rotation: position.rotation ?? 0,
    };
  }

  const widthCm = printArea.widthCm ?? printArea.width;
  const heightCm = printArea.heightCm ?? printArea.height;
  const w = position.widthCm ?? position.width ?? widthCm * 0.8;
  const h = position.heightCm ?? position.height ?? heightCm * 0.8;
  const relX = position.xCm ?? position.x ?? 0;
  const relY = position.yCm ?? position.y ?? 0;

  return {
    x: Math.round(printArea.x + (relX / widthCm) * printArea.width),
    y: Math.round(printArea.y + (relY / heightCm) * printArea.height),
    width: Math.round((w / widthCm) * printArea.width),
    height: Math.round((h / heightCm) * printArea.height),
    scale: position.scale ?? 1,
    rotation: position.rotation ?? 0,
  };
}

export function computeCompositeBox(
  config: { printArea?: PrintAreaRect; position?: Partial<EditorPlacementState> },
  variant: "main" | "lifestyle" | "closeup" | "preview",
): EditorPlacementState {
  const printArea = config.printArea ?? { x: 0, y: 0, width: 2000, height: 2000, safeX: 0, safeY: 0, safeWidth: 2000, safeHeight: 2000 };
  const position = config.position ?? {};
  const base: EditorPlacementState = {
    x: position.x ?? printArea.safeX,
    y: position.y ?? printArea.safeY,
    width: position.width ?? printArea.safeWidth,
    height: position.height ?? printArea.safeHeight,
    scale: position.scale ?? 1,
    rotation: position.rotation ?? 0,
  };

  if (variant !== "closeup") return base;

  const padding = Math.round(Math.min(base.width, base.height) * 0.15);
  return {
    ...base,
    x: Math.max(0, base.x - padding),
    y: Math.max(0, base.y - padding),
    width: base.width + padding * 2,
    height: base.height + padding * 2,
  };
}
