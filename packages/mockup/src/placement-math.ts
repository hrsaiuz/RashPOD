import type {
  EditorPlacementState,
  LocalSelectionPositionCm,
  LocalSelectionPositionPx,
  PlacementPresetDefaults,
  PlacementUnit,
  PrintAreaRect,
} from "./types";
import { renderedPlacementBounds } from "./placement-geometry";

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
  sourceAspectRatio?: number | null,
): EditorPlacementState {
  let targetWidth = preset?.defaultWidthCm && printArea.widthCm
    ? Math.round((preset.defaultWidthCm / printArea.widthCm) * printArea.width)
    : Math.round(printArea.safeWidth * 0.8);
  let targetHeight = preset?.defaultHeightCm && printArea.heightCm
    ? Math.round((preset.defaultHeightCm / printArea.heightCm) * printArea.height)
    : Math.round(printArea.safeHeight * 0.8);
  if (sourceAspectRatio && Number.isFinite(sourceAspectRatio) && sourceAspectRatio > 0) {
    if (preset?.defaultWidthCm && !preset.defaultHeightCm) {
      targetHeight = Math.round(targetWidth / sourceAspectRatio);
    } else if (!preset?.defaultWidthCm && preset?.defaultHeightCm) {
      targetWidth = Math.round(targetHeight * sourceAspectRatio);
    }
  }
  if (
    !preset?.defaultWidthCm &&
    !preset?.defaultHeightCm &&
    sourceAspectRatio &&
    Number.isFinite(sourceAspectRatio) &&
    sourceAspectRatio > 0
  ) {
    const availableWidth = printArea.safeWidth * 0.8;
    const availableHeight = printArea.safeHeight * 0.8;
    targetWidth = Math.round(Math.min(availableWidth, availableHeight * sourceAspectRatio));
    targetHeight = Math.round(targetWidth / sourceAspectRatio);
  }

  const placementScale = preset?.defaultScale && Number.isFinite(preset.defaultScale) && preset.defaultScale > 0
    ? preset.defaultScale
    : 1;
  const maxWidth = printArea.safeWidth / placementScale;
  const maxHeight = printArea.safeHeight / placementScale;
  const minWidth = Math.min(20 / placementScale, maxWidth);
  const minHeight = Math.min(20 / placementScale, maxHeight);
  const width = Math.max(minWidth, Math.min(targetWidth, maxWidth));
  const height = Math.max(minHeight, Math.min(targetHeight, maxHeight));
  const renderedWidth = width * placementScale;
  const renderedHeight = height * placementScale;

  const alignment = typeof preset?.alignment === "string" ? preset.alignment : "CENTER";
  let x = printArea.safeX + (printArea.safeWidth - renderedWidth) / 2;
  let y = printArea.safeY + (printArea.safeHeight - renderedHeight) / 2;

  if (alignment === "TOP_CENTER") {
    y = printArea.safeY;
    x = printArea.safeX + (printArea.safeWidth - renderedWidth) / 2;
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
    scale: placementScale,
    rotation: 0,
  };
}

