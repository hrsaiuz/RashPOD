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
  money,
} from "../../finance-ui";

type PayoutDetail = {
  id: string;
  designerId: string;
  amount: string | number;
  currency: string;
  status: string;
  reference?: string | null;
  note?: string | null;
  designer?: { displayName?: string | null; email?: string | null };
  royaltyEntries: Array<{
    id: string;
    orderId?: string | null;
    orderItemId?: string | null;
    listingId?: string | null;
    amount: string | number;
    currency: string;
    status: string;
    note?: string | null;
    orderItem?: { listingTitle?: string | null } | null;
  }>;
};

export default function PayoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [payout, setPayout] = useState<PayoutDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/proxy/finance/payouts/${id}`);
      if (res.status === 401 || res.status === 403) {
        router.push("/auth/login");
        return;
      }
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      setPayout(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payout.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoading && user) void load();
  }, [user, isLoading, id]);

  return (
    <DashboardLayout role="finance">
      <FinanceBackLink href="/dashboard/finance/payouts">
        <ArrowLeft size={16} /> Payouts
      </FinanceBackLink>
      <FinancePageHeader title="Payout Batch" onRefresh={load} />
      {error ? <FinanceAlert message={error} /> : null}
      {loading ? <FinancePanel>Loading payout...</FinancePanel> : null}
      {payout ? (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile label="Designer" value={payout.designer?.displayName || payout.designer?.email || payout.designerId} />
            <KpiTile label="Amount" value={money(Number(payout.amount), payout.currency)} />
            <KpiTile label="Status" value={payout.status.replace(/_/g, " ")} />
            <KpiTile label="Entries" value={String(payout.royaltyEntries.length)} />
          </div>
          <FinanceTable
            columns={["Entry", "Order", "Listing", "Amount", "Status", "Note"]}
            loading={false}
            empty={payout.royaltyEntries.length === 0}
            emptyMessage="No entries in this batch."
          >
            {payout.royaltyEntries.map((entry) => (
              <FinanceRow key={entry.id}>
                <FinanceCell>{entry.id.slice(-8)}</FinanceCell>
                <FinanceCell>
                  {entry.orderId ? (
                    <FinanceLink href={`/dashboard/finance/orders/${entry.orderId}`}>#{entry.orderId.slice(-6)}</FinanceLink>
                  ) : (
                    "-"
                  )}
                </FinanceCell>
                <FinanceCell>{entry.orderItem?.listingTitle || entry.listingId || "-"}</FinanceCell>
                <FinanceCell className="font-bold tabular-nums">{money(Number(entry.amount), entry.currency)}</FinanceCell>
                <FinanceCell><FinanceStatusBadge status={entry.status} /></FinanceCell>
                <FinanceCell>{entry.note || "-"}</FinanceCell>
              </FinanceRow>
            ))}
          </FinanceTable>
        </>
      ) : null}
    </DashboardLayout>
  );
}
