"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Archive, Boxes, CheckCircle2, Download, ExternalLink, FileSpreadsheet, Link2, PackageCheck, Plus, RefreshCw, Settings, Store, Tag, XCircle } from "lucide-react";
import { Button, Card, DataTable, DataTableColumn, EmptyState, ErrorState, FormField, Input, KpiTile, Select, Skeleton, StatusBadge } from "@rashpod/ui";
import DashboardLayout from "../../dashboard-layout";
import { api } from "../../../../lib/api";

type MarketplaceConfig = {
  id: string;
  key: string;
  name: string;
  isEnabled: boolean;
  currency: string;
  defaultLanguage: string;
  skuPrefix: string;
  exportFormats?: unknown;
  updatedAt: string;
};

type Mapping = {
  id: string;
  productTypeName?: string;
  baseProductName?: string | null;
  marketplaceCategoryId: string;
  marketplaceCategoryName: string;
  isActive: boolean;
};

type Candidate = {
  listingId: string;
  listingTitle: string;
  type: string;
  eligible: boolean;
  blockers: string[];
  warnings: string[];
  exportSku: string;
  row: { price?: number; currency?: string; categoryName?: string; imageUrls?: string };
};

type Batch = {
  id: string;
  marketplaceName?: string;
  status: string;
  exportFormat: string;
  itemCount: number;
  eligibleCount: number;
  blockedCount: number;
  generatedAt?: string | null;
  createdAt: string;
};

type ExportedListing = {
  id: string;
  listingId: string;
  marketplaceName: string;
  listingTitle: string;
  exportSku: string;
  exportTitle: string;
  exportPrice: number;
  currency: string;
  status: string;
  externalUrl?: string | null;
};

type ExternalSale = {
  id: string;
  marketplaceName: string;
  listingTitle: string;
  exportSku: string;
  externalOrderId?: string | null;
  quantity: number;
  salePrice: number;
  currency: string;
  status: string;
  createdAt: string;
};

type Overview = {
  kpis: { configs: number; batches: number; exportedListings: number; externalSales: number };
  recentBatches: Batch[];
};

type Tab = "overview" | "settings" | "mappings" | "candidates" | "batches" | "exported" | "sales" | "legacy";

const tabs: Array<{ key: Tab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "settings", label: "Settings" },
  { key: "mappings", label: "Mappings" },
  { key: "candidates", label: "Candidates" },
  { key: "batches", label: "Batches" },
  { key: "exported", label: "Exported" },
  { key: "sales", label: "Sales" },
  { key: "legacy", label: "Legacy CSV" },
];

function money(value: number, currency = "UZS") {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value) + " " + currency;
}

function compactId(id: string) {
  return id.slice(0, 8);
}

