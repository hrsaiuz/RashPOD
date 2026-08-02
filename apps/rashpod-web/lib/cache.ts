// Admin saves invalidate this tag immediately. The short TTL is a safety net if
// cross-service revalidation is temporarily unavailable.
export const BRANDING_REVALIDATE_SECONDS = 60;

export const BRANDING_CACHE_TAG = "branding";

export const SHOP_SETTINGS_REVALIDATE_SECONDS = 60 * 60; // 1 hour

export const SHOP_SETTINGS_CACHE_TAG = "shop-settings";

export const CATALOG_REVALIDATE_SECONDS = 60;
