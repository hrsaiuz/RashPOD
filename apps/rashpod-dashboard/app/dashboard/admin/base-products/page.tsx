"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState, ErrorState, Skeleton, StatusBadge } from "@rashpod/ui";
import { Boxes, Plus, Trash2, Upload, X } from "lucide-react";
import DashboardLayout from "../../dashboard-layout";

interface ProductType {
  id: string;
  name: string;
  isActive: boolean;
}

interface BaseProduct {
  id: string;
  name: string;
  skuPrefix: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  availableColors: string[];
  availableSizes: string[];
  productTypeId: string;
  productType?: { id: string; name: string };
}

export default function AdminBaseProductsPage() {
  const [items, setItems] = useState<BaseProduct[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    productTypeId: "",
    name: "",
    skuPrefix: "",
    description: "",
    imageUrl: "",
    availableColors: "",
    availableSizes: "",
  });

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [bpRes, ptRes] = await Promise.all([
        fetch("/api/proxy/admin/base-products"),
        fetch("/api/proxy/admin/product-types"),
      ]);
      if (!bpRes.ok) throw new Error(`Failed to load base products (${bpRes.status})`);
      const bp = (await bpRes.json()) as BaseProduct[];
      const pt = ptRes.ok ? ((await ptRes.json()) as ProductType[]) : [];
      setItems(Array.isArray(bp) ? bp : []);
      setProductTypes(Array.isArray(pt) ? pt.filter((p) => p.isActive) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({
      productTypeId: productTypes[0]?.id ?? "",
      name: "",
      skuPrefix: "",
      description: "",
      imageUrl: "",
      availableColors: "",
      availableSizes: "",
    });
  }

  function openForm() {
    resetForm();
    setShowForm(true);
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const signRes = await fetch("/api/proxy/admin/media/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "BASE_PRODUCT_IMAGE",
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
          category: "BASE_PRODUCT_IMAGE",
          title: form.name || file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        }),
      });
      if (!completeRes.ok) throw new Error(`Finalize failed (${completeRes.status})`);
      const asset = await completeRes.json();
      if (asset.publicUrl) setForm((f) => ({ ...f, imageUrl: asset.publicUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.productTypeId || !form.name || !form.skuPrefix) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        productTypeId: form.productTypeId,
        name: form.name,
        skuPrefix: form.skuPrefix,
        description: form.description || undefined,
        imageUrl: form.imageUrl || undefined,
        availableColors: form.availableColors
          ? form.availableColors.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        availableSizes: form.availableSizes
          ? form.availableSizes.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
      };
      const res = await fetch("/api/proxy/admin/base-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Failed to create (${res.status})`);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: BaseProduct) {
    await fetch(`/api/proxy/admin/base-products/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this base product?")) return;
    await fetch(`/api/proxy/admin/base-products/${id}`, { method: "DELETE" });
    await load();
  }

  const grouped = useMemo(() => {
    const map = new Map<string, BaseProduct[]>();
    for (const it of items) {
      const k = it.productType?.name ?? "Unassigned";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    return Array.from(map.entries());
  }, [items]);

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-brand-ink">Base Products</h1>
            <p className="text-brand-muted mt-1">
              Raw products (t-shirts, hoodies, mugs, posters) used as the foundation for mockup generation. Upload a
              clean product photo so designers can preview their work.
            </p>
          </div>
          <Button variant="primaryBlue" onClick={openForm}>
            <Plus size={16} className="mr-1" /> New base product
          </Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading ? (
          <Skeleton className="h-64" />
        ) : items.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Boxes className="text-brand-peach" size={32} />}
              title="No base products yet"
              description="Add your first base product. You'll need at least one per product type before designers can run the mockup studio."
              action={
                <Button variant="primaryBlue" onClick={openForm}>
                  <Plus size={16} className="mr-1" /> Add base product
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="space-y-6">
            {grouped.map(([typeName, list]) => (
              <div key={typeName}>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-muted mb-3">{typeName}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {list.map((p) => (
                    <Card key={p.id} className="!p-0 overflow-hidden">
                      <div className="aspect-square bg-brand-bg flex items-center justify-center overflow-hidden">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain" />
                        ) : (
                          <Boxes className="text-brand-muted" size={48} />
                        )}
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-brand-ink truncate">{p.name}</p>
                            <p className="text-xs text-brand-muted">SKU: {p.skuPrefix}</p>
                          </div>
                          <StatusBadge status={p.isActive ? "ACTIVE" : "INACTIVE"} />
                        </div>
                        {p.description && (
                          <p className="text-xs text-brand-muted line-clamp-2">{p.description}</p>
                        )}
                        <div className="text-xs text-brand-muted">
                          {p.availableColors.length} colors · {p.availableSizes.length} sizes
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" variant="secondary" onClick={() => toggleActive(p)}>
                            {p.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-brand-ink">New base product</h2>
              <button onClick={() => setShowForm(false)} aria-label="Close">
                <X size={20} className="text-brand-muted" />
              </button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-brand-ink">Product type *</label>
                <select
                  required
                  value={form.productTypeId}
                  onChange={(e) => setForm({ ...form, productTypeId: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                >
                  <option value="">Select a product type…</option>
                  {productTypes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-brand-ink">Name *</label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Classic Unisex Tee"
                    className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-brand-ink">SKU prefix *</label>
                  <input
                    required
                    type="text"
                    value={form.skuPrefix}
                    onChange={(e) => setForm({ ...form, skuPrefix: e.target.value.toUpperCase() })}
                    placeholder="TEE-UNI"
                    className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-brand-ink">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="180g cotton, ringspun, unisex fit."
                  className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-brand-ink">Colors (comma separated)</label>
                  <input
                    type="text"
                    value={form.availableColors}
                    onChange={(e) => setForm({ ...form, availableColors: e.target.value })}
                    placeholder="white, black, navy"
                    className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-brand-ink">Sizes (comma separated)</label>
                  <input
                    type="text"
                    value={form.availableSizes}
                    onChange={(e) => setForm({ ...form, availableSizes: e.target.value })}
                    placeholder="S, M, L, XL"
                    className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-brand-ink">Product photo</label>
                <div className="mt-1 flex items-center gap-3">
                  {form.imageUrl ? (
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-brand-bg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.imageUrl} alt="" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-brand-bg flex items-center justify-center">
                      <Boxes className="text-brand-muted" size={24} />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadImage(f);
                        e.target.value = "";
                      }}
                      disabled={uploading}
                    />
                    <span className="inline-flex items-center gap-2 rounded-full bg-brand-blue px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-blue/90">
                      <Upload size={14} />
                      {uploading ? "Uploading…" : form.imageUrl ? "Replace image" : "Upload image"}
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setShowForm(false)} type="button">
                  Cancel
                </Button>
                <Button variant="primaryBlue" type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Create base product"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
