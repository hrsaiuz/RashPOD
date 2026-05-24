export type LoginDecorThemeUrlKey =
  | "loginDecorBlobTopLeftUrl"
  | "loginDecorFlowerOrangeUrl"
  | "loginDecorBlockBottomLeftUrl"
  | "loginDecorFlowerBlueUrl"
  | "loginDecorGradientCircleUrl"
  | "loginDecorSunburstUrl"
  | "loginDecorStarOrangeUrl"
  | "loginDecorPentagonsUrl";

export type LoginDecorSlot = {
  mediaKey: string;
  themeUrlKey: LoginDecorThemeUrlKey;
  title: string;
  description: string;
  className: string;
};

export const LOGIN_DECORATION_SLOTS: LoginDecorSlot[] = [
  {
    mediaKey: "auth-login-blob-top-left",
    themeUrlKey: "loginDecorBlobTopLeftUrl",
    title: "Login blob (top-left)",
    description: "Large grey blob shape peeking from the top-left corner of the login panel.",
    className:
      "hidden lg:block absolute -left-8 -top-10 w-[220px] h-[200px] object-contain pointer-events-none select-none",
  },
  {
    mediaKey: "auth-login-flower-orange",
    themeUrlKey: "loginDecorFlowerOrangeUrl",
    title: "Login flower (orange, top-left)",
    description: "Small orange flower accent near the top-left of the login panel.",
    className:
      "hidden lg:block absolute left-[140px] top-[72px] w-[72px] h-[72px] object-contain pointer-events-none select-none",
  },
  {
    mediaKey: "auth-login-block-bottom-left",
    themeUrlKey: "loginDecorBlockBottomLeftUrl",
    title: "Login block (bottom-left)",
    description: "Lavender rounded rectangle at the bottom-left of the login panel.",
    className:
      "hidden md:block absolute -left-6 bottom-0 w-[200px] h-[160px] object-contain pointer-events-none select-none",
  },
  {
    mediaKey: "auth-login-flower-blue",
    themeUrlKey: "loginDecorFlowerBlueUrl",
    title: "Login flower (blue, bottom-left)",
    description: "Blue flower overlapping the bottom-left block.",
    className:
      "hidden md:block absolute left-[120px] bottom-[80px] w-[120px] h-[120px] object-contain pointer-events-none select-none",
  },
  {
    mediaKey: "auth-login-gradient-circle",
    themeUrlKey: "loginDecorGradientCircleUrl",
    title: "Login gradient circle (top-right)",
    description: "Soft purple-to-peach gradient circle at the top-right.",
    className:
      "hidden lg:block absolute -right-4 top-8 w-[180px] h-[180px] object-contain pointer-events-none select-none",
  },
  {
    mediaKey: "auth-login-sunburst",
    themeUrlKey: "loginDecorSunburstUrl",
    title: "Login sunburst (right)",
    description: "Large grey radial sunburst on the right side of the login panel.",
    className:
      "hidden md:block absolute right-[-40px] top-1/2 -translate-y-1/2 w-[320px] h-[320px] lg:w-[420px] lg:h-[420px] object-contain pointer-events-none select-none opacity-90",
  },
  {
    mediaKey: "auth-login-star-orange",
    themeUrlKey: "loginDecorStarOrangeUrl",
    title: "Login star (bottom-right)",
    description: "Orange star or blob shape at the bottom-right corner.",
    className:
      "hidden md:block absolute -right-2 -bottom-4 w-[160px] h-[160px] object-contain pointer-events-none select-none",
  },
  {
    mediaKey: "auth-login-pentagons",
    themeUrlKey: "loginDecorPentagonsUrl",
    title: "Login pentagons (bottom-right)",
    description: "Small blue pentagon accents near the bottom-right.",
    className:
      "hidden lg:block absolute right-[180px] bottom-[48px] w-[80px] h-[80px] object-contain pointer-events-none select-none",
  },
];

export const LOGIN_DECORATION_MEDIA_KEYS = LOGIN_DECORATION_SLOTS.map((slot) => slot.mediaKey);

export type LoginDecorTheme = Partial<Record<LoginDecorThemeUrlKey, string>>;

export interface LoginDecorUiAsset {
  key: string;
  title?: string | null;
  publicUrl?: string | null;
}

export function pickLoginDecorUrls(theme?: Record<string, unknown> | null): LoginDecorTheme {
  if (!theme) return {};
  const result: LoginDecorTheme = {};
  for (const slot of LOGIN_DECORATION_SLOTS) {
    const value = theme[slot.themeUrlKey];
    if (typeof value === "string" && value.trim()) {
      result[slot.themeUrlKey] = value.trim();
    }
  }
  return result;
}

function normalizeDecorKey(key: string) {
  return key
    .toLowerCase()
    .replace(/^auth-login-/, "")
    .replace(/^login-/, "");
}

export function resolveLoginDecorAssetMap(assets: LoginDecorUiAsset[]): Record<string, string> {
  const byExactKey: Record<string, string> = {};
  const byNormalizedKey: Record<string, string> = {};

  for (const asset of assets) {
    if (!asset.key || !asset.publicUrl) continue;
    byExactKey[asset.key] = asset.publicUrl;
    byNormalizedKey[normalizeDecorKey(asset.key)] = asset.publicUrl;
    if (asset.title) {
      byNormalizedKey[normalizeDecorKey(slugifyTitle(asset.title))] = asset.publicUrl;
    }
  }

  const resolved: Record<string, string> = {};
  for (const slot of LOGIN_DECORATION_SLOTS) {
    const exact = byExactKey[slot.mediaKey];
    if (exact) {
      resolved[slot.mediaKey] = exact;
      continue;
    }
    const normalized = byNormalizedKey[normalizeDecorKey(slot.mediaKey)];
    if (normalized) {
      resolved[slot.mediaKey] = normalized;
    }
  }
  return resolved;
}

function slugifyTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
