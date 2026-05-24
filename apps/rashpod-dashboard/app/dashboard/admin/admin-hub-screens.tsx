"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  DataTable,
  DataTableColumn,
  EmptyState,
  ErrorState,
  Input,
  Select,
  Skeleton,
  StatusBadge,
  Textarea,
} from "@rashpod/ui";
import {
  Building2,
  ClipboardList,
  Factory,
  FileText,
  Mail,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import DashboardLayout from "../dashboard-layout";
import { api } from "../../../lib/api";

type LoadState = "idle" | "loading" | "ready" | "error";

function errorMessage(error: unknown, fallback = "Request failed") {
  return error instanceof Error ? error.message : fallback;
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

function Drawer({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 p-4">
      <div className="flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-[24px] bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-surface-borderSoft p-5">
          <h2 className="text-xl font-semibold text-brand-ink">{title}</h2>
          <button aria-label="Close panel" className="rounded-full p-2 text-brand-muted hover:bg-surface-app" onClick={onClose} type="button">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

type EmailTemplate = { id: string; key: string; subject: string; body: string; variables?: unknown; updatedAt?: string };

export function EmailTemplatesScreen() {
  const [rows, setRows] = useState<EmailTemplate[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<(EmailTemplate & { isNew?: boolean }) | null>(null);
  const [testTo, setTestTo] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setState("loading");
    setError("");
    try {
      const data = await api.get<EmailTemplate[]>("/admin/email-templates");
      setRows(Array.isArray(data) ? data : []);
      setState("ready");
    } catch (err) {
      setError(errorMessage(err));
      setState("error");
    }
  }

  useEffect(() => { void load(); }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.isNew) {
        await api.post("/admin/email-templates", { key: editing.key, subject: editing.subject, body: editing.body });
      } else {
        await api.patch(`/admin/email-templates/${editing.id}`, { subject: editing.subject, body: editing.body });
      }
      setEditing(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    if (!editing || !testTo) return;
    setSaving(true);
    try {
      await api.post(`/admin/email-templates/${editing.id}/test`, { to: testTo, key: editing.key });
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell title="Email Templates" description="Manage transactional email templates and send test messages before publishing changes." icon={<Mail size={22} />} action={<Button variant="secondary" onClick={load}><RefreshCw size={16} /> Refresh</Button>}>
      {state === "loading" ? <Skeleton className="h-64" /> : state === "error" ? <ErrorState title="Could not load email templates" description={error} retry={<Button onClick={load}>Retry</Button>} /> : (
        <Card className="!p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-surface-borderSoft p-4">
            <p className="text-sm text-brand-muted">{rows.length} templates</p>
            <Button onClick={() => setEditing({ id: "", key: "", subject: "", body: "", isNew: true })}>New template</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-app text-brand-muted"><tr><th className="px-5 py-3 text-left">Key</th><th className="px-5 py-3 text-left">Subject</th><th className="px-5 py-3 text-left">Updated</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-surface-borderSoft">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-4 font-mono text-xs">{row.key}</td>
                    <td className="px-5 py-4">{row.subject}</td>
                    <td className="px-5 py-4">{formatDate(row.updatedAt)}</td>
                    <td className="px-5 py-4 text-right"><Button size="sm" variant="secondary" onClick={() => setEditing(row)}>Edit</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 ? <EmptyState title="No email templates" description="Create your first template to customize RashPOD notifications." /> : null}
        </Card>
      )}
      {editing ? (
        <Drawer title={editing.isNew ? "Create template" : "Edit template"} onClose={() => setEditing(null)}>
          <form className="space-y-4" onSubmit={save}>
            {editing.isNew ? <label className="block text-sm font-semibold">Key<Input required value={editing.key} onChange={(e) => setEditing({ ...editing, key: e.target.value })} /></label> : null}
            <label className="block text-sm font-semibold">Subject<Input required value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} /></label>
            <label className="block text-sm font-semibold">Body<Textarea rows={12} required value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} /></label>
            {!editing.isNew ? (
              <div className="flex gap-2">
                <Input placeholder="Test recipient email" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
                <Button type="button" variant="secondary" onClick={sendTest} disabled={!testTo || saving}>Send test</Button>
              </div>
            ) : null}
            <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" loading={saving}>Save</Button></div>
          </form>
        </Drawer>
      ) : null}
    </PageShell>
  );
}

type AiSettings = {
  provider: "OPENAI" | "DISABLED";
  enabled: boolean;
  monthlyBudgetUsd: number;
  dailyBudgetUsd: number;
  moderationAssistEnabled: boolean;
  usageUsdMonth: number;
  usageUsdDay: number;
  workflows: Record<string, { enabled?: boolean; model?: string }>;
};

export function AiSettingsScreen() {
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setState("loading");
    setError("");
    try {
      const data = await api.get<AiSettings>("/admin/ai-settings");
      setSettings(data);
      setState("ready");
    } catch (err) {
      setError(errorMessage(err));
      setState("error");
    }
  }

  useEffect(() => { void load(); }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await api.patch<AiSettings>("/admin/ai-settings", {
        provider: settings.provider,
        enabled: settings.enabled,
        monthlyBudgetUsd: settings.monthlyBudgetUsd,
        moderationAssistEnabled: settings.moderationAssistEnabled,
        workflows: settings.workflows,
      });
      setSettings(updated);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell title="AI Settings" description="Configure AI provider, budgets, workflow toggles, and moderation assist for RashPOD." icon={<Sparkles size={22} />} action={<Button variant="secondary" onClick={load}><RefreshCw size={16} /> Refresh</Button>}>
      {state === "loading" ? <Skeleton className="h-64" /> : state === "error" ? <ErrorState title="Could not load AI settings" description={error} retry={<Button onClick={load}>Retry</Button>} /> : settings ? (
        <form onSubmit={save} className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-4">
            <h2 className="text-lg font-semibold text-brand-ink">Provider</h2>
            <Select value={settings.provider} onChange={(e) => setSettings({ ...settings, provider: e.target.value as AiSettings["provider"] })}><option value="OPENAI">OpenAI</option><option value="DISABLED">Disabled</option></Select>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.enabled} onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })} /> AI enabled</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.moderationAssistEnabled} onChange={(e) => setSettings({ ...settings, moderationAssistEnabled: e.target.checked })} /> Moderation assist</label>
            <label className="block text-sm font-semibold">Monthly budget (USD)<Input type="number" value={settings.monthlyBudgetUsd} onChange={(e) => setSettings({ ...settings, monthlyBudgetUsd: Number(e.target.value) })} /></label>
            <p className="text-xs text-brand-muted">Usage this month: ${settings.usageUsdMonth.toFixed(2)} · today: ${settings.usageUsdDay.toFixed(2)}</p>
            <Button type="submit" loading={saving}>Save settings</Button>
          </Card>
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-brand-ink">Workflows</h2>
            {Object.entries(settings.workflows ?? {}).map(([key, workflow]) => (
              <label key={key} className="flex items-center justify-between rounded-xl border border-surface-borderSoft px-3 py-2 text-sm">
                <span className="font-medium text-brand-ink">{key.replace(/_/g, " ")}</span>
                <input type="checkbox" checked={workflow.enabled !== false} onChange={(e) => setSettings({ ...settings, workflows: { ...settings.workflows, [key]: { ...workflow, enabled: e.target.checked } } })} />
              </label>
            ))}
          </Card>
        </form>
      ) : null}
    </PageShell>
  );
}

