"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState, Skeleton, StatusBadge } from "@rashpod/ui";
import { Images, Upload, Trash2, Filter } from "lucide-react";
import DashboardLayout from "../../dashboard-layout";

type MediaCategory =
  | "UI_ASSET"
  | "BRANDING_LOGO_WEB"
  | "BRANDING_LOGO_DASHBOARD"
  | "BRANDING_LOGO_LOGIN"
  | "BRANDING_FAVICON"
  | "BASE_PRODUCT_IMAGE"
  | "MOCKUP_TEMPLATE";

interface MediaAsset {
  id: string;
  key: string;
  category: MediaCategory;
  title: string;
  description?: string | null;
  publicUrl?: string | null;
  mimeType: string;
  sizeBytes: number;
  isActive: boolean;
  createdAt: string;
}

const CATEGORIES: { value: MediaCategory | "ALL"; label: string }[] = [
  { value: "ALL", label: "All assets" },
  { value: "UI_ASSET", label: "UI assets" },
  { value: "BASE_PRODUCT_IMAGE", label: "Base product images" },
  { value: "MOCKUP_TEMPLATE", label: "Mockup templates" },
  { value: "BRANDING_LOGO_WEB", label: "Storefront logo" },
  { value: "BRANDING_LOGO_DASHBOARD", label: "Dashboard logo" },
  { value: "BRANDING_LOGO_LOGIN", label: "Login logo" },
  { value: "BRANDING_FAVICON", label: "Favicon" },
];

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaLibraryPage() {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MediaCategory | "ALL">("ALL");
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<MediaCategory>("UI_ASSET");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/proxy/admin/media");
      const data = res.ok ? await res.json() : [];
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(
    () => (filter === "ALL" ? items : items.filter((i) => i.category === filter)),
    [items, filter],
  );

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const title = uploadTitle.trim() || file.name.replace(/\.[^.]+$/, "");
      const signRes = await fetch("/api/proxy/admin/media/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: uploadCategory,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        }),
      });
      if (!signRes.ok) throw new Error(`Failed to get upload URL (${signRes.status})`);
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
          category: uploadCategory,
          title,
          description: uploadDescription || undefined,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        }),
      });
      if (!completeRes.ok) throw new Error(`Failed to register asset (${completeRes.status})`);

      setUploadTitle("");
      setUploadDescription("");
      e.target.value = "";
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this asset? Files used in branding/UI will disappear immediately.")) return;
    const res = await fetch(`/api/proxy/admin/media/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-brand-ink">Media Library</h1>
            <p className="text-brand-muted mt-1">
              Upload UI assets, base product photos, and mockup templates used across storefront and dashboard.
            </p>
          </div>
        </div>

        <Card>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-1">
              <label className="text-sm font-medium text-brand-ink">Category</label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value as MediaCategory)}
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                {CATEGORIES.filter((c) => c.value !== "ALL").map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-1">
              <label className="text-sm font-medium text-brand-ink">Title</label>
              <input
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Hero illustration"
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>
            <div className="lg:col-span-1">
              <label className="text-sm font-medium text-brand-ink">Description</label>
              <input
                type="text"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Optional"
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>
            <div className="lg:col-span-1 flex items-end">
              <label className="w-full">
                <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
                <span className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-blue px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-blue/90 cursor-pointer">
                  <Upload size={16} />
                  {uploading ? "Uploading…" : "Upload file"}
                </span>
              </label>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </Card>

        <div className="flex items-center gap-2">
          <Filter className="text-brand-muted" size={16} />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as MediaCategory | "ALL")}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <span className="text-sm text-brand-muted">{filtered.length} assets</span>
        </div>

        {loading ? (
          <Skeleton className="h-48" />
        ) : filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Images className="text-brand-peach" size={32} />}
              title="No assets uploaded yet"
              description="Use the form above to upload UI assets, logos, or base product photos."
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((a) => (
              <Card key={a.id} className="!p-0 overflow-hidden">
                <div className="aspect-square bg-brand-bg flex items-center justify-center overflow-hidden">
                  {a.publicUrl && a.mimeType.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.publicUrl} alt={a.title} className="w-full h-full object-contain" />
                  ) : (
                    <Images className="text-brand-muted" size={48} />
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-brand-ink truncate" title={a.title}>
                        {a.title}
                      </p>
                      <p className="text-xs text-brand-muted truncate">{a.key}</p>
                    </div>
                    <StatusBadge status={a.isActive ? "ACTIVE" : "INACTIVE"} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-brand-muted">
                    <span>{a.category.replace(/_/g, " ").toLowerCase()}</span>
                    <span>{formatBytes(a.sizeBytes)}</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    {a.publicUrl && (
                      <Button size="sm" variant="secondary" onClick={() => copyUrl(a.publicUrl!)}>
                        Copy URL
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(a.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
