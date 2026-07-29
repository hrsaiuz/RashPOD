import { calculateLocalPosition, calculatePrintfulPosition } from "./placement-converters";
import { renderedPlacementBounds } from "./placement-geometry";
import type { NormalizedPosition, PrintableAreaBounds, PositionInput } from "./types";
import { PlacementValidationError as ValidationError } from "./types";

export { calculateLocalPosition, calculatePrintfulPosition };

export function validatePositionWithinArea(
  position: NormalizedPosition,
  bounds: PrintableAreaBounds,
  units: "CM" | "INCH" | "PX",
): true {
  const rawWidth = position.width ?? 0;
  const rawHeight = position.height ?? 0;
  const rawX = position.x ?? position.left ?? 0;
  const rawY = position.y ?? position.top ?? 0;
  const rawScale = position.scale ?? 1;
  const rawRotation = position.rotation ?? 0;
  if (
    !Number.isFinite(rawWidth)
    || !Number.isFinite(rawHeight)
    || !Number.isFinite(rawX)
    || !Number.isFinite(rawY)
    || !Number.isFinite(rawScale)
    || !Number.isFinite(rawRotation)
  ) {
    throw new ValidationError("INVALID_PLACEMENT: placement values must be finite numbers", "INVALID_PLACEMENT");
  }
  const rendered = renderedPlacementBounds({
    x: rawX,
    y: rawY,
    width: rawWidth,
    height: rawHeight,
    scale: rawScale,
    rotation: rawRotation,
  });
  const { left: x, top: y, width, height } = rendered;
  const areaWidth = units === "CM" ? bounds.widthCm : units === "INCH" ? bounds.widthIn : bounds.widthPx;
  const areaHeight = units === "CM" ? bounds.heightCm : units === "INCH" ? bounds.heightIn : bounds.heightPx;
  const areaX = units === "PX" ? (bounds.xPx ?? 0) : units === "INCH" ? (bounds.xIn ?? 0) : 0;
  const areaY = units === "PX" ? (bounds.yPx ?? 0) : units === "INCH" ? (bounds.yIn ?? 0) : 0;

  if (rawWidth <= 0 || rawHeight <= 0) {
    throw new ValidationError("INVALID_PLACEMENT: width and height are required", "INVALID_PLACEMENT");
  }
  if (rawScale <= 0) {
    throw new ValidationError("INVALID_PLACEMENT: scale must be greater than zero", "INVALID_PLACEMENT");
  }
  if (x < areaX || y < areaY) {
    throw new ValidationError("POSITION_OUTSIDE_PRINT_AREA", "POSITION_OUTSIDE_PRINT_AREA");
  }
  if (areaWidth != null && x + width > areaX + areaWidth) {
    throw new ValidationError("POSITION_OUTSIDE_PRINT_AREA", "POSITION_OUTSIDE_PRINT_AREA");
  }
  if (areaHeight != null && y + height > areaY + areaHeight) {
    throw new ValidationError("POSITION_OUTSIDE_PRINT_AREA", "POSITION_OUTSIDE_PRINT_AREA");
  }
  return true;
}

export function validatePrintAreaConstraints(
  position: NormalizedPosition,
  bounds: PrintableAreaBounds,
  units: "CM" | "INCH" | "PX",
): true {
  validatePositionWithinArea(position, bounds, units);
  const scale = position.scale ?? 1;
  const rotation = position.rotation ?? 0;

  if (bounds.minScale != null && scale < bounds.minScale) {
    throw new ValidationError("INVALID_PLACEMENT: scale is below print area minimum", "INVALID_PLACEMENT");
  }
  if (bounds.maxScale != null && scale > bounds.maxScale) {
    throw new ValidationError("INVALID_PLACEMENT: scale is above print area maximum", "INVALID_PLACEMENT");
  }
  if (bounds.allowRotate === false && rotation !== 0) {
    throw new ValidationError("INVALID_PLACEMENT: rotation is not allowed for this print area", "INVALID_PLACEMENT");
  }

  const rendered = renderedPlacementBounds({
    x: position.x ?? position.left ?? 0,
    y: position.y ?? position.top ?? 0,
    width: position.width ?? 0,
    height: position.height ?? 0,
    scale,
    rotation,
  });
  const { left: x, top: y, width, height } = rendered;
  // allowMove and allowResize describe moderator-editor capabilities. The print area
  // does not store a canonical artwork rectangle to compare against, so geometry and
  // safe-zone checks remain the server-side source of truth for submitted positions.

  const safeBounds = resolveSafeBounds(bounds, units);
  if (safeBounds) {
    if (
      x < safeBounds.x
      || y < safeBounds.y
      || x + width > safeBounds.x + safeBounds.width
      || y + height > safeBounds.y + safeBounds.height
    ) {
      throw new ValidationError("POSITION_OUTSIDE_SAFE_ZONE", "POSITION_OUTSIDE_SAFE_ZONE");
    }
  }

  return true;
}

function resolveSafeBounds(bounds: PrintableAreaBounds, units: "CM" | "INCH" | "PX") {
  if (bounds.safeX == null || bounds.safeY == null || bounds.safeWidth == null || bounds.safeHeight == null) {
    return null;
  }
  if (units === "PX") {
    return { x: bounds.safeX, y: bounds.safeY, width: bounds.safeWidth, height: bounds.safeHeight };
  }
  if (
    units === "CM"
    && bounds.xPx != null
    && bounds.yPx != null
    && bounds.widthPx
    && bounds.heightPx
    && bounds.widthCm
    && bounds.heightCm
  ) {
    return {
      x: ((bounds.safeX - bounds.xPx) / bounds.widthPx) * bounds.widthCm,
      y: ((bounds.safeY - bounds.yPx) / bounds.heightPx) * bounds.heightCm,
      width: (bounds.safeWidth / bounds.widthPx) * bounds.widthCm,
      height: (bounds.safeHeight / bounds.heightPx) * bounds.heightCm,
    };
  }
  return null;
}

export function validateLocalPositionInput(position: PositionInput, bounds: PrintableAreaBounds, units: "CM" | "PX") {
  const normalized = calculateLocalPosition(position);
  return validatePrintAreaConstraints(normalized, bounds, units);
}

export function validatePrintfulPositionInput(position: PositionInput, bounds: PrintableAreaBounds) {
  const normalized = calculatePrintfulPosition(position);
  return validatePrintAreaConstraints(normalized, bounds, "INCH");
}
