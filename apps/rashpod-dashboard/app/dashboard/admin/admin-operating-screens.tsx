"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState, ErrorState, Input, Select, Skeleton, StatusBadge, Textarea } from "@rashpod/ui";
import { Activity, BadgePercent, CreditCard, Eye, FileText, Layers, ListChecks, Pencil, Plus, ShieldCheck, SlidersHorizontal, Trash2, Upload, X } from "lucide-react";
import { suggestDefaultPrintAreaRects, type PrintAreaRect } from "@rashpod/mockup";
import DashboardLayout from "../dashboard-layout";
import { api } from "../../../lib/api";
import { PrintAreaVisualEditor } from "../../../components/mockup/PrintAreaVisualEditorDynamic";

type IdRow = { id: string };
type ProductType = IdRow & {
  name: string;
  slug: string;
  category: string;
  productionMethod: string;
  isActive: boolean;
  availableForDesigners: boolean;
  availableInShop: boolean;
  availableForCorporate: boolean;
  availableForMarketplace: boolean;
  requiresMockup: boolean;
  supportsFilmSale: boolean;
  baseCost?: string | number | null;
  defaultMargin?: string | number | null;
  createdAt?: string;
};
type BaseProduct = IdRow & { name: string; skuPrefix?: string; productTypeId: string };
type MockupTemplate = IdRow & {
  baseProductId: string;
  name: string;
  baseImageKey: string;
  lifestyleImageKey?: string | null;
  closeupImageKey?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
};
type PrintArea = IdRow & {
  mockupTemplateId: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  safeX: number;
  safeY: number;
  safeWidth: number;
  safeHeight: number;
  allowMove: boolean;
  allowResize: boolean;
  allowRotate: boolean;
  minScale: number;
  maxScale: number;
};
type RoyaltyRule = IdRow & { scope: string; basis: string; value: string | number; isActive: boolean; effectiveAt: string; createdAt?: string };
type FilmSaleSettings = {
  id?: string;
  enableFilmSalesGlobally: boolean;
  enableDTF: boolean;
  enableUvDtf: boolean;
  defaultRoyaltyBasis: string;
  defaultRoyaltyValue: string | number;
  minimumOrderPrice?: string | number | null;
  rushOrderFee?: string | number | null;
  revocationPolicy?: string | null;
  updatedAt?: string;
};
type PaymentSettings = {
  enabled: boolean;
  mode: "TEST" | "PRODUCTION";
  merchantId: string;
  serviceId: string;
  secretName: string;
  returnUrl: string;
  webhookPath: string;
  allowedUseCases: string[];
};
type AuditLog = IdRow & {
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: unknown;
  createdAt: string;
  actor?: { email?: string | null; displayName?: string | null; role?: string | null } | null;
};
type ListingRow = IdRow & {
  type: "PRODUCT" | "FILM";
  status: string;
  title: string;
  description?: string | null;
  slug: string;
  price: string | number;
  currency: string;
  updatedAt: string;
  publishedAt?: string | null;
  designer?: { email?: string; displayName?: string; handle?: string | null };
  designAsset?: { title?: string; status?: string };
};

type LoadState = "idle" | "loading" | "ready" | "error";

function errorMessage(error: unknown, fallback = "Request failed") {
  return error instanceof Error ? error.message : fallback;
}

function asNumber(value: string) {
  return value === "" ? undefined : Number(value);
}

function decimal(value: unknown) {
  if (value == null || value === "") return "";
  return String(value);
}

function isoDateInput(value?: string) {
  if (!value) return new Date().toISOString().slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function PageShell({ title, description, icon, action, children }: { title: string; description: string; icon: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-2xl bg-brand-blueLight/60 p-3 text-brand-blue">{icon}</div>
            <div>
              <h1 className="text-3xl font-bold text-brand-ink">{title}</h1>
              <p className="mt-1 max-w-3xl text-brand-muted">{description}</p>
            </div>
          </div>
          {action}
        </div>
        {children}
      </div>
    </DashboardLayout>
  );
}

function Field({ label, children, helper }: { label: string; children: ReactNode; helper?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-semibold text-brand-ink">{label}</span>
      {children}
      {helper ? <span className="block text-xs text-brand-muted">{helper}</span> : null}
    </label>
  );
}

function ToggleField({ label, checked, onChange, helper }: { label: string; checked: boolean; onChange: (value: boolean) => void; helper?: string }) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-surface-borderSoft bg-white p-3">
      <input className="mt-1 h-4 w-4 accent-brand-blue" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>
        <span className="block text-sm font-semibold text-brand-ink">{label}</span>
        {helper ? <span className="block text-xs text-brand-muted">{helper}</span> : null}
      </span>
    </label>
  );
}

function Drawer({ title, children, onClose, size = "default" }: { title: string; children: ReactNode; onClose: () => void; size?: "default" | "wide" }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 p-4">
      <div className={`flex h-full w-full flex-col overflow-hidden rounded-[24px] bg-white shadow-card ${size === "wide" ? "max-w-5xl" : "max-w-2xl"}`}>
        <div className="flex items-center justify-between border-b border-surface-borderSoft p-5">
          <h2 className="text-xl font-semibold text-brand-ink">{title}</h2>
          <button aria-label="Close panel" className="rounded-full p-2 text-brand-muted hover:bg-surface-app" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function Notice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <ErrorState title="Could not complete the admin request" description={message} retry={onRetry ? <Button onClick={onRetry}>Retry</Button> : undefined} />;
}

function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap justify-end gap-2">{children}</div>;
}

const PRODUCT_TYPE_EMPTY = {
  name: "",
  slug: "",
  category: "Clothes",
  productionMethod: "DTF",
  isActive: true,
  availableForDesigners: true,
  availableInShop: true,
  availableForCorporate: true,
  availableForMarketplace: false,
  requiresMockup: true,
  supportsFilmSale: false,
  baseCost: "",
  defaultMargin: "",
};

