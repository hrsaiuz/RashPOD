"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";
import {
  FinanceAlert,
  FinanceCell,
  FinancePageHeader,
  FinanceRow,
  FinanceStatusBadge,
  FinanceTable,
  money,
} from "../finance-ui";

interface PaymentRow {
  id: string;
  orderId: string;
  customerName: string;
  amount: number;
  method: string;
  status: "pending" | "completed" | "failed" | "refunded";
  createdAt: string;
}

export default function FinancePaymentsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoading || !user) return;

    const load = async () => {
      try {
        const res = await fetch(`/api/proxy/payments`);
        if (res.status === 401 || res.status === 403) {
          router.push("/auth/login");
          return;
        }
        if (!res.ok) throw new Error(`Server error (${res.status})`);
        setRows(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load payments.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user, isLoading, router]);

  return (
    <DashboardLayout role="finance">
      <FinancePageHeader title="Payments" />
      {error ? <FinanceAlert message={error} /> : null}
      <FinanceTable
        columns={["Order", "Customer", "Amount", "Method", "Status", "Date"]}
        loading={loading}
        empty={rows.length === 0}
        emptyMessage="No payments found."
      >
        {rows.map((row) => (
          <FinanceRow key={row.id}>
            <FinanceCell className="font-mono text-xs">#{row.orderId.slice(-6)}</FinanceCell>
            <FinanceCell>{row.customerName}</FinanceCell>
            <FinanceCell className="font-semibold tabular-nums">{money(row.amount, "UZS")}</FinanceCell>
            <FinanceCell className="capitalize">{row.method}</FinanceCell>
            <FinanceCell><FinanceStatusBadge status={row.status} /></FinanceCell>
            <FinanceCell className="text-brand-muted">{new Date(row.createdAt).toLocaleDateString()}</FinanceCell>
          </FinanceRow>
        ))}
      </FinanceTable>
    </DashboardLayout>
  );
}
