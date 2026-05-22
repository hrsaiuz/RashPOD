"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, ShieldCheck } from "lucide-react";
import { Button, ErrorState } from "@rashpod/ui";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";

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
};

export default function SuperAdminPlansPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/proxy/super-admin/plans");
      if (res.status === 401 || res.status === 403) throw new Error("Super admin plan access is required.");
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      setRows(await res.json() as PlanRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load plans.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push("/auth/login?next=/dashboard/super-admin/plans");
      return;
    }
    void load();
  }, [user, isLoading, router]);

  return (
    <DashboardLayout role="super-admin">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-ink">Plans</h1>
          <p className="text-sm text-brand-muted">SaaS plan catalog and entitlement visibility for tenant gating.</p>
        </div>
        <Button variant="secondary" onClick={() => void load()} loading={loading}>Refresh</Button>
      </div>

      {error ? <ErrorState title="Plans unavailable" description={error} /> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((plan) => (
          <section key={plan.id} className="rounded-2xl border border-brand-line bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex items-center gap-2 text-brand-blue"><CreditCard size={18} /><span className="text-xs font-bold uppercase">{plan.code}</span></div>
                <h2 className="text-lg font-bold text-brand-ink">{plan.name}</h2>
                <p className="text-sm text-brand-muted">{plan.currency} {String(plan.price)} · {plan.billingInterval.toLowerCase()} · {plan.trialDays} trial days</p>
              </div>
              <span className="rounded-pill bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue">{plan.status}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <JsonBox title="Limits" value={plan.includedLimits} />
              <JsonBox title="Features" value={plan.featureFlags} />
            </div>
          </section>
        ))}
        {!loading && rows.length === 0 ? (
          <div className="rounded-2xl border border-brand-line bg-white p-8 text-center text-sm text-brand-muted shadow-soft">
            <ShieldCheck className="mx-auto mb-3 text-brand-blue" />
            No plans found.
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}

function JsonBox({ title, value }: { title: string; value?: Record<string, unknown> | null }) {
  return (
    <div className="rounded-xl border border-brand-line bg-surface-soft p-3">
      <div className="mb-2 text-xs font-semibold uppercase text-brand-muted">{title}</div>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs text-brand-ink">{JSON.stringify(value ?? {}, null, 2)}</pre>
    </div>
  );
}
