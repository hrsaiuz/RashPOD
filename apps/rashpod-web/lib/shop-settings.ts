import { SHOP_SETTINGS_CACHE_TAG, SHOP_SETTINGS_REVALIDATE_SECONDS } from "./cache";

export type DeliveryOption = {
  id: string;
  providerType: string;
  displayName: string;
  zone: string;
  price: number | null;
  freeDeliveryThreshold: number | null;
  etaText: string | null;
};

export type ShopSettings = {
  currency: string;
  defaultLocale: string;
  freeDeliveryThreshold: number | null;
  deliveryOptions: DeliveryOption[];
  pickup: {
    displayName: string;
    zone: string;
    address: string | null;
    hours: string | null;
  } | null;
};

export const DEFAULT_FREE_DELIVERY_THRESHOLD = 500_000;

export async function getShopSettings(): Promise<ShopSettings> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;
  if (!apiUrl) {
    return fallbackShopSettings();
  }

  try {
    const res = await fetch(`${apiUrl}/shop/settings`, {
      next: { revalidate: SHOP_SETTINGS_REVALIDATE_SECONDS, tags: [SHOP_SETTINGS_CACHE_TAG] },
    });
    if (!res.ok) return fallbackShopSettings();
    return (await res.json()) as ShopSettings;
  } catch {
    return fallbackShopSettings();
  }
}

export function resolveFreeDeliveryThreshold(settings: ShopSettings | null | undefined) {
  return settings?.freeDeliveryThreshold ?? DEFAULT_FREE_DELIVERY_THRESHOLD;
}

function fallbackShopSettings(): ShopSettings {
  return {
    currency: "UZS",
    defaultLocale: "uz-Latn",
    freeDeliveryThreshold: DEFAULT_FREE_DELIVERY_THRESHOLD,
    deliveryOptions: [],
    pickup: null,
  };
}
