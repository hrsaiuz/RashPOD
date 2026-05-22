"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, FileSpreadsheet, PackageCheck, Plus, RefreshCw, Search, ShieldAlert, UploadCloud, XCircle } from "lucide-react";
import { Button, Card, DataTable, DataTableColumn, EmptyState, ErrorState, FormField, Input, KpiTile, Select, Skeleton, StatusBadge, Textarea } from "@rashpod/ui";
import DashboardLayout from "../../dashboard-layout";
import { api } from "../../../../lib/api";

type SourceType = "MARKETPLACE_MANUAL" | "MARKETPLACE_CSV_IMPORT" | "TELEGRAM_MANUAL" | "INSTAGRAM_MANUAL" | "PHONE_ORDER" | "SHOWROOM_OR_OFFLINE" | "GLOBAL_POD_PROVIDER_MANUAL" | "OTHER";
type PaymentStatus = "PAID_EXTERNALLY" | "CASH_ON_DELIVERY" | "PAYMENT_PENDING_MANUAL" | "UNPAID" | "REFUNDED_EXTERNALLY" | "CANCELED_EXTERNALLY" | "MANUAL_REVIEW";

type Overview = {
  kpis: { total: number; newIntakes: number; needsReview: number; readyToConvert: number; convertedOrders: number; duplicates: number; failedImports: number };
  revenueBySource: Record<string, number>;
  currency: string;
};

type IntakeItem = {
  id: string;
  title: string;
  externalSku?: string | null;
  quantity: number;
  unitPrice: number;
  currency: string;
  mappingStatus: string;
  listingId?: string | null;
  exportedListingId?: string | null;
};

type Intake = {
  id: string;
  sourceType: SourceType;
  customerName: string;
  customerPhone: string;
  externalOrderId?: string | null;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  currency: string;
  status: string;
  duplicateStatus: string;
  validationErrorsJson?: string[] | null;
  validationWarningsJson?: string[] | null;
  internalOrderId?: string | null;
  createdAt: string;
  items: IntakeItem[];
  internalOrder?: { id: string; status: string; productionJobs?: Array<{ id: string; status: string }> } | null;
};

type Duplicate = {
  id: string;
  duplicateStatus: string;
  matchType: string;
  score: number;
  intake: Intake;
  matchedIntake?: Intake | null;
};

type ImportRecord = {
  id: string;
  status: string;
  sourceType: SourceType;
  originalFilename?: string | null;
  importedCount: number;
  failedCount: number;
};

type ImportPreviewRow = { index: number; raw: Record<string, unknown>; input: Record<string, unknown>; item: Record<string, unknown>; errors: string[]; warnings: string[] };

type Tab = "overview" | "manual" | "import" | "intakes" | "duplicates" | "converted";

const tabs: Array<{ key: Tab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "manual", label: "Manual entry" },
  { key: "import", label: "CSV/XLSX import" },
  { key: "intakes", label: "Intake records" },
  { key: "duplicates", label: "Duplicates" },
  { key: "converted", label: "Converted orders" },
];

const sourceTypes: SourceType[] = ["MARKETPLACE_MANUAL", "MARKETPLACE_CSV_IMPORT", "TELEGRAM_MANUAL", "INSTAGRAM_MANUAL", "PHONE_ORDER", "SHOWROOM_OR_OFFLINE", "GLOBAL_POD_PROVIDER_MANUAL", "OTHER"];
const paymentStatuses: PaymentStatus[] = ["PAID_EXTERNALLY", "CASH_ON_DELIVERY", "PAYMENT_PENDING_MANUAL", "UNPAID", "MANUAL_REVIEW"];

