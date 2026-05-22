"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Boxes, CheckCircle2, CloudCog, Link2, PackageCheck, RefreshCw, Settings, ShieldCheck, UploadCloud, XCircle } from "lucide-react";
import { Button, Card, DataTable, DataTableColumn, EmptyState, ErrorState, FormField, Input, KpiTile, Select, Skeleton, StatusBadge } from "@rashpod/ui";
import DashboardLayout from "../../dashboard-layout";
import { api } from "../../../../lib/api";

type ProviderConfig = {
  id: string;
  provider: "PRINTFUL" | "PRINTIFY";
  mode: "TEST" | "LIVE";
  displayName: string;
  isEnabled: boolean;
  defaultCurrency: string;
  credentialConfigured?: boolean;
  webhookSecretConfigured?: boolean;
  lastCatalogSyncStatus?: string | null;
  lastCatalogSyncError?: string | null;
  updatedAt: string;
};

type Overview = {
  providers: number;
  products: number;
  mappedProducts: number;
  printAreaMappings: number;
  readySyncRecords: number;
  failedSyncRecords: number;
  webhookEvents: number;
};

type CatalogProduct = {
  id: string;
  providerProductId: string;
  name: string;
  category?: string | null;
  availabilityStatus: string;
  currency: string;
  variants?: unknown[];
  printAreas?: unknown[];
};

type ProductMapping = {
  id: string;
  isActive: boolean;
  quality: string;
  defaultProviderVariantId?: string | null;
  productType?: { name: string };
  baseProduct?: { name: string } | null;
  providerProduct?: { name: string; providerProductId: string };
};

type PrintAreaMapping = {
  id: string;
  isActive: boolean;
  quality: string;
  providerPlacement?: string | null;
  providerWidth?: number | null;
  providerHeight?: number | null;
  providerUnits: string;
  printArea?: { name: string };
  providerProduct?: { name: string };
  providerPrintArea?: { name: string };
};

type Candidate = {
  listing: { id: string; title: string; status: string };
  readiness: { eligible: boolean; blockers: string[] };
};

type SyncRecord = {
  id: string;
  provider: string;
  mode: string;
  status: string;
  failureReason?: string | null;
  listing?: { title: string };
  providerProductId: string;
  providerVariantId?: string | null;
  updatedAt: string;
};

type Tab = "overview" | "providers" | "catalog" | "productMappings" | "printAreaMappings" | "candidates" | "syncRecords";

const tabs: Array<{ key: Tab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "providers", label: "Providers" },
  { key: "catalog", label: "Catalog" },
  { key: "productMappings", label: "Product mappings" },
  { key: "printAreaMappings", label: "Print areas" },
  { key: "candidates", label: "Candidates" },
  { key: "syncRecords", label: "Sync records" },
];

function shortId(id?: string | null) {
  return id ? id.slice(0, 8) : "-";
}

