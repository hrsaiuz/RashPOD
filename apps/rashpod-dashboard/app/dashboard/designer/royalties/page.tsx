"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, EmptyState, KpiTile, Skeleton } from "@rashpod/ui";
import { Coins, TrendingUp, Wallet } from "lucide-react";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";
import { api, type DesignerOverview } from "../../../../lib/api";

export default function RoyaltiesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [overview, setOverview] = useState<DesignerOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/login?next=/dashboard/designer/royalties");
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function load() {
    setLoading(true);
    try {
      const d = await api.get<DesignerOverview>("/dashboard/designer");
      setOverview(d);
    } catch {
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout role="designer">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-ink">Royalties</h1>
          <p className="text-brand-muted mt-1">Earnings, payouts, and per-listing performance.</p>
        </div>

        {loading ? (
          <Skeleton className="h-32" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiTile
              label="Items sold"
              value={overview?.soldItems ?? 0}
              icon={<TrendingUp className="text-brand-blue" />}
            />
            <KpiTile
              label="Lifetime earnings"
              value="—"
              icon={<Coins className="text-brand-peach" />}
            />
            <KpiTile
              label="Next payout"
              value="—"
              icon={<Wallet className="text-brand-muted" />}
            />
          </div>
        )}

        <Card>
          <EmptyState
            icon={<Coins className="text-brand-peach" size={32} />}
            title="Itemised royalty ledger ships with v1.1"
            description="The order pipeline is live; the per-sale royalty journal and Click payout integration launch in the next release. Sales are already tracked — you can see your sold-item count above."
            action={
              <Link href="/dashboard/designer/settings">
                <Button variant="secondary">Set up payout details</Button>
              </Link>
            }
          />
        </Card>
      </div>
    </DashboardLayout>
  );
}
