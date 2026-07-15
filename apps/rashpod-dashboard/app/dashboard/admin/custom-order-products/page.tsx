"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Card, MediaImage, Skeleton } from "@rashpod/ui";
import { ImagePlus, Save } from "lucide-react";
import DashboardLayout from "../../dashboard-layout";
import { revalidateStorefrontBranding } from "../../../../lib/revalidate-storefront";

type MediaAsset = { id: string; title: string; publicUrl?: string | null; mimeType: string; isActive: boolean };
type Product = { key: string; label: string; title: string; mediaAssetId: string | null; imageUrl?: string | null; altText: string };

export default function CustomOrderProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { void load(); }, []);
  async function load() {
    setLoading(true);
    const [configResponse, mediaResponse] = await Promise.all([fetch("/api/proxy/admin/branding/custom-order-products"), fetch("/api/proxy/admin/media?activeOnly=true")]);
    setProducts(configResponse.ok ? await configResponse.json() : []);
    setAssets(mediaResponse.ok ? await mediaResponse.json() : []);
    setLoading(false);
  }
  const imageAssets = useMemo(() => assets.filter((asset) => asset.isActive && ["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(asset.mimeType)), [assets]);
  function patch(key: string, values: Partial<Product>) { setProducts((current) => current.map((product) => product.key === key ? { ...product, ...values } : product)); }
  async function save() {
    setSaving(true); setMessage("");
    const response = await fetch("/api/proxy/admin/branding/custom-order-products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: products.map(({ key, mediaAssetId, altText }) => ({ key, mediaAssetId, altText })) }) });
    if (response.ok) { setProducts(await response.json()); setMessage("Custom Order images saved."); await revalidateStorefrontBranding(); }
    else setMessage("Images could not be saved. Check the selected media assets.");
    setSaving(false);
  }

  return <DashboardLayout role="admin"><div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-brand-peach">Storefront</p><h1 className="mt-1 text-3xl font-bold text-brand-ink">Custom Order cards</h1><p className="mt-1 text-sm text-brand-muted">Assign durable Media Library assets to the four public product-type cards.</p></div><Link href="/dashboard/admin/media-library" className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-brand-blue px-4 text-sm font-semibold text-brand-blue"><ImagePlus size={17} /> Open Media Library</Link></div>
    {loading ? <Skeleton className="h-96" /> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{products.map((product) => {
      const selected = imageAssets.find((asset) => asset.id === product.mediaAssetId);
      return <Card key={product.key} className="space-y-4"><MediaImage src={selected?.publicUrl ?? product.imageUrl} alt={product.altText} fallbackLabel={`${product.title} image not assigned`} containerClassName="aspect-square rounded-2xl bg-brand-ink" className="p-5 object-contain" /><div><p className="text-xs font-bold uppercase tracking-wide text-brand-muted">{product.label}</p><h2 className="text-xl font-bold capitalize text-brand-ink">{product.title}</h2></div><label className="block text-sm font-semibold text-brand-ink">Media asset<select value={product.mediaAssetId ?? ""} onChange={(event) => patch(product.key, { mediaAssetId: event.target.value || null, imageUrl: imageAssets.find((asset) => asset.id === event.target.value)?.publicUrl ?? null })} className="mt-2 h-11 w-full rounded-xl border border-surface-borderSoft bg-white px-3 text-sm"><option value="">No image</option>{imageAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.title}</option>)}</select></label><label className="block text-sm font-semibold text-brand-ink">Alt text<input value={product.altText} maxLength={160} onChange={(event) => patch(product.key, { altText: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-surface-borderSoft px-3 text-sm" /></label></Card>;
    })}</div>}
    <div className="flex flex-wrap items-center justify-end gap-4">{message ? <p role="status" className="text-sm text-brand-muted">{message}</p> : null}<Button onClick={save} loading={saving} disabled={loading || saving}><Save size={17} /> Save card images</Button></div>
  </div></DashboardLayout>;
}
