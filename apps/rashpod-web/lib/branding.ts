import { BRANDING_CACHE_TAG, BRANDING_REVALIDATE_SECONDS } from "./cache";

export type StorefrontBranding = {
  storefrontLogoUrl: string | null;
  footerLogoUrl: string | null;
  faviconUrl: string | null;
  homeHeroImageUrl?: string | null;
  homeHeroImageAlt?: string | null;
  homeDesignerSectionImageUrl?: string | null;
  homeDesignerSectionImageAlt?: string | null;
  theme: { storeName?: string; storeTagline?: string };
};

const getOptionalString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined;

export function extractHomeMedia(branding: Record<string, unknown> | null | undefined) {
  if (!branding || typeof branding !== "object") {
    return {
      homeHeroImageUrl: undefined,
      homeHeroImageAlt: undefined,
      homeDesignerSectionImageUrl: undefined,
      homeDesignerSectionImageAlt: undefined,
    };
  }

  const theme = typeof branding.theme === "object" && branding.theme ? (branding.theme as Record<string, unknown>) : {};

  return {
    homeHeroImageUrl:
      getOptionalString(branding.homeHeroImageUrl) ?? getOptionalString(theme.homeHeroImageUrl),
    homeHeroImageAlt:
      getOptionalString(branding.homeHeroImageAlt) ?? getOptionalString(theme.homeHeroImageAlt),
    homeDesignerSectionImageUrl:
      getOptionalString(branding.homeDesignerSectionImageUrl) ??
      getOptionalString(theme.homeDesignerSectionImageUrl),
    homeDesignerSectionImageAlt:
      getOptionalString(branding.homeDesignerSectionImageAlt) ??
      getOptionalString(theme.homeDesignerSectionImageAlt),
  };
}

export async function getStorefrontBranding(): Promise<StorefrontBranding | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;
  if (!apiUrl) return null;

  try {
    const res = await fetch(`${apiUrl}/branding`, {
      next: { revalidate: BRANDING_REVALIDATE_SECONDS, tags: [BRANDING_CACHE_TAG] },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const theme =
      typeof data.theme === "object" && data.theme ? (data.theme as Record<string, unknown>) : {};

    return {
      storefrontLogoUrl: getOptionalString(data.storefrontLogoUrl) ?? null,
      footerLogoUrl: getOptionalString(data.footerLogoUrl) ?? null,
      faviconUrl: getOptionalString(data.faviconUrl) ?? null,
      homeHeroImageUrl: getOptionalString(data.homeHeroImageUrl) ?? getOptionalString(theme.homeHeroImageUrl) ?? null,
      homeHeroImageAlt: getOptionalString(data.homeHeroImageAlt) ?? getOptionalString(theme.homeHeroImageAlt) ?? null,
      homeDesignerSectionImageUrl:
        getOptionalString(data.homeDesignerSectionImageUrl) ??
        getOptionalString(theme.homeDesignerSectionImageUrl) ??
        null,
      homeDesignerSectionImageAlt:
        getOptionalString(data.homeDesignerSectionImageAlt) ??
        getOptionalString(theme.homeDesignerSectionImageAlt) ??
        null,
      theme: theme as StorefrontBranding["theme"],
    };
  } catch {
    return null;
  }
}
