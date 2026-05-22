"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";

type ReconciliationRow = { id: string; paymentTransactionId: string; orderId: string; provider: string; providerTransactionId?: string | null; expectedAmount: string | number; receivedAmount?: string | number | null; currency: string; providerStatus?: string | null; internalStatus?: string | null; discrepancyAmount: string | number; status: string; note?: string | null; updatedAt: string; order?: { customerName?: string | null; customer?: { displayName?: string | null; email?: string | null } } };

export default function ReconciliationPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [rows, setRows] = useState<ReconciliationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try { const res = await fetch("/api/proxy/finance/reconciliation"); if (res.status === 401 || res.status === 403) { router.push("/auth/login"); return; } if (!res.ok) throw new Error(`Server error (${res.status})`); setRows(await res.json()); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to load reconciliation."); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (!isLoading && user) void load(); }, [user, isLoading]);

  async function review(paymentId: string, matched: boolean) {
    const note = window.prompt(matched ? "Reason/confirmation note" : "Review note");
    if (!note) return;
    const res = await fetch(`/api/proxy/finance/reconciliation/${paymentId}/${matched ? "mark-matched" : "mark-reviewed"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) });
    if (!res.ok) { setError(await res.text()); return; }
    await load();
  }

  return <DashboardLayout role="finance"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18 }}><h1 style={{ margin: 0, fontSize: 22, color: "#1A1D2E" }}>Payment Reconciliation</h1><button onClick={load} style={buttonStyle}><RefreshCw size={15} /> Refresh</button></div>{error ? <Alert message={error} /> : null}<div style={tableWrap}><table style={tableStyle}><thead><tr>{["Payment", "Order", "Customer", "Expected", "Received", "Discrepancy", "Status", "Provider", "Actions"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={9} style={tdStyle}>Loading reconciliation...</td></tr> : rows.length === 0 ? <tr><td colSpan={9} style={{ ...tdStyle, textAlign: "center", color: "#9CA3AF" }}>No reconciliation records.</td></tr> : rows.map((row) => <tr key={row.id} style={{ borderBottom: "1px solid #F0F2FA" }}><td style={tdStyle}>{row.paymentTransactionId.slice(-8)}</td><td style={tdStyle}><Link href={`/dashboard/finance/orders/${row.orderId}`} style={linkStyle}>#{row.orderId.slice(-6)}</Link></td><td style={tdStyle}>{row.order?.customerName || row.order?.customer?.displayName || row.order?.customer?.email || "-"}</td><td style={tdStyle}>{money(Number(row.expectedAmount), row.currency)}</td><td style={tdStyle}>{row.receivedAmount == null ? "-" : money(Number(row.receivedAmount), row.currency)}</td><td style={{ ...tdStyle, color: Number(row.discrepancyAmount) === 0 ? "#047857" : "#B42318", fontWeight: 800 }}>{money(Number(row.discrepancyAmount), row.currency)}</td><td style={tdStyle}><Badge status={row.status} /></td><td style={tdStyle}>{row.provider} / {row.providerStatus || "-"}</td><td style={tdStyle}><div style={{ display: "flex", gap: 6 }}><button disabled={row.status === "MATCHED"} onClick={() => void review(row.paymentTransactionId, true)} style={iconStyle} title="Mark matched"><CheckCircle2 size={14} /></button><button onClick={() => void review(row.paymentTransactionId, false)} style={buttonStyle}>Review</button></div></td></tr>)}</tbody></table></div></DashboardLayout>;
}
function Alert({ message }: { message: string }) { return <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 14, color: "#B42318", marginBottom: 16 }}>{message}</div>; }
function Badge({ status }: { status: string }) { const danger = ["MISMATCHED", "MANUAL_REVIEW", "UNRECONCILED"].includes(status); return <span style={{ borderRadius: 999, padding: "4px 9px", background: danger ? "#FEF3C7" : "#D1FAE5", color: danger ? "#92400E" : "#047857", fontSize: 11, fontWeight: 800 }}>{status.replace(/_/g, " ")}</span>; }
function money(value = 0, currency = "UZS") { return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: currency === "UZS" ? 0 : 2 }).format(value || 0); }
const buttonStyle = { display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #E8EAFB", background: "white", borderRadius: 8, padding: "8px 12px", color: "#374151", cursor: "pointer" };
const tableWrap = { background: "white", border: "1px solid #E8EAFB", borderRadius: 8, overflow: "auto" };
const tableStyle = { width: "100%", borderCollapse: "collapse" as const, fontSize: 13, minWidth: 1040 };
const thStyle = { textAlign: "left" as const, padding: "10px 12px", color: "#6B7280", background: "#F8F9FF", borderBottom: "1px solid #E8EAFB" };
const tdStyle = { padding: "10px 12px", color: "#374151", verticalAlign: "top" as const };
const linkStyle = { color: "#788AE0", textDecoration: "none", fontWeight: 700 };
const iconStyle = { display: "inline-grid", placeItems: "center", width: 34, height: 34, borderRadius: 8, border: "1px solid #E8EAFB", background: "white", color: "#047857", cursor: "pointer" };
