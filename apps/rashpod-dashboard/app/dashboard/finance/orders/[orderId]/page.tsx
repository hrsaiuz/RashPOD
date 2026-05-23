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
  FinancePageHeader,
  FinancePanel,
  FinanceRow,
  FinanceTable,
  money,
} from "../../finance-ui";

type OrderFinance = {
  id: string;
  status: string;
  total: string | number;
  subtotal: string | number;
  deliveryFee: string | number;
  discountTotal: string | number;
  currency: string;
  financeSnapshots?: Snapshot[];
  royaltyLedgerEntries?: Royalty[];
  paymentReconciliations?: Recon[];
  payments?: Array<{ id: string; provider: string; status: string; amount: string | number; providerRef?: string | null }>;
};
type Snapshot = {
  id: string;
  orderItemId: string;
  listingId: string;
  designerId?: string | null;
  grossLineAmount: string | number;
  netRevenue: string | number;
  baseProductCost?: string | number | null;
  productionCost?: string | number | null;
  deliveryCost?: string | number | null;
  royaltyAmount: string | number;
  platformMarginEstimate?: string | number | null;
  marginIncomplete: boolean;
  incompleteReason?: string | null;
  settlementStatus: string;
  refundStatus: string;
};
type Royalty = { id: string; designerId: string; amount: string | number; currency: string; status: string; entryType: string; orderItemId?: string | null };
type Recon = { id: string; status: string; expectedAmount: string | number; receivedAmount?: string | number | null; discrepancyAmount: string | number; currency: string };

export default function OrderFinancePage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [order, setOrder] = useState<OrderFinance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/proxy/finance/orders/${orderId}`);
      if (res.status === 401 || res.status === 403) {
        router.push("/auth/login");
        return;
      }
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      setOrder(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order finance.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoading && user) void load();
  }, [user, isLoading, orderId]);

  const currency = order?.currency ?? "UZS";
  const snapshots = order?.financeSnapshots ?? [];
  const margin = snapshots.reduce((sum, row) => sum + Number(row.platformMarginEstimate ?? 0), 0);

  return (
    <DashboardLayout role="finance">
      <FinanceBackLink href="/dashboard/finance">
        <ArrowLeft size={16} /> Finance
      </FinanceBackLink>
      <FinancePageHeader title={`Order Finance #${orderId.slice(-6)}`} onRefresh={load} />
      {error ? <FinanceAlert message={error} /> : null}
      {loading ? <FinancePanel>Loading order finance...</FinancePanel> : null}
      {order ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            <KpiTile label="Gross" value={money(Number(order.total), currency)} />
            <KpiTile label="Subtotal" value={money(Number(order.subtotal), currency)} />
            <KpiTile label="Delivery" value={money(Number(order.deliveryFee), currency)} />
            <KpiTile label="Discount" value={money(Number(order.discountTotal), currency)} />
            <KpiTile label="Margin estimate" value={money(margin, currency)} />
          </div>
          <FinancePanel className="mb-4">
            <h2 className="mb-3 text-sm font-semibold text-brand-ink">Item Finance</h2>
            <FinanceTable
              columns={["Item", "Gross", "Net", "Costs", "Royalty", "Margin", "Status"]}
              loading={false}
              empty={snapshots.length === 0}
              emptyMessage="No finance snapshots yet."
            >
              {snapshots.map((row) => (
                <FinanceRow key={row.id}>
                  <FinanceCell>{row.orderItemId.slice(-8)}</FinanceCell>
                  <FinanceCell className="tabular-nums">{money(Number(row.grossLineAmount), currency)}</FinanceCell>
                  <FinanceCell className="tabular-nums">{money(Number(row.netRevenue), currency)}</FinanceCell>
                  <FinanceCell className="text-xs">
                    Base {money(Number(row.baseProductCost ?? 0), currency)} / Prod{" "}
                    {money(Number(row.productionCost ?? 0), currency)} / Del {money(Number(row.deliveryCost ?? 0), currency)}
                  </FinanceCell>
                  <FinanceCell className="tabular-nums">{money(Number(row.royaltyAmount), currency)}</FinanceCell>
                  <FinanceCell className={`font-bold tabular-nums ${row.marginIncomplete ? "text-semantic-warningText" : "text-semantic-successText"}`}>
                    {money(Number(row.platformMarginEstimate ?? 0), currency)}
                    {row.marginIncomplete ? ` (${row.incompleteReason || "incomplete"})` : ""}
                  </FinanceCell>
                  <FinanceCell>{row.settlementStatus} / {row.refundStatus}</FinanceCell>
                </FinanceRow>
              ))}
            </FinanceTable>
          </FinancePanel>
          <FinancePanel className="mb-4">
            <h2 className="mb-3 text-sm font-semibold text-brand-ink">Royalty Entries</h2>
            <pre className="overflow-auto whitespace-pre-wrap rounded-xs bg-surface-app p-3 text-xs text-brand-text">
              {JSON.stringify(order.royaltyLedgerEntries ?? [], null, 2)}
            </pre>
          </FinancePanel>
          <FinancePanel>
            <h2 className="mb-3 text-sm font-semibold text-brand-ink">Reconciliation</h2>
            <pre className="overflow-auto whitespace-pre-wrap rounded-xs bg-surface-app p-3 text-xs text-brand-text">
              {JSON.stringify(order.paymentReconciliations ?? [], null, 2)}
            </pre>
          </FinancePanel>
        </>
      ) : null}
    </DashboardLayout>
  );
}