export default function AdminPodPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [productMappings, setProductMappings] = useState<ProductMapping[]>([]);
  const [printAreaMappings, setPrintAreaMappings] = useState<PrintAreaMapping[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [syncRecords, setSyncRecords] = useState<SyncRecord[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [providerForm, setProviderForm] = useState({ provider: "PRINTFUL", mode: "TEST", displayName: "Printful test", credentialEnvVar: "PRINTFUL_API_TOKEN", defaultCurrency: "USD" });
  const [productMappingForm, setProductMappingForm] = useState({ productTypeId: "", baseProductId: "", providerProductId: "", defaultProviderVariantId: "", quality: "MANUAL_REVIEW" });
  const [printAreaMappingForm, setPrintAreaMappingForm] = useState({ printAreaId: "", providerProductId: "", providerPrintAreaId: "", providerPlacement: "front", providerWidth: "", providerHeight: "", providerUnits: "INCH", providerDpi: "", quality: "MANUAL_REVIEW" });

  const selectedProvider = useMemo(() => providers.find((provider) => provider.id === selectedProviderId) ?? providers[0], [providers, selectedProviderId]);

  async function loadAll(nextProviderId = selectedProviderId) {
    setError("");
    setLoading(true);
    try {
      const [overviewResult, providerResult, syncRecordResult] = await Promise.all([
        api.get<Overview>("/admin/pod/overview"),
        api.get<ProviderConfig[]>("/admin/pod/providers"),
        api.get<SyncRecord[]>("/admin/pod/sync-records"),
      ]);
      const providerId = nextProviderId || providerResult[0]?.id || "";
      setOverview(overviewResult);
      setProviders(providerResult);
      setSelectedProviderId(providerId);
      setSyncRecords(syncRecordResult);
      const [catalogResult, productMappingResult, printAreaMappingResult, candidateResult] = await Promise.all([
        api.get<CatalogProduct[]>(providerId ? `/admin/pod/catalog?providerConfigId=${providerId}` : "/admin/pod/catalog"),
        api.get<ProductMapping[]>(providerId ? `/admin/pod/product-mappings?providerConfigId=${providerId}` : "/admin/pod/product-mappings"),
        api.get<PrintAreaMapping[]>(providerId ? `/admin/pod/print-area-mappings?providerConfigId=${providerId}` : "/admin/pod/print-area-mappings"),
        api.get<Candidate[]>(providerId ? `/admin/pod/global-candidates?providerConfigId=${providerId}` : "/admin/pod/global-candidates"),
      ]);
      setCatalog(catalogResult);
      setProductMappings(productMappingResult);
      setPrintAreaMappings(printAreaMappingResult);
      setCandidates(candidateResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Global POD data could not be loaded");
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

  async function createProvider(event: FormEvent) {
    event.preventDefault();
    await run("provider", async () => {
      const created = await api.post<ProviderConfig>("/admin/pod/providers", providerForm);
      setNotice(`Created ${created.displayName}`);
      await loadAll(created.id);
      setTab("providers");
    });
  }

  async function syncCatalog() {
    if (!selectedProvider) return;
    await run("catalog", async () => {
      await api.post(`/admin/pod/providers/${selectedProvider.id}/sync-catalog`, {});
      setNotice("Catalog sync queued");
      await loadAll(selectedProvider.id);
    });
  }

  async function setProviderEnabled(enabled: boolean) {
    if (!selectedProvider) return;
    await run("provider-toggle", async () => {
      await api.post(`/admin/pod/providers/${selectedProvider.id}/${enabled ? "enable" : "disable"}`, {});
      setNotice(enabled ? "Provider enabled" : "Provider disabled");
      await loadAll(selectedProvider.id);
    });
  }

  async function createProductMapping(event: FormEvent) {
    event.preventDefault();
    if (!selectedProvider) return;
    await run("product-mapping", async () => {
      await api.post("/admin/pod/product-mappings", {
        providerConfigId: selectedProvider.id,
        productTypeId: productMappingForm.productTypeId,
        baseProductId: productMappingForm.baseProductId || undefined,
        providerProductId: productMappingForm.providerProductId,
        defaultProviderVariantId: productMappingForm.defaultProviderVariantId || undefined,
        quality: productMappingForm.quality,
      });
      setNotice("Product mapping saved");
      await loadAll(selectedProvider.id);
    });
  }

  async function createPrintAreaMapping(event: FormEvent) {
    event.preventDefault();
    if (!selectedProvider) return;
    await run("print-area-mapping", async () => {
      await api.post("/admin/pod/print-area-mappings", {
        providerConfigId: selectedProvider.id,
        printAreaId: printAreaMappingForm.printAreaId,
        providerProductId: printAreaMappingForm.providerProductId,
        providerPrintAreaId: printAreaMappingForm.providerPrintAreaId,
        providerPlacement: printAreaMappingForm.providerPlacement,
        providerWidth: Number(printAreaMappingForm.providerWidth),
        providerHeight: Number(printAreaMappingForm.providerHeight),
        providerUnits: printAreaMappingForm.providerUnits,
        providerDpi: printAreaMappingForm.providerDpi ? Number(printAreaMappingForm.providerDpi) : undefined,
        quality: printAreaMappingForm.quality,
      });
      setNotice("Print area mapping saved");
      await loadAll(selectedProvider.id);
    });
  }

  async function createSyncRecord(listingId: string) {
    if (!selectedProvider) return;
    await run(`sync-${listingId}`, async () => {
      await api.post(`/admin/pod/global-candidates/${listingId}/create-sync-record`, { providerConfigId: selectedProvider.id });
      setNotice("Sync record created");
      await loadAll(selectedProvider.id);
      setTab("syncRecords");
    });
  }

  async function requestSync(recordId: string) {
    await run(`record-${recordId}`, async () => {
      await api.post(`/admin/pod/sync-records/${recordId}/sync`, {});
      setNotice("Provider draft sync queued");
      await loadAll(selectedProvider?.id);
    });
  }

  const providerColumns: DataTableColumn<ProviderConfig>[] = [
    { key: "displayName", header: "Provider", render: (_value, row) => <div><p className="font-semibold">{row.displayName}</p><p className="text-xs text-brand-muted">{row.provider} · {row.mode}</p></div> },
    { key: "isEnabled", header: "State", render: (_value, row) => <StatusBadge status={row.isEnabled ? "approved" : "draft"} label={row.isEnabled ? "Enabled" : "Disabled"} /> },
    { key: "credentialConfigured", header: "Credential", render: (_value, row) => <StatusBadge status={row.credentialConfigured ? "approved" : "needs_fix"} label={row.credentialConfigured ? "Configured" : "Missing"} /> },
    { key: "lastCatalogSyncStatus", header: "Catalog", render: (value, row) => <div><StatusBadge status={String(value || "pending")} label={String(value || "Not synced")} />{row.lastCatalogSyncError && <p className="mt-1 text-xs text-semantic-dangerText">{row.lastCatalogSyncError}</p>}</div> },
  ];

  const catalogColumns: DataTableColumn<CatalogProduct>[] = [
    { key: "name", header: "Product", render: (_value, row) => <div><p className="font-semibold">{row.name}</p><p className="text-xs text-brand-muted">{row.providerProductId}</p></div> },
    { key: "category", header: "Category", render: (value) => value || "-" },
    { key: "availabilityStatus", header: "Status", render: (value) => <StatusBadge status={String(value)} /> },
    { key: "variants", header: "Variants", render: (_value, row) => row.variants?.length ?? 0 },
    { key: "printAreas", header: "Print areas", render: (_value, row) => row.printAreas?.length ?? 0 },
  ];

  const productMappingColumns: DataTableColumn<ProductMapping>[] = [
    { key: "productType", header: "RashPOD product", render: (_value, row) => <div><p>{row.productType?.name || "-"}</p><p className="text-xs text-brand-muted">{row.baseProduct?.name || "Any base product"}</p></div> },
    { key: "providerProduct", header: "Provider product", render: (_value, row) => <div><p>{row.providerProduct?.name || "-"}</p><p className="text-xs text-brand-muted">{row.providerProduct?.providerProductId || "-"}</p></div> },
    { key: "defaultProviderVariantId", header: "Default variant", render: (value) => shortId(value) },
    { key: "quality", header: "Quality", render: (value) => <StatusBadge status={String(value).toLowerCase()} label={String(value)} /> },
  ];

  const printAreaMappingColumns: DataTableColumn<PrintAreaMapping>[] = [
    { key: "printArea", header: "RashPOD area", render: (_value, row) => row.printArea?.name || "-" },
    { key: "providerPrintArea", header: "Provider area", render: (_value, row) => <div><p>{row.providerPrintArea?.name || "-"}</p><p className="text-xs text-brand-muted">{row.providerPlacement || "placement unset"}</p></div> },
    { key: "providerWidth", header: "Dimensions", render: (_value, row) => `${row.providerWidth ?? "-"} × ${row.providerHeight ?? "-"} ${row.providerUnits}` },
    { key: "quality", header: "Quality", render: (value) => <StatusBadge status={String(value).toLowerCase()} label={String(value)} /> },
  ];

  const candidateColumns: DataTableColumn<Candidate>[] = [
    { key: "listing", header: "Listing", render: (_value, row) => <div><p className="font-semibold">{row.listing.title}</p><p className="text-xs text-brand-muted">{shortId(row.listing.id)} · {row.listing.status}</p></div> },
    { key: "readiness", header: "Readiness", render: (_value, row) => <StatusBadge status={row.readiness.eligible ? "approved" : "needs_fix"} label={row.readiness.eligible ? "Ready" : "Blocked"} /> },
    { key: "blockers", header: "Blockers", render: (_value, row) => row.readiness.blockers.length ? <p className="max-w-[360px] text-xs text-brand-muted">{row.readiness.blockers.join("; ")}</p> : "-" },
    { key: "actions", header: "Actions", render: (_value, row) => <Button size="sm" variant="secondary" loading={busy === `sync-${row.listing.id}`} onClick={() => createSyncRecord(row.listing.id)}><Link2 size={15} /> Sync record</Button> },
  ];

  const syncColumns: DataTableColumn<SyncRecord>[] = [
    { key: "listing", header: "Listing", render: (_value, row) => <div><p className="font-semibold">{row.listing?.title || shortId(row.id)}</p><p className="text-xs text-brand-muted">{row.provider} · {row.mode}</p></div> },
    { key: "status", header: "Status", render: (value, row) => <div><StatusBadge status={String(value)} />{row.failureReason && <p className="mt-1 text-xs text-semantic-dangerText">{row.failureReason}</p>}</div> },
    { key: "providerProductId", header: "Provider product", render: (value, row) => <div><p>{shortId(String(value))}</p><p className="text-xs text-brand-muted">{shortId(row.providerVariantId)}</p></div> },
    { key: "actions", header: "Actions", render: (_value, row) => <Button size="sm" variant="secondary" loading={busy === `record-${row.id}`} disabled={!['READY','FAILED'].includes(row.status)} onClick={() => requestSync(row.id)}><UploadCloud size={15} /> Queue</Button> },
  ];

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-blue">Global POD</p>
            <h1 className="text-3xl font-bold text-brand-ink">Provider foundation</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={selectedProvider?.id || ""} onChange={(event) => loadAll(event.target.value)} aria-label="Select provider">
              {providers.length === 0 && <option value="">No providers</option>}
              {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.displayName} · {provider.mode}</option>)}
            </Select>
            <Button variant="secondary" onClick={() => loadAll(selectedProvider?.id)} loading={busy === "reload"}><RefreshCw size={16} /> Refresh</Button>
          </div>
        </div>

        {error && <ErrorState title="Global POD action failed" description={error} />}
        {notice && <Card className="border-semantic-success/25 bg-semantic-successBg text-sm text-semantic-successText">{notice}</Card>}

        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <Button key={item.key} type="button" size="sm" variant={tab === item.key ? "primaryBlue" : "secondary"} onClick={() => setTab(item.key)}>{item.label}</Button>
          ))}
        </div>

        {loading ? <Skeleton className="h-64" /> : (
          <>
            {tab === "overview" && overview && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <KpiTile label="Providers" value={overview.providers} icon={<CloudCog size={22} />} />
                <KpiTile label="Catalog products" value={overview.products} icon={<Boxes size={22} />} />
                <KpiTile label="Mapped products" value={overview.mappedProducts} icon={<Link2 size={22} />} />
                <KpiTile label="Ready syncs" value={overview.readySyncRecords} icon={<PackageCheck size={22} />} />
                <KpiTile label="Print area mappings" value={overview.printAreaMappings} icon={<ShieldCheck size={22} />} />
                <KpiTile label="Failed syncs" value={overview.failedSyncRecords} icon={<XCircle size={22} />} />
                <KpiTile label="Webhook events" value={overview.webhookEvents} icon={<Settings size={22} />} />
              </div>
            )}

            {tab === "providers" && (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                <Card className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-brand-ink">Provider settings</h2>
                    {selectedProvider && <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => setProviderEnabled(true)}><CheckCircle2 size={15} /> Enable</Button><Button size="sm" variant="secondary" onClick={() => setProviderEnabled(false)}><XCircle size={15} /> Disable</Button><Button size="sm" variant="secondary" onClick={syncCatalog} loading={busy === "catalog"}><RefreshCw size={15} /> Sync catalog</Button></div>}
                  </div>
                  <DataTable columns={providerColumns} rows={providers} emptyState={<EmptyState title="No providers" description="Create Printful or Printify configuration to begin." />} />
                </Card>
                <Card>
                  <form onSubmit={createProvider} className="space-y-3">
                    <h2 className="text-lg font-semibold text-brand-ink">Add provider</h2>
                    <FormField label="Provider"><Select value={providerForm.provider} onChange={(event) => setProviderForm({ ...providerForm, provider: event.target.value })}><option value="PRINTFUL">Printful</option><option value="PRINTIFY">Printify</option></Select></FormField>
                    <FormField label="Mode"><Select value={providerForm.mode} onChange={(event) => setProviderForm({ ...providerForm, mode: event.target.value })}><option value="TEST">Test</option><option value="LIVE">Live</option></Select></FormField>
                    <FormField label="Display name"><Input value={providerForm.displayName} onChange={(event) => setProviderForm({ ...providerForm, displayName: event.target.value })} /></FormField>
                    <FormField label="Credential env var"><Input value={providerForm.credentialEnvVar} onChange={(event) => setProviderForm({ ...providerForm, credentialEnvVar: event.target.value })} /></FormField>
                    <FormField label="Currency"><Input value={providerForm.defaultCurrency} onChange={(event) => setProviderForm({ ...providerForm, defaultCurrency: event.target.value })} /></FormField>
                    <Button type="submit" loading={busy === "provider"}><CloudCog size={16} /> Save provider</Button>
                  </form>
                </Card>
              </div>
            )}

            {tab === "catalog" && <DataTable columns={catalogColumns} rows={catalog} emptyState={<EmptyState title="No catalog products" description="Sync a provider catalog to populate products." />} />}

            {tab === "productMappings" && (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
                <DataTable columns={productMappingColumns} rows={productMappings} emptyState={<EmptyState title="No product mappings" description="Map RashPOD products to provider products." />} />
                <Card><form onSubmit={createProductMapping} className="space-y-3"><h2 className="text-lg font-semibold text-brand-ink">Add product mapping</h2><FormField label="Product type ID"><Input value={productMappingForm.productTypeId} onChange={(event) => setProductMappingForm({ ...productMappingForm, productTypeId: event.target.value })} /></FormField><FormField label="Base product ID"><Input value={productMappingForm.baseProductId} onChange={(event) => setProductMappingForm({ ...productMappingForm, baseProductId: event.target.value })} /></FormField><FormField label="Provider product ID"><Input value={productMappingForm.providerProductId} onChange={(event) => setProductMappingForm({ ...productMappingForm, providerProductId: event.target.value })} /></FormField><FormField label="Default provider variant"><Input value={productMappingForm.defaultProviderVariantId} onChange={(event) => setProductMappingForm({ ...productMappingForm, defaultProviderVariantId: event.target.value })} /></FormField><FormField label="Quality"><Select value={productMappingForm.quality} onChange={(event) => setProductMappingForm({ ...productMappingForm, quality: event.target.value })}><option value="EXACT">Exact</option><option value="COMPATIBLE">Compatible</option><option value="MANUAL_REVIEW">Manual review</option></Select></FormField><Button type="submit" loading={busy === "product-mapping"}><Link2 size={16} /> Save mapping</Button></form></Card>
              </div>
            )}

            {tab === "printAreaMappings" && (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
                <DataTable columns={printAreaMappingColumns} rows={printAreaMappings} emptyState={<EmptyState title="No print area mappings" description="Connect RashPOD print areas to provider print areas." />} />
                <Card><form onSubmit={createPrintAreaMapping} className="space-y-3"><h2 className="text-lg font-semibold text-brand-ink">Add print area mapping</h2><FormField label="RashPOD print area ID"><Input value={printAreaMappingForm.printAreaId} onChange={(event) => setPrintAreaMappingForm({ ...printAreaMappingForm, printAreaId: event.target.value })} /></FormField><FormField label="Provider product ID"><Input value={printAreaMappingForm.providerProductId} onChange={(event) => setPrintAreaMappingForm({ ...printAreaMappingForm, providerProductId: event.target.value })} /></FormField><FormField label="Provider print area ID"><Input value={printAreaMappingForm.providerPrintAreaId} onChange={(event) => setPrintAreaMappingForm({ ...printAreaMappingForm, providerPrintAreaId: event.target.value })} /></FormField><FormField label="Provider placement"><Input value={printAreaMappingForm.providerPlacement} onChange={(event) => setPrintAreaMappingForm({ ...printAreaMappingForm, providerPlacement: event.target.value })} /></FormField><div className="grid grid-cols-2 gap-3"><FormField label="Width"><Input value={printAreaMappingForm.providerWidth} onChange={(event) => setPrintAreaMappingForm({ ...printAreaMappingForm, providerWidth: event.target.value })} /></FormField><FormField label="Height"><Input value={printAreaMappingForm.providerHeight} onChange={(event) => setPrintAreaMappingForm({ ...printAreaMappingForm, providerHeight: event.target.value })} /></FormField></div><FormField label="Units"><Select value={printAreaMappingForm.providerUnits} onChange={(event) => setPrintAreaMappingForm({ ...printAreaMappingForm, providerUnits: event.target.value })}><option value="INCH">Inch</option><option value="CM">Cm</option><option value="PX">Px</option></Select></FormField><FormField label="DPI"><Input value={printAreaMappingForm.providerDpi} onChange={(event) => setPrintAreaMappingForm({ ...printAreaMappingForm, providerDpi: event.target.value })} /></FormField><Button type="submit" loading={busy === "print-area-mapping"}><ShieldCheck size={16} /> Save mapping</Button></form></Card>
              </div>
            )}

            {tab === "candidates" && <DataTable columns={candidateColumns} rows={candidates} emptyState={<EmptyState title="No candidates" description="Published product listings will appear when they can be reviewed for provider sync." />} />}
            {tab === "syncRecords" && <DataTable columns={syncColumns} rows={syncRecords} emptyState={<EmptyState title="No sync records" description="Create a sync record from a global candidate." />} />}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
