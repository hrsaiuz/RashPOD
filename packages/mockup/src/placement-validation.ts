import { calculateLocalPosition, calculatePrintfulPosition } from "./placement-converters";
import type { NormalizedPosition, PrintableAreaBounds, PositionInput } from "./types";
import { PlacementValidationError as ValidationError } from "./types";

export { calculateLocalPosition, calculatePrintfulPosition };

export function validatePositionWithinArea(
  position: NormalizedPosition,
  bounds: PrintableAreaBounds,
  units: "CM" | "INCH" | "PX",
): true {
  const width = position.width ?? 0;
  const height = position.height ?? 0;
  const x = position.x ?? position.left ?? 0;
  const y = position.y ?? position.top ?? 0;
  const areaWidth = units === "CM" ? bounds.widthCm : units === "INCH" ? bounds.widthIn : bounds.widthPx;
  const areaHeight = units === "CM" ? bounds.heightCm : units === "INCH" ? bounds.heightIn : bounds.heightPx;

  if (width <= 0 || height <= 0) {
    throw new ValidationError("INVALID_PLACEMENT: width and height are required", "INVALID_PLACEMENT");
  }
  if (x < 0 || y < 0) {
    throw new ValidationError("POSITION_OUTSIDE_PRINT_AREA", "POSITION_OUTSIDE_PRINT_AREA");
  }
  if (areaWidth != null && x + width > areaWidth) {
    throw new ValidationError("POSITION_OUTSIDE_PRINT_AREA", "POSITION_OUTSIDE_PRINT_AREA");
  }
  if (areaHeight != null && y + height > areaHeight) {
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

  const width = position.width ?? 0;
  const height = position.height ?? 0;
  const x = position.x ?? position.left ?? 0;
  const y = position.y ?? position.top ?? 0;
  const areaWidth = units === "CM" ? bounds.widthCm : units === "INCH" ? bounds.widthIn : bounds.widthPx;
  const areaHeight = units === "CM" ? bounds.heightCm : units === "INCH" ? bounds.heightIn : bounds.heightPx;

  if (bounds.allowMove === false && (x !== 0 || y !== 0)) {
    throw new ValidationError("INVALID_PLACEMENT: moving is not allowed for this print area", "INVALID_PLACEMENT");
  }
  if (
    bounds.allowResize === false &&
    areaWidth != null &&
    areaHeight != null &&
    (width !== areaWidth || height !== areaHeight)
  ) {
    throw new ValidationError("INVALID_PLACEMENT: resizing is not allowed for this print area", "INVALID_PLACEMENT");
  }

  if (units === "PX" && bounds.safeX != null && bounds.safeY != null && bounds.safeWidth != null && bounds.safeHeight != null) {
    if (x < bounds.safeX || y < bounds.safeY || x + width > bounds.safeX + bounds.safeWidth || y + height > bounds.safeY + bounds.safeHeight) {
      throw new ValidationError("POSITION_OUTSIDE_SAFE_ZONE", "POSITION_OUTSIDE_SAFE_ZONE");
    }
  }

  return true;
}

export function validateLocalPositionInput(position: PositionInput, bounds: PrintableAreaBounds, units: "CM" | "PX") {
  const normalized = calculateLocalPosition(position);
  return validatePrintAreaConstraints(normalized, bounds, units);
}

export function validatePrintfulPositionInput(position: PositionInput, bounds: PrintableAreaBounds) {
  const normalized = calculatePrintfulPosition(position);
  return validatePrintAreaConstraints(normalized, bounds, "INCH");
}
