"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Download, Filter, RefreshCw } from "lucide-react";
import DashboardLayout from "../../dashboard-layout";
import { api } from "../../../../lib/api";
import { Button, Card, ChartWrapper, DataTable, DataTableColumn, EmptyState, ErrorState, FormField, Input, KpiTile, Select, Skeleton, StatusBadge } from "@rashpod/ui";

type AnalyticsClientProps = {
  role?: "admin" | "designer";
  title: string;
  description: string;
  endpoint: string;
  reportType: string;
  sensitive?: boolean;
};

type FilterState = {
  from: string;
  to: string;
  channel: string;
  currency: string;
  productTypeId: string;
  baseProductId: string;
  designerId: string;
};

const channelOptions = [
  ["", "All channels"],
  ["DIRECT", "Direct storefront"],
  ["FILM", "Film sales"],
  ["GANG_SHEET", "Gang sheets"],
  ["EXTERNAL_MARKETPLACE", "External marketplace"],
  ["GLOBAL_POD", "Global POD"],
];

export function AnalyticsClient({ role = "admin", title, description, endpoint, reportType, sensitive = false }: AnalyticsClientProps) {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(now.getDate() - 30);
  const [filters, setFilters] = useState<FilterState>({ from: dateInput(defaultFrom), to: dateInput(now), channel: "", currency: "UZS", productTypeId: "", baseProductId: "", designerId: "" });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.from) params.set("from", `${filters.from}T00:00:00.000Z`);
    if (filters.to) params.set("to", `${filters.to}T23:59:59.999Z`);
    for (const key of ["channel", "currency", "productTypeId", "baseProductId", "designerId"] as const) if (filters[key]) params.set(key, filters[key]);
    return params.toString();
  }, [filters]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get(`${endpoint}${query ? `?${query}` : ""}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  async function exportCsv() {
    setExporting(true);
    setError(null);
    try {
      const created = await api.post<{ id: string }>("/admin/analytics/exports", { reportType, format: "CSV", ...filters });
      const file = await api.get<{ filename: string; contentType: string; csv: string }>(`/admin/analytics/exports/${created.id}/download`);
      const url = URL.createObjectURL(new Blob([file.csv], { type: file.contentType || "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = file.filename || `${reportType}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => { void load(); }, [query, endpoint]);

  const kpis = kpiRows(data);
  const chartData = chartRows(data);
  const warningRows = data?.warnings?.items ?? data?.items ?? [];
  const tables = tableSections(data);

  return (
    <DashboardLayout role={role}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-blue">Analytics</p>
            <h1 className="text-3xl font-bold text-brand-ink">{title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-brand-muted">{description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={load} disabled={loading}><RefreshCw size={16} />Refresh</Button>
            <Button onClick={exportCsv} loading={exporting} disabled={role !== "admin" && sensitive}><Download size={16} />Export CSV</Button>
          </div>
        </div>

        <Card>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-ink"><Filter size={16} />Filters</div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
            <FormField label="From"><Input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></FormField>
            <FormField label="To"><Input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></FormField>
            <FormField label="Channel"><Select value={filters.channel} onChange={(event) => setFilters({ ...filters, channel: event.target.value })}>{channelOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></FormField>
            <FormField label="Currency"><Input value={filters.currency} onChange={(event) => setFilters({ ...filters, currency: event.target.value.toUpperCase() })} /></FormField>
            {role === "admin" ? <FormField label="Designer id"><Input value={filters.designerId} onChange={(event) => setFilters({ ...filters, designerId: event.target.value })} placeholder="Optional" /></FormField> : null}
            <FormField label="Product type id"><Input value={filters.productTypeId} onChange={(event) => setFilters({ ...filters, productTypeId: event.target.value })} placeholder="Optional" /></FormField>
            <FormField label="Base product id"><Input value={filters.baseProductId} onChange={(event) => setFilters({ ...filters, baseProductId: event.target.value })} placeholder="Optional" /></FormField>
          </div>
        </Card>

        {error ? <ErrorState title="Analytics unavailable" description={error} /> : null}
        {loading ? <Skeleton className="h-44" /> : null}

        {!loading && !error ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {kpis.length ? kpis.map((item) => <KpiTile key={item.key} label={label(item.key)} value={formatValue(item.value)} icon={<BarChart3 size={22} />} />) : <Card><EmptyState title="No metrics yet" description="There is no matching data for this date range." /></Card>}
            </div>

            {chartData.length ? <ChartWrapper title="Trend" data={chartData} xAxisKey="label" dataKey="value" color="blue" /> : null}

            {warningRows.length ? <Card><div className="mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-semantic-warningText" /><h2 className="text-lg font-semibold text-brand-ink">Warnings</h2></div><DataTable columns={warningColumns} rows={warningRows} emptyState={<EmptyState title="No warnings" description="No analytics warnings for the selected period." />} /></Card> : null}

            {tables.map((section) => <Card key={section.title}><h2 className="mb-4 text-lg font-semibold text-brand-ink">{section.title}</h2><DataTable columns={section.columns} rows={section.rows} emptyState={<EmptyState title="No rows" description="No matching rows for this report." />} /></Card>)}
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}

const warningColumns: DataTableColumn<any>[] = [
  { key: "label", header: "Warning" },
  { key: "count", header: "Count" },
  { key: "severity", header: "Severity", render: (value) => <StatusBadge status={String(value)} /> },
];

function tableSections(data: any) {
  const sections: Array<{ title: string; rows: any[]; columns: DataTableColumn<any>[] }> = [];
  const candidates = data?.tables ?? {};
  for (const [title, rows] of Object.entries(candidates)) {
    if (!Array.isArray(rows) || rows.length === 0) continue;
    sections.push({ title: label(title), rows: rows.slice(0, 25), columns: columnsFor(rows) });
  }
  if (Array.isArray(data?.topListings) && data.topListings.length) sections.push({ title: "Top listings", rows: data.topListings, columns: columnsFor(data.topListings) });
  if (Array.isArray(data?.topDesigners) && data.topDesigners.length) sections.push({ title: "Top designers", rows: data.topDesigners, columns: columnsFor(data.topDesigners) });
  return sections;
}

function columnsFor(rows: any[]): DataTableColumn<any>[] {
  const first = rows[0] ?? {};
  return Object.keys(first).filter((key) => !key.endsWith("Json") && typeof first[key] !== "object").slice(0, 7).map((key) => ({ key, header: label(key), render: (value) => renderCell(value) }));
}

function kpiRows(data: any) {
  const source = data?.executive ?? data?.kpis ?? data?.summary ?? {};
  return Object.entries(source).filter(([, value]) => typeof value === "number" || typeof value === "string").slice(0, 12).map(([key, value]) => ({ key, value }));
}

function chartRows(data: any) {
  if (Array.isArray(data?.salesTrend)) return data.salesTrend.map((row: any) => ({ label: row.date, value: row.revenue ?? row.orders ?? 0 }));
  if (Array.isArray(data?.trend)) return data.trend.map((row: any) => ({ label: row.date, value: row.revenue ?? row.amount ?? row.orders ?? 0 }));
  if (Array.isArray(data?.revenueByChannel)) return data.revenueByChannel.map((row: any) => ({ label: row.key, value: row.revenue ?? row.count ?? 0 }));
  if (Array.isArray(data?.byStatus)) return data.byStatus.map((row: any) => ({ label: row.key, value: row.count ?? 0 }));
  if (Array.isArray(data?.byFilmType)) return data.byFilmType.map((row: any) => ({ label: row.key, value: row.revenue ?? row.count ?? 0 }));
  return [];
}

function renderCell(value: unknown) {
  if (typeof value === "number") return formatValue(value);
  if (typeof value === "string" && value.length > 24) return <span title={value}>{value.slice(0, 24)}...</span>;
  if (value == null) return "-";
  return String(value);
}

function formatValue(value: unknown) {
  if (typeof value !== "number") return String(value ?? "-");
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: value % 1 === 0 ? 0 : 2 }).format(value);
}

function label(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ").replace(/^./, (char) => char.toUpperCase());
}

function dateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}
