import type { EditorPlacementState, PrintAreaRect } from "./types";

export interface VariantRenderRegion {
  canvasWidth: number;
  canvasHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseVariantRenderRegion(metadata: unknown): VariantRenderRegion | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const raw = (metadata as Record<string, unknown>).renderRegion;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const canvasWidth = finiteNumber(record.canvasWidth);
  const canvasHeight = finiteNumber(record.canvasHeight);
  const x = finiteNumber(record.x);
  const y = finiteNumber(record.y);
  const width = finiteNumber(record.width);
  const height = finiteNumber(record.height);
  const rotation = finiteNumber(record.rotation) ?? 0;
  if (canvasWidth == null || canvasHeight == null || x == null || y == null || width == null || height == null) return null;
  if (canvasWidth <= 0 || canvasHeight <= 0 || width <= 0 || height <= 0) return null;
  if (x < 0 || y < 0 || x + width > canvasWidth || y + height > canvasHeight) return null;
  return { canvasWidth, canvasHeight, x, y, width, height, rotation };
}

export function mapPlacementToVariantRegion(
  placement: EditorPlacementState,
  sourcePrintArea: PrintAreaRect,
  target: VariantRenderRegion,
): EditorPlacementState {
  if (sourcePrintArea.width <= 0 || sourcePrintArea.height <= 0) {
    throw new Error("SOURCE_PRINT_AREA_INVALID");
  }
  const renderedWidth = placement.width * placement.scale;
  const renderedHeight = placement.height * placement.scale;
  const relativeCenterX = (placement.x + renderedWidth / 2 - sourcePrintArea.x) / sourcePrintArea.width;
  const relativeCenterY = (placement.y + renderedHeight / 2 - sourcePrintArea.y) / sourcePrintArea.height;
  const targetWidth = Math.max(1, Math.round((renderedWidth / sourcePrintArea.width) * target.width));
  const targetHeight = Math.max(1, Math.round((renderedHeight / sourcePrintArea.height) * target.height));
  const regionCenterX = target.x + target.width / 2;
  const regionCenterY = target.y + target.height / 2;
  const unrotatedCenterX = target.x + relativeCenterX * target.width;
  const unrotatedCenterY = target.y + relativeCenterY * target.height;
  const rotation = target.rotation ?? 0;
  const radians = rotation * Math.PI / 180;
  const offsetX = unrotatedCenterX - regionCenterX;
  const offsetY = unrotatedCenterY - regionCenterY;
  const rotatedCenterX = regionCenterX + offsetX * Math.cos(radians) - offsetY * Math.sin(radians);
  const rotatedCenterY = regionCenterY + offsetX * Math.sin(radians) + offsetY * Math.cos(radians);
  return {
    x: Math.round(rotatedCenterX - targetWidth / 2),
    y: Math.round(rotatedCenterY - targetHeight / 2),
    width: targetWidth,
    height: targetHeight,
    scale: 1,
    rotation: placement.rotation + rotation,
  };
}
