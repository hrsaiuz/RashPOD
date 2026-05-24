"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LOGIN_DECORATION_MEDIA_KEYS,
  LOGIN_DECORATION_SLOTS,
  pickLoginDecorUrls,
  resolveLoginDecorAssetMap,
  type LoginDecorTheme,
} from "./auth-login-slots";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface UiAsset {
  key: string;
  title?: string | null;
  publicUrl?: string | null;
}

interface PublicBranding {
  theme?: Record<string, unknown>;
  loginLogoUrl?: string | null;
}

async function fetchUiAssets(keys?: string): Promise<UiAsset[]> {
  if (!API_URL) return [];
  const query = keys ? `?keys=${encodeURIComponent(keys)}` : "";
  const res = await fetch(`${API_URL}/media/ui-assets${query}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export function AuthDecorations({ themeUrls }: { themeUrls?: LoginDecorTheme }) {
  const [apiAssets, setApiAssets] = useState<Record<string, string>>({});

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const keyed = await fetchUiAssets(LOGIN_DECORATION_MEDIA_KEYS.join(","));
        let resolved = resolveLoginDecorAssetMap(keyed);

        const missing = LOGIN_DECORATION_SLOTS.some((slot) => !resolved[slot.mediaKey]);
        if (missing) {
          const all = await fetchUiAssets();
          resolved = { ...resolveLoginDecorAssetMap(all), ...resolved };
        }

        if (!controller.signal.aborted) {
          setApiAssets(resolved);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => controller.abort();
  }, []);

  const resolved = useMemo(() => {
    return LOGIN_DECORATION_SLOTS.map((slot) => {
      const themeUrl = themeUrls?.[slot.themeUrlKey];
      const apiUrl = apiAssets[slot.mediaKey];
      const url = themeUrl || apiUrl || "";
      return { ...slot, url };
    }).filter((slot) => slot.url);
  }, [apiAssets, themeUrls]);

  return (
    <>
      {resolved.map((slot) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={slot.mediaKey}
          src={slot.url}
          alt=""
          aria-hidden="true"
          className={slot.className}
        />
      ))}
    </>
  );
}

export function useAuthBranding() {
  const [branding, setBranding] = useState<PublicBranding | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!API_URL) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    fetch(`${API_URL}/branding`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setBranding(data))
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const decorThemeUrls = useMemo(() => pickLoginDecorUrls(branding?.theme), [branding?.theme]);

  return { branding, decorThemeUrls, loading };
}
