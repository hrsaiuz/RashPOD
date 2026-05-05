"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/auth-provider";
import DashboardLayout from "../dashboard-layout";
import { KpiTile, DataTable, DataTableColumn, EmptyState, ErrorState, Skeleton, Card, Button } from "@rashpod/ui";
import { Activity, AlertTriangle, Database, CheckCircle } from "lucide-react";
import Link from "next/link";

interface SuperAdminKpis {
  servicesUp: number;
  queueDepth: number;
  errorsCount: number;
  healthScore: number;
}

interface AuditEntry {
  id: string;
  action: string;
  user: string;
  resource: string;
  timestamp: string;
}

export default function SuperAdminOverview() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [kpis, setKpis] = useState<SuperAdminKpis | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/login?next=/dashboard/super-admin");
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        // TODO: Replace with actual endpoints
        // const healthRes = await fetch("/api/proxy/admin/health");
        // const queueRes = await fetch("/api/proxy/admin/worker-jobs?status=queued&count=true");
        // const auditRes = await fetch("/api/proxy/admin/audit-log?limit=5");
        
        setKpis({
          servicesUp: 4,
          queueDepth: 12,
          errorsCount: 2,
          healthScore: 98,
        });
        setAuditLog([
          { id: "1", action: "UPDATE_SETTINGS", user: "admin@rashpod.com", resource: "delivery_settings", timestamp: "2025-01-20T10:30:00" },
          { id: "2", action: "DELETE_USER", user: "admin@rashpod.com", resource: "user_123", timestamp: "2025-01-20T09:15:00" },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user, authLoading, router]);

  const auditColumns: DataTableColumn<AuditEntry>[] = [
    { key: "action", header: "Action", sortable: true },
    { key: "user", header: "User" },
    { key: "resource", header: "Resource" },
    { 
      key: "timestamp", 
      header: "Time",
      render: (val) => new Date(val).toLocaleString(),
    },
  ];

  return (
    <DashboardLayout role="super-admin">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-ink mb-2">Super Admin Dashboard</h1>
          <p className="text-brand-muted">System health, services, and audit logs.</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
          ⚠️ Actions taken here affect all users and all services. Review before making changes.
        </div>

        {error && (
          <ErrorState
            title="Failed to load dashboard"
            description={error}
            retry={
              <Button onClick={() => window.location.reload()} variant="primaryBlue">
                Retry
              </Button>
            }
          />
        )}

        {!error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {loading ? (
                <>
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </>
              ) : kpis ? (
                <>
                  <KpiTile label="Services Up" value={kpis.servicesUp} icon={<CheckCircle size={24} />} />
                  <KpiTile label="Queue Depth" value={kpis.queueDepth} icon={<Database size={24} />} />
                  <KpiTile label="Errors (24h)" value={kpis.errorsCount} icon={<AlertTriangle size={24} />} />
                  <KpiTile 
                    label="Health Score" 
                    value={`${kpis.healthScore}%`} 
                    icon={<Activity size={24} />}
                    delta={{ value: 2, isPositive: true }}
                  />
                </>
              ) : null}
            </div>

            <Card>
              <h3 className="text-lg font-semibold text-brand-ink mb-4">Service Status</h3>
              <div className="space-y-3">
                {["rashpod-web", "rashpod-dashboard", "rashpod-api", "rashpod-worker"].map((service) => (
                  <div key={service} className="flex items-center justify-between">
                    <span className="text-sm text-brand-ink">{service}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs text-brand-muted">Up</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-brand-muted mt-4">
                TODO: Replace with actual health check endpoints
              </p>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-brand-ink">Audit Log</h2>
              </div>
              <DataTable
                columns={auditColumns}
                rows={auditLog}
                loading={loading}
                mobileMode="cards"
                emptyState={
                  <EmptyState
                    title="No audit entries"
                    description="Audit log will appear here."
                  />
                }
              />
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

