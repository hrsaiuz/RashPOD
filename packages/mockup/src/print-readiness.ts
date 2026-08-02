export const DEFAULT_MINIMUM_PRINT_DPI = 150;

export type PrintReadiness = {
  dpi: number | null;
  minimumDpi: number;
  ready: boolean;
  verifiable: boolean;
  label: string;
};

export function assessPrintReadiness(input: {
  sourceWidthPx?: number | null;
  sourceHeightPx?: number | null;
  placedWidthIn?: number | null;
  placedHeightIn?: number | null;
  minimumDpi?: number | null;
}): PrintReadiness {
  const minimumDpi = positive(input.minimumDpi) ?? DEFAULT_MINIMUM_PRINT_DPI;
  const sourceWidthPx = positive(input.sourceWidthPx);
  const sourceHeightPx = positive(input.sourceHeightPx);
  const placedWidthIn = positive(input.placedWidthIn);
  const placedHeightIn = positive(input.placedHeightIn);

  if (!sourceWidthPx || !sourceHeightPx || !placedWidthIn || !placedHeightIn) {
    return {
      dpi: null,
      minimumDpi,
      ready: false,
      verifiable: false,
      label: `Print quality cannot be verified (requires physical size and ${minimumDpi} DPI minimum)`,
    };
  }

  const dpi = Math.floor(Math.min(sourceWidthPx / placedWidthIn, sourceHeightPx / placedHeightIn));
  return {
    dpi,
    minimumDpi,
    ready: dpi >= minimumDpi,
    verifiable: true,
    label: `Effective print resolution ${dpi} DPI (minimum ${minimumDpi})`,
  };
}

function positive(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}
