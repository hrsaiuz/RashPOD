"use client";

import { ArrowLeft } from "lucide-react";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KpiTile } from "@rashpod/ui";
import { useAuth } from "../../../../auth/auth-provider";
import DashboardLayout from "../../../dashboard-layout";
import {
  FinanceAlert,
  FinanceBackLink,
  FinanceCell,
  FinanceLink,
  FinancePageHeader,
  FinancePanel,
  FinanceRow,
  FinanceStatusBadge,
  FinanceTable,
  formatLabel,
  money,
} from "../../finance-ui";

type Balance = {
  designerId: string;
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
    orderItemId?: string | null;
    reason?: string | null;
    createdAt: string;
  }>;
};

export default function DesignerBalancePage({ params }: { params: Promise<{ designerId: string }> }) {
  const { designerId } = use(params);
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [data, setData] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/proxy/finance/designers/${designerId}/balance`);
      if (res.status === 401 || res.status === 403) {
        router.push("/auth/login");
        return;
      }
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load designer balance.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoading && user) void load();
  }, [user, isLoading, designerId]);

  const currency = data?.entries[0]?.currency ?? "UZS";

  return (
    <DashboardLayout role="finance">
      <FinanceBackLink href="/dashboard/finance/royalties">
        <ArrowLeft size={16} /> Royalties
      </FinanceBackLink>
      <FinancePageHeader title="Designer Balance" onRefresh={load} />
      {error ? <FinanceAlert message={error} /> : null}
      {loading ? <FinancePanel>Loading balance...</FinancePanel> : null}
      {data ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <KpiTile label="Pending" value={money(data.pending, currency)} />
            <KpiTile label="Earned" value={money(data.earned, currency)} />
            <KpiTile label="Payable" value={money(data.payable, currency)} />
            <KpiTile label="Paid" value={money(data.paid, currency)} />
            <KpiTile label="Reversed" value={money(data.reversed, currency)} />
            <KpiTile label="Adjustments" value={money(data.adjustments, currency)} />
          </div>
          <FinanceTable
            columns={["Date", "Type", "Status", "Amount", "Order", "Reason"]}
            loading={false}
            empty={data.entries.length === 0}
            emptyMessage="No entries."
          >
              {data.entries.map((entry) => (
                <FinanceRow key={entry.id}>
                  <FinanceCell>{new Date(entry.createdAt).toLocaleDateString()}</FinanceCell>
                  <FinanceCell>{formatLabel(entry.entryType)}</FinanceCell>
                  <FinanceCell><FinanceStatusBadge status={entry.status} /></FinanceCell>
                  <FinanceCell className="font-bold tabular-nums">{money(Number(entry.amount), entry.currency)}</FinanceCell>
                  <FinanceCell>
                    {entry.orderId ? (
                      <FinanceLink href={`/dashboard/finance/orders/${entry.orderId}`}>#{entry.orderId.slice(-6)}</FinanceLink>
                    ) : (
                      "-"
                    )}
                  </FinanceCell>
                  <FinanceCell>{entry.reason || "-"}</FinanceCell>
                </FinanceRow>
              ))}
            </FinanceTable>
        </>
      ) : null}
    </DashboardLayout>
  );
}
