"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { Button, Card, Skeleton } from "@rashpod/ui";
import { Upload, Image as ImageIcon } from "lucide-react";
import DashboardLayout from "../../dashboard-layout";

type SlotKey = "storefrontLogoUrl" | "dashboardLogoUrl" | "loginLogoUrl" | "faviconUrl";

interface Branding {
  storefrontLogoUrl: string | null;
  dashboardLogoUrl: string | null;
  loginLogoUrl: string | null;
  faviconUrl: string | null;
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
    key: "faviconUrl",
    category: "BRANDING_FAVICON",
    title: "Favicon",
    description: "Browser tab icon. Recommended: 32×32px or 64×64px PNG.",
    aspect: "aspect-square",
  },
];

export default function BrandingPage() {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingKey, setUploadingKey] = useState<SlotKey | null>(null);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState({
    primaryColor: "#788AE0",
    peachColor: "#F39E7C",
    storeName: "RashPOD",
    storeTagline: "Print-on-demand by Uzbek creators",
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
        setTheme((prev) => ({ ...prev, ...(data.theme as Record<string, string>) }));
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

  async function saveTheme() {
    setThemeSaving(true);
    setThemeSaved(false);
    try {
      const res = await fetch("/api/proxy/admin/branding/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(theme),
      });
      if (res.ok) {
        setThemeSaved(true);
        await load();
      }
    } finally {
      setThemeSaving(false);
    }
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

        {error && <p className="text-sm text-red-600">{error}</p>}

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
                    <span className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-blue px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-blue/90 cursor-pointer">
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
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-brand-ink">Tagline</label>
              <input
                type="text"
                value={theme.storeTagline}
                onChange={(e) => setTheme({ ...theme, storeTagline: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-brand-ink">Primary color</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={theme.primaryColor}
                  onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                  className="h-10 w-12 rounded border border-gray-200"
                />
                <input
                  type="text"
                  value={theme.primaryColor}
                  onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                  className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
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
                  className="h-10 w-12 rounded border border-gray-200"
                />
                <input
                  type="text"
                  value={theme.peachColor}
                  onChange={(e) => setTheme({ ...theme, peachColor: e.target.value })}
                  className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Button variant="primaryBlue" onClick={saveTheme} disabled={themeSaving}>
              {themeSaving ? "Saving…" : "Save brand identity"}
            </Button>
            {themeSaved && <span className="text-sm text-green-600">Saved.</span>}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
