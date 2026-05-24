import type { MockupVariant, PlacementConfigV1 } from "./types";

export function resolveTemplateImageKey(config: PlacementConfigV1 | null | undefined, variant: MockupVariant): string | null {
  if (!config?.mockupTemplate) return null;
  const template = config.mockupTemplate;
  const base = template.baseImageKey;
  if (variant === "lifestyle") return template.lifestyleImageKey ?? base ?? null;
  if (variant === "closeup") return template.closeupImageKey ?? base ?? null;
  return base ?? null;
}
