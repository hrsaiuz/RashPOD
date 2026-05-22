"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, Banknote, CreditCard, FileText, RefreshCw, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../auth/auth-provider";
import DashboardLayout from "../dashboard-layout";

type FinanceOverview = {
  grossSales: number;
  netSales: number;
  paidOrders: number;
  unpaidOrFailedPayments: number;
  pendingRoyalties: number;
  earnedRoyalties: number;
  payableRoyalties: number;
  paidPayouts: number;
  estimatedPlatformMargin: number;
  reconciliationIssues: number;
  incompleteCostWarnings: number;
  currency: string;
};

const links = [
  { href: "/dashboard/finance/royalties", label: "Royalties", icon: Wallet },
  { href: "/dashboard/finance/payouts", label: "Payouts", icon: Banknote },
  { href: "/dashboard/finance/reconciliation", label: "Reconciliation", icon: CreditCard },
  { href: "/dashboard/finance/payments", label: "Payments", icon: FileText },
];

export default function FinanceOverviewPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [data, setData] = useState<FinanceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/proxy/finance/overview");
      if (res.status === 401 || res.status === 403) { router.push("/auth/login?next=/dashboard/finance"); return; }
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load finance overview.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isLoading || !user) return;
    void load();
  }, [user, isLoading]);

  const currency = data?.currency ?? "UZS";

  return (
    <DashboardLayout role="finance">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: "#1A1D2E" }}>Finance Overview</h1>
          <p style={{ margin: "4px 0 0", color: "#6B7280", fontSize: 13 }}>Sales, royalties, payouts, margin, and reconciliation control.</p>
        </div>
        <button onClick={load} style={buttonStyle}><RefreshCw size={15} /> Refresh</button>
      </div>

      {error ? <Alert message={error} /> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 20 }}>
        <Kpi label="Gross sales" value={money(data?.grossSales, currency)} loading={loading} />
        <Kpi label="Net sales" value={money(data?.netSales, currency)} loading={loading} />
        <Kpi label="Paid orders" value={data?.paidOrders ?? 0} loading={loading} />
        <Kpi label="Pending royalties" value={money(data?.pendingRoyalties, currency)} loading={loading} />
        <Kpi label="Payable royalties" value={money(data?.payableRoyalties, currency)} loading={loading} />
        <Kpi label="Paid payouts" value={money(data?.paidPayouts, currency)} loading={loading} />
        <Kpi label="Margin estimate" value={money(data?.estimatedPlatformMargin, currency)} loading={loading} />
        <Kpi label="Recon issues" value={data?.reconciliationIssues ?? 0} loading={loading} warning={(data?.reconciliationIssues ?? 0) > 0} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 0.8fr)", gap: 16 }}>
        <section style={panelStyle}>
          <h2 style={sectionTitle}>Open Controls</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            {links.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} style={linkTileStyle}><Icon size={18} /> {label}</Link>
            ))}
          </div>
        </section>
        <section style={panelStyle}>
          <h2 style={sectionTitle}>Warnings</h2>
          {loading ? <Skeleton /> : null}
          {!loading && data && data.incompleteCostWarnings === 0 && data.reconciliationIssues === 0 ? <p style={muted}>No finance warnings right now.</p> : null}
          {!loading && data && data.incompleteCostWarnings > 0 ? <Warning text={`${data.incompleteCostWarnings} item(s) have incomplete margin data.`} /> : null}
          {!loading && data && data.reconciliationIssues > 0 ? <Warning text={`${data.reconciliationIssues} payment reconciliation item(s) need review.`} /> : null}
          {!loading && data && data.unpaidOrFailedPayments > 0 ? <Warning text={`${data.unpaidOrFailedPayments} unpaid/failed order(s) remain open.`} /> : null}
        </section>
      </div>
    </DashboardLayout>
  );
}

function Kpi({ label, value, loading, warning }: { label: string; value: string | number; loading: boolean; warning?: boolean }) {
  return <div style={{ ...panelStyle, minHeight: 86 }}><div style={{ color: "#6B7280", fontSize: 12, marginBottom: 8 }}>{label}</div>{loading ? <Skeleton /> : <div style={{ color: warning ? "#B42318" : "#1A1D2E", fontWeight: 800, fontSize: 20, overflowWrap: "anywhere" }}>{value}</div>}</div>;
}

function Alert({ message }: { message: string }) {
  return <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 14, color: "#B42318", fontSize: 14, marginBottom: 16 }}>{message}</div>;
}

function Warning({ text }: { text: string }) {
  return <div style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "#92400E", background: "#FEF3C7", borderRadius: 8, padding: 10, marginTop: 8, fontSize: 13 }}><AlertCircle size={16} /> {text}</div>;
}

function Skeleton() {
  return <div style={{ height: 18, width: "70%", borderRadius: 6, background: "#F0F2FA" }} />;
}

function money(value = 0, currency = "UZS") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: currency === "UZS" ? 0 : 2 }).format(value || 0);
}

const panelStyle = { background: "white", border: "1px solid #E8EAFB", borderRadius: 8, padding: 16 };
const sectionTitle = { margin: "0 0 12px", color: "#1F2937", fontSize: 15 };
const muted = { color: "#6B7280", fontSize: 13, margin: 0 };
const buttonStyle = { display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #E8EAFB", background: "white", borderRadius: 8, padding: "8px 12px", color: "#374151", cursor: "pointer" };
const linkTileStyle = { display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #E8EAFB", borderRadius: 8, padding: "12px", color: "#374151", textDecoration: "none", fontWeight: 700, fontSize: 13 };
