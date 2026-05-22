"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle, CircleX } from "lucide-react";
import { ErrorState } from "@rashpod/ui";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";

type CheckStatus = "PASS" | "WARN" | "FAIL";
type LaunchCheck = { key: string; label: string; status: CheckStatus; explanation: string; docsPath?: string };
type LaunchSection = { key: string; label: string; checks: LaunchCheck[] };
type LaunchReadiness = { generatedAt: string; environment: string; summary: { pass: number; warn: number; fail: number }; sections: LaunchSection[] };

const style: Record<CheckStatus, { bg: string; text: string; icon: typeof CheckCircle }> = {
  PASS: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", icon: CheckCircle },
  WARN: { bg: "bg-amber-50 border-amber-200", text: "text-amber-800", icon: AlertTriangle },
  FAIL: { bg: "bg-red-50 border-red-200", text: "text-red-700", icon: CircleX },
};

export default function LaunchReadinessPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [data, setData] = useState<LaunchReadiness | null>(null);
  const [error, setError] = useState("");
  const totals = useMemo(() => data?.summary ?? { pass: 0, warn: 0, fail: 0 }, [data]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push("/auth/login?next=/dashboard/admin/launch-readiness"); return; }
    fetch("/api/proxy/admin/launch-readiness")
      .then((res) => {
        if (res.status === 401 || res.status === 403) throw new Error("You do not have access to launch readiness checks.");
        if (!res.ok) throw new Error(`Server error (${res.status})`);
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load launch readiness."));
  }, [user, isLoading, router]);

  return (
    <DashboardLayout role="admin">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-ink">Launch Readiness</h1>
          <p className="text-sm text-brand-muted">Production safety checks for environment, operations, security, and data readiness.</p>
        </div>
        {data ? <p className="text-xs text-brand-muted">Generated {new Date(data.generatedAt).toLocaleString()} · {data.environment}</p> : null}
      </div>
      {error ? <ErrorState title="Readiness unavailable" description={error} /> : null}
      {!data && !error ? <div className="rounded-xl border border-brand-line bg-white p-5 text-sm text-brand-muted">Loading launch checks...</div> : null}
      {data ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Summary label="Pass" value={totals.pass} tone="text-emerald-700" />
            <Summary label="Warn" value={totals.warn} tone="text-amber-800" />
            <Summary label="Fail" value={totals.fail} tone="text-red-700" />
          </div>
          {data.sections.map((section) => (
            <section key={section.key} className="rounded-2xl border border-brand-line bg-white p-5 shadow-soft">
              <h2 className="mb-3 text-lg font-semibold text-brand-ink">{section.label}</h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {section.checks.map((check) => {
                  const s = style[check.status];
                  const Icon = s.icon;
                  return (
                    <div key={check.key} className={`rounded-xl border p-4 ${s.bg}`}>
                      <div className="mb-2 flex items-center gap-2">
                        <Icon size={16} className={s.text} />
                        <span className={`text-xs font-bold ${s.text}`}>{check.status}</span>
                        <span className="text-sm font-semibold text-brand-ink">{check.label}</span>
                      </div>
                      <p className="text-sm text-brand-muted">{check.explanation}</p>
                      {check.docsPath ? <p className="mt-2 text-xs text-brand-muted">{check.docsPath}</p> : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </DashboardLayout>
  );
}

function Summary({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="rounded-2xl border border-brand-line bg-white p-4 shadow-soft"><div className={`text-2xl font-bold ${tone}`}>{value}</div><div className="text-sm text-brand-muted">{label}</div></div>;
}
