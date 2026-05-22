"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../../auth/auth-provider";
import DashboardLayout from "../../../dashboard-layout";

type PayoutDetail = { id: string; designerId: string; amount: string | number; currency: string; status: string; reference?: string | null; note?: string | null; designer?: { displayName?: string | null; email?: string | null }; royaltyEntries: Array<{ id: string; orderId?: string | null; orderItemId?: string | null; listingId?: string | null; amount: string | number; currency: string; status: string; note?: string | null; orderItem?: { listingTitle?: string | null } | null }> };

export default function PayoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); const router = useRouter(); const { user, isLoading } = useAuth(); const [payout, setPayout] = useState<PayoutDetail | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  async function load() { setLoading(true); setError(""); try { const res = await fetch(`/api/proxy/finance/payouts/${id}`); if (res.status === 401 || res.status === 403) { router.push("/auth/login"); return; } if (!res.ok) throw new Error(`Server error (${res.status})`); setPayout(await res.json()); } catch (err) { setError(err instanceof Error ? err.message : "Failed to load payout."); } finally { setLoading(false); } }
  useEffect(() => { if (!isLoading && user) void load(); }, [user, isLoading, id]);
  return <DashboardLayout role="finance"><Link href="/dashboard/finance/payouts" style={backStyle}><ArrowLeft size={16} /> Payouts</Link><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18 }}><h1 style={{ margin: 0, fontSize: 22, color: "#1A1D2E" }}>Payout Batch</h1><button onClick={load} style={buttonStyle}><RefreshCw size={15} /> Refresh</button></div>{error ? <Alert message={error} /> : null}{loading ? <div style={panelStyle}>Loading payout...</div> : null}{payout ? <><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}><Kpi label="Designer" value={payout.designer?.displayName || payout.designer?.email || payout.designerId} /><Kpi label="Amount" value={money(Number(payout.amount), payout.currency)} /><Kpi label="Status" value={payout.status} /><Kpi label="Entries" value={String(payout.royaltyEntries.length)} /></div><div style={panelStyle}><h2 style={{ margin: "0 0 12px", fontSize: 15 }}>Included Entries</h2><table style={tableStyle}><thead><tr>{["Entry", "Order", "Listing", "Amount", "Status", "Note"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead><tbody>{payout.royaltyEntries.map((entry) => <tr key={entry.id} style={{ borderBottom: "1px solid #F0F2FA" }}><td style={tdStyle}>{entry.id.slice(-8)}</td><td style={tdStyle}>{entry.orderId ? <Link href={`/dashboard/finance/orders/${entry.orderId}`} style={linkStyle}>#{entry.orderId.slice(-6)}</Link> : "-"}</td><td style={tdStyle}>{entry.orderItem?.listingTitle || entry.listingId || "-"}</td><td style={{ ...tdStyle, fontWeight: 800 }}>{money(Number(entry.amount), entry.currency)}</td><td style={tdStyle}>{entry.status}</td><td style={tdStyle}>{entry.note || "-"}</td></tr>)}</tbody></table></div></> : null}</DashboardLayout>;
}
function Kpi({ label, value }: { label: string; value: string }) { return <div style={panelStyle}><div style={{ color: "#6B7280", fontSize: 12 }}>{label}</div><div style={{ color: "#1A1D2E", fontWeight: 800, marginTop: 8, overflowWrap: "anywhere" }}>{value}</div></div>; }
function Alert({ message }: { message: string }) { return <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 14, color: "#B42318", marginBottom: 16 }}>{message}</div>; }
function money(value = 0, currency = "UZS") { return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: currency === "UZS" ? 0 : 2 }).format(value || 0); }
const backStyle = { display: "inline-flex", alignItems: "center", gap: 8, color: "#788AE0", textDecoration: "none", marginBottom: 16 };
const buttonStyle = { display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #E8EAFB", background: "white", borderRadius: 8, padding: "8px 12px", color: "#374151", cursor: "pointer" };
const panelStyle = { background: "white", border: "1px solid #E8EAFB", borderRadius: 8, padding: 14, overflow: "auto" };
const tableStyle = { width: "100%", borderCollapse: "collapse" as const, fontSize: 13, minWidth: 760 };
const thStyle = { textAlign: "left" as const, padding: "10px 12px", color: "#6B7280", background: "#F8F9FF", borderBottom: "1px solid #E8EAFB" };
const tdStyle = { padding: "10px 12px", color: "#374151" };
const linkStyle = { color: "#788AE0", textDecoration: "none", fontWeight: 700 };
