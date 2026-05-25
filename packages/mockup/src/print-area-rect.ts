export interface AxisRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const MIN_PRINT_AREA_RECT_SIZE = 20;

function clampDimension(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function clampRectToBounds(
  rect: AxisRect,
  canvasWidth: number,
  canvasHeight: number,
  minSize = MIN_PRINT_AREA_RECT_SIZE,
): AxisRect {
  if (canvasWidth <= 0 || canvasHeight <= 0) {
    return { ...rect };
  }

  const width = clampDimension(rect.width, minSize, canvasWidth);
  const height = clampDimension(rect.height, minSize, canvasHeight);
  const x = clampDimension(rect.x, 0, Math.max(0, canvasWidth - width));
  const y = clampDimension(rect.y, 0, Math.max(0, canvasHeight - height));

  return { x, y, width, height };
}

export function clampSafeRectToPrintArea(safe: AxisRect, print: AxisRect, minSize = MIN_PRINT_AREA_RECT_SIZE): AxisRect {
  const maxWidth = Math.max(minSize, print.width);
  const maxHeight = Math.max(minSize, print.height);
  const width = clampDimension(safe.width, minSize, maxWidth);
  const height = clampDimension(safe.height, minSize, maxHeight);
  const x = clampDimension(safe.x, print.x, print.x + print.width - width);
  const y = clampDimension(safe.y, print.y, print.y + print.height - height);

  return { x, y, width, height };
}

export function normalizePrintAreaRects(
  print: AxisRect,
  safe: AxisRect,
  canvasWidth: number,
  canvasHeight: number,
  minSize = MIN_PRINT_AREA_RECT_SIZE,
) {
  const normalizedPrint = clampRectToBounds(print, canvasWidth, canvasHeight, minSize);
  const normalizedSafe = clampSafeRectToPrintArea(safe, normalizedPrint, minSize);
  return { print: normalizedPrint, safe: normalizedSafe };
}

export function suggestDefaultPrintAreaRects(canvasWidth: number, canvasHeight: number) {
  const printMarginX = Math.round(canvasWidth * 0.1);
  const printMarginY = Math.round(canvasHeight * 0.1);
  const print = {
    x: printMarginX,
    y: printMarginY,
    width: Math.max(MIN_PRINT_AREA_RECT_SIZE, canvasWidth - printMarginX * 2),
    height: Math.max(MIN_PRINT_AREA_RECT_SIZE, canvasHeight - printMarginY * 2),
  };
  const safeInsetX = Math.round(print.width * 0.05);
  const safeInsetY = Math.round(print.height * 0.05);
  const safe = {
    x: print.x + safeInsetX,
    y: print.y + safeInsetY,
    width: Math.max(MIN_PRINT_AREA_RECT_SIZE, print.width - safeInsetX * 2),
    height: Math.max(MIN_PRINT_AREA_RECT_SIZE, print.height - safeInsetY * 2),
  };
  return normalizePrintAreaRects(print, safe, canvasWidth, canvasHeight);
}
