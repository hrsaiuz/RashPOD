"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, KpiTile } from "@rashpod/ui";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";
import {
  FinanceAlert,
  FinanceCell,
  FinanceLink,
  FinancePageHeader,
  FinanceRow,
  FinanceStatusBadge,
  FinanceTable,
  formatLabel,
  money,
} from "../../finance/finance-ui";

type Earnings = {
  pending: number;
  earned: number;
  payable: number;
  paid: number;
  reversed: number;
  adjustments: number;
  currentPayableBalance: number;
  entries: Array<{
    id: string;
    amount: string | number;
    currency: string;
    status: string;
    entryType: string;
    orderId?: string | null;
    reason?: string | null;
    createdAt: string;
  }>;
};

type Payout = {
  id: string;
  amount: string | number;
  currency: string;
  status: string;
  createdAt: string;
  reference?: string | null;
};

export default function DesignerEarningsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [earningsRes, payoutsRes] = await Promise.all([
        fetch("/api/proxy/designer/earnings"),
        fetch("/api/proxy/designer/earnings/payouts"),
      ]);
      if (earningsRes.status === 401 || earningsRes.status === 403) {
        router.push("/auth/login");
        return;
      }
      if (!earningsRes.ok) throw new Error(`Server error (${earningsRes.status})`);
      setEarnings(await earningsRes.json());
      setPayouts(payoutsRes.ok ? await payoutsRes.json() : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load earnings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoading && user) void load();
  }, [user, isLoading]);

  const currency = earnings?.entries[0]?.currency ?? payouts[0]?.currency ?? "UZS";

  return (
    <DashboardLayout role="designer">
      <FinancePageHeader title="Earnings" description="Your royalty ledger and payout history." onRefresh={load} />
      {error ? <FinanceAlert message={error} /> : null}
      {loading ? <Card className="p-4 text-sm text-brand-muted">Loading earnings...</Card> : null}
      {earnings ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <KpiTile label="Pending" value={money(earnings.pending, currency)} />
            <KpiTile label="Earned" value={money(earnings.earned, currency)} />
            <KpiTile label="Payable" value={money(earnings.payable, currency)} />
            <KpiTile label="Paid" value={money(earnings.paid, currency)} />
            <KpiTile label="Reversed" value={money(earnings.reversed, currency)} />
            <KpiTile label="Adjustments" value={money(earnings.adjustments, currency)} />
          </div>

          <FinanceTable
            columns={["Date", "Type", "Status", "Amount", "Order", "Reason"]}
            loading={false}
            empty={earnings.entries.length === 0}
            emptyMessage="No royalty entries yet."
          >
            {earnings.entries.slice(0, 100).map((entry) => (
              <FinanceRow key={entry.id}>
                <FinanceCell>{new Date(entry.createdAt).toLocaleDateString()}</FinanceCell>
                <FinanceCell>{formatLabel(entry.entryType)}</FinanceCell>
                <FinanceCell><FinanceStatusBadge status={entry.status} /></FinanceCell>
                <FinanceCell className="font-bold tabular-nums">{money(Number(entry.amount), entry.currency)}</FinanceCell>
                <FinanceCell>{entry.orderId ? `#${entry.orderId.slice(-6)}` : "-"}</FinanceCell>
                <FinanceCell>{entry.reason || "-"}</FinanceCell>
              </FinanceRow>
            ))}
          </FinanceTable>

          <div className="mt-4">
            <h2 className="mb-3 text-sm font-semibold text-brand-ink">Payout history</h2>
            <FinanceTable
              columns={["Date", "Amount", "Status", "Reference"]}
              loading={false}
              empty={payouts.length === 0}
              emptyMessage="No payouts yet."
            >
              {payouts.map((payout) => (
                <FinanceRow key={payout.id}>
                  <FinanceCell>{new Date(payout.createdAt).toLocaleDateString()}</FinanceCell>
                  <FinanceCell className="font-bold tabular-nums">{money(Number(payout.amount), payout.currency)}</FinanceCell>
                  <FinanceCell><FinanceStatusBadge status={payout.status} /></FinanceCell>
                  <FinanceCell>{payout.reference || "-"}</FinanceCell>
                </FinanceRow>
              ))}
            </FinanceTable>
          </div>

          <div className="mt-4">
            <FinanceLink href="/dashboard/designer/settings">Payout settings</FinanceLink>
          </div>
        </>
      ) : null}
    </DashboardLayout>
  );
}
