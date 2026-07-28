"use client";

import { FormEvent, useEffect, useState } from "react";
import { RefreshCw, Users } from "lucide-react";
import { Button, Card, Drawer, EmptyState, ErrorState, Input, Select, Skeleton } from "@rashpod/ui";
import { useAuth } from "../../../auth/auth-provider";
import { api } from "../../../../lib/api";
import { useDashboardFeedback } from "../../../../components/feedback/use-dashboard-feedback";
import { ConfirmDialog, Feedback, FeedbackBanner, PageShell, Pagination } from "../super-admin-ui";

const ROLES = [
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

type PlatformUser = {
  id: string;
  email: string;
  displayName?: string | null;
  role: string;
  designerStatus?: string | null;
  createdAt: string;
};

type PageData = {
  items: PlatformUser[];
  total: number;
  page: number;
  limit: number;
};

export default function SuperAdminRolesPage() {
  const actionFeedback = useDashboardFeedback();
  const { user } = useAuth();
  const [rows, setRows] = useState<PlatformUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [selected, setSelected] = useState<PlatformUser | null>(null);
  const [newRole, setNewRole] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const limit = 25;

  async function load(nextPage = page) {
    setLoading(true);
    setLoadError("");
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: String(limit) });
      if (search.trim()) params.set("search", search.trim());
      if (roleFilter) params.set("role", roleFilter);
      const data = await api.get<PageData>(`/super-admin/users?${params}`);
      setRows(Array.isArray(data.items) ? data.items : []);
      setTotal(data.total ?? 0);
      setPage(data.page ?? nextPage);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(1); }, []);

  function searchUsers(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    void load(1);
  }

  async function saveRole() {
    if (!selected || !newRole || selected.role === newRole) return;
    setSaving(true);
    setFeedback(null);
    try {
      await api.patch(`/super-admin/users/${selected.id}/role`, { role: newRole });
      setFeedback({ kind: "success", message: `${selected.email} is now ${newRole.replace(/_/g, " ")}.` });
      actionFeedback.success({ title: "User role updated", description: selected.email });
      setConfirming(false);
      setSelected(null);
      await load(page);
    } catch (error) {
      setFeedback({ kind: "error", message: actionFeedback.error(error, { title: "Could not update user role", fallback: "Could not update role" }) });
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  }

  const riskyChange = selected?.role === "SUPER_ADMIN" || newRole === "SUPER_ADMIN";

  return (
    <PageShell
      title="Roles"
      description="Search user accounts and assign their platform role. Self-demotion and removal of the final super admin are blocked by the API."
      icon={<Users size={22} />}
      action={<Button variant="secondary" onClick={() => void load(page)} aria-label="Refresh users"><RefreshCw size={16} aria-hidden="true" /></Button>}
    >
      <FeedbackBanner feedback={selected ? null : feedback} onDismiss={() => setFeedback(null)} />
      <form onSubmit={searchUsers} className="grid gap-3 rounded-2xl border border-brand-line bg-white p-4 shadow-soft sm:grid-cols-[minmax(0,1fr)_220px_auto]">
        <label className="text-sm font-semibold text-brand-ink">
          Search users
          <Input className="mt-2" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or email" />
        </label>
        <label className="text-sm font-semibold text-brand-ink">
          Role
          <Select className="mt-2" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="">All roles</option>
            {ROLES.map((role) => <option key={role} value={role}>{role.replace(/_/g, " ")}</option>)}
          </Select>
        </label>
        <Button type="submit" className="self-end" loading={loading}>Search</Button>
      </form>

      {loading ? <Skeleton className="h-72" /> : loadError ? (
        <ErrorState title="Could not load users" description={loadError} retry={<Button onClick={() => void load(page)}>Retry</Button>} />
      ) : rows.length === 0 ? (
        <EmptyState title="No users found" description="Try a different name, email, or role filter." />
      ) : (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <caption className="sr-only">Platform users and assigned roles</caption>
              <thead className="bg-surface-app text-brand-muted">
                <tr><th scope="col" className="px-5 py-3 text-left">User</th><th scope="col" className="px-5 py-3 text-left">Role</th><th scope="col" className="px-5 py-3 text-left">Designer status</th><th scope="col" className="px-5 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-surface-borderSoft">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-app/60">
                    <td className="px-5 py-4"><p className="font-medium">{row.displayName || "Unnamed user"}</p><p className="text-xs text-brand-muted">{row.email}</p></td>
                    <td className="px-5 py-4">{row.role.replace(/_/g, " ")}</td>
                    <td className="px-5 py-4">{row.role === "DESIGNER" ? row.designerStatus ?? "—" : "Not applicable"}</td>
                    <td className="px-5 py-4 text-right">
                      <Button size="sm" variant="secondary" onClick={() => { setSelected(row); setNewRole(row.role); }}>
                        Change role
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / limit))} total={total} disabled={loading} onPageChange={(next) => void load(next)} />
        </Card>
      )}

      <Drawer open={Boolean(selected)} side="right" title="Change platform role" onClose={() => { if (!saving) setSelected(null); }}>
        {selected ? (
          <div className="space-y-5">
            <FeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />
            <div className="rounded-2xl bg-surface-app p-4">
              <p className="font-semibold text-brand-ink">{selected.displayName || "Unnamed user"}</p>
              <p className="mt-1 text-sm text-brand-muted">{selected.email}</p>
              {selected.id === user?.id ? <p className="mt-3 text-sm font-semibold text-semantic-warningText">This is your current account.</p> : null}
            </div>
            <label className="block text-sm font-semibold text-brand-ink">
              New role
              <Select className="mt-2" value={newRole} onChange={(event) => setNewRole(event.target.value)}>
                {ROLES.map((role) => <option key={role} value={role}>{role.replace(/_/g, " ")}</option>)}
              </Select>
            </label>
            <p className="text-sm leading-6 text-brand-muted">The new permissions take effect on the user’s next API request. This change is audit logged.</p>
            <Button disabled={!newRole || newRole === selected.role} onClick={() => setConfirming(true)}>Review role change</Button>
          </div>
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={confirming}
        title="Apply this role change?"
        description={selected ? <span><strong>{selected.email}</strong> will change from {selected.role.replace(/_/g, " ")} to {newRole.replace(/_/g, " ")}.</span> : ""}
        confirmLabel="Change role"
        confirmationText={riskyChange ? selected?.email : undefined}
        loading={saving}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void saveRole()}
      />
    </PageShell>
  );
}
