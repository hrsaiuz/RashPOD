"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState, ErrorState, Skeleton, StatusBadge } from "@rashpod/ui";
import { Boxes, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import DashboardLayout from "../../dashboard-layout";
import { api, resolveUploadMimeType, uploadToSignedUrl } from "../../../../lib/api";
import { useDashboardFeedback } from "../../../../components/feedback/use-dashboard-feedback";

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

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeBaseProduct(item: BaseProduct): BaseProduct {
  return {
    ...item,
    availableColors: normalizeStringArray(item.availableColors),
    availableSizes: normalizeStringArray(item.availableSizes),
  };
}

export default function AdminBaseProductsPage() {
  const [items, setItems] = useState<BaseProduct[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [actionError, setActionError] = useState("");
  const [formError, setFormError] = useState("");
  const [productTypesWarning, setProductTypesWarning] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const feedback = useDashboardFeedback();

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
    setPageError("");
    setProductTypesWarning("");
    const results = await Promise.allSettled([
      api.get<BaseProduct[]>("/admin/base-products"),
      api.get<ProductType[]>("/admin/product-types"),
    ]);
    const [bpResult, ptResult] = results;

    if (bpResult.status === "fulfilled") {
      setItems(Array.isArray(bpResult.value) ? bpResult.value.map(normalizeBaseProduct) : []);
    } else {
      setItems([]);
      setPageError(bpResult.reason instanceof Error ? bpResult.reason.message : "Failed to load base products");
    }

    if (ptResult.status === "fulfilled") {
      setProductTypes(Array.isArray(ptResult.value) ? ptResult.value : []);
    } else {
      setProductTypes([]);
      setProductTypesWarning(
        ptResult.reason instanceof Error ? ptResult.reason.message : "Product types could not be loaded — create form may be limited",
      );
    }
    setLoading(false);
  }

  function resetForm() {
    setForm({
      productTypeId: productTypes.find((item) => item.isActive)?.id ?? "",
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
    setEditingId(null);
    setFormError("");
    setShowForm(true);
  }

  function openEdit(item: BaseProduct) {
    setEditingId(item.id);
    setFormError("");
    setForm({
      productTypeId: item.productTypeId,
      name: item.name,
      skuPrefix: item.skuPrefix,
      description: item.description ?? "",
      imageUrl: item.imageUrl ?? "",
      availableColors: item.availableColors.join(", "),
      availableSizes: item.availableSizes.join(", "),
    });
    setShowForm(true);
  }

  function dismissForm() {
    setShowForm(false);
    setEditingId(null);
    setFormError("");
  }

  function closeForm() {
    if (saving || uploading) return;
    dismissForm();
  }

  async function uploadImage(file: File) {
    setUploading(true);
    setFormError("");
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
      await uploadToSignedUrl(signed.uploadUrl, file, resolveUploadMimeType(file), signed.headers);
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
      if (!asset.publicUrl) throw new Error("Upload completed without an image URL");
      setForm((f) => ({ ...f, imageUrl: asset.publicUrl }));
    } catch (cause) {
      setFormError(feedback.error(cause, {
        title: "Could not upload product photo",
        fallback: "The image could not be uploaded. Check the file and try again.",
      }));
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.productTypeId || !form.name || !form.skuPrefix) return;
    setSaving(true);
    setFormError("");
    try {
      const editing = editingId !== null;
      const colors = form.availableColors.split(",").map((value) => value.trim()).filter(Boolean);
      const sizes = form.availableSizes.split(",").map((value) => value.trim()).filter(Boolean);
      const payload = {
        productTypeId: form.productTypeId,
        name: form.name.trim(),
        skuPrefix: form.skuPrefix.trim(),
        description: form.description.trim() || (editing ? null : undefined),
        imageUrl: form.imageUrl.trim() || (editing ? null : undefined),
        availableColors: colors.length || editing ? colors : undefined,
        availableSizes: sizes.length || editing ? sizes : undefined,
      };
      if (editingId) {
        await api.patch(`/admin/base-products/${editingId}`, payload);
        feedback.success({ title: "Base product updated", description: `${form.name} was saved.` });
      } else {
        await api.post("/admin/base-products", payload);
        feedback.success({ title: "Base product created", description: `${form.name} is ready for configuration.` });
      }
      dismissForm();
      await load();
    } catch (cause) {
      setFormError(feedback.error(cause, {
        title: editingId ? "Could not update base product" : "Could not create base product",
        fallback: "The base product could not be saved.",
      }));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: BaseProduct) {
    setActionError("");
    try {
      await api.patch(`/admin/base-products/${item.id}`, { isActive: !item.isActive });
      await load();
    } catch (cause) {
      setActionError(feedback.error(cause, {
        title: "Could not update base product",
        fallback: "The base product status could not be changed.",
      }));
    }
  }

  async function remove(item: BaseProduct) {
    if (!confirm(`Delete base product ${item.name}? Its unused mockup templates and print areas will also be deleted.`)) return;
    setDeletingId(item.id);
    setActionError("");
    try {
      await api.delete(`/admin/base-products/${item.id}`);
      feedback.success({
        title: "Base product deleted",
        description: `${item.name} and its unused mockup configuration were removed.`,
      });
      await load();
    } catch (cause) {
      setActionError(feedback.error(cause, {
        title: "Could not delete base product",
        fallback: "The base product could not be deleted.",
      }));
    } finally {
      setDeletingId(null);
    }
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

        {pageError && (
          <ErrorState
            title="Could not load base products"
            description={pageError}
            retry={<Button variant="primaryBlue" onClick={load}>Retry</Button>}
          />
        )}

        {actionError ? (
          <div role="alert" className="rounded-xl border border-semantic-danger/30 bg-semantic-danger/10 px-4 py-3 text-sm text-brand-ink">
            {actionError}
          </div>
        ) : null}

        {productTypesWarning ? (
          <div className="rounded-xl border border-semantic-warningBg bg-semantic-warningBg px-4 py-3 text-sm text-brand-ink">
            {productTypesWarning}
          </div>
        ) : null}

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
                          <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>
                            <Pencil size={14} /> Edit
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => toggleActive(p)}>
                            {p.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="min-h-11 min-w-11 px-0"
                            onClick={() => remove(p)}
                            loading={deletingId === p.id}
                            disabled={deletingId !== null}
                            aria-label={`Delete ${p.name}`}
                          >
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
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="base-product-form-title"
            className="bg-white rounded-[24px] shadow-card max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-surface-borderSoft flex items-center justify-between">
              <h2 id="base-product-form-title" className="text-xl font-semibold text-brand-ink">
                {editingId ? "Edit base product" : "New base product"}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                disabled={saving || uploading}
                aria-label="Close base product form"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-surface-borderSoft focus:outline-none focus:ring-4 focus:ring-brand-blue/20 disabled:pointer-events-none disabled:opacity-50"
              >
                <X size={20} className="text-brand-muted" />
              </button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              {formError ? (
                <div role="alert" className="rounded-xl border border-semantic-danger/30 bg-semantic-danger/10 px-4 py-3 text-sm text-brand-ink">
                  {formError}
                </div>
              ) : null}
              <div>
                <label htmlFor="base-product-type" className="text-sm font-medium text-brand-ink">Product type *</label>
                <select
                  id="base-product-type"
                  required
                  value={form.productTypeId}
                  onChange={(e) => setForm({ ...form, productTypeId: e.target.value })}
                  className="mt-1 w-full rounded-input border border-surface-borderSoft px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                >
                  <option value="">Select a product type…</option>
                  {productTypes.filter((p) => p.isActive || p.id === form.productTypeId).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.isActive ? "" : " (inactive)"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="base-product-name" className="text-sm font-medium text-brand-ink">Name *</label>
                  <input
                    id="base-product-name"
                    required
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Classic Unisex Tee"
                    className="mt-1 w-full rounded-input border border-surface-borderSoft px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                </div>
                <div>
                  <label htmlFor="base-product-sku" className="text-sm font-medium text-brand-ink">SKU prefix *</label>
                  <input
                    id="base-product-sku"
                    required
                    type="text"
                    value={form.skuPrefix}
                    onChange={(e) => setForm({ ...form, skuPrefix: e.target.value.toUpperCase() })}
                    placeholder="TEE-UNI"
                    className="mt-1 w-full rounded-input border border-surface-borderSoft px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="base-product-description" className="text-sm font-medium text-brand-ink">Description</label>
                <textarea
                  id="base-product-description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="180g cotton, ringspun, unisex fit."
                  className="mt-1 w-full rounded-input border border-surface-borderSoft px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="base-product-colors" className="text-sm font-medium text-brand-ink">Colors (comma separated)</label>
                  <input
                    id="base-product-colors"
                    type="text"
                    value={form.availableColors}
                    onChange={(e) => setForm({ ...form, availableColors: e.target.value })}
                    placeholder="white, black, navy"
                    className="mt-1 w-full rounded-input border border-surface-borderSoft px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                </div>
                <div>
                  <label htmlFor="base-product-sizes" className="text-sm font-medium text-brand-ink">Sizes (comma separated)</label>
                  <input
                    id="base-product-sizes"
                    type="text"
                    value={form.availableSizes}
                    onChange={(e) => setForm({ ...form, availableSizes: e.target.value })}
                    placeholder="S, M, L, XL"
                    className="mt-1 w-full rounded-input border border-surface-borderSoft px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-brand-ink">Product photo</span>
                <div className="mt-1 flex flex-wrap items-center gap-3">
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
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      id="base-product-image-upload"
                      type="file"
                      accept="image/*"
                      className="peer sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadImage(f);
                        e.target.value = "";
                      }}
                      disabled={uploading}
                    />
                    <label
                      htmlFor="base-product-image-upload"
                      className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-brand-blue px-4 py-2 text-sm font-medium text-brand-ink shadow-soft transition-colors hover:bg-brand-blueSecondary peer-focus-visible:ring-4 peer-focus-visible:ring-brand-blue/20 peer-disabled:pointer-events-none peer-disabled:opacity-50"
                    >
                      <Upload size={14} />
                      {uploading ? "Uploading…" : form.imageUrl ? "Replace image" : "Upload image"}
                    </label>
                    {form.imageUrl ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={uploading || saving}
                        onClick={() => setForm((current) => ({ ...current, imageUrl: "" }))}
                      >
                        Remove image
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={closeForm} type="button" disabled={saving || uploading}>
                  Cancel
                </Button>
                <Button variant="primaryBlue" type="submit" loading={saving} disabled={uploading}>
                  {saving ? "Saving…" : editingId ? "Save changes" : "Create base product"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
