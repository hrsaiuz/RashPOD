"use client";

import { FormEvent, useEffect, useState } from "react";
import { CreditCard, Plus, RefreshCw } from "lucide-react";
import { Button, Card, Drawer, EmptyState, ErrorState, Input, Select, Skeleton, StatusBadge, Textarea } from "@rashpod/ui";
import { api } from "../../../../lib/api";
import { ConfirmDialog, Feedback, FeedbackBanner, PageShell, parseJsonObject } from "../super-admin-ui";

type PlanRow = {
  id: string;
  name: string;
  code: string;
  status: string;
  currency: string;
  billingInterval: string;
  price: string | number;
  trialDays: number;
  includedLimits?: Record<string, unknown> | null;
  featureFlags?: Record<string, unknown> | null;
  _count?: { tenants: number; subscriptions: number };
};
type PlanDraft = {
  id?: string;
  name: string;
  code: string;
  status: string;
  currency: string;
  billingInterval: string;
  price: string;
  trialDays: string;
  includedLimits: string;
  featureFlags: string;
};

const EMPTY_PLAN: PlanDraft = {
  name: "", code: "", status: "ACTIVE", currency: "UZS", billingInterval: "MONTHLY",
  price: "0", trialDays: "14", includedLimits: "{}", featureFlags: "{}",
};

