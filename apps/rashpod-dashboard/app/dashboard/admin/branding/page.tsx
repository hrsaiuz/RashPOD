"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { Button, Card, rashpodTokens, Skeleton } from "@rashpod/ui";
import { Upload, Image as ImageIcon } from "lucide-react";
import DashboardLayout from "../../dashboard-layout";
import { LOGIN_DECORATION_SLOTS, type LoginDecorThemeUrlKey } from "../../../auth/auth-login-slots";
import { revalidateStorefrontBranding } from "../../../../lib/revalidate-storefront";

type SlotKey = "storefrontLogoUrl" | "dashboardLogoUrl" | "loginLogoUrl" | "footerLogoUrl" | "faviconUrl";
type ThemeImageUrlKey = "homeHeroImageUrl" | "homeDesignerSectionImageUrl";
type ThemeImageAltKey = "homeHeroImageAlt" | "homeDesignerSectionImageAlt";
type HomeCategoryTile = {
  key: string;
  category: string;
  productName: string;
  href: string;
  imageUrl: string;
  altText: string;
  variant: "blue" | "peach";
  size?: "wide" | "standard";
};

type BrandingTheme = {
  primaryColor: string;
  peachColor: string;
  storeName: string;
  storeTagline: string;
  homeHeroImageUrl: string;
  homeHeroImageAlt: string;
  homeDesignerSectionImageUrl: string;
  homeDesignerSectionImageAlt: string;
  homeCategoryTiles: HomeCategoryTile[];
} & Record<LoginDecorThemeUrlKey, string>;

interface Branding {
  storefrontLogoUrl: string | null;
  dashboardLogoUrl: string | null;
  loginLogoUrl: string | null;
  footerLogoUrl: string | null;
  faviconUrl: string | null;
  homeHeroImageUrl?: string | null;
  homeHeroImageAlt?: string | null;
  homeDesignerSectionImageUrl?: string | null;
  homeDesignerSectionImageAlt?: string | null;
  theme: Record<string, unknown>;
}

const SLOTS: { key: SlotKey; category: string; title: string; description: string; aspect: string }[] = [
  {
    key: "storefrontLogoUrl",
    category: "BRANDING_LOGO_WEB",
    title: "Storefront logo",
    description: "Shown on the public site header (rashpod.uz). Recommended: SVG or PNG, 240×64px.",
    aspect: "aspect-[15/4]",
  },
  {
    key: "dashboardLogoUrl",
    category: "BRANDING_LOGO_DASHBOARD",
    title: "Dashboard logo",
    description: "Shown in the sidebar of the dashboard. Recommended: square or wide, 200×48px.",
    aspect: "aspect-[5/2]",
  },
  {
    key: "loginLogoUrl",
    category: "BRANDING_LOGO_LOGIN",
    title: "Login form logo",
    description: "Shown above the dashboard login form. Recommended: centered logo, 320×80px.",
    aspect: "aspect-[4/1]",
  },
  {
    key: "footerLogoUrl",
    category: "BRANDING_LOGO_FOOTER",
    title: "Footer large logo",
    description: "Shown as the oversized brand mark in the public site footer. Recommended: SVG or PNG, 1200×240px.",
    aspect: "aspect-[5/1]",
  },
  {
    key: "faviconUrl",
    category: "BRANDING_FAVICON",
    title: "Favicon",
    description: "Browser tab icon. Recommended: 32×32px or 64×64px PNG.",
    aspect: "aspect-square",
  },
];

