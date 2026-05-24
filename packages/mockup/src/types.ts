export type MockupVariant = "main" | "lifestyle" | "closeup" | "preview";

export type PlacementUnit = "CM" | "PX" | "INCH";

export interface EditorPlacementState {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation: number;
}

export interface PrintAreaRect {
  x: number;
  y: number;
  width: number;
  height: number;
  safeX: number;
  safeY: number;
  safeWidth: number;
  safeHeight: number;
  widthCm?: number | null;
  heightCm?: number | null;
}

export interface PlacementConstraints {
  allowMove?: boolean;
  allowResize?: boolean;
  allowRotate?: boolean;
  minScale?: number;
  maxScale?: number;
}

export interface PlacementPresetDefaults {
  defaultWidthCm?: number | null;
  defaultHeightCm?: number | null;
  defaultX?: number | null;
  defaultY?: number | null;
  defaultScale?: number | null;
  alignment?: string | null;
}

export interface PlacementConfigV1 {
  version: 1;
  mockupTemplate: {
    id: string;
    name: string;
    baseImageKey: string;
    lifestyleImageKey?: string | null;
    closeupImageKey?: string | null;
  };
  printArea: PrintAreaRect & {
    id?: string;
    name?: string;
    placement?: string | null;
  };
  placementPreset?: {
    id: string;
    name: string;
    alignment?: unknown;
  };
  unit?: PlacementUnit;
  anchor?: string;
  position: EditorPlacementState;
}

export interface NormalizedPosition {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  left?: number;
  top?: number;
  scale: number;
  rotation: number;
}

export interface PositionInput {
  width?: number;
  height?: number;
  widthCm?: number;
  heightCm?: number;
  widthIn?: number;
  heightIn?: number;
  x?: number;
  y?: number;
  xCm?: number;
  yCm?: number;
  left?: number;
  top?: number;
  leftIn?: number;
  topIn?: number;
  scale?: number;
  rotation?: number;
}

export interface PrintableAreaBounds {
  widthPx?: number | null;
  heightPx?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  widthIn?: number | null;
  heightIn?: number | null;
  safeX?: number | null;
  safeY?: number | null;
  safeWidth?: number | null;
  safeHeight?: number | null;
  allowMove?: boolean | null;
  allowResize?: boolean | null;
  allowRotate?: boolean | null;
  minScale?: number | null;
  maxScale?: number | null;
}

export interface LocalSelectionPositionPx {
  widthPx: number;
  heightPx: number;
  xPx: number;
  yPx: number;
  scale: number;
  rotation: number;
}

export interface LocalSelectionPositionCm {
  widthCm: number;
  heightCm: number;
  xCm: number;
  yCm: number;
  scale: number;
  rotation: number;
}

export class PlacementValidationError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "PlacementValidationError";
  }
}
