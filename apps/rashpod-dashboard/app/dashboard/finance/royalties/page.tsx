"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";

type RoyaltyRow = {
  id: string;
  designerId: string;
  amount: string | number;
  currency: string;
  status: string;
  entryType: string;
  reason?: string | null;
  createdAt: string;
  designer?: { displayName?: string | null; email?: string | null };
  order?: { id: string; status: string } | null;
  orderItem?: { listingTitle?: string | null; quantity?: number; totalPrice?: string | number } | null;
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
      if (res.status === 401 || res.status === 403) { router.push("/auth/login"); return; }
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
    const res = await fetch("/api/proxy/finance/royalties/adjustment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) { setError(await res.text()); return; }
    setAdjustOpen(false);
    await load();
  }

  return (
    <DashboardLayout role="finance">
      <Header title="Royalties" onRefresh={load} action={<button onClick={() => setAdjustOpen((v) => !v)} style={buttonStyle}><Plus size={15} /> Adjustment</button>} />
      {error ? <Alert message={error} /> : null}

      <div style={{ ...panelStyle, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select value={status} onChange={(event) => setStatus(event.target.value)} style={inputStyle}>
            {[
              "ALL", "PENDING", "EARNED", "PAYABLE", "PAID", "REVERSED", "ADJUSTMENT", "CANCELLED",
            ].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <input value={designerId} onChange={(event) => setDesignerId(event.target.value)} placeholder="Designer id" style={inputStyle} />
          <button onClick={load} style={buttonStyle}>Apply</button>
        </div>
        {adjustOpen ? (
          <form action={createAdjustment} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginTop: 14 }}>
            <input name="designerId" required placeholder="Designer id" style={inputStyle} />
            <input name="amount" required type="number" step="0.01" placeholder="Amount" style={inputStyle} />
            <input name="currency" defaultValue="UZS" style={inputStyle} />
            <input name="reason" required placeholder="Reason" style={inputStyle} />
            <input name="orderId" placeholder="Order id optional" style={inputStyle} />
            <input name="orderItemId" placeholder="Order item id optional" style={inputStyle} />
            <input name="listingId" placeholder="Listing id optional" style={inputStyle} />
            <button type="submit" style={buttonStyle}>Create</button>
          </form>
        ) : null}
      </div>

      <Table loading={loading} rows={rows} />
    </DashboardLayout>
  );
}

function Table({ loading, rows }: { loading: boolean; rows: RoyaltyRow[] }) {
  return <div style={tableWrap}><table style={tableStyle}><thead><tr>{["Designer", "Order", "Listing", "Type", "Amount", "Status", "Payout", "Date"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead><tbody>{loading ? Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={8} style={tdStyle}><Skeleton /></td></tr>) : rows.length === 0 ? <tr><td colSpan={8} style={{ ...tdStyle, textAlign: "center", color: "#9CA3AF" }}>No royalty entries.</td></tr> : rows.map((row) => <tr key={row.id} style={{ borderBottom: "1px solid #F0F2FA" }}><td style={tdStyle}><div>{row.designer?.displayName || row.designer?.email || row.designerId}</div><Link href={`/dashboard/finance/designers/${row.designerId}`} style={smallLink}>Balance</Link></td><td style={tdStyle}>{row.order ? <Link href={`/dashboard/finance/orders/${row.order.id}`} style={smallLink}>#{row.order.id.slice(-6)}</Link> : "-"}</td><td style={tdStyle}>{row.listing?.title || row.orderItem?.listingTitle || "-"}</td><td style={tdStyle}>{label(row.entryType)}</td><td style={{ ...tdStyle, fontWeight: 800 }}>{money(Number(row.amount), row.currency)}</td><td style={tdStyle}><Badge status={row.status} /></td><td style={tdStyle}>{row.payout ? <Link href={`/dashboard/finance/payouts/${row.payout.id}`} style={smallLink}>{row.payout.status}</Link> : "-"}</td><td style={tdStyle}>{new Date(row.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div>;
}

function Header({ title, onRefresh, action }: { title: string; onRefresh: () => void; action?: React.ReactNode }) { return <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}><h1 style={{ margin: 0, fontSize: 22, color: "#1A1D2E" }}>{title}</h1><div style={{ display: "flex", gap: 8 }}>{action}<button onClick={onRefresh} style={buttonStyle}><RefreshCw size={15} /> Refresh</button></div></div>; }
function Alert({ message }: { message: string }) { return <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 14, color: "#B42318", marginBottom: 16 }}>{message}</div>; }
function Badge({ status }: { status: string }) { const danger = ["REVERSED", "CANCELLED", "CANCELED"].includes(status); const success = ["PAYABLE", "PAID"].includes(status); return <span style={{ borderRadius: 999, padding: "4px 9px", background: danger ? "#FEF2F2" : success ? "#D1FAE5" : "#FEF3C7", color: danger ? "#B42318" : success ? "#047857" : "#92400E", fontSize: 11, fontWeight: 800 }}>{label(status)}</span>; }
function Skeleton() { return <div style={{ height: 14, width: "70%", borderRadius: 6, background: "#F0F2FA" }} />; }
function label(value: string) { return value.replace(/_/g, " ").toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase()); }
function money(value = 0, currency = "UZS") { return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: currency === "UZS" ? 0 : 2 }).format(value || 0); }
const panelStyle = { background: "white", border: "1px solid #E8EAFB", borderRadius: 8, padding: 14 };
const buttonStyle = { display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #E8EAFB", background: "white", borderRadius: 8, padding: "8px 12px", color: "#374151", cursor: "pointer" };
const inputStyle = { border: "1px solid #E8EAFB", borderRadius: 8, padding: "8px 10px", color: "#374151", minWidth: 140 };
const tableWrap = { background: "white", border: "1px solid #E8EAFB", borderRadius: 8, overflow: "auto" };
const tableStyle = { width: "100%", borderCollapse: "collapse" as const, fontSize: 13, minWidth: 1040 };
const thStyle = { textAlign: "left" as const, padding: "10px 12px", color: "#6B7280", background: "#F8F9FF", borderBottom: "1px solid #E8EAFB" };
const tdStyle = { padding: "10px 12px", color: "#374151", verticalAlign: "top" as const };
const smallLink = { color: "#788AE0", textDecoration: "none", fontSize: 12, fontWeight: 700 };
