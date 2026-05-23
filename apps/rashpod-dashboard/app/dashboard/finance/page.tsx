"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, Banknote, CreditCard, FileText, RefreshCw, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  KpiTile,
  PageHeader,
  Skeleton,
} from "@rashpod/ui";
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

function money(value = 0, currency = "UZS") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: currency === "UZS" ? 0 : 2 }).format(value || 0);
}

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
      if (res.status === 401 || res.status === 403) {
        router.push("/auth/login?next=/dashboard/finance");
        return;
      }
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
      <PageHeader
        title="Finance Overview"
        description="Sales, royalties, payouts, margin, and reconciliation control."
        actions={
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCw size={15} className="mr-2" />
            Refresh
          </Button>
        }
      />

      {error ? (
        <div role="alert" className="mb-4 rounded-xl border border-semantic-dangerBg bg-semantic-dangerBg p-4 text-sm text-semantic-dangerText">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Gross sales" value={loading ? "—" : money(data?.grossSales, currency)} />
        <KpiTile label="Net sales" value={loading ? "—" : money(data?.netSales, currency)} />
        <KpiTile label="Paid orders" value={loading ? "—" : String(data?.paidOrders ?? 0)} />
        <KpiTile label="Pending royalties" value={loading ? "—" : money(data?.pendingRoyalties, currency)} />
        <KpiTile label="Payable royalties" value={loading ? "—" : money(data?.payableRoyalties, currency)} />
        <KpiTile label="Paid payouts" value={loading ? "—" : money(data?.paidPayouts, currency)} />
        <KpiTile label="Margin estimate" value={loading ? "—" : money(data?.estimatedPlatformMargin, currency)} />
        <KpiTile
          label="Recon issues"
          value={loading ? "—" : String(data?.reconciliationIssues ?? 0)}
          className={(data?.reconciliationIssues ?? 0) > 0 ? "text-semantic-dangerText" : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <h2 className="mb-4 text-section font-semibold text-brand-ink">Open Controls</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-line bg-white px-4 py-3 text-sm font-bold text-brand-text transition-colors hover:border-brand-blue hover:text-brand-blue"
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 text-section font-semibold text-brand-ink">Warnings</h2>
          {loading ? <Skeleton className="h-5 w-2/3" /> : null}
          {!loading && data && data.incompleteCostWarnings === 0 && data.reconciliationIssues === 0 ? (
            <p className="text-sm text-brand-muted">No finance warnings right now.</p>
          ) : null}
          {!loading && data && data.incompleteCostWarnings > 0 ? (
            <FinanceWarning text={`${data.incompleteCostWarnings} item(s) have incomplete margin data.`} />
          ) : null}
          {!loading && data && data.reconciliationIssues > 0 ? (
            <FinanceWarning text={`${data.reconciliationIssues} payment reconciliation item(s) need review.`} />
          ) : null}
          {!loading && data && data.unpaidOrFailedPayments > 0 ? (
            <FinanceWarning text={`${data.unpaidOrFailedPayments} unpaid/failed order(s) remain open.`} />
          ) : null}
        </Card>
      </div>
    </DashboardLayout>
  );
}

function FinanceWarning({ text }: { text: string }) {
  return (
    <div className="mt-2 flex items-start gap-2 rounded-xl bg-semantic-warningBg p-3 text-sm text-semantic-warningText">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      {text}
    </div>
  );
}