type ProductionOverview = { total: number; queued: number; blocked: number; fileFailures: number; highPriority: number; overdue: number; readyForPickup: number; readyForDelivery: number };

export function AdminProductionScreen() {
  const [overview, setOverview] = useState<ProductionOverview | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");

  async function load() {
    setState("loading");
    setError("");
    try {
      const data = await api.get<ProductionOverview>("/production/overview");
      setOverview(data);
      setState("ready");
    } catch (err) {
      setError(errorMessage(err));
      setState("error");
    }
  }

  useEffect(() => { void load(); }, []);

  const tiles = overview ? [
    ["Total jobs", overview.total],
    ["Queued", overview.queued],
    ["Blocked", overview.blocked],
    ["File failures", overview.fileFailures],
    ["High priority", overview.highPriority],
    ["Overdue", overview.overdue],
    ["Ready pickup", overview.readyForPickup],
    ["Ready delivery", overview.readyForDelivery],
  ] as const : [];

  return (
    <PageShell title="Production Overview" description="Admin view of the production queue. Open the full workshop queue for operator actions." icon={<Factory size={22} />} action={<Link href="/dashboard/production/jobs"><Button>Open production queue</Button></Link>}>
      {state === "loading" ? <Skeleton className="h-48" /> : state === "error" ? <ErrorState title="Could not load production overview" description={error} retry={<Button onClick={load}>Retry</Button>} /> : overview ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map(([label, value]) => (
            <Card key={label}><p className="text-sm text-brand-muted">{label}</p><p className="mt-2 text-3xl font-bold text-brand-ink">{value}</p></Card>
          ))}
        </div>
      ) : null}
    </PageShell>
  );
}

