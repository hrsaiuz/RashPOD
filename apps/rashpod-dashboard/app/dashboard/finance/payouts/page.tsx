"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, Plus, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@rashpod/ui";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";
import {
  FinanceAlert,
  FinanceCell,
  FinanceIconButton,
  FinanceInput,
  FinanceLink,
  FinancePageHeader,
  FinancePanel,
  FinanceRow,
  FinanceStatusBadge,
  FinanceTable,
  money,
} from "../finance-ui";

type Payout = {
  id: string;
  designerId: string;
  amount: string | number;
  currency: string;
  status: string;
  reference?: string | null;
  note?: string | null;
  createdAt: string;
  designer?: { displayName?: string | null; email?: string | null };
  royaltyEntries?: Array<{ id: string }>;
};

export default function PayoutsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [rows, setRows] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draftOpen, setDraftOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/proxy/finance/payouts");
      if (res.status === 401 || res.status === 403) {
        router.push("/auth/login");
        return;
      }
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      setRows(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payouts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoading && user) void load();
  }, [user, isLoading]);

  async function createDraft(form: FormData) {
    const body = {
      designerId: String(form.get("designerId") || ""),
      currency: String(form.get("currency") || "UZS"),
      note: String(form.get("note") || "") || undefined,
    };
    const res = await fetch("/api/proxy/finance/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    setDraftOpen(false);
    await load();
  }

  async function action(id: string, path: string, message: string) {
    if (!window.confirm(message)) return;
    const res = await fetch(`/api/proxy/finance/payouts/${id}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "MANUAL", note: message }),
    });
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    await load();
  }

  async function exportCsv(id: string) {
    const res = await fetch(`/api/proxy/finance/payouts/${id}/export`);
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    const data = await res.json();
    const url = URL.createObjectURL(new Blob([data.csv], { type: data.contentType || "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = data.filename || `payout-${id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout role="finance">
      <FinancePageHeader
        title="Payout Batches"
        onRefresh={load}
        actions={
          <Button variant="secondary" size="sm" onClick={() => setDraftOpen((v) => !v)}>
            <Plus size={15} className="mr-2" />
            Draft
          </Button>
        }
      />
      {error ? <FinanceAlert message={error} /> : null}
      {draftOpen ? (
        <FinancePanel className="mb-4">
          <form action={createDraft} className="flex flex-wrap items-center gap-3">
            <FinanceInput name="designerId" required placeholder="Designer id" />
            <FinanceInput name="currency" defaultValue="UZS" />
            <FinanceInput name="note" placeholder="Note" />
            <Button type="submit" variant="primaryBlue" size="sm">Create draft</Button>
          </form>
        </FinancePanel>
      ) : null}
      <FinanceTable
        columns={["Designer", "Amount", "Status", "Entries", "Reference", "Date", "Actions"]}
        loading={loading}
        empty={rows.length === 0}
        emptyMessage="No payout batches."
      >
        {rows.map((row) => (
          <FinanceRow key={row.id}>
            <FinanceCell>
              <div>{row.designer?.displayName || row.designer?.email || row.designerId}</div>
              <FinanceLink href={`/dashboard/finance/payouts/${row.id}`}>Open</FinanceLink>
            </FinanceCell>
            <FinanceCell className="font-bold tabular-nums">{money(Number(row.amount), row.currency)}</FinanceCell>
            <FinanceCell><FinanceStatusBadge status={row.status} /></FinanceCell>
            <FinanceCell>{row.royaltyEntries?.length ?? 0}</FinanceCell>
            <FinanceCell>{row.reference || "-"}</FinanceCell>
            <FinanceCell>{new Date(row.createdAt).toLocaleDateString()}</FinanceCell>
            <FinanceCell>
              <div className="flex flex-wrap gap-2">
                <FinanceIconButton title="Approve" disabled={!["DRAFT", "REQUESTED"].includes(row.status)} onClick={() => void action(row.id, "approve", "Approve this payout?")}>
                  <CheckCircle2 size={14} />
                </FinanceIconButton>
                <FinanceIconButton title="Mark paid" disabled={!["APPROVED", "PROCESSING"].includes(row.status)} onClick={() => void action(row.id, "mark-paid", "Mark this payout paid?")}>
                  <CheckCircle2 size={14} />
                </FinanceIconButton>
                <FinanceIconButton title="Cancel" disabled={["PAID", "CONFIRMED", "CANCELED", "CANCELLED"].includes(row.status)} onClick={() => void action(row.id, "cancel", "Cancel this payout?")}>
                  <XCircle size={14} />
                </FinanceIconButton>
                <FinanceIconButton title="Export" onClick={() => void exportCsv(row.id)}>
                  <Download size={14} />
                </FinanceIconButton>
              </div>
            </FinanceCell>
          </FinanceRow>
        ))}
      </FinanceTable>
    </DashboardLayout>
  );
}