const HOMEPAGE_IMAGE_SLOTS: {
  urlKey: ThemeImageUrlKey;
  altKey: ThemeImageAltKey;
  mediaKey: string;
  title: string;
  description: string;
  aspect: string;
  defaultAlt: string;
}[] = [
  {
    urlKey: "homeHeroImageUrl",
    altKey: "homeHeroImageAlt",
    mediaKey: "home-hero-figma",
    title: "Homepage hero artwork",
    description: "Figma-exported hero picture shown on the right side of the main homepage hero. Recommended: WebP, 1400x1050 or wider.",
    aspect: "aspect-[4/3]",
    defaultAlt: "RashPOD product mockup and designer artwork preview",
  },
  {
    urlKey: "homeDesignerSectionImageUrl",
    altKey: "homeDesignerSectionImageAlt",
    mediaKey: "home-designers-figma",
    title: "Featured designers artwork",
    description: "Figma-exported picture anchoring the Featured designers section. Recommended: WebP, 1200x900 or wider.",
    aspect: "aspect-[4/3]",
    defaultAlt: "RashPOD designer community artwork",
  },
];

const DEFAULT_HOME_CATEGORY_TILES: HomeCategoryTile[] = [
  { key: "t-shirt", category: "clothes", productName: "t-shirt", href: "/shop?categories=t-shirt", imageUrl: "", altText: "RashPOD t-shirt", variant: "blue", size: "wide" },
  { key: "postal-card", category: "prints", productName: "postal card", href: "/shop?categories=postal-card", imageUrl: "", altText: "RashPOD postal cards", variant: "peach" },
  { key: "mug", category: "ceramics", productName: "mug", href: "/shop?categories=mug", imageUrl: "", altText: "RashPOD mug", variant: "blue" },
  { key: "hoodie", category: "clothes", productName: "hoodie", href: "/shop?categories=hoodie", imageUrl: "", altText: "RashPOD hoodie", variant: "peach" },
  { key: "hat", category: "clothes", productName: "hat", href: "/shop?categories=hat", imageUrl: "", altText: "RashPOD hat", variant: "blue" },
  { key: "poster", category: "prints", productName: "poster in frame", href: "/shop?categories=poster", imageUrl: "", altText: "RashPOD framed poster", variant: "peach", size: "wide" },
];

const inputClassName =
  "mt-1 w-full rounded-[14px] border border-surface-borderSoft bg-white px-3 py-2 text-sm text-brand-text shadow-xs focus:outline-none focus:ring-4 focus:ring-brand-blue/20 focus:border-brand-blue";
const uploadButtonClassName =
  "inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-blueGlow hover:bg-brand-blue/90 cursor-pointer transition-colors";

