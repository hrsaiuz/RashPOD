"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState, ErrorState, Skeleton, StatusBadge } from "@rashpod/ui";
import { Globe2, Layers, MapPin, Plus, RefreshCw, Settings } from "lucide-react";
import DashboardLayout from "../../dashboard-layout";
import { api } from "../../../../lib/api";

type PipelineType = "LOCAL" | "GLOBAL_PRINTFUL";

type BaseProduct = {
  id: string;
  name: string;
  isActive: boolean;
  productType?: { name?: string | null } | null;
};

type PlacementPreset = {
  id: string;
  name: string;
  pipeline: PipelineType;
  placement: string;
  localBaseProductId?: string | null;
  productTemplateId?: string | null;
  defaultWidthCm?: string | number | null;
  defaultHeightCm?: string | number | null;
  defaultWidthIn?: string | number | null;
  defaultHeightIn?: string | number | null;
  defaultX?: string | number | null;
  defaultY?: string | number | null;
  defaultScale?: string | number | null;
  active: boolean;
  localBaseProduct?: { name?: string | null } | null;
  printfulProductTemplate?: { displayName?: string | null } | null;
};

type PrintfulTemplate = {
  id: string;
  rashpodProductType: string;
  displayName: string;
  previewImageUrl?: string | null;
  printfulCatalogProductId: string;
  printfulProductName: string;
  defaultTechnique: string;
  defaultPlacement: string;
  defaultRetailPrice?: string | number | null;
  estimatedBaseCost?: string | number | null;
  currency: string;
  active: boolean;
  allowedPlacements?: unknown;
  allowedTechniques?: unknown;
};

type PrintfulSettings = {
  enabled: boolean;
  defaultStoreId?: string | null;
  connectedMarketplaces: string[];
  autoPublishTrusted: boolean;
  allowGlobalWithoutLocal: boolean;
  catalogAllowlist: Array<{
    catalogProductId: number;
    rashpodProductType: string;
    displayName?: string;
    defaultVariantIds?: number[];
    defaultTechnique?: string;
    defaultPlacement?: string;
  }>;
  tokenConfigured: boolean;
  apiBaseUrl: string;
};

const inputClassName = "mt-1 h-12 w-full rounded-[14px] border border-surface-borderSoft bg-white px-3 text-sm text-brand-text shadow-xs focus:border-brand-blue focus:outline-none focus:ring-4 focus:ring-brand-blue/20";
const textareaClassName = "mt-1 min-h-24 w-full rounded-[14px] border border-surface-borderSoft bg-white px-3 py-2 text-sm text-brand-text shadow-xs focus:border-brand-blue focus:outline-none focus:ring-4 focus:ring-brand-blue/20";
const checkboxClassName = "flex min-h-11 items-center gap-2 rounded-pill border border-surface-borderSoft px-3 text-sm text-brand-ink";