export function ProductTypesScreen() {
  const [items, setItems] = useState<ProductType[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<(typeof PRODUCT_TYPE_EMPTY & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setState("loading");
    setError("");
    try {
      const data = await api.get<ProductType[]>("/admin/product-types");
      setItems(Array.isArray(data) ? data : []);
      setState("ready");
    } catch (err) {
      setError(errorMessage(err));
      setState("error");
    }
  }

  useEffect(() => { void load(); }, []);

  function open(item?: ProductType) {
    setEditing(item ? {
      id: item.id,
      name: item.name,
      slug: item.slug,
      category: item.category,
      productionMethod: item.productionMethod,
      isActive: item.isActive,
      availableForDesigners: item.availableForDesigners,
      availableInShop: item.availableInShop,
      availableForCorporate: item.availableForCorporate,
      availableForMarketplace: item.availableForMarketplace,
      requiresMockup: item.requiresMockup,
      supportsFilmSale: item.supportsFilmSale,
      baseCost: decimal(item.baseCost),
      defaultMargin: decimal(item.defaultMargin),
    } : PRODUCT_TYPE_EMPTY);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const payload = { ...editing, baseCost: asNumber(String(editing.baseCost)), defaultMargin: asNumber(String(editing.defaultMargin)) };
      if (editing.id) await api.patch(`/admin/product-types/${editing.id}`, payload);
      else await api.post("/admin/product-types", payload);
      setEditing(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: ProductType) {
    if (!confirm(`Delete product type ${item.name}?`)) return;
    try {
      await api.delete(`/admin/product-types/${item.id}`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <PageShell title="Product Types" description="Configure which products designers, customers, corporate clients, and marketplace channels can use." icon={<SlidersHorizontal size={22} />} action={<Button onClick={() => open()}><Plus size={16} /> New product type</Button>}>
      {error && state !== "error" ? <Notice message={error} /> : null}
      {state === "loading" ? <Skeleton className="h-64" /> : state === "error" ? <Notice message={error} onRetry={load} /> : items.length === 0 ? (
        <Card><EmptyState icon={<SlidersHorizontal className="text-brand-peach" size={32} />} title="No product types" description="Create the first configurable product type before adding base products or mockup templates." action={<Button onClick={() => open()}><Plus size={16} /> Add product type</Button>} /></Card>
      ) : (
        <Card className="!p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-surface-app text-brand-muted"><tr><th className="px-5 py-3 text-left">Product</th><th className="px-5 py-3 text-left">Channels</th><th className="px-5 py-3 text-left">Method</th><th className="px-5 py-3 text-left">Cost / Margin</th><th className="px-5 py-3 text-left">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-surface-borderSoft">{items.map((item) => <tr key={item.id}><td className="px-5 py-4"><p className="font-semibold text-brand-ink">{item.name}</p><p className="text-xs text-brand-muted">{item.slug} · {item.category}</p></td><td className="px-5 py-4"><div className="flex flex-wrap gap-1 text-xs text-brand-muted">{item.availableForDesigners && <span>Designers</span>}{item.availableInShop && <span>Shop</span>}{item.availableForCorporate && <span>Corporate</span>}{item.availableForMarketplace && <span>Marketplace</span>}{item.supportsFilmSale && <span>Film</span>}</div></td><td className="px-5 py-4">{item.productionMethod}</td><td className="px-5 py-4">{decimal(item.baseCost) || "-"} / {decimal(item.defaultMargin) || "-"}</td><td className="px-5 py-4"><StatusBadge status={item.isActive ? "ACTIVE" : "INACTIVE"} /></td><td className="px-5 py-4"><RowActions><Button size="sm" variant="secondary" onClick={() => open(item)}><Pencil size={14} /> Edit</Button><Button size="sm" variant="ghost" onClick={() => remove(item)}><Trash2 size={14} /> Delete</Button></RowActions></td></tr>)}</tbody></table></div></Card>
      )}
      {editing && <Drawer title={editing.id ? "Edit product type" : "New product type"} onClose={() => setEditing(null)}><form className="space-y-4" onSubmit={save}><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Field label="Name"><Input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: editing.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") })} /></Field><Field label="Slug"><Input required value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></Field><Field label="Category"><Input required value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} /></Field><Field label="Production method"><Input required value={editing.productionMethod} onChange={(e) => setEditing({ ...editing, productionMethod: e.target.value })} /></Field><Field label="Base cost"><Input inputMode="decimal" value={editing.baseCost} onChange={(e) => setEditing({ ...editing, baseCost: e.target.value })} /></Field><Field label="Default margin"><Input inputMode="decimal" value={editing.defaultMargin} onChange={(e) => setEditing({ ...editing, defaultMargin: e.target.value })} /></Field></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><ToggleField label="Active" checked={editing.isActive} onChange={(v) => setEditing({ ...editing, isActive: v })} /><ToggleField label="Available for designers" checked={editing.availableForDesigners} onChange={(v) => setEditing({ ...editing, availableForDesigners: v })} /><ToggleField label="Available in shop" checked={editing.availableInShop} onChange={(v) => setEditing({ ...editing, availableInShop: v })} /><ToggleField label="Available for corporate" checked={editing.availableForCorporate} onChange={(v) => setEditing({ ...editing, availableForCorporate: v })} /><ToggleField label="Available for marketplace" checked={editing.availableForMarketplace} onChange={(v) => setEditing({ ...editing, availableForMarketplace: v })} /><ToggleField label="Requires mockup" checked={editing.requiresMockup} onChange={(v) => setEditing({ ...editing, requiresMockup: v })} /><ToggleField label="Supports film sale" checked={editing.supportsFilmSale} onChange={(v) => setEditing({ ...editing, supportsFilmSale: v })} /></div><div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" loading={saving}>Save product type</Button></div></form></Drawer>}
    </PageShell>
  );
}

const MOCKUP_EMPTY = { baseProductId: "", name: "", baseImageKey: "", lifestyleImageKey: "", closeupImageKey: "", isActive: true, sortOrder: "0" };

type MockupImageField = "baseImageKey" | "lifestyleImageKey" | "closeupImageKey";

type MockupEditingState = typeof MOCKUP_EMPTY & {
  id?: string;
  previews: Partial<Record<MockupImageField, string>>;
};

type MediaAssetRow = { objectKey: string; publicUrl?: string | null };

const MOCKUP_IMAGE_SPECS: Record<MockupImageField, { label: string; required: boolean; description: string; optimal: string }> = {
  baseImageKey: {
    label: "Base product image",
    required: true,
    description: "The blank product photo the renderer composites the design onto. This is the main mockup canvas for listing image #1.",
    optimal: "2000×2000 px or larger, PNG or JPG, neutral or transparent background, front-facing view, print area clearly visible, even studio lighting.",
  },
  lifestyleImageKey: {
    label: "Lifestyle image",
    required: false,
    description: "A contextual or worn-product shot for the shop gallery. Shown as listing image #2 when present; otherwise the base image is reused.",
    optimal: "1600×2000 px+, JPG or PNG, model or styled scene, product readable at a glance, minimal clutter, brand-safe background.",
  },
  closeupImageKey: {
    label: "Close-up detail",
    required: false,
    description: "A tight crop highlighting print quality, fabric, or finishing. Shown as listing image #3 when present; otherwise the base image is reused.",
    optimal: "1200×1200 px+, PNG or JPG, sharp focus on print area or texture, high contrast, no heavy filters.",
  },
};

async function uploadMockupTemplateImage(file: File, title: string) {
  const signRes = await fetch("/api/proxy/admin/media/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: "MOCKUP_TEMPLATE",
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    }),
  });
  if (!signRes.ok) throw new Error(`Upload init failed (${signRes.status})`);
  const signed = (await signRes.json()) as { objectKey: string; uploadUrl: string; method?: string; headers?: Record<string, string> };
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
      category: "MOCKUP_TEMPLATE",
      title,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    }),
  });
  if (!completeRes.ok) throw new Error(`Finalize failed (${completeRes.status})`);
  const asset = (await completeRes.json()) as { objectKey: string; publicUrl?: string | null };
  return { objectKey: signed.objectKey, publicUrl: asset.publicUrl ?? undefined };
}