type CustomerRow = { id: string; email: string; displayName?: string | null; role?: string; createdAt: string; ordersCount?: number; requestsCount?: number };

export function CorporateClientsScreen() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CustomerRow | null>(null);

  async function load() {
    setState("loading");
    setError("");
    try {
      const data = await api.get<CustomerRow[]>("/admin/users/customers?corporate=true");
      setRows(Array.isArray(data) ? data : []);
      setState("ready");
    } catch (err) {
      setError(errorMessage(err));
      setState("error");
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.email.toLowerCase().includes(q) || (r.displayName ?? "").toLowerCase().includes(q));
  }, [rows, search]);

  const columns: DataTableColumn<CustomerRow>[] = [
    { key: "displayName", header: "Client", render: (_v, r) => <div><p className="font-medium">{r.displayName || "—"}</p><p className="text-xs text-brand-muted">{r.email}</p></div> },
    { key: "requestsCount", header: "Requests", render: (_v, r) => r.requestsCount ?? 0 },
    { key: "ordersCount", header: "Orders", render: (_v, r) => r.ordersCount ?? 0 },
    { key: "createdAt", header: "Joined", render: (_v, r) => new Date(r.createdAt).toLocaleDateString() },
    { key: "actions", header: "", render: (_v, r) => <Button size="sm" variant="secondary" onClick={() => setSelected(r)}>Details</Button> },
  ];

  return (
    <PageShell title="Corporate Clients" description="B2B accounts with corporate request history and order activity." icon={<Building2 size={22} />}>
      <div className="flex gap-3"><Input placeholder="Search clients" value={search} onChange={(e) => setSearch(e.target.value)} /><Button variant="secondary" onClick={load}><RefreshCw size={16} /></Button></div>
      {state === "loading" ? <Skeleton className="h-64" /> : state === "error" ? <ErrorState title="Could not load corporate clients" description={error} retry={<Button onClick={load}>Retry</Button>} /> : (
        <Card><DataTable columns={columns} rows={filtered} emptyState={<EmptyState title="No corporate clients" description="Corporate accounts will appear here after onboarding." />} /></Card>
      )}
      {selected ? (
        <Drawer title="Corporate client" onClose={() => setSelected(null)}>
          <div className="space-y-2 text-sm"><p><strong>Email:</strong> {selected.email}</p><p><strong>Name:</strong> {selected.displayName || "—"}</p><p><strong>Requests:</strong> {selected.requestsCount ?? 0}</p><p><strong>Orders:</strong> {selected.ordersCount ?? 0}</p><p><strong>Joined:</strong> {formatDate(selected.createdAt)}</p></div>
        </Drawer>
      ) : null}
    </PageShell>
  );
}

type CorporateRequest = { id: string; title: string; status: string; quantity?: number | null; budget?: string | number | null; deadline?: string | null; createdAt: string };

