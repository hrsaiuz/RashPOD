"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@rashpod/ui";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";
import {
  FinanceAlert,
  FinanceCell,
  FinanceIconButton,
  FinanceLink,
  FinancePageHeader,
  FinanceRow,
  FinanceStatusBadge,
  FinanceTable,
  money,
} from "../finance-ui";

type ReconciliationRow = {
  id: string;
  paymentTransactionId: string;
  orderId: string;
  provider: string;
  providerTransactionId?: string | null;
  expectedAmount: string | number;
  receivedAmount?: string | number | null;
  currency: string;
  providerStatus?: string | null;
  internalStatus?: string | null;
  discrepancyAmount: string | number;
  status: string;
  note?: string | null;
  updatedAt: string;
  order?: {
    customerName?: string | null;
    customer?: { displayName?: string | null; email?: string | null };
  };
};

export default function ReconciliationPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [rows, setRows] = useState<ReconciliationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/proxy/finance/reconciliation");
      if (res.status === 401 || res.status === 403) {
        router.push("/auth/login");
        return;
      }
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      setRows(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reconciliation.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoading && user) void load();
  }, [user, isLoading]);

  async function review(paymentId: string, matched: boolean) {
    const note = window.prompt(matched ? "Reason/confirmation note" : "Review note");
    if (!note) return;
    const res = await fetch(
      `/api/proxy/finance/reconciliation/${paymentId}/${matched ? "mark-matched" : "mark-reviewed"}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) },
    );
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    await load();
  }

  return (
    <DashboardLayout role="finance">
      <FinancePageHeader title="Payment Reconciliation" onRefresh={load} />
      {error ? <FinanceAlert message={error} /> : null}
      <FinanceTable
        columns={["Payment", "Order", "Customer", "Expected", "Received", "Discrepancy", "Status", "Provider", "Actions"]}
        loading={loading}
        empty={rows.length === 0}
        emptyMessage="No reconciliation records."
      >
        {rows.map((row) => (
          <FinanceRow key={row.id}>
            <FinanceCell>{row.paymentTransactionId.slice(-8)}</FinanceCell>
            <FinanceCell>
              <FinanceLink href={`/dashboard/finance/orders/${row.orderId}`}>#{row.orderId.slice(-6)}</FinanceLink>
            </FinanceCell>
            <FinanceCell>
              {row.order?.customerName || row.order?.customer?.displayName || row.order?.customer?.email || "-"}
            </FinanceCell>
            <FinanceCell className="tabular-nums">{money(Number(row.expectedAmount), row.currency)}</FinanceCell>
            <FinanceCell className="tabular-nums">
              {row.receivedAmount == null ? "-" : money(Number(row.receivedAmount), row.currency)}
            </FinanceCell>
            <FinanceCell className={`font-bold tabular-nums ${Number(row.discrepancyAmount) === 0 ? "text-semantic-successText" : "text-semantic-dangerText"}`}>
              {money(Number(row.discrepancyAmount), row.currency)}
            </FinanceCell>
            <FinanceCell><FinanceStatusBadge status={row.status} /></FinanceCell>
            <FinanceCell>{row.provider} / {row.providerStatus || "-"}</FinanceCell>
            <FinanceCell>
              <div className="flex flex-wrap gap-2">
                <FinanceIconButton
                  title="Mark matched"
                  disabled={row.status === "MATCHED"}
                  onClick={() => void review(row.paymentTransactionId, true)}
                >
                  <CheckCircle2 size={14} />
                </FinanceIconButton>
                <Button variant="secondary" size="sm" onClick={() => void review(row.paymentTransactionId, false)}>
                  Review
                </Button>
              </div>
            </FinanceCell>
          </FinanceRow>
        ))}
      </FinanceTable>
    </DashboardLayout>
  );
}