function money(value: number, currency = "UZS") {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(value || 0))} ${currency}`;
}

function label(value?: string | null) {
  return value ? value.replace(/_/g, " ").toLowerCase() : "-";
}

function shortId(id?: string | null) {
  return id ? id.slice(0, 8) : "-";
}

export default function ExternalSalesPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedIntakeId, setSelectedIntakeId] = useState("");
  const [manualForm, setManualForm] = useState({ sourceType: "MARKETPLACE_MANUAL" as SourceType, paymentStatus: "PAID_EXTERNALLY" as PaymentStatus, externalOrderId: "", externalOrderUrl: "", customerName: "", customerPhone: "", customerEmail: "", deliveryMethod: "delivery", deliveryAddress: "", totalAmount: "", currency: "UZS", notes: "" });
  const [itemForm, setItemForm] = useState({ externalSku: "", exportedListingId: "", listingId: "", title: "", quantity: "1", unitPrice: "", size: "", color: "", material: "", printSide: "" });
  const [manualItems, setManualItems] = useState<Array<typeof itemForm>>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importRecord, setImportRecord] = useState<ImportRecord | null>(null);
  const [importRows, setImportRows] = useState<ImportPreviewRow[]>([]);
  const [columnMapping, setColumnMapping] = useState("{}");

  const selectedIntake = useMemo(() => intakes.find((row) => row.id === selectedIntakeId) ?? intakes[0], [intakes, selectedIntakeId]);
  const converted = intakes.filter((row) => row.status === "CONVERTED_TO_ORDER");

  async function loadAll(nextId = selectedIntakeId) {
    setError("");
    setLoading(true);
    try {
      const [overviewResult, intakeResult, duplicateResult] = await Promise.all([
        api.get<Overview>("/admin/external-sales/overview"),
        api.get<Intake[]>("/admin/external-sales"),
        api.get<Duplicate[]>("/admin/external-sales/duplicates"),
      ]);
      setOverview(overviewResult);
      setIntakes(intakeResult);
      setDuplicates(duplicateResult);
      setSelectedIntakeId(nextId || intakeResult[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "External sales data could not be loaded");
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

  function addManualItem() {
    if (!itemForm.externalSku && !itemForm.exportedListingId && !itemForm.listingId) {
      setError("Add an exported SKU, exported listing id, or listing id before adding the item");
      return;
    }
    setManualItems([...manualItems, itemForm]);
    setItemForm({ externalSku: "", exportedListingId: "", listingId: "", title: "", quantity: "1", unitPrice: "", size: "", color: "", material: "", printSide: "" });
  }

  async function createManual(event: FormEvent) {
    event.preventDefault();
    const items = manualItems.length ? manualItems : [itemForm];
    await run("manual", async () => {
      const created = await api.post<Intake>("/admin/external-sales", {
        ...manualForm,
        totalAmount: Number(manualForm.totalAmount || 0),
        items: items.map((item) => ({ ...item, quantity: Number(item.quantity || 1), unitPrice: Number(item.unitPrice || 0) })),
      });
      setNotice("External sale recorded and validated");
      setManualItems([]);
      await loadAll(created.id);
      setSelectedIntakeId(created.id);
      setTab("intakes");
    });
  }

  async function validateSelected() {
    if (!selectedIntake) return;
    await run("validate", async () => {
      await api.post(`/admin/external-sales/${selectedIntake.id}/validate`, {});
      setNotice("Validation refreshed");
      await loadAll(selectedIntake.id);
    });
  }

  async function convertSelected() {
    if (!selectedIntake) return;
    if (!window.confirm("Convert this external intake into an internal RashPOD order?")) return;
    await run("convert", async () => {
      await api.post(`/admin/external-sales/${selectedIntake.id}/convert-to-order`, { acceptForProduction: selectedIntake.paymentStatus === "CASH_ON_DELIVERY" });
      setNotice("External sale converted to internal order");
      await loadAll(selectedIntake.id);
      setTab("converted");
    });
  }

  async function markNotDuplicate(id: string) {
    const reason = window.prompt("Reason for marking this intake as not duplicate");
    if (!reason) return;
    await run("duplicate", async () => {
      await api.post(`/admin/external-sales/${id}/mark-not-duplicate`, { reason });
      await loadAll(id);
    });
  }

  async function markDuplicate(id: string) {
    const reason = window.prompt("Reason for confirming duplicate");
    if (!reason) return;
    await run("duplicate", async () => {
      await api.post(`/admin/external-sales/${id}/mark-duplicate`, { reason });
      await loadAll(id);
    });
  }

  async function parseImport() {
    if (!importFile) {
      setError("Choose a CSV or XLSX file first");
      return;
    }
    await run("import", async () => {
      const created = await api.post<ImportRecord>("/admin/external-sales/imports/upload", { sourceType: "MARKETPLACE_CSV_IMPORT", originalFilename: importFile.name, mimeType: importFile.type });
      const contentBase64 = await fileToBase64(importFile);
      const parsed = await api.post<{ import: ImportRecord; rows: Record<string, unknown>[]; expectedFields: string[] }>(`/admin/external-sales/imports/${created.id}/parse`, { filename: importFile.name, mimeType: importFile.type, contentBase64 });
      setImportRecord(parsed.import);
      setImportRows(parsed.rows.map((raw, index) => ({ index, raw, input: {}, item: {}, errors: [], warnings: [] })));
      setNotice(`Parsed ${parsed.rows.length} rows`);
    });
  }

  async function validateImportRows() {
    if (!importRecord) return;
    await run("validate-import", async () => {
      const result = await api.post<{ rows: ImportPreviewRow[] }>(`/admin/external-sales/imports/${importRecord.id}/validate`, { columnMappingJson: JSON.parse(columnMapping || "{}") });
      setImportRows(result.rows);
      setNotice("Import rows validated");
    });
  }

  async function importValidRows() {
    if (!importRecord) return;
    if (!window.confirm("Create intake records for valid import rows?")) return;
    await run("import-rows", async () => {
      await api.post(`/admin/external-sales/imports/${importRecord.id}/import-rows`, { columnMappingJson: JSON.parse(columnMapping || "{}") });
      setNotice("Valid rows imported as external intake records");
      await loadAll();
      setTab("intakes");
    });
  }

  const intakeColumns: DataTableColumn<Intake>[] = [
    { key: "sourceType", header: "Source", render: (_value, row) => label(row.sourceType) },
    { key: "externalOrderId", header: "External order", render: (_value, row) => row.externalOrderId || shortId(row.id) },
    { key: "customerName", header: "Customer", render: (_value, row) => <div><div className="font-medium">{row.customerName}</div><div className="text-xs text-slate-500">{row.customerPhone}</div></div> },
    { key: "totalAmount", header: "Total", render: (_value, row) => money(row.totalAmount, row.currency) },
    { key: "status", header: "Status", render: (_value, row) => <StatusBadge status={row.status} /> },
    { key: "duplicateStatus", header: "Duplicate", render: (_value, row) => <StatusBadge status={row.duplicateStatus} /> },
    { key: "actions", header: "Actions", render: (_value, row) => <Button size="sm" variant="secondary" onClick={() => { setSelectedIntakeId(row.id); setTab("intakes"); }}><Search size={14} />Open</Button> },
  ];

  const duplicateColumns: DataTableColumn<Duplicate>[] = [
    { key: "matchType", header: "Match", render: (_value, row) => label(row.matchType) },
    { key: "intake", header: "Intake", render: (_value, row) => <div>{row.intake.externalOrderId || shortId(row.intake.id)}<div className="text-xs text-slate-500">{row.intake.customerPhone}</div></div> },
    { key: "matchedIntake", header: "Possible match", render: (_value, row) => row.matchedIntake?.externalOrderId || shortId(row.matchedIntake?.id) },
    { key: "duplicateStatus", header: "Status", render: (_value, row) => <StatusBadge status={row.duplicateStatus} /> },
    { key: "actions", header: "Resolve", render: (_value, row) => <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => markNotDuplicate(row.intake.id)}>Not duplicate</Button><Button size="sm" variant="danger" onClick={() => markDuplicate(row.intake.id)}>Confirm</Button></div> },
  ];

  const importColumns: DataTableColumn<ImportPreviewRow>[] = [
    { key: "index", header: "Row", render: (_value, row) => row.index + 1 },
    { key: "raw", header: "Raw", render: (_value, row) => <span className="text-xs text-slate-600">{JSON.stringify(row.raw).slice(0, 120)}</span> },
    { key: "errors", header: "Errors", render: (_value, row) => row.errors.length ? <StatusBadge status="NEEDS_REVIEW" label={`${row.errors.length} errors`} /> : <StatusBadge status="READY" label="Valid" /> },
    { key: "warnings", header: "Warnings", render: (_value, row) => row.warnings.length ? row.warnings.join(", ") : "-" },
  ];

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-brand-ink">External Sales</h1>
            <p className="text-sm text-slate-600">Import, validate, map, de-duplicate, and convert outside-channel orders into RashPOD operations.</p>
          </div>
          <Button onClick={() => loadAll()} variant="secondary" disabled={Boolean(busy)}><RefreshCw size={16} />Refresh</Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => <Button key={item.key} variant={tab === item.key ? "primaryBlue" : "secondary"} size="sm" onClick={() => setTab(item.key)}>{item.label}</Button>)}
        </div>

        {error && <ErrorState title="External sales error" description={error} />}
        {notice && <Card className="border-green-200 bg-green-50 text-sm text-green-800">{notice}</Card>}
        {loading ? <Skeleton className="h-72" /> : null}

        {!loading && tab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <KpiTile label="Intakes" value={overview?.kpis.total ?? 0} icon={<ClipboardList size={22} />} />
              <KpiTile label="Needs review" value={overview?.kpis.needsReview ?? 0} icon={<AlertTriangle size={22} />} />
              <KpiTile label="Ready" value={overview?.kpis.readyToConvert ?? 0} icon={<CheckCircle2 size={22} />} />
              <KpiTile label="Converted" value={overview?.kpis.convertedOrders ?? 0} icon={<PackageCheck size={22} />} />
              <KpiTile label="Duplicates" value={overview?.kpis.duplicates ?? 0} icon={<ShieldAlert size={22} />} />
              <KpiTile label="Failed imports" value={overview?.kpis.failedImports ?? 0} icon={<XCircle size={22} />} />
            </div>
            <Card>
              <h2 className="mb-4 text-lg font-semibold text-brand-ink">Revenue by source</h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {Object.entries(overview?.revenueBySource ?? {}).map(([source, value]) => <div key={source} className="rounded-lg border border-slate-200 bg-white p-4"><div className="text-xs uppercase text-slate-500">{label(source)}</div><div className="mt-1 text-xl font-semibold text-brand-ink">{money(value, overview?.currency)}</div></div>)}
                {!Object.keys(overview?.revenueBySource ?? {}).length && <EmptyState title="No external revenue yet" description="Converted or ready external sales will appear here." />}
              </div>
            </Card>
          </div>
        )}

        {!loading && tab === "manual" && (
          <Card>
            <form onSubmit={createManual} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-4">
                <FormField label="Source"><Select value={manualForm.sourceType} onChange={(event) => setManualForm({ ...manualForm, sourceType: event.target.value as SourceType })}>{sourceTypes.map((value) => <option key={value} value={value}>{label(value)}</option>)}</Select></FormField>
                <FormField label="Payment"><Select value={manualForm.paymentStatus} onChange={(event) => setManualForm({ ...manualForm, paymentStatus: event.target.value as PaymentStatus })}>{paymentStatuses.map((value) => <option key={value} value={value}>{label(value)}</option>)}</Select></FormField>
                <FormField label="External order id"><Input value={manualForm.externalOrderId} onChange={(event) => setManualForm({ ...manualForm, externalOrderId: event.target.value })} /></FormField>
                <FormField label="Total"><Input type="number" value={manualForm.totalAmount} onChange={(event) => setManualForm({ ...manualForm, totalAmount: event.target.value })} /></FormField>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Customer name"><Input value={manualForm.customerName} onChange={(event) => setManualForm({ ...manualForm, customerName: event.target.value })} required /></FormField>
                <FormField label="Phone"><Input value={manualForm.customerPhone} onChange={(event) => setManualForm({ ...manualForm, customerPhone: event.target.value })} required /></FormField>
                <FormField label="Email"><Input type="email" value={manualForm.customerEmail} onChange={(event) => setManualForm({ ...manualForm, customerEmail: event.target.value })} /></FormField>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Delivery address"><Input value={manualForm.deliveryAddress} onChange={(event) => setManualForm({ ...manualForm, deliveryAddress: event.target.value })} /></FormField>
                <FormField label="External URL"><Input value={manualForm.externalOrderUrl} onChange={(event) => setManualForm({ ...manualForm, externalOrderUrl: event.target.value })} /></FormField>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <h2 className="mb-3 text-base font-semibold text-brand-ink">Items</h2>
                <div className="grid gap-3 md:grid-cols-4">
                  <FormField label="Export SKU"><Input value={itemForm.externalSku} onChange={(event) => setItemForm({ ...itemForm, externalSku: event.target.value })} /></FormField>
                  <FormField label="Listing id"><Input value={itemForm.listingId} onChange={(event) => setItemForm({ ...itemForm, listingId: event.target.value })} /></FormField>
                  <FormField label="Title"><Input value={itemForm.title} onChange={(event) => setItemForm({ ...itemForm, title: event.target.value })} /></FormField>
                  <FormField label="Unit price"><Input type="number" value={itemForm.unitPrice} onChange={(event) => setItemForm({ ...itemForm, unitPrice: event.target.value })} /></FormField>
                  <FormField label="Qty"><Input type="number" value={itemForm.quantity} onChange={(event) => setItemForm({ ...itemForm, quantity: event.target.value })} /></FormField>
                  <FormField label="Size"><Input value={itemForm.size} onChange={(event) => setItemForm({ ...itemForm, size: event.target.value })} /></FormField>
                  <FormField label="Color"><Input value={itemForm.color} onChange={(event) => setItemForm({ ...itemForm, color: event.target.value })} /></FormField>
                  <div className="flex items-end"><Button type="button" variant="secondary" onClick={addManualItem}><Plus size={16} />Add item</Button></div>
                </div>
                {manualItems.length > 0 && <div className="mt-3 text-sm text-slate-600">{manualItems.length} item{manualItems.length === 1 ? "" : "s"} staged</div>}
              </div>
              <FormField label="Notes"><Textarea value={manualForm.notes} onChange={(event) => setManualForm({ ...manualForm, notes: event.target.value })} rows={3} /></FormField>
              <Button type="submit" disabled={busy === "manual"}><Plus size={16} />{busy === "manual" ? "Recording..." : "Record external sale"}</Button>
            </form>
          </Card>
        )}

        {!loading && tab === "import" && (
          <div className="space-y-4">
            <Card>
              <div className="grid gap-4 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
                <FormField label="CSV/XLSX file"><Input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => setImportFile(event.target.files?.[0] ?? null)} /></FormField>
                <Button onClick={parseImport} disabled={!importFile || busy === "import"}><UploadCloud size={16} />Parse</Button>
                <Button onClick={validateImportRows} variant="secondary" disabled={!importRecord}><CheckCircle2 size={16} />Validate</Button>
                <Button onClick={importValidRows} variant="primaryBlue" disabled={!importRecord || !importRows.length}><FileSpreadsheet size={16} />Import valid rows</Button>
              </div>
              <FormField label="Column mapping JSON" className="mt-4"><Textarea value={columnMapping} onChange={(event) => setColumnMapping(event.target.value)} rows={4} /></FormField>
            </Card>
            <Card><DataTable columns={importColumns} rows={importRows} emptyState={<EmptyState title="No import rows" description="Choose a CSV/XLSX file and parse it to preview rows." />} /></Card>
          </div>
        )}

        {!loading && tab === "intakes" && (
          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Card><DataTable columns={intakeColumns} rows={intakes} emptyState={<EmptyState title="No external sales" description="Manual entries and imported rows will appear here." />} /></Card>
            <Card>
              {selectedIntake ? <div className="space-y-4">
                <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-brand-ink">{selectedIntake.externalOrderId || shortId(selectedIntake.id)}</h2><p className="text-sm text-slate-600">{selectedIntake.customerName} · {selectedIntake.customerPhone}</p></div><StatusBadge status={selectedIntake.status} /></div>
                <div className="grid gap-3 text-sm md:grid-cols-2"><div><span className="text-slate-500">Payment</span><div>{label(selectedIntake.paymentStatus)}</div></div><div><span className="text-slate-500">Duplicate</span><div>{label(selectedIntake.duplicateStatus)}</div></div><div><span className="text-slate-500">Total</span><div>{money(selectedIntake.totalAmount, selectedIntake.currency)}</div></div><div><span className="text-slate-500">Order</span><div>{selectedIntake.internalOrderId ? shortId(selectedIntake.internalOrderId) : "Not converted"}</div></div></div>
                <div className="space-y-2">{selectedIntake.items.map((item) => <div key={item.id} className="rounded-md border border-slate-200 p-3 text-sm"><div className="font-medium">{item.title}</div><div className="text-slate-500">{item.externalSku || "No SKU"} · qty {item.quantity} · {money(item.unitPrice, item.currency)}</div><StatusBadge status={item.mappingStatus} /></div>)}</div>
                <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={validateSelected}><CheckCircle2 size={16} />Validate</Button><Button onClick={convertSelected} disabled={selectedIntake.status !== "READY_TO_CONVERT"}><PackageCheck size={16} />Convert</Button>{selectedIntake.duplicateStatus === "POSSIBLE_DUPLICATE" && <Button variant="secondary" onClick={() => markNotDuplicate(selectedIntake.id)}>Mark not duplicate</Button>}</div>
              </div> : <EmptyState title="No intake selected" description="Select an intake record to review mapping, duplicate status, and conversion readiness." />}
            </Card>
          </div>
        )}

        {!loading && tab === "duplicates" && <Card><DataTable columns={duplicateColumns} rows={duplicates} emptyState={<EmptyState title="No duplicate reviews" description="Possible duplicate external orders will appear here." />} /></Card>}

        {!loading && tab === "converted" && <Card><DataTable columns={intakeColumns} rows={converted} emptyState={<EmptyState title="No converted external orders" description="Converted intakes will link to internal orders after conversion." />} /></Card>}
      </div>
    </DashboardLayout>
  );
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