export function CorporateRequestsScreen() {
  const [rows, setRows] = useState<CorporateRequest[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  async function load() {
    setState("loading");
    setError("");
    try {
      const data = await api.get<CorporateRequest[]>("/corporate/requests");
      setRows(Array.isArray(data) ? data : []);
      setState("ready");
    } catch (err) {
      setError(errorMessage(err));
      setState("error");
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => (statusFilter ? rows.filter((r) => r.status === statusFilter) : rows), [rows, statusFilter]);
  const statuses = useMemo(() => [...new Set(rows.map((r) => r.status))], [rows]);

  return (
    <PageShell title="Corporate Requests" description="Inbox of corporate briefs with status filters for admin review." icon={<ClipboardList size={22} />} action={<Link href="/dashboard/admin/corporate"><Button variant="secondary">Bid workflow</Button></Link>}>
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">All statuses</option>{statuses.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
        <Button variant="secondary" onClick={load}><RefreshCw size={16} /> Refresh</Button>
      </div>
      {state === "loading" ? <Skeleton className="h-64" /> : state === "error" ? <ErrorState title="Could not load requests" description={error} retry={<Button onClick={load}>Retry</Button>} /> : (
        <Card className="!p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-app text-brand-muted"><tr><th className="px-5 py-3 text-left">Title</th><th className="px-5 py-3 text-left">Status</th><th className="px-5 py-3 text-left">Qty</th><th className="px-5 py-3 text-left">Budget</th><th className="px-5 py-3 text-left">Created</th></tr></thead>
            <tbody className="divide-y divide-surface-borderSoft">
              {filtered.map((row) => (
                <tr key={row.id}><td className="px-5 py-4 font-medium">{row.title}</td><td className="px-5 py-4"><StatusBadge status={row.status} /></td><td className="px-5 py-4">{row.quantity ?? "—"}</td><td className="px-5 py-4">{row.budget ?? "—"}</td><td className="px-5 py-4">{formatDate(row.createdAt)}</td></tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? <EmptyState title="No requests" description="Corporate requests will appear here when clients submit briefs." /> : null}
        </Card>
      )}
    </PageShell>
  );
}

type CommercialOffer = {
  id: string;
  offerNumber: string;
  status: string;
  subtotal: string;
  discount: string;
  total: string;
  sentAt?: string | null;
  createdAt: string;
  corporateRequest?: { id: string; title: string; status: string } | null;
};

export function CommercialOffersScreen() {
  const [rows, setRows] = useState<CommercialOffer[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [acting, setActing] = useState("");

  async function load() {
    setState("loading");
    setError("");
    try {
      const params = statusFilter ? `?status=${statusFilter}` : "";
      const data = await api.get<CommercialOffer[]>(`/admin/commercial-offers${params}`);
      setRows(Array.isArray(data) ? data : []);
      setState("ready");
    } catch (err) {
      setError(errorMessage(err));
      setState("error");
    }
  }

  useEffect(() => { void load(); }, [statusFilter]);

  async function sendOffer(id: string) {
    setActing(id);
    try {
      await api.post(`/admin/commercial-offers/${id}/send`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setActing("");
    }
  }

  return (
    <PageShell title="Commercial Offers" description="Review draft and sent offers, then trigger send actions for corporate clients." icon={<FileText size={22} />}>
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">All statuses</option><option value="DRAFT">DRAFT</option><option value="SENT">SENT</option><option value="ACCEPTED">ACCEPTED</option><option value="REJECTED">REJECTED</option></Select>
        <Button variant="secondary" onClick={load}><RefreshCw size={16} /> Refresh</Button>
      </div>
      {error && state === "ready" ? <div className="rounded-xl border border-semantic-dangerBg bg-semantic-dangerBg px-4 py-3 text-sm">{error}</div> : null}
      {state === "loading" ? <Skeleton className="h-64" /> : state === "error" ? <ErrorState title="Could not load offers" description={error} retry={<Button onClick={load}>Retry</Button>} /> : (
        <Card className="!p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-app text-brand-muted"><tr><th className="px-5 py-3 text-left">Offer</th><th className="px-5 py-3 text-left">Request</th><th className="px-5 py-3 text-left">Total</th><th className="px-5 py-3 text-left">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-surface-borderSoft">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-5 py-4"><p className="font-medium">{row.offerNumber}</p><p className="text-xs text-brand-muted">{formatDate(row.createdAt)}</p></td>
                  <td className="px-5 py-4">{row.corporateRequest?.title ?? "—"}</td>
                  <td className="px-5 py-4">{Number(row.total).toLocaleString()}</td>
                  <td className="px-5 py-4"><StatusBadge status={row.status} /></td>
                  <td className="px-5 py-4 text-right">{row.status === "DRAFT" ? <Button size="sm" loading={acting === row.id} onClick={() => sendOffer(row.id)}>Send</Button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <EmptyState title="No commercial offers" description="Offers created from the corporate workflow will appear here." /> : null}
        </Card>
      )}
    </PageShell>
  );
}

type UserRow = { id: string; email: string; displayName?: string | null; role: string; designerStatus?: string | null; createdAt: string };

export function AdminUsersHubScreen() {
  const [tab, setTab] = useState<"designers" | "customers" | "staff">("designers");
  const [rows, setRows] = useState<UserRow[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [newRole, setNewRole] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setState("loading");
    setError("");
    try {
      const params = new URLSearchParams({ segment: tab });
      if (search.trim()) params.set("search", search.trim());
      const data = await api.get<UserRow[]>(`/admin/users?${params.toString()}`);
      setRows(Array.isArray(data) ? data : []);
      setState("ready");
    } catch (err) {
      setError(errorMessage(err));
      setState("error");
    }
  }

  useEffect(() => { void load(); }, [tab]);

  async function saveRole() {
    if (!selected || !newRole) return;
    setSaving(true);
    try {
      await api.patch(`/admin/users/${selected.id}/role`, { role: newRole });
      setSelected(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const roleOptions = ["ADMIN", "MODERATOR", "OPERATIONS_MANAGER", "PRODUCTION_STAFF", "FINANCE_STAFF", "SUPPORT_STAFF", "SUPER_ADMIN", "DESIGNER", "CUSTOMER", "CORPORATE_CLIENT"];

  return (
    <PageShell title="Users" description="Unified hub for designers, customers, and staff accounts." icon={<Users size={22} />}>
      <div className="inline-flex rounded-full border border-surface-borderSoft bg-white p-1 shadow-soft">
        {(["designers", "customers", "staff"] as const).map((value) => (
          <button key={value} type="button" className={`rounded-full px-4 py-2 text-sm font-medium ${tab === value ? "bg-brand-blue text-white" : "text-brand-muted"}`} onClick={() => setTab(value)}>{value[0].toUpperCase() + value.slice(1)}</button>
        ))}
      </div>
      <div className="flex gap-3"><Input placeholder="Search users" value={search} onChange={(e) => setSearch(e.target.value)} /><Button onClick={load}>Search</Button></div>
      {state === "loading" ? <Skeleton className="h-64" /> : state === "error" ? <ErrorState title="Could not load users" description={error} retry={<Button onClick={load}>Retry</Button>} /> : (
        <Card className="!p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-app text-brand-muted"><tr><th className="px-5 py-3 text-left">User</th><th className="px-5 py-3 text-left">Role</th><th className="px-5 py-3 text-left">Status</th><th className="px-5 py-3 text-left">Joined</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-surface-borderSoft">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-5 py-4"><p className="font-medium">{row.displayName || "—"}</p><p className="text-xs text-brand-muted">{row.email}</p></td>
                  <td className="px-5 py-4">{row.role}</td>
                  <td className="px-5 py-4">{row.designerStatus ?? "—"}</td>
                  <td className="px-5 py-4">{formatDate(row.createdAt)}</td>
                  <td className="px-5 py-4 text-right"><Button size="sm" variant="secondary" onClick={() => { setSelected(row); setNewRole(row.role); }}>Manage</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <EmptyState title="No users found" description="Try another tab or search term." /> : null}
        </Card>
      )}
      {selected ? (
        <Drawer title="Manage user" onClose={() => setSelected(null)}>
          <div className="space-y-4">
            <p className="text-sm"><strong>{selected.displayName || selected.email}</strong><br />{selected.email}</p>
            <label className="block text-sm font-semibold">Role<Select value={newRole} onChange={(e) => setNewRole(e.target.value)}>{roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}</Select></label>
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setSelected(null)}>Cancel</Button><Button loading={saving} onClick={saveRole}>Save role</Button></div>
          </div>
        </Drawer>
      ) : null}
    </PageShell>
  );
}