export default function AdminMarketplacePage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [configs, setConfigs] = useState<MarketplaceConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState("");
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedListingIds, setSelectedListingIds] = useState<string[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [exportedListings, setExportedListings] = useState<ExportedListing[]>([]);
  const [externalSales, setExternalSales] = useState<ExternalSale[]>([]);
  const [legacyData, setLegacyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [configForm, setConfigForm] = useState({ key: "UZUM", name: "Uzum manual export", skuPrefix: "RPD-UZUM", currency: "UZS", defaultLanguage: "uz-Latn" });
  const [mappingForm, setMappingForm] = useState({ productTypeId: "", baseProductId: "", marketplaceCategoryId: "", marketplaceCategoryName: "" });
  const [batchFormat, setBatchFormat] = useState("CSV_WITH_IMAGE_URLS");
  const [legacyType, setLegacyType] = useState<"" | "PRODUCT" | "FILM">("");
  const [saleForm, setSaleForm] = useState({ exportedListingId: "", listingId: "", exportSku: "", externalOrderId: "", quantity: "1", salePrice: "", currency: "UZS" });

  const selectedConfig = useMemo(() => configs.find((config) => config.id === selectedConfigId) ?? configs[0], [configs, selectedConfigId]);

  async function loadAll(nextConfigId = selectedConfigId) {
    setError("");
    setLoading(true);
    try {
      const [overviewResult, configResult, batchResult, exportedResult, salesResult] = await Promise.all([
        api.get<Overview>("/admin/marketplace/overview"),
        api.get<MarketplaceConfig[]>("/admin/marketplace/configs"),
        api.get<Batch[]>("/admin/marketplace/export-batches"),
        api.get<ExportedListing[]>("/admin/marketplace/exported-listings"),
        api.get<ExternalSale[]>("/admin/marketplace/external-sales"),
      ]);
      setOverview(overviewResult);
      setConfigs(configResult);
      setBatches(batchResult);
      setExportedListings(exportedResult);
      setExternalSales(salesResult);
      const configId = nextConfigId || configResult[0]?.id || "";
      setSelectedConfigId(configId);
      if (configId) {
        const [mappingResult, candidateResult] = await Promise.all([
          api.get<Mapping[]>(`/admin/marketplace/configs/${configId}/category-mappings`),
          api.get<{ items: Candidate[] }>(`/admin/marketplace/configs/${configId}/export-candidates`),
        ]);
        setMappings(mappingResult);
        setCandidates(candidateResult.items);
      } else {
        setMappings([]);
        setCandidates([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Marketplace data could not be loaded");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy("");
    }
  }

  async function createConfig(event: FormEvent) {
    event.preventDefault();
    await run("config", async () => {
      const created = await api.post<MarketplaceConfig>("/admin/marketplace/configs", configForm);
      setNotice(`Created ${created.name}`);
      await loadAll(created.id);
      setTab("settings");
    });
  }

  async function createMapping(event: FormEvent) {
    event.preventDefault();
    if (!selectedConfig) return;
    await run("mapping", async () => {
      await api.post(`/admin/marketplace/configs/${selectedConfig.id}/category-mappings`, {
        productTypeId: mappingForm.productTypeId,
        baseProductId: mappingForm.baseProductId || undefined,
        marketplaceCategoryId: mappingForm.marketplaceCategoryId,
        marketplaceCategoryName: mappingForm.marketplaceCategoryName,
      });
      setNotice("Mapping saved");
      setMappingForm({ productTypeId: "", baseProductId: "", marketplaceCategoryId: "", marketplaceCategoryName: "" });
      await loadAll(selectedConfig.id);
    });
  }

  async function refreshCandidates() {
    if (!selectedConfig) return;
    await run("candidates", async () => {
      const result = await api.get<{ items: Candidate[] }>(`/admin/marketplace/configs/${selectedConfig.id}/export-candidates`);
      setCandidates(result.items);
      setSelectedListingIds([]);
      setNotice("Candidates refreshed");
    });
  }

  async function createBatch() {
    if (!selectedConfig || selectedListingIds.length === 0) return;
    await run("batch", async () => {
      const batch = await api.post<Batch>("/admin/marketplace/export-batches", { marketplaceConfigId: selectedConfig.id, listingIds: selectedListingIds, exportFormat: batchFormat });
      setNotice(`Batch ${compactId(batch.id)} created`);
      setSelectedListingIds([]);
      await loadAll(selectedConfig.id);
      setTab("batches");
    });
  }

  async function generateBatch(batchId: string) {
    await run(batchId, async () => {
      await api.post(`/admin/marketplace/export-batches/${batchId}/generate`);
      setNotice(`Batch ${compactId(batchId)} generated`);
      await loadAll(selectedConfig?.id);
    });
  }

  async function markBatchExported(batchId: string) {
    await run(`exported-${batchId}`, async () => {
      await api.post(`/admin/marketplace/export-batches/${batchId}/mark-exported`);
      setNotice(`Batch ${compactId(batchId)} marked exported`);
      await loadAll(selectedConfig?.id);
    });
  }

  async function downloadBatch(batchId: string) {
    await run(`download-${batchId}`, async () => {
      const result = await api.get<{ url: string }>(`/admin/marketplace/export-batches/${batchId}/download`);
      window.open(result.url, "_blank", "noopener,noreferrer");
      setNotice("Download link opened");
    });
  }

  async function markListed(row: ExportedListing) {
    await run(row.id, async () => {
      await api.post(`/admin/marketplace/exported-listings/${row.id}/mark-listed`, { externalUrl: row.externalUrl, externalListingId: row.exportSku });
      setNotice(`${row.exportSku} marked listed`);
      await loadAll(selectedConfig?.id);
    });
  }

  async function archiveListing(row: ExportedListing) {
    await run(`archive-${row.id}`, async () => {
      await api.post(`/admin/marketplace/exported-listings/${row.id}/archive`);
      setNotice(`${row.exportSku} archived`);
      await loadAll(selectedConfig?.id);
    });
  }

  async function recordSale(event: FormEvent) {
    event.preventDefault();
    const exported = exportedListings.find((item) => item.id === saleForm.exportedListingId);
    await run("sale", async () => {
      await api.post("/admin/marketplace/external-sales", {
        marketplaceConfigId: selectedConfig?.id,
        exportedListingId: saleForm.exportedListingId || undefined,
        listingId: saleForm.listingId || exported?.listingId,
        exportSku: saleForm.exportSku || exported?.exportSku,
        externalOrderId: saleForm.externalOrderId || undefined,
        quantity: Number(saleForm.quantity || 1),
        salePrice: Number(saleForm.salePrice || exported?.exportPrice || 0),
        currency: saleForm.currency || exported?.currency || "UZS",
      });
      setNotice("External sale recorded");
      setSaleForm({ exportedListingId: "", listingId: "", exportSku: "", externalOrderId: "", quantity: "1", salePrice: "", currency: "UZS" });
      await loadAll(selectedConfig?.id);
    });
  }

  async function runLegacyExport(event: FormEvent) {
    event.preventDefault();
    await run("legacy", async () => {
      const params = new URLSearchParams();
      if (legacyType) params.set("type", legacyType);
      const data = await api.get<any>(`/admin/marketplace/export?${params.toString()}`);
      setLegacyData(data);
    });
  }

  const configColumns: DataTableColumn<MarketplaceConfig>[] = [
    { key: "name", header: "Marketplace" },
    { key: "key", header: "Key" },
    { key: "skuPrefix", header: "SKU Prefix" },
    { key: "currency", header: "Currency" },
    { key: "isEnabled", header: "State", render: (_, row) => <StatusBadge status={row.isEnabled ? "enabled" : "disabled"} /> },
  ];

  const mappingColumns: DataTableColumn<Mapping>[] = [
    { key: "productTypeName", header: "Product Type", render: (value, row) => value || row.baseProductName || "Unassigned" },
    { key: "baseProductName", header: "Base Product", render: (value) => value || "All" },
    { key: "marketplaceCategoryId", header: "External ID" },
    { key: "marketplaceCategoryName", header: "Category" },
    { key: "isActive", header: "State", render: (_, row) => <StatusBadge status={row.isActive ? "active" : "inactive"} /> },
  ];

  const candidateColumns: DataTableColumn<Candidate>[] = [
    {
      key: "selected",
      header: "Pick",
      render: (_, row) => (
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={selectedListingIds.includes(row.listingId)}
          disabled={!row.eligible}
          onChange={(event) => setSelectedListingIds((current) => event.target.checked ? [...current, row.listingId] : current.filter((id) => id !== row.listingId))}
        />
      ),
    },
    { key: "listingTitle", header: "Listing" },
    { key: "exportSku", header: "SKU" },
    { key: "row", header: "Price", render: (_, row) => money(Number(row.row.price ?? 0), row.row.currency) },
    { key: "eligible", header: "Eligibility", render: (_, row) => <StatusBadge status={row.eligible ? "ready" : "blocked"} /> },
    { key: "blockers", header: "Signals", render: (_, row) => row.blockers.concat(row.warnings).slice(0, 2).join(", ") || "Ready" },
  ];

  const batchColumns: DataTableColumn<Batch>[] = [
    { key: "id", header: "Batch", render: (value) => compactId(String(value)) },
    { key: "marketplaceName", header: "Marketplace" },
    { key: "exportFormat", header: "Format" },
    { key: "itemCount", header: "Items", render: (_, row) => `${row.eligibleCount}/${row.itemCount} ready` },
    { key: "status", header: "Status", render: (_, row) => <StatusBadge status={row.status.toLowerCase()} /> },
    {
      key: "actions",
      header: "Actions",
      render: (_, row) => (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" loading={busy === row.id} onClick={() => generateBatch(row.id)} disabled={row.blockedCount > 0}><FileSpreadsheet size={14} /> Generate</Button>
          <Button size="sm" variant="secondary" loading={busy === `download-${row.id}`} onClick={() => downloadBatch(row.id)} disabled={!row.generatedAt}><Download size={14} /> Download</Button>
          <Button size="sm" variant="secondary" loading={busy === `exported-${row.id}`} onClick={() => markBatchExported(row.id)} disabled={!row.generatedAt}><PackageCheck size={14} /> Exported</Button>
        </div>
      ),
    },
  ];

  const exportedColumns: DataTableColumn<ExportedListing>[] = [
    { key: "exportSku", header: "SKU" },
    { key: "exportTitle", header: "Title" },
    { key: "marketplaceName", header: "Marketplace" },
    { key: "exportPrice", header: "Price", render: (_, row) => money(row.exportPrice, row.currency) },
    { key: "status", header: "Status", render: (_, row) => <StatusBadge status={row.status.toLowerCase()} /> },
    {
      key: "actions",
      header: "Actions",
      render: (_, row) => (
        <div className="flex flex-wrap gap-2">
          {row.externalUrl ? <a className="inline-flex h-[38px] items-center gap-2 rounded-pill border border-brand-blue/35 px-4 text-[13px] font-semibold text-brand-blue" href={row.externalUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Open</a> : null}
          <Button size="sm" variant="secondary" onClick={() => markListed(row)} loading={busy === row.id}><Link2 size={14} /> Listed</Button>
          <Button size="sm" variant="ghost" onClick={() => archiveListing(row)} loading={busy === `archive-${row.id}`}><Archive size={14} /> Archive</Button>
        </div>
      ),
    },
  ];

  const saleColumns: DataTableColumn<ExternalSale>[] = [
    { key: "externalOrderId", header: "External Order", render: (value) => value || "Manual" },
    { key: "listingTitle", header: "Listing" },
    { key: "exportSku", header: "SKU" },
    { key: "quantity", header: "Qty" },
    { key: "salePrice", header: "Sale", render: (_, row) => money(row.salePrice, row.currency) },
    { key: "status", header: "Status", render: (_, row) => <StatusBadge status={row.status.toLowerCase()} /> },
  ];

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-brand-ink">Marketplace Export</h1>
            <p className="mt-1 text-sm text-brand-muted">Manual marketplace packages, listing tracking, and external sale records.</p>
          </div>
          <Button variant="secondary" onClick={() => loadAll(selectedConfig?.id)} loading={busy === "refresh"}><RefreshCw size={16} /> Refresh</Button>
        </div>

        {error ? <ErrorState title="Marketplace issue" description={error} /> : null}
        {notice ? <div className="rounded-[8px] border border-semantic-success/25 bg-semantic-successBg px-4 py-3 text-sm font-semibold text-semantic-successText">{notice}</div> : null}

        <div className="flex gap-2 overflow-x-auto rounded-[8px] border border-brand-line bg-white p-2">
          {tabs.map((item) => (
            <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`min-h-10 shrink-0 rounded-[8px] px-4 text-sm font-semibold ${tab === item.key ? "bg-brand-blue text-white" : "text-brand-muted hover:bg-surface-subtle"}`}>{item.label}</button>
          ))}
        </div>

        {loading ? <Skeleton className="h-80" /> : null}

        {!loading && tab === "overview" ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <KpiTile label="Marketplaces" value={overview?.kpis.configs ?? 0} icon={<Store size={24} />} />
              <KpiTile label="Export Batches" value={overview?.kpis.batches ?? 0} icon={<Boxes size={24} />} />
              <KpiTile label="Exported Listings" value={overview?.kpis.exportedListings ?? 0} icon={<CheckCircle2 size={24} />} />
              <KpiTile label="External Sales" value={overview?.kpis.externalSales ?? 0} icon={<Tag size={24} />} />
            </div>
            <Card>
              <div className="mb-4 flex items-center gap-2"><PackageCheck size={18} /><h2 className="text-lg font-semibold text-brand-ink">Recent Batches</h2></div>
              <DataTable columns={batchColumns.slice(0, 5)} rows={overview?.recentBatches ?? []} emptyState={<EmptyState title="No batches yet" description="Create a batch from eligible candidates." />} />
            </Card>
          </div>
        ) : null}

        {!loading && tab === "settings" ? (
          <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
            <Card>
              <div className="mb-4 flex items-center gap-2"><Settings size={18} /><h2 className="text-lg font-semibold text-brand-ink">Marketplace Settings</h2></div>
              <DataTable columns={configColumns} rows={configs} emptyState={<EmptyState title="No marketplace configs" description="Create a manual export config to begin." />} />
            </Card>
            <Card>
              <h2 className="mb-4 text-lg font-semibold text-brand-ink">Create Config</h2>
              <form onSubmit={createConfig} className="space-y-4">
                <FormField label="Marketplace"><Select value={configForm.key} onChange={(event) => setConfigForm({ ...configForm, key: event.target.value })}><option value="UZUM">Uzum</option><option value="OLX_UZ">OLX Uzbekistan</option><option value="TELEGRAM_SHOP">Telegram Shop</option><option value="INSTAGRAM">Instagram</option><option value="FACEBOOK">Facebook</option><option value="OTHER">Other</option></Select></FormField>
                <FormField label="Name"><Input value={configForm.name} onChange={(event) => setConfigForm({ ...configForm, name: event.target.value })} /></FormField>
                <FormField label="SKU Prefix"><Input value={configForm.skuPrefix} onChange={(event) => setConfigForm({ ...configForm, skuPrefix: event.target.value })} /></FormField>
                <div className="grid grid-cols-2 gap-3"><FormField label="Currency"><Input value={configForm.currency} onChange={(event) => setConfigForm({ ...configForm, currency: event.target.value })} /></FormField><FormField label="Language"><Input value={configForm.defaultLanguage} onChange={(event) => setConfigForm({ ...configForm, defaultLanguage: event.target.value })} /></FormField></div>
                <Button type="submit" loading={busy === "config"}><Plus size={16} /> Create</Button>
              </form>
            </Card>
          </div>
        ) : null}

        {!loading && tab === "mappings" ? (
          <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
            <Card><h2 className="mb-4 text-lg font-semibold text-brand-ink">Category Mappings</h2><DataTable columns={mappingColumns} rows={mappings} emptyState={<EmptyState title="No mappings" description="Map RashPOD product types to marketplace categories." />} /></Card>
            <Card>
              <h2 className="mb-4 text-lg font-semibold text-brand-ink">Add Mapping</h2>
              <form onSubmit={createMapping} className="space-y-4">
                <FormField label="Marketplace"><Select value={selectedConfig?.id ?? ""} onChange={(event) => { setSelectedConfigId(event.target.value); loadAll(event.target.value); }}>{configs.map((config) => <option key={config.id} value={config.id}>{config.name}</option>)}</Select></FormField>
                <FormField label="Product type id"><Input value={mappingForm.productTypeId} onChange={(event) => setMappingForm({ ...mappingForm, productTypeId: event.target.value })} /></FormField>
                <FormField label="Base product id"><Input value={mappingForm.baseProductId} onChange={(event) => setMappingForm({ ...mappingForm, baseProductId: event.target.value })} placeholder="Optional" /></FormField>
                <FormField label="Marketplace category id"><Input value={mappingForm.marketplaceCategoryId} onChange={(event) => setMappingForm({ ...mappingForm, marketplaceCategoryId: event.target.value })} /></FormField>
                <FormField label="Marketplace category name"><Input value={mappingForm.marketplaceCategoryName} onChange={(event) => setMappingForm({ ...mappingForm, marketplaceCategoryName: event.target.value })} /></FormField>
                <Button type="submit" loading={busy === "mapping"} disabled={!selectedConfig}><Plus size={16} /> Save</Button>
              </form>
            </Card>
          </div>
        ) : null}

        {!loading && tab === "candidates" ? (
          <Card>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div><h2 className="text-lg font-semibold text-brand-ink">Export Candidates</h2><p className="text-sm text-brand-muted">Eligible listings can be selected into a manual export batch.</p></div>
              <div className="flex flex-wrap gap-2"><Select className="w-56" value={batchFormat} onChange={(event) => setBatchFormat(event.target.value)}><option value="CSV_WITH_IMAGE_URLS">CSV + image URLs</option><option value="CSV">CSV</option><option value="XLSX">XLSX</option><option value="ZIP_IMAGES">ZIP package</option></Select><Button variant="secondary" onClick={refreshCandidates} loading={busy === "candidates"}><RefreshCw size={16} /> Validate</Button><Button onClick={createBatch} loading={busy === "batch"} disabled={selectedListingIds.length === 0}><Plus size={16} /> Create Batch</Button></div>
            </div>
            <DataTable columns={candidateColumns} rows={candidates} emptyState={<EmptyState title="No candidates" description="Published listings will appear after a marketplace config exists." />} />
          </Card>
        ) : null}

        {!loading && tab === "batches" ? <Card><h2 className="mb-4 text-lg font-semibold text-brand-ink">Export Batches</h2><DataTable columns={batchColumns} rows={batches} emptyState={<EmptyState title="No export batches" description="Create a batch from eligible candidates." />} /></Card> : null}

        {!loading && tab === "exported" ? <Card><h2 className="mb-4 text-lg font-semibold text-brand-ink">Exported Listings</h2><DataTable columns={exportedColumns} rows={exportedListings} emptyState={<EmptyState title="No exported listings" description="Mark a generated batch as exported to create listing records." />} /></Card> : null}

        {!loading && tab === "sales" ? (
          <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
            <Card><h2 className="mb-4 text-lg font-semibold text-brand-ink">Manual External Sales</h2><DataTable columns={saleColumns} rows={externalSales} emptyState={<EmptyState title="No external sales" description="Record marketplace sales manually; conversion is deferred." />} /></Card>
            <Card>
              <h2 className="mb-4 text-lg font-semibold text-brand-ink">Record Sale</h2>
              <form onSubmit={recordSale} className="space-y-4">
                <FormField label="Exported listing"><Select value={saleForm.exportedListingId} onChange={(event) => { const row = exportedListings.find((item) => item.id === event.target.value); setSaleForm({ ...saleForm, exportedListingId: event.target.value, exportSku: row?.exportSku ?? saleForm.exportSku, salePrice: row ? String(row.exportPrice) : saleForm.salePrice, currency: row?.currency ?? saleForm.currency }); }}><option value="">Choose exported listing</option>{exportedListings.map((row) => <option key={row.id} value={row.id}>{row.exportSku} - {row.exportTitle}</option>)}</Select></FormField>
                <FormField label="Listing id"><Input value={saleForm.listingId} onChange={(event) => setSaleForm({ ...saleForm, listingId: event.target.value })} placeholder="Required when no exported listing is selected" /></FormField>
                <FormField label="Export SKU"><Input value={saleForm.exportSku} onChange={(event) => setSaleForm({ ...saleForm, exportSku: event.target.value })} /></FormField>
                <FormField label="External order id"><Input value={saleForm.externalOrderId} onChange={(event) => setSaleForm({ ...saleForm, externalOrderId: event.target.value })} placeholder="Optional" /></FormField>
                <div className="grid grid-cols-3 gap-3"><FormField label="Qty"><Input value={saleForm.quantity} onChange={(event) => setSaleForm({ ...saleForm, quantity: event.target.value })} /></FormField><FormField label="Sale price"><Input value={saleForm.salePrice} onChange={(event) => setSaleForm({ ...saleForm, salePrice: event.target.value })} /></FormField><FormField label="Currency"><Input value={saleForm.currency} onChange={(event) => setSaleForm({ ...saleForm, currency: event.target.value })} /></FormField></div>
                <Button type="submit" loading={busy === "sale"} disabled={!selectedConfig}><Plus size={16} /> Record</Button>
              </form>
            </Card>
          </div>
        ) : null}

        {!loading && tab === "legacy" ? (
          <Card>
            <form onSubmit={runLegacyExport} className="mb-4 flex flex-wrap items-end gap-3"><FormField label="Listing type"><Select value={legacyType} onChange={(event) => setLegacyType(event.target.value as any)}><option value="">All</option><option value="PRODUCT">Product</option><option value="FILM">Film</option></Select></FormField><Button type="submit" loading={busy === "legacy"}><Download size={16} /> Export JSON</Button></form>
            {legacyData ? <pre className="overflow-x-auto rounded-[8px] bg-surface-subtle p-4 text-xs text-brand-ink">{JSON.stringify(legacyData.items?.slice(0, 20) ?? [], null, 2)}</pre> : <EmptyState title="No legacy export yet" description="Run the existing JSON export for compatibility checks." icon={<XCircle size={28} />} />}
          </Card>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
