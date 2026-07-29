import type { MockupVariant, PlacementConfigV1 } from "./types";

export function resolveTemplateImageKey(config: PlacementConfigV1 | null | undefined, variant: MockupVariant): string | null {
  if (!config?.mockupTemplate) return null;
  const template = config.mockupTemplate;
  const base = config.mockupView?.blankImageKey ?? template.baseImageKey;
  if (variant === "lifestyle") {
    return config.galleryAssets?.find((asset) => asset.role === "LIFESTYLE")?.imageKey
      ?? template.lifestyleImageKey
      ?? base
      ?? null;
  }
  if (variant === "closeup") {
    return config.galleryAssets?.find((asset) => asset.role === "DETAIL")?.imageKey
      ?? template.closeupImageKey
      ?? base
      ?? null;
  }
  return base ?? null;
}