export default function SuperAdminPlansPage() {
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [editing, setEditing] = useState<PlanDraft | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const data = await api.get<PlanRow[]>("/super-admin/plans");
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load plans");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function reviewSave(event: FormEvent) {
    event.preventDefault();
    try {
      parseJsonObject(editing?.includedLimits ?? "", "Included limits");
      parseJsonObject(editing?.featureFlags ?? "", "Feature flags");
      setConfirming(true);
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Invalid plan configuration" });
    }
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    setFeedback(null);
    try {
      const payload = {
        name: editing.name.trim(),
        ...(editing.id ? {} : { code: editing.code.trim().toUpperCase() }),
        status: editing.status,
        currency: editing.currency.trim().toUpperCase(),
        billingInterval: editing.billingInterval,
        price: editing.price,
        trialDays: Number(editing.trialDays),
        includedLimits: parseJsonObject(editing.includedLimits, "Included limits"),
        featureFlags: parseJsonObject(editing.featureFlags, "Feature flags"),
      };
      if (editing.id) await api.patch(`/super-admin/plans/${editing.id}`, payload);
      else await api.post("/super-admin/plans", payload);
      setFeedback({ kind: "success", message: editing.id ? `${editing.name} updated.` : `${editing.name} created.` });
      setConfirming(false);
      setEditing(null);
      await load();
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Could not save plan" });
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="Plans"
      description="Configure tenant pricing, billing cadence, included limits, and feature entitlements without code changes."
      icon={<CreditCard size={22} />}
      action={(
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void load()} aria-label="Refresh plans"><RefreshCw size={16} aria-hidden="true" /></Button>
          <Button onClick={() => setEditing({ ...EMPTY_PLAN })}><Plus size={16} aria-hidden="true" />Create plan</Button>
        </div>
      )}
    >
      <FeedbackBanner feedback={editing ? null : feedback} onDismiss={() => setFeedback(null)} />
      {loading ? <Skeleton className="h-72" /> : loadError ? (
        <ErrorState title="Plans unavailable" description={loadError} retry={<Button onClick={() => void load()}>Retry</Button>} />
      ) : rows.length === 0 ? (
        <EmptyState title="No plans configured" description="Create a plan to configure tenant billing and feature access." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {rows.map((plan) => (
            <Card key={plan.id} className="flex flex-col">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-brand-blue"><CreditCard size={18} aria-hidden="true" /><span className="text-xs font-bold uppercase tracking-wide">{plan.code}</span></div>
                  <h2 className="mt-2 text-lg font-bold text-brand-ink">{plan.name}</h2>
                  <p className="mt-1 text-sm text-brand-muted">{plan.currency} {String(plan.price)} · {plan.billingInterval.toLowerCase()} · {plan.trialDays} trial days</p>
                </div>
                <StatusBadge status={plan.status} />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <JsonBox title="Included limits" value={plan.includedLimits} />
                <JsonBox title="Feature flags" value={plan.featureFlags} />
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-brand-line pt-4">
                <p className="text-sm text-brand-muted"><strong className="tabular-nums text-brand-ink">{plan._count?.tenants ?? 0}</strong> current tenants · <strong className="tabular-nums text-brand-ink">{plan._count?.subscriptions ?? 0}</strong> subscriptions</p>
                <Button size="sm" variant="secondary" onClick={() => setEditing(toDraft(plan))}>Edit plan</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Drawer open={Boolean(editing)} side="right" title={editing?.id ? `Edit ${editing.name}` : "Create plan"} onClose={() => { if (!saving) setEditing(null); }}>
        {editing ? (
          <form className="space-y-4" onSubmit={reviewSave}>
            <FeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />
            <label className="block text-sm font-semibold">Name<Input className="mt-2" required value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></label>
            <label className="block text-sm font-semibold">Code<Input className="mt-2 font-mono uppercase" required readOnly={Boolean(editing.id)} pattern="[A-Z0-9_]+" value={editing.code} onChange={(event) => setEditing({ ...editing, code: event.target.value.toUpperCase() })} /></label>
            <label className="block text-sm font-semibold">Status<Select className="mt-2" value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value })}><option>ACTIVE</option><option>LEGACY</option><option>DISABLED</option></Select></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold">Currency<Input className="mt-2 uppercase" required value={editing.currency} onChange={(event) => setEditing({ ...editing, currency: event.target.value.toUpperCase() })} /></label>
              <label className="block text-sm font-semibold">Billing interval<Select className="mt-2" value={editing.billingInterval} onChange={(event) => setEditing({ ...editing, billingInterval: event.target.value })}><option>MONTHLY</option><option>YEARLY</option><option>MANUAL</option></Select></label>
              <label className="block text-sm font-semibold">Price<Input className="mt-2" required type="number" min="0" step="0.01" inputMode="decimal" value={editing.price} onChange={(event) => setEditing({ ...editing, price: event.target.value })} /></label>
              <label className="block text-sm font-semibold">Trial days<Input className="mt-2" required type="number" min="0" step="1" inputMode="numeric" value={editing.trialDays} onChange={(event) => setEditing({ ...editing, trialDays: event.target.value })} /></label>
            </div>
            <label className="block text-sm font-semibold">Included limits (JSON)<Textarea className="mt-2 font-mono text-xs" required rows={7} value={editing.includedLimits} onChange={(event) => setEditing({ ...editing, includedLimits: event.target.value })} /></label>
            <label className="block text-sm font-semibold">Feature flags (JSON)<Textarea className="mt-2 font-mono text-xs" required rows={7} value={editing.featureFlags} onChange={(event) => setEditing({ ...editing, featureFlags: event.target.value })} /></label>
            <p className="text-sm leading-6 text-brand-muted">Changes affect entitlement evaluation for every tenant assigned to this plan.</p>
            <Button type="submit" loading={saving}>Review plan changes</Button>
          </form>
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={confirming}
        title={editing?.id ? "Apply plan changes?" : "Create this plan?"}
        description={editing ? <span><strong>{editing.name}</strong> will be {editing.status.toLowerCase()} at {editing.currency} {editing.price} per {editing.billingInterval.toLowerCase()} interval. Existing assigned tenants may be affected immediately.</span> : ""}
        confirmLabel={editing?.id ? "Apply changes" : "Create plan"}
        confirmationText={editing?.code}
        loading={saving}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void save()}
      />
    </PageShell>
  );
}

function JsonBox({ title, value }: { title: string; value?: Record<string, unknown> | null }) {
  return <div className="rounded-xl border border-brand-line bg-surface-app p-3"><h3 className="mb-2 text-xs font-semibold uppercase text-brand-muted">{title}</h3><pre className="max-h-44 overflow-auto whitespace-pre-wrap text-xs leading-5 text-brand-ink">{JSON.stringify(value ?? {}, null, 2)}</pre></div>;
}

function toDraft(plan: PlanRow): PlanDraft {
  return {
    id: plan.id,
    name: plan.name,
    code: plan.code,
    status: plan.status,
    currency: plan.currency,
    billingInterval: plan.billingInterval,
    price: String(plan.price),
    trialDays: String(plan.trialDays),
    includedLimits: JSON.stringify(plan.includedLimits ?? {}, null, 2),
    featureFlags: JSON.stringify(plan.featureFlags ?? {}, null, 2),
  };
}
