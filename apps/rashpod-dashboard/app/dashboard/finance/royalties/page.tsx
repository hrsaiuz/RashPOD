"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@rashpod/ui";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";
import {
  FinanceAlert,
  FinanceCell,
  FinanceInput,
  FinanceLink,
  FinancePageHeader,
  FinancePanel,
  FinanceRow,
  FinanceSelect,
  FinanceStatusBadge,
  FinanceTable,
  formatLabel,
  money,
} from "../finance-ui";

type RoyaltyRow = {
  id: string;
  designerId: string;
  amount: string | number;
  currency: string;
  status: string;
  entryType: string;
  createdAt: string;
  designer?: { displayName?: string | null; email?: string | null };
  order?: { id: string; status: string } | null;
  orderItem?: { listingTitle?: string | null } | null;
  listing?: { id: string; title: string } | null;
  payout?: { id: string; status: string } | null;
};

export default function FinanceRoyaltiesPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [rows, setRows] = useState<RoyaltyRow[]>([]);
  const [status, setStatus] = useState("ALL");
  const [designerId, setDesignerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adjustOpen, setAdjustOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      if (status !== "ALL") qs.set("status", status);
      if (designerId.trim()) qs.set("designerId", designerId.trim());
      const res = await fetch(`/api/proxy/finance/royalties?${qs}`);
      if (res.status === 401 || res.status === 403) {
        router.push("/auth/login");
        return;
      }
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      setRows(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load royalties.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isLoading || !user) return;
    void load();
  }, [user, isLoading, status]);

  async function createAdjustment(form: FormData) {
    const body = {
      designerId: String(form.get("designerId") || ""),
      amount: Number(form.get("amount") || 0),
      currency: String(form.get("currency") || "UZS"),
      reason: String(form.get("reason") || ""),
      orderId: String(form.get("orderId") || "") || undefined,
      orderItemId: String(form.get("orderItemId") || "") || undefined,
      listingId: String(form.get("listingId") || "") || undefined,
    };
    if (!window.confirm(`Create adjustment for ${money(body.amount, body.currency)}?`)) return;
    const res = await fetch("/api/proxy/finance/royalties/adjustment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    setAdjustOpen(false);
    await load();
  }

  return (
    <DashboardLayout role="finance">
      <FinancePageHeader
        title="Royalties"
        onRefresh={load}
        actions={
          <Button variant="secondary" size="sm" onClick={() => setAdjustOpen((v) => !v)}>
            <Plus size={15} className="mr-2" />
            Adjustment
          </Button>
        }
      />
      {error ? <FinanceAlert message={error} /> : null}

      <FinancePanel className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <FinanceSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            {["ALL", "PENDING", "EARNED", "PAYABLE", "PAID", "REVERSED", "ADJUSTMENT", "CANCELLED"].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </FinanceSelect>
          <FinanceInput value={designerId} onChange={(e) => setDesignerId(e.target.value)} placeholder="Designer id" />
          <Button variant="secondary" size="sm" onClick={load}>Apply</Button>
        </div>
        {adjustOpen ? (
          <form action={createAdjustment} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FinanceInput name="designerId" required placeholder="Designer id" />
            <FinanceInput name="amount" required type="number" step="0.01" placeholder="Amount" />
            <FinanceInput name="currency" defaultValue="UZS" />
            <FinanceInput name="reason" required placeholder="Reason" />
            <FinanceInput name="orderId" placeholder="Order id optional" />
            <FinanceInput name="orderItemId" placeholder="Order item id optional" />
            <FinanceInput name="listingId" placeholder="Listing id optional" />
            <Button type="submit" variant="primaryBlue" size="sm">Create</Button>
          </form>
        ) : null}
      </FinancePanel>

      <FinanceTable
        columns={["Designer", "Order", "Listing", "Type", "Amount", "Status", "Payout", "Date"]}
        loading={loading}
        empty={rows.length === 0}
        emptyMessage="No royalty entries."
      >
        {rows.map((row) => (
          <FinanceRow key={row.id}>
            <FinanceCell>
              <div>{row.designer?.displayName || row.designer?.email || row.designerId}</div>
              <FinanceLink href={`/dashboard/finance/designers/${row.designerId}`}>Balance</FinanceLink>
            </FinanceCell>
            <FinanceCell>
              {row.order ? (
                <FinanceLink href={`/dashboard/finance/orders/${row.order.id}`}>#{row.order.id.slice(-6)}</FinanceLink>
              ) : (
                "-"
              )}
            </FinanceCell>
            <FinanceCell>{row.listing?.title || row.orderItem?.listingTitle || "-"}</FinanceCell>
            <FinanceCell>{formatLabel(row.entryType)}</FinanceCell>
            <FinanceCell className="font-bold tabular-nums">{money(Number(row.amount), row.currency)}</FinanceCell>
            <FinanceCell><FinanceStatusBadge status={row.status} /></FinanceCell>
            <FinanceCell>
              {row.payout ? (
                <FinanceLink href={`/dashboard/finance/payouts/${row.payout.id}`}>{row.payout.status}</FinanceLink>
              ) : (
                "-"
              )}
            </FinanceCell>
            <FinanceCell>{new Date(row.createdAt).toLocaleDateString()}</FinanceCell>
          </FinanceRow>
        ))}
      </FinanceTable>
    </DashboardLayout>
  );
}
