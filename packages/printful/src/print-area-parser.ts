export type PrintfulPrintAreaEntry = {
  placement: string;
  technique: string;
  printAreaWidthIn: number;
  printAreaHeightIn: number;
  areaLeftIn: number;
  areaTopIn: number;
  dpi?: number;
  fileWidthPx?: number;
  fileHeightPx?: number;
};

export type PrintfulPrintAreasMap = Record<string, PrintfulPrintAreaEntry>;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function inchesFromPixels(value: number | null, dpi: number | null) {
  if (value == null || value <= 0) return null;
  const resolvedDpi = dpi && dpi > 0 ? dpi : 150;
  return Math.round((value / resolvedDpi) * 100) / 100;
}

function normalizePlacementKey(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function defaultAreaForPlacement(placement: string) {
  const key = normalizePlacementKey(placement);
  if (key.includes("mug") || key.includes("wrap")) {
    return { printAreaWidthIn: 3.5, printAreaHeightIn: 3, areaLeftIn: 0, areaTopIn: 0 };
  }
  return { printAreaWidthIn: 12, printAreaHeightIn: 16, areaLeftIn: 0, areaTopIn: 0 };
}

export function parsePrintfulPrintAreas(printfiles: Record<string, unknown>, technique = "dtg"): PrintfulPrintAreasMap {
  const result: PrintfulPrintAreasMap = {};
  const variantPrintfiles = Array.isArray(printfiles.variant_printfiles) ? printfiles.variant_printfiles : [];

  for (const variantEntry of variantPrintfiles) {
    const record = asRecord(variantEntry);
    const printfilesList = Array.isArray(record.printfiles) ? record.printfiles : [];
    for (const item of printfilesList) {
      const file = asRecord(item);
      const placement = String(file.placement ?? "").trim();
      if (!placement) continue;
      const key = normalizePlacementKey(placement);
      if (result[key]) continue;

      const dpi = asNumber(file.dpi);
      const printAreaWidthIn =
        asNumber(file.print_area_width) ??
        inchesFromPixels(asNumber(file.width), dpi) ??
        defaultAreaForPlacement(placement).printAreaWidthIn;
      const printAreaHeightIn =
        asNumber(file.print_area_height) ??
        inchesFromPixels(asNumber(file.height), dpi) ??
        defaultAreaForPlacement(placement).printAreaHeightIn;

      result[key] = {
        placement: key,
        technique,
        printAreaWidthIn,
        printAreaHeightIn,
        areaLeftIn: asNumber(file.print_area_left) ?? 0,
        areaTopIn: asNumber(file.print_area_top) ?? 0,
        dpi: dpi ?? undefined,
        fileWidthPx: asNumber(file.width) ?? undefined,
        fileHeightPx: asNumber(file.height) ?? undefined,
      };
    }
  }

  return result;
}

export function resolvePrintfulPrintArea(
  printAreas: PrintfulPrintAreasMap | null | undefined,
  placement: string,
  fallbackTechnique = "dtg",
): PrintfulPrintAreaEntry {
  const key = normalizePlacementKey(placement);
  const entry = printAreas?.[key];
  if (entry) return entry;
  const defaults = defaultAreaForPlacement(placement);
  return {
    placement: key,
    technique: fallbackTechnique,
    ...defaults,
  };
}