export function clampPlacementToPrintArea(
  state: EditorPlacementState,
  printArea: PrintAreaRect,
  constraints: {
    allowOverflow?: boolean;
    allowRotate?: boolean;
    minScale?: number | null;
    maxScale?: number | null;
  } = {},
): EditorPlacementState {
  const zone = constraints.allowOverflow
    ? { x: printArea.x, y: printArea.y, width: printArea.width, height: printArea.height }
    : { x: printArea.safeX, y: printArea.safeY, width: printArea.safeWidth, height: printArea.safeHeight };

  let { x, y, width, height, scale, rotation } = state;
  x = Number.isFinite(x) ? x : zone.x;
  y = Number.isFinite(y) ? y : zone.y;
  width = Number.isFinite(width) && width > 0 ? width : zone.width;
  height = Number.isFinite(height) && height > 0 ? height : zone.height;
  const minimumScale = Number.isFinite(constraints.minScale) && (constraints.minScale ?? 0) > 0
    ? constraints.minScale!
    : Number.EPSILON;
  const maximumScale = Number.isFinite(constraints.maxScale) && (constraints.maxScale ?? 0) >= minimumScale
    ? constraints.maxScale!
    : Number.POSITIVE_INFINITY;
  const placementScale = Math.max(
    minimumScale,
    Math.min(maximumScale, Number.isFinite(scale) && scale > 0 ? scale : 1),
  );
  rotation = constraints.allowRotate === false || !Number.isFinite(rotation) ? 0 : rotation;
  const maxWidth = zone.width / placementScale;
  const maxHeight = zone.height / placementScale;
  const minWidth = Math.min(20 / placementScale, maxWidth);
  const minHeight = Math.min(20 / placementScale, maxHeight);

  width = Math.max(minWidth, Math.min(width, maxWidth));
  height = Math.max(minHeight, Math.min(height, maxHeight));
  let rendered = renderedPlacementBounds({ x, y, width, height, scale: placementScale, rotation });
  if (rendered.width > zone.width || rendered.height > zone.height) {
    const shrink = Math.min(zone.width / rendered.width, zone.height / rendered.height) * 0.999;
    width *= shrink;
    height *= shrink;
    rendered = renderedPlacementBounds({ x, y, width, height, scale: placementScale, rotation });
  }

  if (rendered.left < zone.x) x += zone.x - rendered.left;
  if (rendered.top < zone.y) y += zone.y - rendered.top;
  if (rendered.left + rendered.width > zone.x + zone.width) {
    x -= rendered.left + rendered.width - (zone.x + zone.width);
  }
  if (rendered.top + rendered.height > zone.y + zone.height) {
    y -= rendered.top + rendered.height - (zone.y + zone.height);
  }

  const clamped: EditorPlacementState = {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    scale: placementScale,
    rotation,
  };
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const integerBounds = renderedPlacementBounds(clamped);
    if (integerBounds.width > zone.width || integerBounds.height > zone.height) {
      clamped.width = Math.max(1, clamped.width - 1);
      clamped.height = Math.max(1, clamped.height - 1);
      continue;
    }
    if (integerBounds.left < zone.x) clamped.x += Math.ceil(zone.x - integerBounds.left);
    if (integerBounds.top < zone.y) clamped.y += Math.ceil(zone.y - integerBounds.top);
    if (integerBounds.left + integerBounds.width > zone.x + zone.width) {
      clamped.x -= Math.ceil(integerBounds.left + integerBounds.width - (zone.x + zone.width));
    }
    if (integerBounds.top + integerBounds.height > zone.y + zone.height) {
      clamped.y -= Math.ceil(integerBounds.top + integerBounds.height - (zone.y + zone.height));
    }
    const verified = renderedPlacementBounds(clamped);
    if (
      verified.left >= zone.x
      && verified.top >= zone.y
      && verified.left + verified.width <= zone.x + zone.width
      && verified.top + verified.height <= zone.y + zone.height
    ) {
      break;
    }
  }
  return clamped;
}

export function snapPlacementToCenter(state: EditorPlacementState, printArea: PrintAreaRect): EditorPlacementState {
  const placementScale = Number.isFinite(state.scale) && state.scale > 0 ? state.scale : 1;
  return {
    ...state,
    x: Math.round(printArea.safeX + (printArea.safeWidth - state.width * placementScale) / 2),
    y: Math.round(printArea.safeY + (printArea.safeHeight - state.height * placementScale) / 2),
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
  const placementScale = position.scale && Number.isFinite(position.scale) && position.scale > 0
    ? position.scale
    : 1;
  const placement: EditorPlacementState = {
    x: position.x ?? printArea.safeX,
    y: position.y ?? printArea.safeY,
    width: position.width ?? printArea.safeWidth,
    height: position.height ?? printArea.safeHeight,
    scale: placementScale,
    rotation: position.rotation ?? 0,
  };
  const rendered = renderedPlacementBounds(placement);
  const base: EditorPlacementState = {
    x: rendered.left,
    y: rendered.top,
    width: rendered.width,
    height: rendered.height,
    scale: 1,
    rotation: 0,
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