export default function AdminPipelineConfigPage() {
  const [baseProducts, setBaseProducts] = useState<BaseProduct[]>([]);
  const [presets, setPresets] = useState<PlacementPreset[]>([]);
  const [templates, setTemplates] = useState<PrintfulTemplate[]>([]);
  const [settings, setSettings] = useState<PrintfulSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [productsError, setProductsError] = useState("");
  const [presetsError, setPresetsError] = useState("");
  const [templatesError, setTemplatesError] = useState("");
  const [settingsError, setSettingsError] = useState("");

  const [presetForm, setPresetForm] = useState({
    name: "",
    pipeline: "LOCAL" as PipelineType,
    localBaseProductId: "",
    productTemplateId: "",
    placement: "FRONT",
    defaultWidthCm: "10",
    defaultHeightCm: "10",
    defaultWidthIn: "4",
    defaultHeightIn: "4",
    defaultX: "0",
    defaultY: "0",
    defaultScale: "1",
  });
  const [templateForm, setTemplateForm] = useState({
    rashpodProductType: "T_SHIRT",
    displayName: "",
    printfulCatalogProductId: "",
    printfulProductName: "",
    printfulVariantIds: "",
    allowedPlacements: "front",
    allowedTechniques: "dtg",
    defaultTechnique: "dtg",
    defaultPlacement: "front",
    defaultRetailPrice: "",
    estimatedBaseCost: "",
    currency: "USD",
    previewImageUrl: "",
  });
  const [settingsForm, setSettingsForm] = useState({
    enabled: false,
    defaultStoreId: "",
    connectedMarketplaces: "ETSY",
    autoPublishTrusted: false,
    allowGlobalWithoutLocal: false,
    catalogAllowlistJson: "[]",
  });
  const [syncMessage, setSyncMessage] = useState("");

  useEffect(() => {
    void load();
  }, []);

  const activeProducts = useMemo(() => baseProducts.filter((item) => item.isActive), [baseProducts]);
  const activeTemplates = useMemo(() => templates.filter((item) => item.active), [templates]);

  async function load() {
    setLoading(true);
    setError("");
    setProductsError("");
    setPresetsError("");
    setTemplatesError("");
    setSettingsError("");
    const results = await Promise.allSettled([
      api.get<BaseProduct[]>("/admin/base-products"),
      api.get<PlacementPreset[]>("/admin/placement-presets"),
      api.get<PrintfulTemplate[]>("/admin/printful/product-templates"),
      api.get<PrintfulSettings>("/admin/integrations/printful/settings"),
    ]);
    const [productsResult, presetsResult, templatesResult, settingsResult] = results;
    const sectionErrors: string[] = [];

    if (productsResult.status === "fulfilled") {
      setBaseProducts(productsResult.value);
    } else {
      setBaseProducts([]);
      const message = productsResult.reason instanceof Error ? productsResult.reason.message : "Failed to load base products";
      setProductsError(message);
      sectionErrors.push(message);
    }

    if (presetsResult.status === "fulfilled") {
      setPresets(presetsResult.value);
    } else {
      setPresets([]);
      const message = presetsResult.reason instanceof Error ? presetsResult.reason.message : "Failed to load placement presets";
      setPresetsError(message);
      sectionErrors.push(message);
    }

    if (templatesResult.status === "fulfilled") {
      setTemplates(templatesResult.value);
    } else {
      setTemplates([]);
      const message = templatesResult.reason instanceof Error ? templatesResult.reason.message : "Failed to load Printful templates";
      setTemplatesError(message);
      sectionErrors.push(message);
    }

    if (settingsResult.status === "fulfilled") {
      const printfulSettings = settingsResult.value;
      setSettings(printfulSettings);
      setSettingsForm({
        enabled: printfulSettings.enabled,
        defaultStoreId: printfulSettings.defaultStoreId ?? "",
        connectedMarketplaces: printfulSettings.connectedMarketplaces.join(", "),
        autoPublishTrusted: printfulSettings.autoPublishTrusted,
        allowGlobalWithoutLocal: printfulSettings.allowGlobalWithoutLocal,
        catalogAllowlistJson: JSON.stringify(printfulSettings.catalogAllowlist ?? [], null, 2),
      });
    } else {
      setSettings(null);
      const message = settingsResult.reason instanceof Error ? settingsResult.reason.message : "Failed to load Printful settings";
      setSettingsError(message);
      sectionErrors.push(message);
    }

    const products = productsResult.status === "fulfilled" ? productsResult.value : [];
    const printfulTemplates = templatesResult.status === "fulfilled" ? templatesResult.value : [];
    setPresetForm((current) => ({
      ...current,
      localBaseProductId: current.localBaseProductId || products.find((item) => item.isActive)?.id || "",
      productTemplateId: current.productTemplateId || printfulTemplates.find((item) => item.active)?.id || "",
    }));

    if (sectionErrors.length === results.length) {
      setError(sectionErrors[0] ?? "Failed to load pipeline configuration");
    }
    setLoading(false);
  }

  async function createPlacementPreset(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const isLocal = presetForm.pipeline === "LOCAL";
      await api.post("/admin/placement-presets", {
        name: presetForm.name,
        pipeline: presetForm.pipeline,
        localBaseProductId: isLocal ? presetForm.localBaseProductId : undefined,
        productTemplateId: isLocal ? undefined : presetForm.productTemplateId,
        placement: presetForm.placement,
        defaultWidthCm: isLocal ? numberOrUndefined(presetForm.defaultWidthCm) : undefined,
        defaultHeightCm: isLocal ? numberOrUndefined(presetForm.defaultHeightCm) : undefined,
        defaultWidthIn: isLocal ? undefined : numberOrUndefined(presetForm.defaultWidthIn),
        defaultHeightIn: isLocal ? undefined : numberOrUndefined(presetForm.defaultHeightIn),
        defaultX: numberOrUndefined(presetForm.defaultX),
        defaultY: numberOrUndefined(presetForm.defaultY),
        defaultScale: numberOrUndefined(presetForm.defaultScale) ?? 1,
        alignment: "CENTER",
        units: isLocal ? "CM" : "INCH",
        active: true,
      });
      setPresetForm((current) => ({ ...current, name: "" }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save placement preset");
    } finally {
      setSaving(false);
    }
  }

  async function createPrintfulTemplate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/admin/printful/product-templates", {
        rashpodProductType: templateForm.rashpodProductType,
        displayName: templateForm.displayName,
        printfulCatalogProductId: templateForm.printfulCatalogProductId,
        printfulProductName: templateForm.printfulProductName,
        printfulVariantIds: csv(templateForm.printfulVariantIds),
        allowedPlacements: csv(templateForm.allowedPlacements),
        allowedTechniques: csv(templateForm.allowedTechniques),
        defaultTechnique: templateForm.defaultTechnique,
        defaultPlacement: templateForm.defaultPlacement,
        defaultRetailPrice: numberOrUndefined(templateForm.defaultRetailPrice),
        estimatedBaseCost: numberOrUndefined(templateForm.estimatedBaseCost),
        currency: templateForm.currency,
        previewImageUrl: templateForm.previewImageUrl || undefined,
        active: true,
      });
      setTemplateForm((current) => ({ ...current, displayName: "", printfulCatalogProductId: "", printfulProductName: "", printfulVariantIds: "", previewImageUrl: "" }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save Printful template");
    } finally {
      setSaving(false);
    }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const catalogAllowlist = JSON.parse(settingsForm.catalogAllowlistJson) as PrintfulSettings["catalogAllowlist"];
      await api.patch("/admin/integrations/printful/settings", {
        enabled: settingsForm.enabled,
        defaultStoreId: settingsForm.defaultStoreId || undefined,
        connectedMarketplaces: csv(settingsForm.connectedMarketplaces),
        autoPublishTrusted: settingsForm.autoPublishTrusted,
        allowGlobalWithoutLocal: settingsForm.allowGlobalWithoutLocal,
        catalogAllowlist,
      });
      setSyncMessage("Printful settings saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save Printful settings");
    } finally {
      setSaving(false);
    }
  }

  async function togglePreset(item: PlacementPreset) {
    await api.patch(`/admin/placement-presets/${item.id}`, { active: !item.active });
    await load();
  }

  async function toggleTemplate(item: PrintfulTemplate) {
    await api.patch(`/admin/printful/product-templates/${item.id}`, { active: !item.active });
    await load();
  }

  async function syncCatalog() {
    setSaving(true);
    setError("");
    setSyncMessage("");
    try {
      await api.post("/admin/printful/product-templates/sync-catalog");
      setSyncMessage("Catalog sync queued. Refresh templates after the worker completes.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to queue catalog sync");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-brand-ink">Pipeline Config</h1>
            <p className="mt-1 text-brand-muted">Local placements, Printful templates, and global publishing controls.</p>
          </div>
          <Button variant="secondary" onClick={load} disabled={loading}><RefreshCw size={16} /> Refresh</Button>
        </div>

        {error ? <ErrorState title="Pipeline configuration issue" description={error} retry={<Button onClick={load}>Retry</Button>} /> : null}

        {loading ? (
          <Skeleton className="h-80" />
        ) : (
          <>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
              <Card>
                <div className="mb-4 flex items-center gap-2">
                  <Layers size={20} className="text-brand-blue" />
                  <h2 className="text-xl font-semibold text-brand-ink">Placement Presets</h2>
                </div>
                {presetsError ? <ErrorState title="Placement presets unavailable" description={presetsError} retry={<Button size="sm" onClick={load}>Retry</Button>} /> : null}
                <form className="grid gap-3 lg:grid-cols-4" onSubmit={createPlacementPreset}>
                  <Field label="Name" value={presetForm.name} onChange={(value) => setPresetForm((current) => ({ ...current, name: value }))} required />
                  <label className="text-sm font-medium text-brand-ink">Pipeline
                    <select value={presetForm.pipeline} onChange={(event) => setPresetForm((current) => ({ ...current, pipeline: event.target.value as PipelineType }))} className={inputClassName}>
                      <option value="LOCAL">Local</option>
                      <option value="GLOBAL_PRINTFUL">Global Printful</option>
                    </select>
                  </label>
                  {presetForm.pipeline === "LOCAL" ? (
                    <label className="text-sm font-medium text-brand-ink">Product
                      <select value={presetForm.localBaseProductId} onChange={(event) => setPresetForm((current) => ({ ...current, localBaseProductId: event.target.value }))} className={inputClassName}>
                        {activeProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                      </select>
                    </label>
                  ) : (
                    <label className="text-sm font-medium text-brand-ink">Template
                      <select value={presetForm.productTemplateId} onChange={(event) => setPresetForm((current) => ({ ...current, productTemplateId: event.target.value }))} className={inputClassName}>
                        {activeTemplates.map((template) => <option key={template.id} value={template.id}>{template.displayName}</option>)}
                      </select>
                    </label>
                  )}
                  <Field label="Placement" value={presetForm.placement} onChange={(value) => setPresetForm((current) => ({ ...current, placement: value }))} required />
                  <Field label="Width cm" value={presetForm.defaultWidthCm} onChange={(value) => setPresetForm((current) => ({ ...current, defaultWidthCm: value }))} type="number" />
                  <Field label="Height cm" value={presetForm.defaultHeightCm} onChange={(value) => setPresetForm((current) => ({ ...current, defaultHeightCm: value }))} type="number" />
                  <Field label="Width in" value={presetForm.defaultWidthIn} onChange={(value) => setPresetForm((current) => ({ ...current, defaultWidthIn: value }))} type="number" />
                  <Field label="Height in" value={presetForm.defaultHeightIn} onChange={(value) => setPresetForm((current) => ({ ...current, defaultHeightIn: value }))} type="number" />
                  <Field label="Default X" value={presetForm.defaultX} onChange={(value) => setPresetForm((current) => ({ ...current, defaultX: value }))} type="number" />
                  <Field label="Default Y" value={presetForm.defaultY} onChange={(value) => setPresetForm((current) => ({ ...current, defaultY: value }))} type="number" />
                  <Field label="Scale" value={presetForm.defaultScale} onChange={(value) => setPresetForm((current) => ({ ...current, defaultScale: value }))} type="number" />
                  <div className="flex items-end"><Button type="submit" disabled={saving || !presetForm.name}><Plus size={16} /> Add Preset</Button></div>
                </form>
                <PresetList items={presets} onToggle={togglePreset} />
              </Card>

              <Card>
                <div className="mb-4 flex items-center gap-2">
                  <Settings size={20} className="text-brand-blue" />
                  <h2 className="text-xl font-semibold text-brand-ink">Printful Settings</h2>
                </div>
                {settingsError ? <ErrorState title="Printful settings unavailable" description={settingsError} retry={<Button size="sm" onClick={load}>Retry</Button>} /> : (
                <form className="space-y-4" onSubmit={saveSettings}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={checkboxClassName}><input type="checkbox" checked={settingsForm.enabled} onChange={(event) => setSettingsForm((current) => ({ ...current, enabled: event.target.checked }))} /> Enabled</label>
                    <label className={checkboxClassName}><input type="checkbox" checked={settingsForm.autoPublishTrusted} onChange={(event) => setSettingsForm((current) => ({ ...current, autoPublishTrusted: event.target.checked }))} /> Auto-publish trusted</label>
                    <label className={checkboxClassName}><input type="checkbox" checked={settingsForm.allowGlobalWithoutLocal} onChange={(event) => setSettingsForm((current) => ({ ...current, allowGlobalWithoutLocal: event.target.checked }))} /> Global without local</label>
                    <div className="rounded-[14px] border border-surface-borderSoft px-3 py-2 text-sm text-brand-muted">Token: {settings?.tokenConfigured ? "configured" : "missing"}</div>
                  </div>
                  <Field label="Default store ID" value={settingsForm.defaultStoreId} onChange={(value) => setSettingsForm((current) => ({ ...current, defaultStoreId: value }))} />
                  <Field label="Connected marketplaces" value={settingsForm.connectedMarketplaces} onChange={(value) => setSettingsForm((current) => ({ ...current, connectedMarketplaces: value }))} />
                  <label className="text-sm font-medium text-brand-ink lg:col-span-2">Catalog allowlist (JSON)
                    <textarea value={settingsForm.catalogAllowlistJson} onChange={(event) => setSettingsForm((current) => ({ ...current, catalogAllowlistJson: event.target.value }))} className={textareaClassName} spellCheck={false} />
                  </label>
                  <p className="text-xs text-brand-muted lg:col-span-2">Add Printful catalog product IDs with RashPOD product types before running Sync Catalog.</p>
                  {syncMessage ? <p className="text-sm text-brand-ink lg:col-span-2">{syncMessage}</p> : null}
                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" disabled={saving}>Save Settings</Button>
                    <Button type="button" variant="secondary" onClick={syncCatalog} disabled={saving}><RefreshCw size={16} /> Sync Catalog</Button>
                  </div>
                </form>
                )}
              </Card>
            </div>

            <Card>
              <div className="mb-4 flex items-center gap-2">
                <Globe2 size={20} className="text-brand-blue" />
                <h2 className="text-xl font-semibold text-brand-ink">Printful Product Templates</h2>
              </div>
              {templatesError ? <ErrorState title="Printful templates unavailable" description={templatesError} retry={<Button size="sm" onClick={load}>Retry</Button>} /> : null}
              <form className="grid gap-3 lg:grid-cols-4" onSubmit={createPrintfulTemplate}>
                <Field label="Display name" value={templateForm.displayName} onChange={(value) => setTemplateForm((current) => ({ ...current, displayName: value }))} required />
                <Field label="RashPOD product type" value={templateForm.rashpodProductType} onChange={(value) => setTemplateForm((current) => ({ ...current, rashpodProductType: value }))} required />
                <Field label="Catalog product ID" value={templateForm.printfulCatalogProductId} onChange={(value) => setTemplateForm((current) => ({ ...current, printfulCatalogProductId: value }))} required />
                <Field label="Printful product name" value={templateForm.printfulProductName} onChange={(value) => setTemplateForm((current) => ({ ...current, printfulProductName: value }))} required />
                <Field label="Variant IDs" value={templateForm.printfulVariantIds} onChange={(value) => setTemplateForm((current) => ({ ...current, printfulVariantIds: value }))} required />
                <Field label="Allowed placements" value={templateForm.allowedPlacements} onChange={(value) => setTemplateForm((current) => ({ ...current, allowedPlacements: value }))} required />
                <Field label="Allowed techniques" value={templateForm.allowedTechniques} onChange={(value) => setTemplateForm((current) => ({ ...current, allowedTechniques: value }))} required />
                <Field label="Default technique" value={templateForm.defaultTechnique} onChange={(value) => setTemplateForm((current) => ({ ...current, defaultTechnique: value }))} required />
                <Field label="Default placement" value={templateForm.defaultPlacement} onChange={(value) => setTemplateForm((current) => ({ ...current, defaultPlacement: value }))} required />
                <Field label="Retail price" value={templateForm.defaultRetailPrice} onChange={(value) => setTemplateForm((current) => ({ ...current, defaultRetailPrice: value }))} type="number" />
                <Field label="Base cost" value={templateForm.estimatedBaseCost} onChange={(value) => setTemplateForm((current) => ({ ...current, estimatedBaseCost: value }))} type="number" />
                <Field label="Currency" value={templateForm.currency} onChange={(value) => setTemplateForm((current) => ({ ...current, currency: value }))} required />
                <Field label="Preview image URL" value={templateForm.previewImageUrl} onChange={(value) => setTemplateForm((current) => ({ ...current, previewImageUrl: value }))} />
                <div className="flex items-end"><Button type="submit" disabled={saving || !templateForm.displayName || !templateForm.printfulVariantIds}><Plus size={16} /> Add Template</Button></div>
              </form>
              <TemplateList items={templates} onToggle={toggleTemplate} />
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function PresetList({ items, onToggle }: { items: PlacementPreset[]; onToggle: (item: PlacementPreset) => void }) {
  if (!items.length) return <EmptyState icon={<MapPin size={32} />} title="No placement presets" description="Add a local or global preset to enable moderated product selection." />;
  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-[14px] border border-surface-borderSoft p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-brand-ink">{item.name}</p>
              <p className="text-sm text-brand-muted">{item.pipeline === "LOCAL" ? item.localBaseProduct?.name : item.printfulProductTemplate?.displayName} · {item.placement}</p>
            </div>
            <StatusBadge status={item.active ? "ACTIVE" : "INACTIVE"} />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-brand-muted">
            <span>{item.defaultWidthCm ?? item.defaultWidthIn ?? "-"} x {item.defaultHeightCm ?? item.defaultHeightIn ?? "-"}</span>
            <Button size="sm" variant="ghost" onClick={() => onToggle(item)}>{item.active ? "Deactivate" : "Activate"}</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function TemplateList({ items, onToggle }: { items: PrintfulTemplate[]; onToggle: (item: PrintfulTemplate) => void }) {
  if (!items.length) return <EmptyState icon={<Globe2 size={32} />} title="No Printful templates" description="Add a template before moderators can approve global products." />;
  return (
    <div className="mt-5 grid gap-3 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.id} className="overflow-hidden rounded-[14px] border border-surface-borderSoft">
          <div className="aspect-video flex items-center justify-center bg-brand-bg">
            {item.previewImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.previewImageUrl} alt={item.displayName} className="h-full w-full object-contain" />
            ) : (
              <Globe2 className="text-brand-muted" size={32} />
            )}
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-brand-ink">{item.displayName}</p>
                <p className="text-sm text-brand-muted">{item.printfulProductName} · {item.currency}</p>
              </div>
              <StatusBadge status={item.active ? "ACTIVE" : "INACTIVE"} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-brand-muted">
              <span>{item.defaultTechnique} / {item.defaultPlacement}</span>
              <Button size="sm" variant="ghost" onClick={() => onToggle(item)}>{item.active ? "Deactivate" : "Activate"}</Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="text-sm font-medium text-brand-ink">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} type={type} step={type === "number" ? "0.01" : undefined} required={required} className={inputClassName} />
    </label>
  );
}

function csv(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function numberOrUndefined(value: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
