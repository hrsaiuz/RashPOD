"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { Button, ErrorState, KpiTile, PageHeader, Skeleton } from "@rashpod/ui";
import { useAuth } from "../../auth/auth-provider";
import DashboardLayout from "../dashboard-layout";

const VALID_ROLES = new Set(["designer", "customer", "production", "corporate", "moderator", "finance", "support", "admin", "super-admin"]);

function formatStatLabel(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim().replace(/^\w/, (c) => c.toUpperCase());
}

export default function RoleDashboardPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = use(params);
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  if (!VALID_ROLES.has(role)) {
    notFound();
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/auth/login?next=/dashboard/${role}`);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/proxy/dashboard/${role}`);
        if (res.status === 401 || res.status === 403) {
          router.push(`/auth/login?next=/dashboard/${role}`);
          return;
        }
        if (!res.ok) throw new Error(`Failed to load dashboard (${res.status})`);
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [role, user, authLoading, router]);

  return (
    <DashboardLayout role={role}>
      <PageHeader
        title={`${role.replace("-", " ")} overview`}
        description="Key metrics for your dashboard."
      />

      {error ? (
        <ErrorState
          title="Could not load overview"
          description={error}
          retry={
            <Button variant="primaryBlue" onClick={() => window.location.reload()}>
              Retry
            </Button>
          }
        />
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-md" />)
          : data && Object.keys(data).length > 0
            ? Object.entries(data).map(([key, value]) => (
                <KpiTile key={key} label={formatStatLabel(key)} value={value.toLocaleString()} />
              ))
            : !error ? (
                <p className="col-span-full text-sm text-brand-muted">No data available yet.</p>
              ) : null}
      </div>
    </DashboardLayout>
  );
}
