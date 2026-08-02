type TemplateCanvasSizeInput = {
  contextWidthPx?: number | null;
  contextHeightPx?: number | null;
  naturalWidthPx?: number | null;
  naturalHeightPx?: number | null;
  useNaturalTemplateSize: boolean;
};

export function resolveTemplateCanvasSize(input: TemplateCanvasSizeInput) {
  const context = validPair(input.contextWidthPx, input.contextHeightPx);
  const natural = validPair(input.naturalWidthPx, input.naturalHeightPx);
  const selected = input.useNaturalTemplateSize ? natural ?? context : context ?? natural;
  return selected ?? { width: 2000, height: 2000 };
}

function validPair(width: number | null | undefined, height: number | null | undefined) {
  return positive(width) && positive(height) ? { width, height } : null;
}

function positive(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
