"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../../auth/auth-provider";
import DashboardLayout from "../../../dashboard-layout";

type OrderFinance = { id: string; status: string; total: string | number; subtotal: string | number; deliveryFee: string | number; discountTotal: string | number; currency: string; financeSnapshots?: Snapshot[]; royaltyLedgerEntries?: Royalty[]; paymentReconciliations?: Recon[]; payments?: Array<{ id: string; provider: string; status: string; amount: string | number; providerRef?: string | null }> };
type Snapshot = { id: string; orderItemId: string; listingId: string; designerId?: string | null; grossLineAmount: string | number; netRevenue: string | number; baseProductCost?: string | number | null; productionCost?: string | number | null; deliveryCost?: string | number | null; royaltyAmount: string | number; platformMarginEstimate?: string | number | null; marginIncomplete: boolean; incompleteReason?: string | null; settlementStatus: string; refundStatus: string };
type Royalty = { id: string; designerId: string; amount: string | number; currency: string; status: string; entryType: string; orderItemId?: string | null };
type Recon = { id: string; status: string; expectedAmount: string | number; receivedAmount?: string | number | null; discrepancyAmount: string | number; currency: string };

export default function OrderFinancePage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [order, setOrder] = useState<OrderFinance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() { setLoading(true); setError(""); try { const res = await fetch(`/api/proxy/finance/orders/${orderId}`); if (res.status === 401 || res.status === 403) { router.push("/auth/login"); return; } if (!res.ok) throw new Error(`Server error (${res.status})`); setOrder(await res.json()); } catch (err) { setError(err instanceof Error ? err.message : "Failed to load order finance."); } finally { setLoading(false); } }
  useEffect(() => { if (!isLoading && user) void load(); }, [user, isLoading, orderId]);
  const currency = order?.currency ?? "UZS";
  const snapshots = order?.financeSnapshots ?? [];
  const margin = snapshots.reduce((sum, row) => sum + Number(row.platformMarginEstimate ?? 0), 0);

  return <DashboardLayout role="finance"><Link href="/dashboard/finance" style={backStyle}><ArrowLeft size={16} /> Finance</Link><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18 }}><h1 style={{ margin: 0, fontSize: 22, color: "#1A1D2E" }}>Order Finance #{orderId.slice(-6)}</h1><button onClick={load} style={buttonStyle}><RefreshCw size={15} /> Refresh</button></div>{error ? <Alert message={error} /> : null}{loading ? <Panel title="Loading">Loading order finance...</Panel> : null}{order ? <><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 16 }}><Kpi label="Gross" value={money(Number(order.total), currency)} /><Kpi label="Subtotal" value={money(Number(order.subtotal), currency)} /><Kpi label="Delivery" value={money(Number(order.deliveryFee), currency)} /><Kpi label="Discount" value={money(Number(order.discountTotal), currency)} /><Kpi label="Margin estimate" value={money(margin, currency)} /></div><Panel title="Item Finance"><div style={tableWrap}><table style={tableStyle}><thead><tr>{["Item", "Gross", "Net", "Costs", "Royalty", "Margin", "Status"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead><tbody>{snapshots.length === 0 ? <tr><td colSpan={7} style={tdStyle}>No finance snapshots yet.</td></tr> : snapshots.map((row) => <tr key={row.id} style={{ borderBottom: "1px solid #F0F2FA" }}><td style={tdStyle}>{row.orderItemId.slice(-8)}</td><td style={tdStyle}>{money(Number(row.grossLineAmount), currency)}</td><td style={tdStyle}>{money(Number(row.netRevenue), currency)}</td><td style={tdStyle}>Base {money(Number(row.baseProductCost ?? 0), currency)} / Prod {money(Number(row.productionCost ?? 0), currency)} / Del {money(Number(row.deliveryCost ?? 0), currency)}</td><td style={tdStyle}>{money(Number(row.royaltyAmount), currency)}</td><td style={{ ...tdStyle, color: row.marginIncomplete ? "#92400E" : "#047857", fontWeight: 800 }}>{money(Number(row.platformMarginEstimate ?? 0), currency)}{row.marginIncomplete ? ` (${row.incompleteReason || "incomplete"})` : ""}</td><td style={tdStyle}>{row.settlementStatus} / {row.refundStatus}</td></tr>)}</tbody></table></div></Panel><Panel title="Royalty Entries"><pre style={preStyle}>{JSON.stringify(order.royaltyLedgerEntries ?? [], null, 2)}</pre></Panel><Panel title="Reconciliation"><pre style={preStyle}>{JSON.stringify(order.paymentReconciliations ?? [], null, 2)}</pre></Panel></> : null}</DashboardLayout>;
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section style={{ background: "white", border: "1px solid #E8EAFB", borderRadius: 8, padding: 16, marginBottom: 16 }}><h2 style={{ margin: "0 0 12px", fontSize: 15, color: "#1F2937" }}>{title}</h2>{children}</section>; }
function Kpi({ label, value }: { label: string; value: string }) { return <div style={{ background: "white", border: "1px solid #E8EAFB", borderRadius: 8, padding: 14 }}><div style={{ color: "#6B7280", fontSize: 12 }}>{label}</div><div style={{ color: "#1A1D2E", fontWeight: 800, marginTop: 8 }}>{value}</div></div>; }
function Alert({ message }: { message: string }) { return <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 14, color: "#B42318", marginBottom: 16 }}>{message}</div>; }
function money(value = 0, currency = "UZS") { return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: currency === "UZS" ? 0 : 2 }).format(value || 0); }
const backStyle = { display: "inline-flex", alignItems: "center", gap: 8, color: "#788AE0", textDecoration: "none", marginBottom: 16 };
const buttonStyle = { display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #E8EAFB", background: "white", borderRadius: 8, padding: "8px 12px", color: "#374151", cursor: "pointer" };
const tableWrap = { overflow: "auto" };
const tableStyle = { width: "100%", borderCollapse: "collapse" as const, fontSize: 13, minWidth: 900 };
const thStyle = { textAlign: "left" as const, padding: "10px 12px", color: "#6B7280", background: "#F8F9FF", borderBottom: "1px solid #E8EAFB" };
const tdStyle = { padding: "10px 12px", color: "#374151", verticalAlign: "top" as const };
const preStyle = { margin: 0, overflow: "auto", whiteSpace: "pre-wrap" as const, fontSize: 12, color: "#374151", background: "#F8F9FF", borderRadius: 8, padding: 12 };
