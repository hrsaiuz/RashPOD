"use client";

import { FormEvent, useEffect, useState } from "react";
import { Building2, Plus, RefreshCw, Search } from "lucide-react";
import { Button, Card, Drawer, EmptyState, ErrorState, Input, Select, Skeleton, StatusBadge, Textarea } from "@rashpod/ui";
import { api } from "../../../../lib/api";
import { ConfirmDialog, Feedback, FeedbackBanner, PageShell, Pagination } from "../super-admin-ui";

const TENANT_STATUSES = ["TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED", "ARCHIVED"] as const;
const TENANT_TYPES = ["RASHPOD_DEFAULT", "PRINT_SHOP", "BRAND", "STOREFRONT", "WORKSHOP_PARTNER", "CORPORATE"] as const;

type PlanOption = { id: string; name: string; code: string; status: string };
type TenantRow = {
  id: string;
  name: string;
  slug: string;
  legalName?: string | null;
  status: string;
  tenantType: string;
  ownerUserId?: string | null;
  country: string;
  region?: string | null;
  defaultCurrency: string;
  defaultLocale: string;
  timezone: string;
  plan?: PlanOption | null;
  _count?: { members: number; orders: number; commerceListings: number };
  entitlementOverrides?: Array<{ id: string; key: string; value: unknown; reason?: string | null }>;
};
type TenantList = { items: TenantRow[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
type TenantDraft = {
  name: string;
  slug: string;
  legalName: string;
  tenantType: string;
  ownerUserId: string;
  planId: string;
  country: string;
  region: string;
  defaultCurrency: string;
  defaultLocale: string;
  timezone: string;
};

const EMPTY_DRAFT: TenantDraft = {
  name: "", slug: "", legalName: "", tenantType: "PRINT_SHOP", ownerUserId: "", planId: "",
  country: "UZ", region: "", defaultCurrency: "UZS", defaultLocale: "uz-Latn", timezone: "Asia/Tashkent",
};

export default function SuperAdminTenantsPage() {
  const [rows, setRows] = useState<TenantRow[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<TenantDraft>({ ...EMPTY_DRAFT });
  const [selected, setSelected] = useState<TenantRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [planId, setPlanId] = useState("");
  const [planNotes, setPlanNotes] = useState("");
  const [entitlementKey, setEntitlementKey] = useState("");
  const [entitlementValue, setEntitlementValue] = useState("true");
  const [entitlementReason, setEntitlementReason] = useState("");
  const [confirmation, setConfirmation] = useState<"suspend" | "reactivate" | "assign-plan" | null>(null);

  async function load(nextPage = page) {
    setLoading(true);
    setLoadError("");
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: "25" });
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      const [tenantData, planData] = await Promise.all([
        api.get<TenantList>(`/super-admin/tenants?${params}`),
        api.get<PlanOption[]>("/super-admin/plans"),
      ]);
      setRows(Array.isArray(tenantData.items) ? tenantData.items : []);
      setPagination(tenantData.pagination ?? { page: nextPage, limit: 25, total: 0, totalPages: 1 });
      setPage(tenantData.pagination?.page ?? nextPage);
      setPlans(Array.isArray(planData) ? planData : []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load tenants");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(1); }, []);

  function filterTenants(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    void load(1);
  }

  async function openTenant(row: TenantRow) {
    setSelected(row);
    setDetailLoading(true);
    try {
      const detail = await api.get<TenantRow>(`/super-admin/tenants/${row.id}`);
      setSelected(detail);
      setPlanId(detail.plan?.id ?? "");
      setDraft(toDraft(detail));
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Could not load tenant details" });
    } finally {
      setDetailLoading(false);
    }
  }

  async function createTenant(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const created = await api.post<TenantRow>("/super-admin/tenants", tenantPayload(draft, true));
      setFeedback({ kind: "success", message: `${created.name} tenant created.` });
      setCreating(false);
      setDraft({ ...EMPTY_DRAFT });
      await load(1);
      await openTenant(created);
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Could not create tenant" });
    } finally {
      setSaving(false);
    }
  }

  async function updateTenant(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setFeedback(null);
    try {
      const updated = await api.patch<TenantRow>(`/super-admin/tenants/${selected.id}`, tenantPayload(draft, false));
      setSelected({ ...selected, ...updated });
      setFeedback({ kind: "success", message: `${updated.name} settings updated.` });
      await load(page);
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Could not update tenant" });
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus() {
    if (!selected || !confirmation || confirmation === "assign-plan") return;
    setSaving(true);
    setFeedback(null);
    const target = confirmation === "suspend" ? "SUSPENDED" : "ACTIVE";
    try {
      const updated = await api.post<TenantRow>(`/super-admin/tenants/${selected.id}/${confirmation === "suspend" ? "suspend" : "reactivate"}`);
      setSelected({ ...selected, ...updated, status: target });
      setFeedback({ kind: "success", message: `${selected.name} is now ${target.toLowerCase()}.` });
      setConfirmation(null);
      await load(page);
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Could not change tenant status" });
      setConfirmation(null);
    } finally {
      setSaving(false);
    }
  }

  async function assignPlan() {
    if (!selected || !planId) return;
    setSaving(true);
    setFeedback(null);
    try {
      await api.post(`/super-admin/tenants/${selected.id}/plan`, { planId, status: "ACTIVE", notes: planNotes.trim() || undefined });
      setFeedback({ kind: "success", message: `${selected.name} was assigned to ${plans.find((plan) => plan.id === planId)?.name ?? "the selected plan"}.` });
      setConfirmation(null);
      setPlanNotes("");
      await openTenant(selected);
      await load(page);
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Could not assign plan" });
      setConfirmation(null);
    } finally {
      setSaving(false);
    }
  }

  async function saveEntitlement(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setFeedback(null);
    try {
      let value: unknown;
      try { value = JSON.parse(entitlementValue); } catch { throw new Error("Entitlement value must be valid JSON"); }
      await api.post(`/super-admin/tenants/${selected.id}/entitlements`, {
        key: entitlementKey.trim(),
        value,
        reason: entitlementReason.trim() || undefined,
      });
      setFeedback({ kind: "success", message: `Entitlement ${entitlementKey.trim()} saved for ${selected.name}.` });
      setEntitlementKey("");
      setEntitlementValue("true");
      setEntitlementReason("");
      await openTenant(selected);
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Could not save entitlement" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="Tenants"
      description="Create workspaces, manage lifecycle state, assign plans, and configure explicit entitlement overrides."
      icon={<Building2 size={22} />}
      action={(
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void load(page)} aria-label="Refresh tenants"><RefreshCw size={16} aria-hidden="true" /></Button>
          <Button onClick={() => { setDraft({ ...EMPTY_DRAFT }); setCreating(true); }}><Plus size={16} aria-hidden="true" />Create tenant</Button>
        </div>
      )}
    >
      <FeedbackBanner feedback={creating || selected ? null : feedback} onDismiss={() => setFeedback(null)} />
      <form onSubmit={filterTenants} className="grid gap-3 rounded-2xl border border-brand-line bg-white p-4 shadow-soft sm:grid-cols-[minmax(0,1fr)_220px_auto]">
        <label className="text-sm font-semibold">Search tenants<Input className="mt-2" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or slug" /></label>
        <label className="text-sm font-semibold">Status<Select className="mt-2" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{TENANT_STATUSES.map((item) => <option key={item}>{item}</option>)}</Select></label>
        <Button type="submit" className="self-end" loading={loading}><Search size={16} aria-hidden="true" />Filter</Button>
      </form>

      {loading ? <Skeleton className="h-72" /> : loadError ? (
        <ErrorState title="Tenant list unavailable" description={loadError} retry={<Button onClick={() => void load(page)}>Retry</Button>} />
      ) : rows.length === 0 ? (
        <EmptyState title="No tenants found" description="Adjust the filters or create the first matching tenant." />
      ) : (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <caption className="sr-only">Platform tenants</caption>
              <thead className="bg-surface-app text-left text-brand-muted">
                <tr><th scope="col" className="px-4 py-3">Tenant</th><th scope="col" className="px-4 py-3">Plan</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-4 py-3">Members</th><th scope="col" className="px-4 py-3">Orders</th><th scope="col" className="px-4 py-3">Listings</th><th scope="col" className="px-4 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-brand-line">
                {rows.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-surface-app/60">
                    <td className="px-4 py-3"><div className="font-semibold text-brand-ink">{tenant.name}</div><div className="text-xs text-brand-muted">/{tenant.slug} · {tenant.tenantType.replace(/_/g, " ")}</div></td>
                    <td className="px-4 py-3 text-brand-muted">{tenant.plan?.name ?? "No plan"}</td>
                    <td className="px-4 py-3"><StatusBadge status={tenant.status} /></td>
                    <td className="px-4 py-3 tabular-nums text-brand-muted">{tenant._count?.members ?? 0}</td>
                    <td className="px-4 py-3 tabular-nums text-brand-muted">{tenant._count?.orders ?? 0}</td>
                    <td className="px-4 py-3 tabular-nums text-brand-muted">{tenant._count?.commerceListings ?? 0}</td>
                    <td className="px-4 py-3 text-right"><Button size="sm" variant="secondary" onClick={() => void openTenant(tenant)}>Manage</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination {...pagination} disabled={loading} onPageChange={(next) => void load(next)} />
        </Card>
      )}

      <Drawer open={creating} side="right" title="Create tenant" onClose={() => { if (!saving) setCreating(false); }}>
        <div className="space-y-4">
          <FeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />
          <TenantForm draft={draft} setDraft={setDraft} plans={plans} saving={saving} submitLabel="Create tenant" onSubmit={createTenant} includePlan />
        </div>
      </Drawer>

      <Drawer open={Boolean(selected)} side="right" title={selected ? `Manage ${selected.name}` : "Manage tenant"} onClose={() => { if (!saving) setSelected(null); }}>
        {selected ? detailLoading ? <Skeleton className="h-96" /> : (
          <div className="space-y-7">
            <FeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-app p-4">
              <div><p className="font-semibold">{selected.name}</p><p className="text-sm text-brand-muted">/{selected.slug}</p></div>
              <StatusBadge status={selected.status} />
            </div>
            <TenantForm draft={draft} setDraft={setDraft} plans={plans} saving={saving} submitLabel="Save tenant settings" onSubmit={updateTenant} />
            <section className="space-y-3 border-t border-brand-line pt-6">
              <h3 className="font-semibold text-brand-ink">Lifecycle</h3>
              <p className="text-sm leading-6 text-brand-muted">Suspension blocks tenant operations. Reactivation restores normal access.</p>
              {selected.status === "SUSPENDED"
                ? <Button variant="secondary" onClick={() => setConfirmation("reactivate")}>Reactivate tenant</Button>
                : <Button variant="danger" onClick={() => setConfirmation("suspend")}>Suspend tenant</Button>}
            </section>
            <section className="space-y-3 border-t border-brand-line pt-6">
              <h3 className="font-semibold text-brand-ink">Plan assignment</h3>
              <label className="block text-sm font-semibold">Plan<Select className="mt-2" value={planId} onChange={(event) => setPlanId(event.target.value)}><option value="">Select a plan</option>{plans.map((plan) => <option key={plan.id} value={plan.id} disabled={plan.status === "DISABLED"}>{plan.name} ({plan.status})</option>)}</Select></label>
              <label className="block text-sm font-semibold">Change notes<Textarea className="mt-2" rows={3} value={planNotes} onChange={(event) => setPlanNotes(event.target.value)} /></label>
              <Button disabled={!planId || planId === selected.plan?.id} onClick={() => setConfirmation("assign-plan")}>Review plan assignment</Button>
            </section>
            <section className="space-y-3 border-t border-brand-line pt-6">
              <h3 className="font-semibold text-brand-ink">Entitlement overrides</h3>
              {selected.entitlementOverrides?.length ? (
                <ul className="space-y-2">{selected.entitlementOverrides.map((item) => <li key={item.id} className="rounded-xl bg-surface-app p-3 text-sm"><span className="font-mono font-semibold">{item.key}</span><pre className="mt-1 whitespace-pre-wrap text-xs">{JSON.stringify(item.value)}</pre>{item.reason ? <p className="mt-1 text-brand-muted">{item.reason}</p> : null}</li>)}</ul>
              ) : <p className="text-sm text-brand-muted">No overrides configured.</p>}
              <form className="space-y-3" onSubmit={saveEntitlement}>
                <label className="block text-sm font-semibold">Key<Input className="mt-2 font-mono" required value={entitlementKey} onChange={(event) => setEntitlementKey(event.target.value)} /></label>
                <label className="block text-sm font-semibold">JSON value<Textarea className="mt-2 font-mono" required rows={3} value={entitlementValue} onChange={(event) => setEntitlementValue(event.target.value)} /></label>
                <label className="block text-sm font-semibold">Reason<Textarea className="mt-2" required rows={3} value={entitlementReason} onChange={(event) => setEntitlementReason(event.target.value)} /></label>
                <Button type="submit" variant="secondary" loading={saving}>Save override</Button>
              </form>
            </section>
          </div>
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={confirmation === "suspend"}
        title="Suspend this tenant?"
        description="Tenant users will lose access to normal operations until a super admin reactivates the workspace."
        confirmLabel="Suspend tenant"
        confirmationText={selected?.slug}
        loading={saving}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => void changeStatus()}
      />
      <ConfirmDialog
        open={confirmation === "reactivate"}
        title="Reactivate this tenant?"
        description="Tenant users will regain access according to their roles and entitlements."
        confirmLabel="Reactivate tenant"
        danger={false}
        loading={saving}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => void changeStatus()}
      />
      <ConfirmDialog
        open={confirmation === "assign-plan"}
        title="Assign a new plan?"
        description={<span>This creates a new active subscription record and changes the tenant’s effective plan to <strong>{plans.find((plan) => plan.id === planId)?.name}</strong>.</span>}
        confirmLabel="Assign plan"
        confirmationText={selected?.slug}
        loading={saving}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => void assignPlan()}
      />
    </PageShell>
  );
}

function TenantForm({
  draft,
  setDraft,
  plans,
  saving,
  submitLabel,
  onSubmit,
  includePlan = false,
}: {
  draft: TenantDraft;
  setDraft: (draft: TenantDraft) => void;
  plans: PlanOption[];
  saving: boolean;
  submitLabel: string;
  onSubmit: (event: FormEvent) => void;
  includePlan?: boolean;
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block text-sm font-semibold">Name<Input className="mt-2" required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <label className="block text-sm font-semibold">Slug<Input className="mt-2 font-mono" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value.toLowerCase() })} placeholder="Generated from name if empty" /></label>
      <label className="block text-sm font-semibold">Legal name<Input className="mt-2" value={draft.legalName} onChange={(event) => setDraft({ ...draft, legalName: event.target.value })} /></label>
      <label className="block text-sm font-semibold">Tenant type<Select className="mt-2" value={draft.tenantType} onChange={(event) => setDraft({ ...draft, tenantType: event.target.value })}>{TENANT_TYPES.map((type) => <option key={type}>{type}</option>)}</Select></label>
      {includePlan ? <label className="block text-sm font-semibold">Initial plan<Select className="mt-2" value={draft.planId} onChange={(event) => setDraft({ ...draft, planId: event.target.value })}><option value="">No initial plan</option>{plans.map((plan) => <option key={plan.id} value={plan.id} disabled={plan.status === "DISABLED"}>{plan.name} ({plan.status})</option>)}</Select></label> : null}
      <label className="block text-sm font-semibold">Owner user ID<Input className="mt-2 font-mono" value={draft.ownerUserId} onChange={(event) => setDraft({ ...draft, ownerUserId: event.target.value })} placeholder="Optional UUID" /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">Country<Input className="mt-2" required value={draft.country} onChange={(event) => setDraft({ ...draft, country: event.target.value.toUpperCase() })} /></label>
        <label className="block text-sm font-semibold">Region<Input className="mt-2" value={draft.region} onChange={(event) => setDraft({ ...draft, region: event.target.value })} /></label>
        <label className="block text-sm font-semibold">Currency<Input className="mt-2" required value={draft.defaultCurrency} onChange={(event) => setDraft({ ...draft, defaultCurrency: event.target.value.toUpperCase() })} /></label>
        <label className="block text-sm font-semibold">Locale<Input className="mt-2" required value={draft.defaultLocale} onChange={(event) => setDraft({ ...draft, defaultLocale: event.target.value })} /></label>
      </div>
      <label className="block text-sm font-semibold">Timezone<Input className="mt-2" required value={draft.timezone} onChange={(event) => setDraft({ ...draft, timezone: event.target.value })} /></label>
      <Button type="submit" loading={saving}>{submitLabel}</Button>
    </form>
  );
}

function toDraft(tenant: TenantRow): TenantDraft {
  return {
    name: tenant.name,
    slug: tenant.slug,
    legalName: tenant.legalName ?? "",
    tenantType: tenant.tenantType,
    ownerUserId: tenant.ownerUserId ?? "",
    planId: tenant.plan?.id ?? "",
    country: tenant.country,
    region: tenant.region ?? "",
    defaultCurrency: tenant.defaultCurrency,
    defaultLocale: tenant.defaultLocale,
    timezone: tenant.timezone,
  };
}

function tenantPayload(draft: TenantDraft, includePlan: boolean) {
  return {
    name: draft.name.trim(),
    slug: draft.slug.trim() || undefined,
    legalName: draft.legalName.trim() || (includePlan ? undefined : null),
    tenantType: draft.tenantType,
    ownerUserId: draft.ownerUserId.trim() || (includePlan ? undefined : null),
    ...(includePlan ? { planId: draft.planId || undefined } : {}),
    country: draft.country.trim(),
    region: draft.region.trim() || (includePlan ? undefined : null),
    defaultCurrency: draft.defaultCurrency.trim(),
    defaultLocale: draft.defaultLocale.trim(),
    timezone: draft.timezone.trim(),
  };
}
