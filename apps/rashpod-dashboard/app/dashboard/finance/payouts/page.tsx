"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Download, Plus, RefreshCw, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";

type Payout = { id: string; designerId: string; amount: string | number; currency: string; status: string; reference?: string | null; note?: string | null; createdAt: string; designer?: { displayName?: string | null; email?: string | null }; royaltyEntries?: Array<{ id: string }> };

export default function PayoutsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [rows, setRows] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draftOpen, setDraftOpen] = useState(false);

  async function load() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/proxy/finance/payouts");
      if (res.status === 401 || res.status === 403) { router.push("/auth/login"); return; }
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      setRows(await res.json());
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to load payouts."); } finally { setLoading(false); }
  }

  useEffect(() => { if (!isLoading && user) void load(); }, [user, isLoading]);

  async function createDraft(form: FormData) {
    const body = { designerId: String(form.get("designerId") || ""), currency: String(form.get("currency") || "UZS"), note: String(form.get("note") || "") || undefined };
    const res = await fetch("/api/proxy/finance/payouts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) { setError(await res.text()); return; }
    setDraftOpen(false); await load();
  }

  async function action(id: string, path: string, message: string) {
    if (!window.confirm(message)) return;
    const res = await fetch(`/api/proxy/finance/payouts/${id}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method: "MANUAL", note: message }) });
    if (!res.ok) { setError(await res.text()); return; }
    await load();
  }

  async function exportCsv(id: string) {
    const res = await fetch(`/api/proxy/finance/payouts/${id}/export`);
    if (!res.ok) { setError(await res.text()); return; }
    const data = await res.json();
    const url = URL.createObjectURL(new Blob([data.csv], { type: data.contentType || "text/csv" }));
    const link = document.createElement("a");
    link.href = url; link.download = data.filename || `payout-${id}.csv`; link.click(); URL.revokeObjectURL(url);
  }

  return <DashboardLayout role="finance"><Header onRefresh={load} onNew={() => setDraftOpen((v) => !v)} />{error ? <Alert message={error} /> : null}{draftOpen ? <form action={createDraft} style={panelForm}><input name="designerId" required placeholder="Designer id" style={inputStyle} /><input name="currency" defaultValue="UZS" style={inputStyle} /><input name="note" placeholder="Note" style={inputStyle} /><button style={buttonStyle}>Create draft</button></form> : null}<div style={tableWrap}><table style={tableStyle}><thead><tr>{["Designer", "Amount", "Status", "Entries", "Reference", "Date", "Actions"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={7} style={tdStyle}>Loading payouts...</td></tr> : rows.length === 0 ? <tr><td colSpan={7} style={{ ...tdStyle, textAlign: "center", color: "#9CA3AF" }}>No payout batches.</td></tr> : rows.map((row) => <tr key={row.id} style={{ borderBottom: "1px solid #F0F2FA" }}><td style={tdStyle}><div>{row.designer?.displayName || row.designer?.email || row.designerId}</div><Link href={`/dashboard/finance/payouts/${row.id}`} style={smallLink}>Open</Link></td><td style={{ ...tdStyle, fontWeight: 800 }}>{money(Number(row.amount), row.currency)}</td><td style={tdStyle}><Badge status={row.status} /></td><td style={tdStyle}>{row.royaltyEntries?.length ?? 0}</td><td style={tdStyle}>{row.reference || "-"}</td><td style={tdStyle}>{new Date(row.createdAt).toLocaleDateString()}</td><td style={tdStyle}><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><IconButton title="Approve" disabled={!['DRAFT','REQUESTED'].includes(row.status)} onClick={() => void action(row.id, "approve", "Approve this payout?")}><CheckCircle2 size={14} /></IconButton><IconButton title="Mark paid" disabled={!['APPROVED','PROCESSING'].includes(row.status)} onClick={() => void action(row.id, "mark-paid", "Mark this payout paid?")}><CheckCircle2 size={14} /></IconButton><IconButton title="Cancel" disabled={['PAID','CONFIRMED','CANCELED','CANCELLED'].includes(row.status)} onClick={() => void action(row.id, "cancel", "Cancel this payout?")}><XCircle size={14} /></IconButton><IconButton title="Export" onClick={() => void exportCsv(row.id)}><Download size={14} /></IconButton></div></td></tr>)}</tbody></table></div></DashboardLayout>;
}

function Header({ onRefresh, onNew }: { onRefresh: () => void; onNew: () => void }) { return <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}><h1 style={{ margin: 0, fontSize: 22, color: "#1A1D2E" }}>Payout Batches</h1><div style={{ display: "flex", gap: 8 }}><button onClick={onNew} style={buttonStyle}><Plus size={15} /> Draft</button><button onClick={onRefresh} style={buttonStyle}><RefreshCw size={15} /> Refresh</button></div></div>; }
function IconButton({ children, disabled, onClick, title }: { children: React.ReactNode; disabled?: boolean; onClick: () => void; title: string }) { return <button title={title} disabled={disabled} onClick={onClick} style={{ ...iconStyle, opacity: disabled ? 0.45 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>{children}</button>; }
function Alert({ message }: { message: string }) { return <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 14, color: "#B42318", marginBottom: 16 }}>{message}</div>; }
function Badge({ status }: { status: string }) { const success = ["APPROVED", "PAID", "CONFIRMED"].includes(status); const danger = ["FAILED", "CANCELED", "CANCELLED"].includes(status); return <span style={{ borderRadius: 999, padding: "4px 9px", background: success ? "#D1FAE5" : danger ? "#FEF2F2" : "#FEF3C7", color: success ? "#047857" : danger ? "#B42318" : "#92400E", fontSize: 11, fontWeight: 800 }}>{status.replace(/_/g, " ")}</span>; }
function money(value = 0, currency = "UZS") { return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: currency === "UZS" ? 0 : 2 }).format(value || 0); }
const buttonStyle = { display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #E8EAFB", background: "white", borderRadius: 8, padding: "8px 12px", color: "#374151", cursor: "pointer" };
const inputStyle = { border: "1px solid #E8EAFB", borderRadius: 8, padding: "8px 10px", color: "#374151", minWidth: 160 };
const panelForm = { display: "flex", gap: 10, flexWrap: "wrap" as const, background: "white", border: "1px solid #E8EAFB", borderRadius: 8, padding: 14, marginBottom: 16 };
const tableWrap = { background: "white", border: "1px solid #E8EAFB", borderRadius: 8, overflow: "auto" };
const tableStyle = { width: "100%", borderCollapse: "collapse" as const, fontSize: 13, minWidth: 900 };
const thStyle = { textAlign: "left" as const, padding: "10px 12px", color: "#6B7280", background: "#F8F9FF", borderBottom: "1px solid #E8EAFB" };
const tdStyle = { padding: "10px 12px", color: "#374151", verticalAlign: "top" as const };
const smallLink = { color: "#788AE0", textDecoration: "none", fontSize: 12, fontWeight: 700 };
const iconStyle = { display: "inline-grid", placeItems: "center", width: 30, height: 30, borderRadius: 8, border: "1px solid #E8EAFB", background: "white", color: "#374151" };
