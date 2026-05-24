"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Select,
  Skeleton,
  Textarea,
} from "@rashpod/ui";
import {
  Activity,
  CloudCog,
  KeyRound,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";
import DashboardLayout from "../dashboard-layout";
import { api } from "../../../lib/api";

type LoadState = "idle" | "loading" | "ready" | "error";

function errorMessage(error: unknown, fallback = "Request failed") {
  return error instanceof Error ? error.message : fallback;
}

function PageShell({ title, description, icon, action, children }: { title: string; description: string; icon: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <DashboardLayout role="super-admin">
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
      <div className="flex h-full w-full max-w-xl flex-col overflow-hidden rounded-[24px] bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-surface-borderSoft p-5">
          <h2 className="text-xl font-semibold text-brand-ink">{title}</h2>
          <button aria-label="Close panel" className="rounded-full p-2 text-brand-muted hover:bg-surface-app" onClick={onClose} type="button">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

const PLATFORM_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "OPERATIONS_MANAGER",
  "MODERATOR",
  "PRODUCTION_STAFF",
  "FINANCE_STAFF",
  "SUPPORT_STAFF",
  "DESIGNER",
  "CUSTOMER",
  "CORPORATE_CLIENT",
] as const;

type PermissionsMatrix = {
  defaults: Record<string, string[]>;
  overrides: Record<string, string[]>;
  effective: Record<string, string[]>;
};

export function SuperAdminPermissionsScreen() {
  const [matrix, setMatrix] = useState<PermissionsMatrix | null>(null);
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setState("loading");
    setError("");
    try {
      const data = await api.get<PermissionsMatrix>("/super-admin/rbac/permissions");
      setMatrix(data);
      setDraft(data.effective);
      setState("ready");
    } catch (err) {
      setError(errorMessage(err));
      setState("error");
    }
  }

  useEffect(() => { void load(); }, []);

  function toggle(permission: string, role: string) {
    setDraft((current) => {
      const roles = new Set(current[permission] ?? []);
      if (roles.has(role)) roles.delete(role);
      else roles.add(role);
      return { ...current, [permission]: [...roles] };
    });
  }

  async function save() {
    if (!matrix) return;
    setSaving(true);
    try {
      const overrides: Record<string, string[]> = {};
      for (const [permission, roles] of Object.entries(draft)) {
        const defaults = matrix.defaults[permission] ?? [];
        const same = defaults.length === roles.length && defaults.every((role) => roles.includes(role));
        if (!same) overrides[permission] = roles;
      }
      await api.patch("/super-admin/rbac/permissions", { overrides });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function resetDefaults() {
    if (!matrix) return;
    setSaving(true);
    try {
      await api.patch("/super-admin/rbac/permissions", { overrides: {} });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const permissions = useMemo(() => Object.keys(draft).sort(), [draft]);

  return (
    <PageShell title="Permissions" description="Edit the effective RBAC matrix. Changes are stored as overrides on top of code defaults." icon={<Shield size={22} />} action={<div className="flex gap-2"><Button variant="secondary" onClick={load}><RefreshCw size={16} /></Button><Button variant="secondary" onClick={resetDefaults} loading={saving}>Reset defaults</Button><Button onClick={save} loading={saving}>Save overrides</Button></div>}>
      {state === "loading" ? <Skeleton className="h-96" /> : state === "error" ? <ErrorState title="Could not load permissions" description={error} retry={<Button onClick={load}>Retry</Button>} /> : (
        <Card className="overflow-x-auto !p-0">
          <table className="min-w-[960px] w-full text-xs">
            <thead className="bg-surface-app text-brand-muted"><tr><th className="sticky left-0 bg-surface-app px-4 py-3 text-left">Permission</th>{PLATFORM_ROLES.map((role) => <th key={role} className="px-2 py-3 text-center">{role.replace(/_/g, " ")}</th>)}</tr></thead>
            <tbody className="divide-y divide-surface-borderSoft">
              {permissions.map((permission) => (
                <tr key={permission}>
                  <td className="sticky left-0 bg-white px-4 py-2 font-mono text-[11px]">{permission}</td>
                  {PLATFORM_ROLES.map((role) => (
                    <td key={role} className="px-2 py-2 text-center">
                      <input type="checkbox" checked={(draft[permission] ?? []).includes(role)} onChange={() => toggle(permission, role)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </PageShell>
  );
}

type PlatformUser = { id: string; email: string; displayName?: string | null; role: string; designerStatus?: string | null; createdAt: string };

export function SuperAdminRolesScreen() {
  const [rows, setRows] = useState<PlatformUser[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PlatformUser | null>(null);
  const [newRole, setNewRole] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setState("loading");
    setError("");
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (search.trim()) params.set("search", search.trim());
      const data = await api.get<{ items: PlatformUser[] }>(`/super-admin/users?${params.toString()}`);
      setRows(Array.isArray(data.items) ? data.items : []);
      setState("ready");
    } catch (err) {
      setError(errorMessage(err));
      setState("error");
    }
  }

  useEffect(() => { void load(); }, []);

  async function saveRole() {
    if (!selected || !newRole) return;
    setSaving(true);
    try {
      await api.patch(`/super-admin/users/${selected.id}/role`, { role: newRole });
      setSelected(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell title="Roles" description="Assign platform roles to user accounts. Role changes are audit logged." icon={<Users size={22} />}>
      <div className="flex gap-3"><Input placeholder="Search users" value={search} onChange={(e) => setSearch(e.target.value)} /><Button onClick={load}>Search</Button></div>
      {state === "loading" ? <Skeleton className="h-64" /> : state === "error" ? <ErrorState title="Could not load users" description={error} retry={<Button onClick={load}>Retry</Button>} /> : (
        <Card className="!p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-app text-brand-muted"><tr><th className="px-5 py-3 text-left">User</th><th className="px-5 py-3 text-left">Role</th><th className="px-5 py-3 text-left">Designer status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-surface-borderSoft">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-5 py-4"><p className="font-medium">{row.displayName || "—"}</p><p className="text-xs text-brand-muted">{row.email}</p></td>
                  <td className="px-5 py-4">{row.role}</td>
                  <td className="px-5 py-4">{row.designerStatus ?? "—"}</td>
                  <td className="px-5 py-4 text-right"><Button size="sm" variant="secondary" onClick={() => { setSelected(row); setNewRole(row.role); }}>Change role</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {selected ? (
        <Drawer title="Change role" onClose={() => setSelected(null)}>
          <div className="space-y-4">
            <p className="text-sm">{selected.email}</p>
            <Select value={newRole} onChange={(e) => setNewRole(e.target.value)}>{PLATFORM_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}</Select>
            <Button loading={saving} onClick={saveRole}>Save</Button>
          </div>
        </Drawer>
      ) : null}
    </PageShell>
  );
}

type SecretReference = { id: string; name: string; envVar: string; secretManagerRef?: string | null; service: string; lastRotatedAt?: string | null; notes?: string | null };

export function SuperAdminSecretsScreen() {
  const [rows, setRows] = useState<SecretReference[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<(SecretReference & { isNew?: boolean }) | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setState("loading");
    setError("");
    try {
      const data = await api.get<SecretReference[]>("/super-admin/secrets");
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
        await api.post("/super-admin/secrets", { name: editing.name, envVar: editing.envVar, secretManagerRef: editing.secretManagerRef, service: editing.service, notes: editing.notes });
      } else {
        await api.patch(`/super-admin/secrets/${editing.id}`, { name: editing.name, envVar: editing.envVar, secretManagerRef: editing.secretManagerRef, service: editing.service, notes: editing.notes });
      }
      setEditing(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this secret reference?")) return;
    await api.delete(`/super-admin/secrets/${id}`);
    await load();
  }

  return (
    <PageShell title="Secrets" description="Manage secret references (names and env vars only — never store raw secret values)." icon={<KeyRound size={22} />} action={<Button onClick={() => setEditing({ id: "", name: "", envVar: "", service: "rashpod-api", isNew: true })}>Add reference</Button>}>
      <p className="text-sm text-brand-muted">Link references to <a className="text-brand-blue underline" href="https://console.cloud.google.com/security/secret-manager" target="_blank" rel="noreferrer">Google Cloud Secret Manager</a>.</p>
      {state === "loading" ? <Skeleton className="h-64" /> : state === "error" ? <ErrorState title="Could not load secrets" description={error} retry={<Button onClick={load}>Retry</Button>} /> : (
        <Card className="!p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-app text-brand-muted"><tr><th className="px-5 py-3 text-left">Name</th><th className="px-5 py-3 text-left">Env var</th><th className="px-5 py-3 text-left">Service</th><th className="px-5 py-3 text-left">Secret Manager ref</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-surface-borderSoft">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-5 py-4 font-medium">{row.name}</td>
                  <td className="px-5 py-4 font-mono text-xs">{row.envVar}</td>
                  <td className="px-5 py-4">{row.service}</td>
                  <td className="px-5 py-4 font-mono text-xs">{row.secretManagerRef || "—"}</td>
                  <td className="px-5 py-4 text-right"><Button size="sm" variant="secondary" onClick={() => setEditing(row)}>Edit</Button> <Button size="sm" variant="danger" onClick={() => remove(row.id)}>Delete</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <EmptyState title="No secret references" description="Add references to document where credentials live." /> : null}
        </Card>
      )}
      {editing ? (
        <Drawer title={editing.isNew ? "Add secret reference" : "Edit secret reference"} onClose={() => setEditing(null)}>
          <form className="space-y-3" onSubmit={save}>
            <label className="block text-sm font-semibold">Name<Input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label>
            <label className="block text-sm font-semibold">Env var<Input required value={editing.envVar} onChange={(e) => setEditing({ ...editing, envVar: e.target.value })} /></label>
            <label className="block text-sm font-semibold">Service<Input required value={editing.service} onChange={(e) => setEditing({ ...editing, service: e.target.value })} /></label>
            <label className="block text-sm font-semibold">Secret Manager ref<Input value={editing.secretManagerRef ?? ""} onChange={(e) => setEditing({ ...editing, secretManagerRef: e.target.value })} /></label>
            <label className="block text-sm font-semibold">Notes<Textarea rows={3} value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></label>
            <Button type="submit" loading={saving}>Save</Button>
          </form>
        </Drawer>
      ) : null}
    </PageShell>
  );
}

type SystemSettings = { companyName?: string; supportEmail?: string; metadata?: unknown };
type SystemHealth = {
  environment?: unknown;
  launchReadiness?: unknown;
  worker?: { pending: number; failed: number };
  tenants?: number;
};

export function SuperAdminSystemScreen() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setState("loading");
    setError("");
    try {
      const [settingsData, healthData] = await Promise.all([
        api.get<SystemSettings>("/super-admin/system/settings"),
        api.get<SystemHealth>("/super-admin/system/health"),
      ]);
      setSettings(settingsData);
      setHealth(healthData);
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
      const updated = await api.patch<SystemSettings>("/super-admin/system/settings", {
        companyName: settings.companyName,
        supportEmail: settings.supportEmail,
      });
      setSettings(updated);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell title="System Settings" description="Platform-wide settings and operational health signals." icon={<CloudCog size={22} />} action={<Button variant="secondary" onClick={load}><RefreshCw size={16} /></Button>}>
      {state === "loading" ? <Skeleton className="h-64" /> : state === "error" ? <ErrorState title="Could not load system data" description={error} retry={<Button onClick={load}>Retry</Button>} /> : (
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={save} className="space-y-4">
            <Card className="space-y-3">
              <h2 className="text-lg font-semibold">Settings</h2>
              <label className="block text-sm font-semibold">Company name<Input value={settings?.companyName ?? ""} onChange={(e) => setSettings((s) => ({ ...(s ?? {}), companyName: e.target.value }))} /></label>
              <label className="block text-sm font-semibold">Support email<Input value={settings?.supportEmail ?? ""} onChange={(e) => setSettings((s) => ({ ...(s ?? {}), supportEmail: e.target.value }))} /></label>
              <Button type="submit" loading={saving}>Save settings</Button>
            </Card>
          </form>
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold">Health</h2>
            <p className="text-sm">Worker pending: <strong>{health?.worker?.pending ?? 0}</strong></p>
            <p className="text-sm">Worker failed: <strong>{health?.worker?.failed ?? 0}</strong></p>
            <p className="text-sm">Tenants: <strong>{health?.tenants ?? 0}</strong></p>
            <pre className="max-h-48 overflow-auto rounded-xl bg-surface-app p-3 text-xs">{JSON.stringify(health?.launchReadiness ?? {}, null, 2)}</pre>
          </Card>
        </div>
      )}
    </PageShell>
  );
}

export function SuperAdminAuditLogsScreen() {
  const [rows, setRows] = useState<Array<{ id: string; action: string; entityType: string; entityId: string; createdAt: string; actor?: { email?: string | null; displayName?: string | null; role?: string | null } | null }>>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");

  async function load() {
    setState("loading");
    setError("");
    try {
      const data = await api.get<{ items: typeof rows }>("/admin/audit-logs?limit=50");
      setRows(Array.isArray(data.items) ? data.items : []);
      setState("ready");
    } catch (err) {
      setError(errorMessage(err));
      setState("error");
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <PageShell title="Platform Audit Logs" description="Platform-wide audit trail for sensitive actions." icon={<Activity size={22} />} action={<Button variant="secondary" onClick={load}><RefreshCw size={16} /></Button>}>
      {state === "loading" ? <Skeleton className="h-64" /> : state === "error" ? <ErrorState title="Could not load audit logs" description={error} retry={<Button onClick={load}>Retry</Button>} /> : (
        <Card className="!p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-app text-brand-muted"><tr><th className="px-5 py-3 text-left">Action</th><th className="px-5 py-3 text-left">Entity</th><th className="px-5 py-3 text-left">Actor</th><th className="px-5 py-3 text-left">Time</th></tr></thead>
            <tbody className="divide-y divide-surface-borderSoft">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-5 py-4 font-semibold">{row.action}</td>
                  <td className="px-5 py-4"><p>{row.entityType}</p><p className="font-mono text-xs text-brand-muted">{row.entityId}</p></td>
                  <td className="px-5 py-4">{row.actor?.displayName || row.actor?.email || "System"}</td>
                  <td className="px-5 py-4">{new Date(row.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <EmptyState title="No audit entries" description="Audited platform actions will appear here." /> : null}
        </Card>
      )}
    </PageShell>
  );
}

export function SuperAdminOverviewScreen() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");

  async function load() {
    setState("loading");
    setError("");
    try {
      const data = await api.get<SystemHealth>("/super-admin/system/health");
      setHealth(data);
      setState("ready");
    } catch (err) {
      setError(errorMessage(err));
      setState("error");
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <PageShell title="Super Admin Dashboard" description="Platform health, worker queue depth, and tenant footprint." icon={<Activity size={22} />}>
      <div className="rounded-xl border border-semantic-dangerBg bg-semantic-dangerBg p-4 text-sm text-semantic-dangerText">Actions here affect all tenants and services. Review carefully before saving.</div>
      {state === "loading" ? <Skeleton className="h-40" /> : state === "error" ? <ErrorState title="Could not load platform health" description={error} retry={<Button onClick={load}>Retry</Button>} /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card><p className="text-sm text-brand-muted">Worker pending</p><p className="mt-2 text-3xl font-bold">{health?.worker?.pending ?? 0}</p></Card>
          <Card><p className="text-sm text-brand-muted">Worker failed</p><p className="mt-2 text-3xl font-bold">{health?.worker?.failed ?? 0}</p></Card>
          <Card><p className="text-sm text-brand-muted">Tenants</p><p className="mt-2 text-3xl font-bold">{health?.tenants ?? 0}</p></Card>
          <Card><p className="text-sm text-brand-muted">Services</p><p className="mt-2 text-3xl font-bold">4</p></Card>
        </div>
      )}
    </PageShell>
  );
}
