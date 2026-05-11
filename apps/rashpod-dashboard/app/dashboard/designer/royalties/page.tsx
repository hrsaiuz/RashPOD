"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, EmptyState, KpiTile, Skeleton } from "@rashpod/ui";
import { Coins, TrendingUp, Wallet, Calendar } from "lucide-react";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";
import { api, type DesignerOverview, type RoyaltyEntry } from "../../../../lib/api";

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Pending",
  PAID: "Paid",
  IN_PRODUCTION: "In production",
  READY_FOR_PICKUP: "Ready",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

function formatCurrency(value: number, currency = "UZS") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function RoyaltiesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [overview, setOverview] = useState<DesignerOverview | null>(null);
  const [entries, setEntries] = useState<RoyaltyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

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
      const [d, rows] = await Promise.all([
        api.get<DesignerOverview>("/dashboard/designer"),
        api.get<RoyaltyEntry[]>("/dashboard/designer/royalties?limit=100"),
      ]);
      setOverview(d);
      setEntries(Array.isArray(rows) ? rows : []);
    } catch {
      setOverview(null);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = entries.filter((e) => statusFilter === "ALL" || e.orderStatus === statusFilter);

  return (
    <DashboardLayout role="designer">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-ink">Royalties</h1>
          <p className="text-brand-muted mt-1">
            Earnings, payouts, and per-sale royalty journal.
            {overview?.royaltyPct ? ` Current rate: ${overview.royaltyPct}% of item total.` : ""}
          </p>
        </div>

        {loading ? (
          <Skeleton className="h-32" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <KpiTile
              label="Items sold"
              value={overview?.soldItems ?? 0}
              icon={<TrendingUp className="text-brand-blue" />}
            />
            <KpiTile
              label="Lifetime earnings"
              value={formatCurrency(overview?.lifetimeEarnings ?? 0)}
              icon={<Coins className="text-brand-peach" />}
            />
            <KpiTile
              label="This month"
              value={formatCurrency(overview?.monthEarnings ?? 0)}
              icon={<Calendar className="text-brand-blue" />}
            />
            <KpiTile
              label="Next payout"
              value="—"
              icon={<Wallet className="text-brand-muted" />}
            />
          </div>
        )}

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-brand-ink">Royalty entries</h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-brand-muted">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm rounded-md border border-gray-200 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                <option value="ALL">All</option>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <Skeleton className="h-48" />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Coins className="text-brand-peach" size={32} />}
              title="No royalty entries yet"
              description="Royalty entries appear here after each sale of your listings."
              action={
                <Link href="/dashboard/designer/settings">
                  <Button variant="secondary">Set up payout details</Button>
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 text-brand-muted">
                  <tr>
                    <th className="text-left py-2 pr-4 font-medium">Date</th>
                    <th className="text-left py-2 pr-4 font-medium">Listing</th>
                    <th className="text-right py-2 pr-4 font-medium">Qty</th>
                    <th className="text-right py-2 pr-4 font-medium">Sale</th>
                    <th className="text-right py-2 pr-4 font-medium">Royalty</th>
                    <th className="text-left py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id} className="border-b border-gray-50">
                      <td className="py-2 pr-4">{new Date(e.createdAt).toLocaleDateString()}</td>
                      <td className="py-2 pr-4">
                        <Link href={`/dashboard/designer/listings/${e.listingId}`} className="text-brand-blue hover:underline">
                          {e.listingTitle}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-right">{e.quantity}</td>
                      <td className="py-2 pr-4 text-right">{formatCurrency(e.totalPrice)}</td>
                      <td className="py-2 pr-4 text-right font-medium text-brand-ink">{formatCurrency(e.royalty)}</td>
                      <td className="py-2">{STATUS_LABEL[e.orderStatus] ?? e.orderStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