function MockupImageUploadField({
  spec,
  objectKey,
  previewUrl,
  uploading,
  onUpload,
  onClear,
}: {
  spec: (typeof MOCKUP_IMAGE_SPECS)[MockupImageField];
  objectKey: string;
  previewUrl?: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onClear?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-surface-borderSoft bg-surface-app/40 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-brand-ink">
          {spec.label}
          {spec.required ? " *" : " (optional)"}
        </p>
        <p className="mt-1 text-xs text-brand-muted">{spec.description}</p>
        <p className="mt-2 text-xs text-brand-ink">
          <span className="font-semibold">Optimal:</span> {spec.optimal}
        </p>
      </div>
      {previewUrl ? (
        <div className="overflow-hidden rounded-xl border border-surface-borderSoft bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt={spec.label} className="max-h-48 w-full object-contain" />
        </div>
      ) : null}
      {objectKey ? <p className="truncate font-mono text-[11px] text-brand-muted" title={objectKey}>{objectKey}</p> : null}
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-blueGlow hover:bg-brand-blue/90">
          <Upload size={16} />
          {uploading ? "Uploading…" : objectKey ? "Replace image" : "Upload image"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUpload(file);
              event.target.value = "";
            }}
          />
        </label>
        {objectKey && onClear ? (
          <Button type="button" size="sm" variant="ghost" onClick={onClear} disabled={uploading}>
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function MockupTemplatesScreen() {
  const [items, setItems] = useState<MockupTemplate[]>([]);
  const [baseProducts, setBaseProducts] = useState<BaseProduct[]>([]);
  const [mediaByObjectKey, setMediaByObjectKey] = useState<Map<string, string>>(new Map());
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<MockupEditingState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<MockupImageField | null>(null);

  async function loadMediaPreviews() {
    try {
      const data = await api.get<MediaAssetRow[]>("/admin/media?category=MOCKUP_TEMPLATE");
      const map = new Map<string, string>();
      for (const row of Array.isArray(data) ? data : []) {
        if (row.publicUrl) map.set(row.objectKey, row.publicUrl);
      }
      setMediaByObjectKey(map);
    } catch {
      setMediaByObjectKey(new Map());
    }
  }

  async function load() {
    setState("loading");
    setError("");
    const results = await Promise.allSettled([
      api.get<MockupTemplate[]>("/admin/mockup-templates"),
      api.get<BaseProduct[]>("/admin/base-products"),
      loadMediaPreviews(),
    ]);
    const [templatesResult, basesResult] = results;
    if (templatesResult.status === "fulfilled") {
      setItems(Array.isArray(templatesResult.value) ? templatesResult.value : []);
    } else {
      setItems([]);
      setError(errorMessage(templatesResult.reason));
    }
    if (basesResult.status === "fulfilled") {
      setBaseProducts(Array.isArray(basesResult.value) ? basesResult.value : []);
    } else {
      setBaseProducts([]);
      const baseError = errorMessage(basesResult.reason);
      setError((current) => (current ? `${current} · ${baseError}` : baseError));
    }
    setState(templatesResult.status === "fulfilled" || basesResult.status === "fulfilled" ? "ready" : "error");
  }

  useEffect(() => {
    void load();
  }, []);

  const baseName = useMemo(() => new Map(baseProducts.map((item) => [item.id, item.name])), [baseProducts]);

  function previewFor(field: MockupImageField, key: string, previews?: MockupEditingState["previews"]) {
    return previews?.[field] || (key ? mediaByObjectKey.get(key) : undefined);
  }

  function open(item?: MockupTemplate) {
    if (item) {
      setEditing({
        id: item.id,
        baseProductId: item.baseProductId,
        name: item.name,
        baseImageKey: item.baseImageKey,
        lifestyleImageKey: item.lifestyleImageKey || "",
        closeupImageKey: item.closeupImageKey || "",
        isActive: item.isActive,
        sortOrder: String(item.sortOrder ?? 0),
        previews: {
          baseImageKey: previewFor("baseImageKey", item.baseImageKey),
          lifestyleImageKey: item.lifestyleImageKey ? previewFor("lifestyleImageKey", item.lifestyleImageKey) : undefined,
          closeupImageKey: item.closeupImageKey ? previewFor("closeupImageKey", item.closeupImageKey) : undefined,
        },
      });
      return;
    }
    setEditing({ ...MOCKUP_EMPTY, baseProductId: baseProducts[0]?.id ?? "", previews: {} });
  }

  async function handleImageUpload(field: MockupImageField, file: File) {
    if (!editing) return;
    setUploadingField(field);
    setError("");
    try {
      const title = `${editing.name || "Mockup template"} — ${MOCKUP_IMAGE_SPECS[field].label}`;
      const uploaded = await uploadMockupTemplateImage(file, title);
      setMediaByObjectKey((current) => new Map(current).set(uploaded.objectKey, uploaded.publicUrl ?? ""));
      setEditing((current) =>
        current
          ? {
              ...current,
              [field]: uploaded.objectKey,
              previews: { ...current.previews, [field]: uploaded.publicUrl },
            }
          : current,
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploadingField(null);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    if (!editing.baseImageKey) {
      setError("Upload a base product image before saving.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        baseProductId: editing.baseProductId,
        name: editing.name,
        baseImageKey: editing.baseImageKey,
        lifestyleImageKey: editing.lifestyleImageKey || undefined,
        closeupImageKey: editing.closeupImageKey || undefined,
        isActive: editing.isActive,
        sortOrder: Number(editing.sortOrder),
      };
      if (editing.id) await api.patch(`/admin/mockup-templates/${editing.id}`, payload);
      else await api.post("/admin/mockup-templates", payload);
      setEditing(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: MockupTemplate) {
    if (!confirm(`Delete mockup template ${item.name}?`)) return;
    try {
      await api.delete(`/admin/mockup-templates/${item.id}`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <PageShell
      title="Mockup Templates"
      description="Upload base, lifestyle, and close-up photos for each product mockup. Images are stored in the media library and referenced by the listing renderer."
      icon={<Layers size={22} />}
      action={
        <Button onClick={() => open()} disabled={!baseProducts.length}>
          <Plus size={16} /> New template
        </Button>
      }
    >
      {error && state !== "error" ? <Notice message={error} /> : null}
      {state === "loading" ? (
        <Skeleton className="h-64" />
      ) : state === "error" ? (
        <Notice message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Layers className="text-brand-peach" size={32} />}
            title="No mockup templates"
            description="Create a template after adding a base product. Upload the three listing images with notes on each role."
          />
        </Card>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-app text-brand-muted">
                <tr>
                  <th className="px-5 py-3 text-left">Template</th>
                  <th className="px-5 py-3 text-left">Base product</th>
                  <th className="px-5 py-3 text-left">Images</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-borderSoft">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-brand-ink">{item.name}</p>
                      <p className="text-xs text-brand-muted">Sort {item.sortOrder}</p>
                    </td>
                    <td className="px-5 py-4">{baseName.get(item.baseProductId) || item.baseProductId}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        {[item.baseImageKey, item.lifestyleImageKey, item.closeupImageKey].filter(Boolean).map((key) => {
                          const url = mediaByObjectKey.get(String(key));
                          return url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={String(key)} src={url} alt="" className="h-12 w-12 rounded-lg border border-surface-borderSoft object-cover" />
                          ) : (
                            <span key={String(key)} className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-surface-borderSoft text-[10px] text-brand-muted">
                              IMG
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={item.isActive ? "ACTIVE" : "INACTIVE"} />
                    </td>
                    <td className="px-5 py-4">
                      <RowActions>
                        <Button size="sm" variant="secondary" onClick={() => open(item)}>
                          <Pencil size={14} /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(item)}>
                          <Trash2 size={14} /> Delete
                        </Button>
                      </RowActions>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {editing ? (
        <Drawer title={editing.id ? "Edit mockup template" : "New mockup template"} onClose={() => setEditing(null)}>
          <form className="space-y-4" onSubmit={save}>
            <Field label="Base product">
              <Select required value={editing.baseProductId} onChange={(e) => setEditing({ ...editing, baseProductId: e.target.value })}>
                <option value="">Select base product</option>
                {baseProducts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Template name">
                <Input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </Field>
              <Field label="Sort order">
                <Input inputMode="numeric" value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: e.target.value })} />
              </Field>
            </div>
            {(Object.keys(MOCKUP_IMAGE_SPECS) as MockupImageField[]).map((field) => (
              <MockupImageUploadField
                key={field}
                spec={MOCKUP_IMAGE_SPECS[field]}
                objectKey={editing[field]}
                previewUrl={previewFor(field, editing[field], editing.previews)}
                uploading={uploadingField === field}
                onUpload={(file) => void handleImageUpload(field, file)}
                onClear={
                  field === "baseImageKey"
                    ? undefined
                    : () => setEditing((current) => (current ? { ...current, [field]: "", previews: { ...current.previews, [field]: undefined } } : current))
                }
              />
            ))}
            <ToggleField label="Active" checked={editing.isActive} onChange={(v) => setEditing({ ...editing, isActive: v })} />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving} disabled={!editing.baseImageKey}>
                Save template
              </Button>
            </div>
          </form>
        </Drawer>
      ) : null}
    </PageShell>
  );
}

const PRINT_AREA_EMPTY = { mockupTemplateId: "", name: "Front print area", x: "300", y: "260", width: "800", height: "900", safeX: "340", safeY: "300", safeWidth: "720", safeHeight: "820", allowMove: true, allowResize: true, allowRotate: false, minScale: "0.1", maxScale: "2" };

type PrintAreaEditingState = typeof PRINT_AREA_EMPTY & { id?: string };

function printAreaFromEditing(editing: PrintAreaEditingState): PrintAreaRect {
  return {
    x: Number(editing.x),
    y: Number(editing.y),
    width: Number(editing.width),
    height: Number(editing.height),
    safeX: Number(editing.safeX),
    safeY: Number(editing.safeY),
    safeWidth: Number(editing.safeWidth),
    safeHeight: Number(editing.safeHeight),
  };
}

function editingFromPrintAreaRect(editing: PrintAreaEditingState, rect: PrintAreaRect): PrintAreaEditingState {
  return {
    ...editing,
    x: String(rect.x),
    y: String(rect.y),
    width: String(rect.width),
    height: String(rect.height),
    safeX: String(rect.safeX),
    safeY: String(rect.safeY),
    safeWidth: String(rect.safeWidth),
    safeHeight: String(rect.safeHeight),
  };
}

function shouldSuggestPrintAreaDefaults(editing: PrintAreaEditingState) {
  const fields = ["x", "y", "width", "height", "safeX", "safeY", "safeWidth", "safeHeight"] as const;
  const values = fields.map((key) => Number(editing[key]));
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) return true;
  return fields.every((key) => editing[key] === PRINT_AREA_EMPTY[key]);
}

export function PrintAreasScreen() {
  const [items, setItems] = useState<PrintArea[]>([]);
  const [templates, setTemplates] = useState<MockupTemplate[]>([]);
  const [mediaByObjectKey, setMediaByObjectKey] = useState<Map<string, string>>(new Map());
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<PrintAreaEditingState | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeLayer, setActiveLayer] = useState<"print" | "safe">("print");
  const [suggestedForTemplateId, setSuggestedForTemplateId] = useState<string | null>(null);

  async function loadMediaPreviews() {
    try {
      const data = await api.get<MediaAssetRow[]>("/admin/media?category=MOCKUP_TEMPLATE");
      const map = new Map<string, string>();
      for (const row of Array.isArray(data) ? data : []) {
        if (row.publicUrl) map.set(row.objectKey, row.publicUrl);
      }
      setMediaByObjectKey(map);
    } catch {
      setMediaByObjectKey(new Map());
    }
  }

  async function load() {
    setState("loading");
    setError("");
    try {
      const [areas, tmpls] = await Promise.all([
        api.get<PrintArea[]>("/admin/print-areas"),
        api.get<MockupTemplate[]>("/admin/mockup-templates"),
        loadMediaPreviews(),
      ]);
      setItems(Array.isArray(areas) ? areas : []);
      setTemplates(Array.isArray(tmpls) ? tmpls : []);
      setState("ready");
    } catch (err) {
      setError(errorMessage(err));
      setState("error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const templateName = useMemo(() => new Map(templates.map((item) => [item.id, item.name])), [templates]);
  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === editing?.mockupTemplateId),
    [editing?.mockupTemplateId, templates],
  );
  const templateImageUrl = selectedTemplate?.baseImageKey ? mediaByObjectKey.get(selectedTemplate.baseImageKey) ?? null : null;
  const canSavePrintArea = Boolean(selectedTemplate?.baseImageKey && templateImageUrl);

  function open(item?: PrintArea) {
    setActiveLayer("print");
    setSuggestedForTemplateId(null);
    setEditing(
      item
        ? {
            id: item.id,
            mockupTemplateId: item.mockupTemplateId,
            name: item.name,
            x: String(item.x),
            y: String(item.y),
            width: String(item.width),
            height: String(item.height),
            safeX: String(item.safeX),
            safeY: String(item.safeY),
            safeWidth: String(item.safeWidth),
            safeHeight: String(item.safeHeight),
            allowMove: item.allowMove,
            allowResize: item.allowResize,
            allowRotate: item.allowRotate,
            minScale: String(item.minScale),
            maxScale: String(item.maxScale),
          }
        : { ...PRINT_AREA_EMPTY, mockupTemplateId: templates[0]?.id ?? "" },
    );
  }

  const applySuggestedDefaults = useCallback(
    (templateId: string, width: number, height: number) => {
      setEditing((current) => {
        if (!current || current.id || current.mockupTemplateId !== templateId) return current;
        if (!shouldSuggestPrintAreaDefaults(current)) return current;
        const { print, safe } = suggestDefaultPrintAreaRects(width, height);
        return {
          ...current,
          x: String(print.x),
          y: String(print.y),
          width: String(print.width),
          height: String(print.height),
          safeX: String(safe.x),
          safeY: String(safe.y),
          safeWidth: String(safe.width),
          safeHeight: String(safe.height),
        };
      });
      setSuggestedForTemplateId(templateId);
    },
    [],
  );

  function handleTemplateChange(mockupTemplateId: string) {
    if (!editing) return;
    setSuggestedForTemplateId(null);
    setEditing({ ...editing, mockupTemplateId });
  }

  function handleVisualChange(rect: PrintAreaRect) {
    if (!editing) return;
    setEditing(editingFromPrintAreaRect(editing, rect));
  }

  const handleImageDimensions = useCallback(
    (width: number, height: number) => {
      if (!editing || editing.id || !editing.mockupTemplateId) return;
      if (suggestedForTemplateId === editing.mockupTemplateId) return;
      applySuggestedDefaults(editing.mockupTemplateId, width, height);
    },
    [applySuggestedDefaults, editing, suggestedForTemplateId],
  );

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing || !canSavePrintArea) return;
    setSaving(true);
    try {
      const payload = {
        ...editing,
        x: Number(editing.x),
        y: Number(editing.y),
        width: Number(editing.width),
        height: Number(editing.height),
        safeX: Number(editing.safeX),
        safeY: Number(editing.safeY),
        safeWidth: Number(editing.safeWidth),
        safeHeight: Number(editing.safeHeight),
        minScale: Number(editing.minScale),
        maxScale: Number(editing.maxScale),
      };
      if (editing.id) await api.patch(`/admin/print-areas/${editing.id}`, payload);
      else await api.post("/admin/print-areas", payload);
      setEditing(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: PrintArea) {
    if (!confirm(`Delete print area ${item.name}?`)) return;
    try {
      await api.delete(`/admin/print-areas/${item.id}`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const numberFields: Array<keyof typeof PRINT_AREA_EMPTY> = [
    "x",
    "y",
    "width",
    "height",
    "safeX",
    "safeY",
    "safeWidth",
    "safeHeight",
    "minScale",
    "maxScale",
  ];

  return (
    <PageShell
      title="Print Areas / Safe Zones"
      description="Define print rectangles, safe rectangles, and allowed transforms for each mockup template."
      icon={<ListChecks size={22} />}
      action={
        <Button onClick={() => open()} disabled={!templates.length}>
          <Plus size={16} /> New print area
        </Button>
      }
    >
      {error && state !== "error" ? <Notice message={error} /> : null}
      {state === "loading" ? (
        <Skeleton className="h-64" />
      ) : state === "error" ? (
        <Notice message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ListChecks className="text-brand-peach" size={32} />}
            title="No print areas"
            description="Create print and safe zones before designers can place artwork accurately."
          />
        </Card>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-app text-brand-muted">
                <tr>
                  <th className="px-5 py-3 text-left">Area</th>
                  <th className="px-5 py-3 text-left">Template</th>
                  <th className="px-5 py-3 text-left">Print rect</th>
                  <th className="px-5 py-3 text-left">Safe rect</th>
                  <th className="px-5 py-3 text-left">Transforms</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-borderSoft">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-4 font-semibold text-brand-ink">{item.name}</td>
                    <td className="px-5 py-4">{templateName.get(item.mockupTemplateId) || item.mockupTemplateId}</td>
                    <td className="px-5 py-4 font-mono text-xs">
                      {item.x},{item.y} · {item.width}x{item.height}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs">
                      {item.safeX},{item.safeY} · {item.safeWidth}x{item.safeHeight}
                    </td>
                    <td className="px-5 py-4 text-xs text-brand-muted">
                      {item.allowMove ? "Move " : ""}
                      {item.allowResize ? "Resize " : ""}
                      {item.allowRotate ? "Rotate" : ""}
                      <br />
                      Scale {item.minScale}-{item.maxScale}
                    </td>
                    <td className="px-5 py-4">
                      <RowActions>
                        <Button size="sm" variant="secondary" onClick={() => open(item)}>
                          <Pencil size={14} /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(item)}>
                          <Trash2 size={14} /> Delete
                        </Button>
                      </RowActions>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {editing ? (
        <Drawer title={editing.id ? "Edit print area" : "New print area"} onClose={() => setEditing(null)} size="wide">
          <form className="space-y-4" onSubmit={save}>
            <Field label="Mockup template">
              <Select required value={editing.mockupTemplateId} onChange={(e) => handleTemplateChange(e.target.value)}>
                <option value="">Select template</option>
                {templates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Name">
              <Input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <PrintAreaVisualEditor
              imageUrl={templateImageUrl}
              value={printAreaFromEditing(editing)}
              onChange={handleVisualChange}
              activeLayer={activeLayer}
              onActiveLayerChange={setActiveLayer}
              onImageDimensions={handleImageDimensions}
            />
            <details className="rounded-2xl border border-surface-borderSoft bg-surface-app/40 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-brand-ink">Advanced coordinates</summary>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                {numberFields.map((key) => (
                  <Field key={key} label={key}>
                    <Input
                      required
                      inputMode="decimal"
                      value={String(editing[key])}
                      onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                    />
                  </Field>
                ))}
              </div>
            </details>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <ToggleField label="Allow move" checked={editing.allowMove} onChange={(v) => setEditing({ ...editing, allowMove: v })} />
              <ToggleField label="Allow resize" checked={editing.allowResize} onChange={(v) => setEditing({ ...editing, allowResize: v })} />
              <ToggleField label="Allow rotate" checked={editing.allowRotate} onChange={(v) => setEditing({ ...editing, allowRotate: v })} />
            </div>
            {!canSavePrintArea ? (
              <p className="text-sm text-brand-muted">Upload a base image on the selected mockup template before saving this print area.</p>
            ) : null}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving} disabled={!canSavePrintArea}>
                Save print area
              </Button>
            </div>
          </form>
        </Drawer>
      ) : null}
    </PageShell>
  );
}

const ROYALTY_EMPTY = { scope: "DEFAULT", basis: "NET_PROFIT_PERCENT", value: "15", isActive: true, effectiveAt: new Date().toISOString().slice(0, 10) };

export function RoyaltyRulesScreen() {
  const [items, setItems] = useState<RoyaltyRule[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<(typeof ROYALTY_EMPTY & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  async function load() { setState("loading"); setError(""); try { const rows = await api.get<RoyaltyRule[]>("/admin/royalty-rules"); setItems(Array.isArray(rows) ? rows : []); setState("ready"); } catch (err) { setError(errorMessage(err)); setState("error"); } }
  useEffect(() => { void load(); }, []);
  function open(item?: RoyaltyRule) { setEditing(item ? { id: item.id, scope: item.scope, basis: item.basis, value: decimal(item.value), isActive: item.isActive, effectiveAt: isoDateInput(item.effectiveAt) } : ROYALTY_EMPTY); }
  async function save(event: FormEvent) { event.preventDefault(); if (!editing) return; setSaving(true); try { const payload = { ...editing, value: Number(editing.value), effectiveAt: new Date(editing.effectiveAt).toISOString() }; if (editing.id) await api.patch(`/admin/royalty-rules/${editing.id}`, payload); else await api.post("/admin/royalty-rules", payload); setEditing(null); await load(); } catch (err) { setError(errorMessage(err)); } finally { setSaving(false); } }
  async function remove(item: RoyaltyRule) { if (!confirm(`Delete royalty rule ${item.scope}?`)) return; try { await api.delete(`/admin/royalty-rules/${item.id}`); await load(); } catch (err) { setError(errorMessage(err)); } }
  return <PageShell title="Royalty Rules" description="Configure designer royalty basis, scope, values, activation state, and effective dates." icon={<BadgePercent size={22} />} action={<Button onClick={() => open()}><Plus size={16} /> New rule</Button>}>{error && state !== "error" ? <Notice message={error} /> : null}{state === "loading" ? <Skeleton className="h-64" /> : state === "error" ? <Notice message={error} onRetry={load} /> : items.length === 0 ? <Card><EmptyState icon={<BadgePercent className="text-brand-peach" size={32} />} title="No royalty rules" description="Create a default rule before publishing paid listings." /></Card> : <Card className="!p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-surface-app text-brand-muted"><tr><th className="px-5 py-3 text-left">Scope</th><th className="px-5 py-3 text-left">Basis</th><th className="px-5 py-3 text-left">Value</th><th className="px-5 py-3 text-left">Effective</th><th className="px-5 py-3 text-left">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-surface-borderSoft">{items.map((item) => <tr key={item.id}><td className="px-5 py-4 font-semibold text-brand-ink">{item.scope}</td><td className="px-5 py-4">{item.basis}</td><td className="px-5 py-4">{decimal(item.value)}</td><td className="px-5 py-4">{formatDate(item.effectiveAt)}</td><td className="px-5 py-4"><StatusBadge status={item.isActive ? "ACTIVE" : "INACTIVE"} /></td><td className="px-5 py-4"><RowActions><Button size="sm" variant="secondary" onClick={() => open(item)}><Pencil size={14} /> Edit</Button><Button size="sm" variant="ghost" onClick={() => remove(item)}><Trash2 size={14} /> Delete</Button></RowActions></td></tr>)}</tbody></table></div></Card>}{editing && <Drawer title={editing.id ? "Edit royalty rule" : "New royalty rule"} onClose={() => setEditing(null)}><form className="space-y-4" onSubmit={save}><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Field label="Scope"><Select value={editing.scope} onChange={(e) => setEditing({ ...editing, scope: e.target.value })}>{["DEFAULT", "PRODUCT_TYPE", "DESIGNER", "CHANNEL", "CAMPAIGN"].map((v) => <option key={v}>{v}</option>)}</Select></Field><Field label="Basis"><Select value={editing.basis} onChange={(e) => setEditing({ ...editing, basis: e.target.value })}>{["SALE_PRICE_PERCENT", "NET_PROFIT_PERCENT", "FIXED_AMOUNT"].map((v) => <option key={v}>{v}</option>)}</Select></Field><Field label="Value"><Input required inputMode="decimal" value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} /></Field><Field label="Effective date"><Input required type="date" value={editing.effectiveAt} onChange={(e) => setEditing({ ...editing, effectiveAt: e.target.value })} /></Field></div><ToggleField label="Active" checked={editing.isActive} onChange={(v) => setEditing({ ...editing, isActive: v })} /><div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" loading={saving}>Save royalty rule</Button></div></form></Drawer>}</PageShell>;
}

export function FilmSaleSettingsScreen() {
  const [form, setForm] = useState({ enableFilmSalesGlobally: false, enableDTF: true, enableUvDtf: true, defaultRoyaltyBasis: "NET_PROFIT_PERCENT", defaultRoyaltyValue: "15", minimumOrderPrice: "", rushOrderFee: "", revocationPolicy: "Existing paid orders may still be fulfilled; future orders are blocked." });
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  async function load() { setState("loading"); setError(""); try { const data = await api.get<FilmSaleSettings | null>("/admin/film-sale-settings"); if (data) setForm({ enableFilmSalesGlobally: data.enableFilmSalesGlobally, enableDTF: data.enableDTF, enableUvDtf: data.enableUvDtf, defaultRoyaltyBasis: data.defaultRoyaltyBasis, defaultRoyaltyValue: decimal(data.defaultRoyaltyValue), minimumOrderPrice: decimal(data.minimumOrderPrice), rushOrderFee: decimal(data.rushOrderFee), revocationPolicy: data.revocationPolicy || "" }); setState("ready"); } catch (err) { setError(errorMessage(err)); setState("error"); } }
  useEffect(() => { void load(); }, []);
  async function save(event: FormEvent) { event.preventDefault(); setSaving(true); setMessage(""); try { await api.post("/admin/film-sale-settings", { ...form, defaultRoyaltyValue: Number(form.defaultRoyaltyValue), minimumOrderPrice: asNumber(form.minimumOrderPrice), rushOrderFee: asNumber(form.rushOrderFee), revocationPolicy: form.revocationPolicy || undefined }); setMessage("Film sale settings saved and audited."); await load(); } catch (err) { setError(errorMessage(err)); } finally { setSaving(false); } }
  return <PageShell title="Film Sale Settings" description="Control DTF/UV-DTF availability, film royalty defaults, price floors, rush fees, and revocation behavior." icon={<ShieldCheck size={22} />}>{state === "loading" ? <Skeleton className="h-64" /> : state === "error" ? <Notice message={error} onRetry={load} /> : <Card><form className="space-y-5" onSubmit={save}>{message ? <p className="text-sm font-semibold text-brand-blue">{message}</p> : null}{error ? <Notice message={error} /> : null}<div className="grid grid-cols-1 md:grid-cols-3 gap-3"><ToggleField label="Enable film sales globally" checked={form.enableFilmSalesGlobally} onChange={(v) => setForm({ ...form, enableFilmSalesGlobally: v })} /><ToggleField label="Enable DTF" checked={form.enableDTF} onChange={(v) => setForm({ ...form, enableDTF: v })} /><ToggleField label="Enable UV-DTF" checked={form.enableUvDtf} onChange={(v) => setForm({ ...form, enableUvDtf: v })} /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Field label="Default royalty basis"><Select value={form.defaultRoyaltyBasis} onChange={(e) => setForm({ ...form, defaultRoyaltyBasis: e.target.value })}>{["SALE_PRICE_PERCENT", "NET_PROFIT_PERCENT", "FIXED_AMOUNT"].map((v) => <option key={v}>{v}</option>)}</Select></Field><Field label="Default royalty value"><Input required inputMode="decimal" value={form.defaultRoyaltyValue} onChange={(e) => setForm({ ...form, defaultRoyaltyValue: e.target.value })} /></Field><Field label="Minimum order price"><Input inputMode="decimal" value={form.minimumOrderPrice} onChange={(e) => setForm({ ...form, minimumOrderPrice: e.target.value })} /></Field><Field label="Rush order fee"><Input inputMode="decimal" value={form.rushOrderFee} onChange={(e) => setForm({ ...form, rushOrderFee: e.target.value })} /></Field></div><Field label="Revocation policy"><Textarea rows={4} value={form.revocationPolicy} onChange={(e) => setForm({ ...form, revocationPolicy: e.target.value })} /></Field><div className="flex justify-end"><Button type="submit" loading={saving}>Save film settings</Button></div></form></Card>}</PageShell>;
}

export function PaymentSettingsScreen() {
  const [form, setForm] = useState<PaymentSettings>({ enabled: false, mode: "TEST", merchantId: "", serviceId: "", secretName: "", returnUrl: "", webhookPath: "/payments/click/webhook", allowedUseCases: ["PRODUCT_ORDER", "FILM_ORDER"] });
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  async function load() { setState("loading"); setError(""); try { const data = await api.get<PaymentSettings>("/payments/admin/click/settings"); setForm({ ...form, ...data, allowedUseCases: Array.isArray(data.allowedUseCases) ? data.allowedUseCases : [] }); setState("ready"); } catch (err) { setError(errorMessage(err)); setState("error"); } }
  useEffect(() => { void load(); }, []);
  async function save(event: FormEvent) { event.preventDefault(); setSaving(true); setMessage(""); try { await api.post("/payments/admin/click/settings", form); setMessage("Click payment settings saved and audited."); await load(); } catch (err) { setError(errorMessage(err)); } finally { setSaving(false); } }
  return <PageShell title="Payment Settings" description="Configure Click operational settings. Secret values should live in Secret Manager; this page stores identifiers and runtime switches only." icon={<CreditCard size={22} />}>{state === "loading" ? <Skeleton className="h-64" /> : state === "error" ? <Notice message={error} onRetry={load} /> : <Card><form className="space-y-5" onSubmit={save}>{message ? <p className="text-sm font-semibold text-brand-blue">{message}</p> : null}{error ? <Notice message={error} /> : null}<div className="grid grid-cols-1 md:grid-cols-2 gap-4"><ToggleField label="Enable Click payments" checked={form.enabled} onChange={(v) => setForm({ ...form, enabled: v })} /><Field label="Mode"><Select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as PaymentSettings["mode"] })}><option>TEST</option><option>PRODUCTION</option></Select></Field><Field label="Merchant ID"><Input value={form.merchantId} onChange={(e) => setForm({ ...form, merchantId: e.target.value })} /></Field><Field label="Service ID"><Input value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })} /></Field><Field label="Secret Manager name" helper="Do not paste raw secrets here."><Input value={form.secretName} onChange={(e) => setForm({ ...form, secretName: e.target.value })} /></Field><Field label="Return URL"><Input value={form.returnUrl} onChange={(e) => setForm({ ...form, returnUrl: e.target.value })} /></Field><Field label="Webhook path"><Input value={form.webhookPath} onChange={(e) => setForm({ ...form, webhookPath: e.target.value })} /></Field><Field label="Allowed use cases"><Input value={form.allowedUseCases.join(", ")} onChange={(e) => setForm({ ...form, allowedUseCases: e.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></Field></div><div className="flex justify-end"><Button type="submit" loading={saving}>Save payment settings</Button></div></form></Card>}</PageShell>;
}

export function AuditLogsScreen() {
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ action: "", entityType: "", entityId: "", actorId: "" });
  async function load(page = pagination.page) { setState("loading"); setError(""); try { const params = new URLSearchParams({ page: String(page), limit: "50" }); Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); }); const data = await api.get<{ items: AuditLog[]; pagination: { page: number; totalPages: number; total: number } }>(`/admin/audit-logs?${params.toString()}`); setRows(Array.isArray(data.items) ? data.items : []); setPagination(data.pagination); setState("ready"); } catch (err) { setError(errorMessage(err)); setState("error"); } }
  useEffect(() => { void load(1); }, []);
  return <PageShell title="Audit Logs" description="Review sensitive admin and operational actions across settings, royalties, rights, moderation, listings, payments, and publishing." icon={<Activity size={22} />}><Card><form className="grid grid-cols-1 md:grid-cols-5 gap-3" onSubmit={(event) => { event.preventDefault(); void load(1); }}><Input placeholder="Action" value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} /><Input placeholder="Entity type" value={filters.entityType} onChange={(e) => setFilters({ ...filters, entityType: e.target.value })} /><Input placeholder="Entity ID" value={filters.entityId} onChange={(e) => setFilters({ ...filters, entityId: e.target.value })} /><Input placeholder="Actor ID" value={filters.actorId} onChange={(e) => setFilters({ ...filters, actorId: e.target.value })} /><Button type="submit"><Eye size={16} /> Filter</Button></form></Card>{state === "loading" ? <Skeleton className="h-64" /> : state === "error" ? <Notice message={error} onRetry={() => load()} /> : rows.length === 0 ? <Card><EmptyState icon={<Activity className="text-brand-peach" size={32} />} title="No audit logs found" description="Try clearing filters or perform an audited admin action." /></Card> : <Card className="!p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-surface-app text-brand-muted"><tr><th className="px-5 py-3 text-left">Action</th><th className="px-5 py-3 text-left">Entity</th><th className="px-5 py-3 text-left">Actor</th><th className="px-5 py-3 text-left">Metadata</th><th className="px-5 py-3 text-left">Time</th></tr></thead><tbody className="divide-y divide-surface-borderSoft">{rows.map((row) => <tr key={row.id}><td className="px-5 py-4 font-semibold text-brand-ink">{row.action}</td><td className="px-5 py-4"><p>{row.entityType}</p><p className="font-mono text-xs text-brand-muted">{row.entityId}</p></td><td className="px-5 py-4"><p>{row.actor?.displayName || row.actorEmail || row.actorId || "System"}</p><p className="text-xs text-brand-muted">{row.actor?.role || row.actorRole || "-"}</p></td><td className="px-5 py-4"><pre className="max-w-md overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs text-brand-muted">{JSON.stringify(row.metadata ?? {})}</pre></td><td className="px-5 py-4">{formatDate(row.createdAt)}</td></tr>)}</tbody></table></div><div className="flex items-center justify-between border-t border-surface-borderSoft p-4 text-sm text-brand-muted"><span>{pagination.total} records</span><div className="flex gap-2"><Button size="sm" variant="secondary" disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>Previous</Button><span className="self-center">Page {pagination.page} / {pagination.totalPages || 1}</span><Button size="sm" variant="secondary" disabled={pagination.page >= pagination.totalPages} onClick={() => load(pagination.page + 1)}>Next</Button></div></div></Card>}</PageShell>;
}

const LISTING_STATUSES = ["DRAFT", "READY_FOR_REVIEW", "READY_TO_PUBLISH", "PUBLISHED", "UNPUBLISHED", "FAILED", "ARCHIVED", "REJECTED", "SUSPENDED"];

export function AdminListingsReviewScreen() {
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ status: "", type: "", q: "" });
  const [editing, setEditing] = useState<(ListingRow & { editTitle: string; editDescription: string; editPrice: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  async function load() { setState("loading"); setError(""); try { const params = new URLSearchParams({ limit: "150" }); if (filters.status) params.set("status", filters.status); if (filters.type) params.set("type", filters.type); if (filters.q) params.set("q", filters.q); const data = await api.get<ListingRow[]>(`/admin/listings?${params.toString()}`); setRows(Array.isArray(data) ? data : []); setState("ready"); } catch (err) { setError(errorMessage(err)); setState("error"); } }
  useEffect(() => { void load(); }, []);
  function open(row: ListingRow) { setEditing({ ...row, editTitle: row.title, editDescription: row.description || "", editPrice: decimal(row.price) }); }
  async function saveListing(event: FormEvent) { event.preventDefault(); if (!editing) return; setSaving(true); try { await api.patch(`/admin/listings/${editing.id}`, { title: editing.editTitle, description: editing.editDescription || undefined, price: Number(editing.editPrice) }); setEditing(null); await load(); } catch (err) { setError(errorMessage(err)); } finally { setSaving(false); } }
  async function setStatus(row: ListingRow, status: string) { if (!confirm(`Set ${row.title} to ${status}?`)) return; try { await api.post(`/admin/listings/${row.id}/status`, { status }); await load(); } catch (err) { setError(errorMessage(err)); } }
  return <PageShell title="Admin Listings Review" description="Review product and film listings, edit listing copy or price, and move listings through publication, rejection, suspension, or archive states." icon={<FileText size={22} />}><Card><form className="grid grid-cols-1 md:grid-cols-4 gap-3" onSubmit={(event) => { event.preventDefault(); void load(); }}><Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">All statuses</option>{LISTING_STATUSES.map((value) => <option key={value}>{value}</option>)}</Select><Select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}><option value="">All types</option><option>PRODUCT</option><option>FILM</option></Select><Input placeholder="Search title" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} /><Button type="submit"><Eye size={16} /> Review</Button></form></Card>{error && state !== "error" ? <Notice message={error} /> : null}{state === "loading" ? <Skeleton className="h-64" /> : state === "error" ? <Notice message={error} onRetry={load} /> : rows.length === 0 ? <Card><EmptyState icon={<FileText className="text-brand-peach" size={32} />} title="No listings found" description="Listings awaiting review or publication will appear here once designers create them." /></Card> : <Card className="!p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-surface-app text-brand-muted"><tr><th className="px-5 py-3 text-left">Listing</th><th className="px-5 py-3 text-left">Designer</th><th className="px-5 py-3 text-left">Type</th><th className="px-5 py-3 text-left">Price</th><th className="px-5 py-3 text-left">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-surface-borderSoft">{rows.map((row) => <tr key={row.id}><td className="px-5 py-4"><p className="font-semibold text-brand-ink">{row.title}</p><p className="text-xs text-brand-muted">/{row.slug} · {row.designAsset?.title || "No design title"}</p></td><td className="px-5 py-4"><p>{row.designer?.displayName || "-"}</p><p className="text-xs text-brand-muted">{row.designer?.email || "-"}</p></td><td className="px-5 py-4">{row.type}</td><td className="px-5 py-4">{Number(row.price).toLocaleString()} {row.currency}</td><td className="px-5 py-4"><StatusBadge status={row.status} /></td><td className="px-5 py-4"><RowActions><Button size="sm" variant="secondary" onClick={() => open(row)}><Pencil size={14} /> Edit</Button><Select className="h-[38px] w-44" value="" aria-label={`Set status for ${row.title}`} onChange={(e) => { if (e.target.value) void setStatus(row, e.target.value); }}><option value="">Set status</option>{LISTING_STATUSES.map((value) => <option key={value}>{value}</option>)}</Select></RowActions></td></tr>)}</tbody></table></div></Card>}{editing && <Drawer title="Review listing" onClose={() => setEditing(null)}><form className="space-y-4" onSubmit={saveListing}><div className="rounded-2xl bg-surface-app p-4 text-sm text-brand-muted"><p><strong className="text-brand-ink">Current status:</strong> {editing.status}</p><p><strong className="text-brand-ink">Designer:</strong> {editing.designer?.displayName || editing.designer?.email || "-"}</p><p><strong className="text-brand-ink">Design:</strong> {editing.designAsset?.title || "-"}</p></div><Field label="Title"><Input required value={editing.editTitle} onChange={(e) => setEditing({ ...editing, editTitle: e.target.value })} /></Field><Field label="Description"><Textarea rows={5} value={editing.editDescription} onChange={(e) => setEditing({ ...editing, editDescription: e.target.value })} /></Field><Field label="Price"><Input required inputMode="decimal" value={editing.editPrice} onChange={(e) => setEditing({ ...editing, editPrice: e.target.value })} /></Field><div className="flex flex-wrap justify-between gap-3"><div className="flex flex-wrap gap-2"><Button type="button" variant="primaryBlue" onClick={() => setStatus(editing, "PUBLISHED")}>Publish</Button><Button type="button" variant="secondary" onClick={() => setStatus(editing, "READY_FOR_REVIEW")}>Needs review</Button><Button type="button" variant="danger" onClick={() => setStatus(editing, "REJECTED")}>Reject</Button></div><div className="flex gap-2"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" loading={saving}>Save edits</Button></div></div></form></Drawer>}</PageShell>;
}
