"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/auth-provider";
import DashboardLayout from "../dashboard-layout";
import { KpiTile, EmptyState, ErrorState, Skeleton, Card, Button } from "@rashpod/ui";
import { DollarSign, CreditCard, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";

interface FinanceKpis {
  pendingRoyalties: number;
  paidThisMonth: number;
  clickReconciliation: number;
  settlementsDue: number;
}

export default function FinanceOverview() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [kpis, setKpis] = useState<FinanceKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/login?next=/dashboard/finance");
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        // TODO: Replace with actual endpoints
        // const kpiRes = await fetch("/api/proxy/finance/kpis");
        
        setKpis({
          pendingRoyalties: 1250.75,
          paidThisMonth: 4320.50,
          clickReconciliation: 850.00,
          settlementsDue: 3,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user, authLoading, router]);

  return (
    <DashboardLayout role="finance">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-ink mb-2">Finance Dashboard</h1>
          <p className="text-brand-muted">Monitor royalties, payments, and settlements.</p>
        </div>

        {error && (
          <ErrorState
            title="Failed to load dashboard"
            description={error}
            retry={
              <Button onClick={() => window.location.reload()} variant="primary">
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
                  <KpiTile 
                    label="Pending Royalties" 
                    value={`$${kpis.pendingRoyalties.toFixed(2)}`} 
                    icon={<DollarSign size={24} />} 
                  />
                  <KpiTile 
                    label="Paid This Month" 
                    value={`$${kpis.paidThisMonth.toFixed(2)}`} 
                    icon={<CheckCircle size={24} />}
                    delta={{ value: 8, isPositive: true }}
                  />
                  <KpiTile 
                    label="Click Reconciliation" 
                    value={`$${kpis.clickReconciliation.toFixed(2)}`} 
                    icon={<CreditCard size={24} />} 
                  />
                  <KpiTile label="Settlements Due" value={kpis.settlementsDue} icon={<AlertCircle size={24} />} />
                </>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-lg font-semibold text-brand-ink mb-4">Quick Links</h3>
                <div className="space-y-3">
                  <Link href="/dashboard/finance/royalties">
                    <Button variant="ghost" className="w-full justify-start">
                      <DollarSign size={18} className="mr-2" />
                      Manage Royalties
                    </Button>
                  </Link>
                  <Link href="/dashboard/finance/payments">
                    <Button variant="ghost" className="w-full justify-start">
                      <CreditCard size={18} className="mr-2" />
                      View Payments
                    </Button>
                  </Link>
                </div>
              </Card>

              <Card>
                <h3 className="text-lg font-semibold text-brand-ink mb-2">Alerts</h3>
                <p className="text-sm text-brand-muted">
                  {kpis && kpis.settlementsDue > 0 
                    ? `${kpis.settlementsDue} settlement(s) need your attention.`
                    : "All settlements are up to date."}
                </p>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
