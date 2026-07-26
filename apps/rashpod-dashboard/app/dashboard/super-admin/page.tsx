"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Building2, KeyRound, ShieldCheck, Users } from "lucide-react";
import { Button, Card, ErrorState, Skeleton } from "@rashpod/ui";
import { api } from "../../../lib/api";
import { PageShell } from "./super-admin-ui";

type SystemHealth = {
  launchReadiness?: unknown;
  worker?: { pending: number; failed: number };
  tenants?: number;
};

const QUICK_LINKS = [
  { href: "/dashboard/super-admin/tenants", label: "Manage tenants", description: "Plans, status, entitlements", icon: Building2 },
  { href: "/dashboard/super-admin/roles", label: "Review user roles", description: "Platform account access", icon: Users },
  { href: "/dashboard/super-admin/permissions", label: "Review RBAC", description: "Effective permission matrix", icon: ShieldCheck },
  { href: "/dashboard/super-admin/secrets", label: "Secret references", description: "Credential ownership and rotation", icon: KeyRound },
];

export default function SuperAdminPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setHealth(await api.get<SystemHealth>("/super-admin/system/health"));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load platform health");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <PageShell title="Platform overview" description="Cross-tenant health, access governance, and operational control for RashPOD’s four deployable services." icon={<Activity size={22} />}>
      <div className="rounded-2xl border border-semantic-warningBg bg-semantic-warningBg p-4 text-sm leading-6 text-semantic-warningText">
        Changes in this workspace can affect every tenant. High-risk actions require an explicit review and are audit logged.
      </div>
      {loading ? <Skeleton className="h-40" /> : error ? (
        <ErrorState title="Could not load platform health" description={error} retry={<Button onClick={() => void load()}>Retry</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card><p className="text-sm text-brand-muted">Worker pending</p><p className="mt-2 text-3xl font-bold tabular-nums">{health?.worker?.pending ?? 0}</p></Card>
          <Card><p className="text-sm text-brand-muted">Worker failed</p><p className="mt-2 text-3xl font-bold tabular-nums text-semantic-dangerText">{health?.worker?.failed ?? 0}</p></Card>
          <Card><p className="text-sm text-brand-muted">Tenants</p><p className="mt-2 text-3xl font-bold tabular-nums">{health?.tenants ?? 0}</p></Card>
          <Card><p className="text-sm text-brand-muted">Deployable services</p><p className="mt-2 text-3xl font-bold tabular-nums">4</p></Card>
        </div>
      )}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-brand-ink">Common platform tasks</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_LINKS.map(({ href, label, description, icon: Icon }) => (
            <Link key={href} href={href} className="group rounded-2xl border border-brand-line bg-white p-5 shadow-soft transition-colors hover:border-brand-blue/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20">
              <Icon className="text-brand-blue" size={22} aria-hidden="true" />
              <h3 className="mt-4 font-semibold text-brand-ink">{label}</h3>
              <p className="mt-1 text-sm text-brand-muted">{description}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-blue">Open <ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-1 motion-reduce:transform-none" /></span>
            </Link>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