export default function BrandingPage() {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingKey, setUploadingKey] = useState<SlotKey | null>(null);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<BrandingTheme>({
    primaryColor: rashpodTokens.colors.brand.blue,
    peachColor: rashpodTokens.colors.brand.peach,
    storeName: "RashPOD",
    storeTagline: "Print-on-demand by Uzbek creators",
    homeHeroImageUrl: "",
    homeHeroImageAlt: "RashPOD product mockup and designer artwork preview",
    homeDesignerSectionImageUrl: "",
    homeDesignerSectionImageAlt: "RashPOD designer community artwork",
    homeCategoryTiles: DEFAULT_HOME_CATEGORY_TILES,
    loginDecorBlobTopLeftUrl: "",
    loginDecorFlowerOrangeUrl: "",
    loginDecorBlockBottomLeftUrl: "",
    loginDecorFlowerBlueUrl: "",
    loginDecorGradientCircleUrl: "",
    loginDecorSunburstUrl: "",
    loginDecorStarOrangeUrl: "",
    loginDecorPentagonsUrl: "",
  });
  const [themeSaving, setThemeSaving] = useState(false);
  const [themeSaved, setThemeSaved] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/proxy/admin/branding");
      const data = res.ok ? await res.json() : null;
      setBranding(data);
      if (data?.theme && typeof data.theme === "object") {
        const incoming = data.theme as Partial<BrandingTheme>;
        const incomingCategoryTiles = Array.isArray(data.homeCategoryTiles)
          ? data.homeCategoryTiles
          : Array.isArray(incoming.homeCategoryTiles)
            ? incoming.homeCategoryTiles
            : [];
        setTheme((prev) => ({
          ...prev,
          ...incoming,
          homeHeroImageUrl: data.homeHeroImageUrl ?? incoming.homeHeroImageUrl ?? prev.homeHeroImageUrl,
          homeHeroImageAlt: data.homeHeroImageAlt ?? incoming.homeHeroImageAlt ?? prev.homeHeroImageAlt,
          homeDesignerSectionImageUrl:
            data.homeDesignerSectionImageUrl ?? incoming.homeDesignerSectionImageUrl ?? prev.homeDesignerSectionImageUrl,
          homeDesignerSectionImageAlt:
            data.homeDesignerSectionImageAlt ?? incoming.homeDesignerSectionImageAlt ?? prev.homeDesignerSectionImageAlt,
          homeCategoryTiles: DEFAULT_HOME_CATEGORY_TILES.map((fallback) => ({
            ...fallback,
            ...(incomingCategoryTiles.find((tile: HomeCategoryTile) => tile.key === fallback.key) ?? {}),
          })),
        }));
      }
    } finally {
      setLoading(false);
    }
  }

  async function uploadFor(slot: typeof SLOTS[number], file: File) {
    setError("");
    setUploadingKey(slot.key);
    try {
      const signRes = await fetch("/api/proxy/admin/media/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: slot.category,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        }),
      });
      if (!signRes.ok) throw new Error(`Upload init failed (${signRes.status})`);
      const signed = await signRes.json();

      const putRes = await fetch(signed.uploadUrl, {
        method: signed.method || "PUT",
        headers: signed.headers || {},
        body: file,
      });
      if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);

      const completeRes = await fetch("/api/proxy/admin/media/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectKey: signed.objectKey,
          category: slot.category,
          title: slot.title,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        }),
      });
      if (!completeRes.ok) throw new Error(`Finalize failed (${completeRes.status})`);
      await load();
      await revalidateStorefrontBranding();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingKey(null);
    }
  }

  function onFileChange(slot: typeof SLOTS[number]) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void uploadFor(slot, file);
      e.target.value = "";
    };
  }

  async function saveThemePayload(nextTheme: BrandingTheme) {
    setThemeSaving(true);
    setThemeSaved(false);
    try {
      const res = await fetch("/api/proxy/admin/branding/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextTheme),
      });
      if (res.ok) {
        setThemeSaved(true);
        await load();
        const revalidated = await revalidateStorefrontBranding();
        if (!revalidated) {
          setError("Branding was saved, but the storefront refresh could not run. The public site will retry within one minute.");
        }
      }
    } finally {
      setThemeSaving(false);
    }
  }

  async function saveTheme() {
    await saveThemePayload(theme);
  }

  async function uploadHomepageImage(slot: typeof HOMEPAGE_IMAGE_SLOTS[number], file: File) {
    setError("");
    setThemeSaving(false);
    try {
      const signRes = await fetch("/api/proxy/admin/media/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "UI_ASSET",
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        }),
      });
      if (!signRes.ok) throw new Error(`Upload init failed (${signRes.status})`);
      const signed = await signRes.json();

      const putRes = await fetch(signed.uploadUrl, {
        method: signed.method || "PUT",
        headers: signed.headers || {},
        body: file,
      });
      if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);

      const completeRes = await fetch("/api/proxy/admin/media/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectKey: signed.objectKey,
          category: "UI_ASSET",
          title: slot.title,
          description: slot.description,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          key: slot.mediaKey,
        }),
      });
      if (!completeRes.ok) throw new Error(`Finalize failed (${completeRes.status})`);
      const asset = await completeRes.json();
      const publicUrl = typeof asset.publicUrl === "string" ? asset.publicUrl : "";
      const nextTheme = {
        ...theme,
        [slot.urlKey]: publicUrl,
        [slot.altKey]: theme[slot.altKey] || slot.defaultAlt,
      };
      setTheme(nextTheme);
      await saveThemePayload(nextTheme);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  function onHomepageImageChange(slot: typeof HOMEPAGE_IMAGE_SLOTS[number]) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void uploadHomepageImage(slot, file);
      e.target.value = "";
    };
  }

  function updateCategoryTile(key: string, patch: Partial<HomeCategoryTile>) {
    setTheme((current) => ({
      ...current,
      homeCategoryTiles: current.homeCategoryTiles.map((tile) => tile.key === key ? { ...tile, ...patch } : tile),
    }));
  }

  async function uploadCategoryTileImage(tile: HomeCategoryTile, file: File) {
    setError("");
    try {
      const signRes = await fetch("/api/proxy/admin/media/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "UI_ASSET", filename: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size }),
      });
      if (!signRes.ok) throw new Error(`Upload init failed (${signRes.status})`);
      const signed = await signRes.json();
      const putRes = await fetch(signed.uploadUrl, { method: signed.method || "PUT", headers: signed.headers || {}, body: file });
      if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);
      const completeRes = await fetch("/api/proxy/admin/media/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectKey: signed.objectKey,
          category: "UI_ASSET",
          title: `Homepage category: ${tile.productName}`,
          description: `Product cutout for the ${tile.productName} homepage category tile`,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          key: `home-category-${tile.key}`,
        }),
      });
      if (!completeRes.ok) throw new Error(`Finalize failed (${completeRes.status})`);
      const asset = await completeRes.json();
      const nextTheme = {
        ...theme,
        homeCategoryTiles: theme.homeCategoryTiles.map((item) => item.key === tile.key ? { ...item, imageUrl: asset.publicUrl || "" } : item),
      };
      setTheme(nextTheme);
      await saveThemePayload(nextTheme);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function uploadLoginDecoration(slot: typeof LOGIN_DECORATION_SLOTS[number], file: File) {
    setError("");
    setThemeSaving(false);
    try {
      const signRes = await fetch("/api/proxy/admin/media/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "UI_ASSET",
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        }),
      });
      if (!signRes.ok) throw new Error(`Upload init failed (${signRes.status})`);
      const signed = await signRes.json();

      const putRes = await fetch(signed.uploadUrl, {
        method: signed.method || "PUT",
        headers: signed.headers || {},
        body: file,
      });
      if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);

      const completeRes = await fetch("/api/proxy/admin/media/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectKey: signed.objectKey,
          category: "UI_ASSET",
          title: slot.title,
          description: slot.description,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          key: slot.mediaKey,
        }),
      });
      if (!completeRes.ok) throw new Error(`Finalize failed (${completeRes.status})`);
      const asset = await completeRes.json();
      const publicUrl = typeof asset.publicUrl === "string" ? asset.publicUrl : "";
      const nextTheme = {
        ...theme,
        [slot.themeUrlKey]: publicUrl,
      };
      setTheme(nextTheme);
      await saveThemePayload(nextTheme);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  function onLoginDecorationChange(slot: typeof LOGIN_DECORATION_SLOTS[number]) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void uploadLoginDecoration(slot, file);
      e.target.value = "";
    };
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-ink">Branding</h1>
          <p className="text-brand-muted mt-1">
            Upload the logos shown on the storefront, dashboard sidebar, and dashboard login form. Replacing a logo
            instantly updates every surface.
          </p>
        </div>

        {error && <p className="text-sm text-semantic-dangerText">{error}</p>}

        {loading ? (
          <Skeleton className="h-64" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SLOTS.map((slot) => {
              const url = (branding?.[slot.key] as string | null) ?? null;
              const isUploading = uploadingKey === slot.key;
              return (
                <Card key={slot.key}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-brand-ink">{slot.title}</h3>
                      <p className="text-sm text-brand-muted">{slot.description}</p>
                    </div>
                  </div>
                  <div
                    className={`${slot.aspect} bg-brand-bg rounded-xl flex items-center justify-center overflow-hidden mb-3`}
                  >
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={slot.title} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <ImageIcon className="text-brand-muted" size={36} />
                    )}
                  </div>
                  <label className="block">
                    <input type="file" className="hidden" onChange={onFileChange(slot)} disabled={isUploading} />
                    <span className={uploadButtonClassName}>
                      <Upload size={16} />
                      {isUploading ? "Uploading…" : url ? "Replace" : "Upload"}
                    </span>
                  </label>
                </Card>
              );
            })}
          </div>
        )}

        <Card>
          <h2 className="text-xl font-semibold text-brand-ink mb-1">Brand identity</h2>
          <p className="text-sm text-brand-muted mb-4">
            Display name, tagline, and primary colors. Read by the storefront on every page load.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-brand-ink">Store name</label>
              <input
                type="text"
                value={theme.storeName}
                onChange={(e) => setTheme({ ...theme, storeName: e.target.value })}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-brand-ink">Tagline</label>
              <input
                type="text"
                value={theme.storeTagline}
                onChange={(e) => setTheme({ ...theme, storeTagline: e.target.value })}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-brand-ink">Primary color</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={theme.primaryColor}
                  onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                  className="h-10 w-12 rounded-[12px] border border-surface-borderSoft shadow-xs"
                />
                <input
                  type="text"
                  value={theme.primaryColor}
                  onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                  className="flex-1 rounded-[14px] border border-surface-borderSoft bg-white px-3 py-2 text-sm text-brand-text shadow-xs focus:outline-none focus:ring-4 focus:ring-brand-blue/20 focus:border-brand-blue"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-brand-ink">Accent (peach) color</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={theme.peachColor}
                  onChange={(e) => setTheme({ ...theme, peachColor: e.target.value })}
                  className="h-10 w-12 rounded-[12px] border border-surface-borderSoft shadow-xs"
                />
                <input
                  type="text"
                  value={theme.peachColor}
                  onChange={(e) => setTheme({ ...theme, peachColor: e.target.value })}
                  className="flex-1 rounded-[14px] border border-surface-borderSoft bg-white px-3 py-2 text-sm text-brand-text shadow-xs focus:outline-none focus:ring-4 focus:ring-brand-blue/20 focus:border-brand-blue"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Button variant="primaryBlue" onClick={saveTheme} disabled={themeSaving}>
              {themeSaving ? "Saving…" : "Save brand identity"}
            </Button>
            {themeSaved && <span className="text-sm text-semantic-successText">Saved.</span>}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-brand-ink mb-1">Login page decorations</h2>
          <p className="text-sm text-brand-muted mb-4">
            Upload the Figma decorative shapes shown around the dashboard login and register forms. Each asset uses a
            stable media key and is stored in the branding theme for fast loading.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {LOGIN_DECORATION_SLOTS.map((slot) => {
              const url = theme[slot.themeUrlKey];
              return (
                <div
                  key={slot.themeUrlKey}
                  className="rounded-2xl border border-surface-borderSoft bg-white/95 p-4 shadow-soft"
                >
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-brand-ink">{slot.title}</h3>
                    <p className="text-xs text-brand-muted mt-1">{slot.description}</p>
                    <p className="text-[11px] text-brand-subtle mt-1 font-mono">{slot.mediaKey}</p>
                  </div>
                  <div className="aspect-square bg-brand-bg rounded-xl flex items-center justify-center overflow-hidden mb-3">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <ImageIcon className="text-brand-muted" size={28} />
                    )}
                  </div>
                  <label className="text-xs font-medium text-brand-ink">Image URL</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setTheme({ ...theme, [slot.themeUrlKey]: e.target.value })}
                    placeholder="Upload or paste URL"
                    className={`${inputClassName} mb-3 text-xs`}
                  />
                  <label className="block">
                    <input type="file" accept="image/*" className="hidden" onChange={onLoginDecorationChange(slot)} />
                    <span className={uploadButtonClassName}>
                      <Upload size={16} />
                      {url ? "Replace" : "Upload"}
                    </span>
                  </label>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Button variant="primaryBlue" onClick={saveTheme} disabled={themeSaving}>
              {themeSaving ? "Saving…" : "Save login decorations"}
            </Button>
            {themeSaved && <span className="text-sm text-semantic-successText">Saved.</span>}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-brand-ink mb-1">Homepage category mosaic</h2>
          <p className="text-sm text-brand-muted mb-4">
            Manage the six product cutouts shown in Browse by category. Uploads are saved in Media Library as reusable UI assets.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {theme.homeCategoryTiles.map((tile) => (
              <div key={tile.key} className={`rounded-2xl p-4 ${tile.variant === "blue" ? "bg-brand-blue" : "bg-brand-peach"}`}>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider">{tile.category}</p>
                    <h3 className="text-xl font-bold text-brand-ink">{tile.productName}</h3>
                  </div>
                  <span className="rounded-pill bg-white/70 px-2 py-1 text-xs font-medium text-brand-ink">{tile.size === "wide" ? "Wide" : "Standard"}</span>
                </div>
                <div className="mb-3 flex aspect-[16/9] items-center justify-center overflow-hidden rounded-xl bg-white/30">
                  {tile.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={tile.imageUrl} alt={tile.altText} className="h-full w-full object-contain" />
                  ) : (
                    <ImageIcon className="text-brand-ink/40" size={34} />
                  )}
                </div>
                <label className="text-xs font-medium text-brand-ink">Alt text</label>
                <input value={tile.altText} onChange={(event) => updateCategoryTile(tile.key, { altText: event.target.value })} className={`${inputClassName} mb-3`} />
                <label className="block">
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadCategoryTileImage(tile, file);
                    event.target.value = "";
                  }} />
                  <span className={uploadButtonClassName}><Upload size={16} />{tile.imageUrl ? "Replace product image" : "Upload product image"}</span>
                </label>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button variant="primaryBlue" onClick={saveTheme} disabled={themeSaving}>{themeSaving ? "Saving…" : "Save category mosaic"}</Button>
            {themeSaved && <span className="text-sm text-semantic-successText">Saved.</span>}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-brand-ink mb-1">Homepage Figma artwork</h2>
          <p className="text-sm text-brand-muted mb-4">
            Upload the exported Figma pictures used by the production homepage. These are stored as UI assets and
            rendered from stable public media URLs.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {HOMEPAGE_IMAGE_SLOTS.map((slot) => {
              const url = theme[slot.urlKey];
              return (
                <div key={slot.urlKey} className="rounded-2xl border border-surface-borderSoft bg-white/95 p-4 shadow-soft">
                  <div className="mb-3">
                    <h3 className="text-base font-semibold text-brand-ink">{slot.title}</h3>
                    <p className="text-sm text-brand-muted">{slot.description}</p>
                  </div>
                  <div className={`${slot.aspect} bg-brand-bg rounded-xl flex items-center justify-center overflow-hidden mb-3`}>
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={theme[slot.altKey]} className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="text-brand-muted" size={36} />
                    )}
                  </div>
                  <label className="text-sm font-medium text-brand-ink">Image URL</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setTheme({ ...theme, [slot.urlKey]: e.target.value })}
                    placeholder="Upload an image or paste a public media URL"
                    className={`${inputClassName} mb-3`}
                  />
                  <label className="text-sm font-medium text-brand-ink">Alt text</label>
                  <input
                    type="text"
                    value={theme[slot.altKey]}
                    onChange={(e) => setTheme({ ...theme, [slot.altKey]: e.target.value })}
                    className={`${inputClassName} mb-3`}
                  />
                  <label className="block">
                    <input type="file" accept="image/*" className="hidden" onChange={onHomepageImageChange(slot)} />
                    <span className={uploadButtonClassName}>
                      <Upload size={16} />
                      {url ? "Replace Figma export" : "Upload Figma export"}
                    </span>
                  </label>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Button variant="primaryBlue" onClick={saveTheme} disabled={themeSaving}>
              {themeSaving ? "Saving…" : "Save homepage artwork"}
            </Button>
            {themeSaved && <span className="text-sm text-semantic-successText">Saved.</span>}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
