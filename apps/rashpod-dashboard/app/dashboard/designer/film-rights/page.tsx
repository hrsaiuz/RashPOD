"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  DataTable,
  DataTableColumn,
  EmptyState,
  ErrorState,
  Skeleton,
  StatusBadge,
} from "@rashpod/ui";
import { Film, ShieldCheck } from "lucide-react";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";
import { api, type CommercialRights, type Design } from "../../../../lib/api";

type Row = {
  design: Design;
  rights: CommercialRights | null;
};

export default function FilmRightsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [working, setWorking] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/login?next=/dashboard/designer/film-rights");
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const designs = await api.get<Design[]>("/designs");
      const enriched = await Promise.all(
        designs.map(async (d) => ({
          design: d,
          rights: await api.get<CommercialRights | null>(`/designs/${d.id}/commercial-rights`).catch(() => null),
        })),
      );
      setRows(enriched);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function toggle(row: Row) {
    setWorking(row.design.id);
    try {
      if (row.rights?.allowFilmSales) {
        await api.post(`/designs/${row.design.id}/disable-film-sales`);
      } else {
        await api.post(`/designs/${row.design.id}/enable-film-sales`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setWorking(null);
    }
  }

  const eligible = rows.filter((r) => r.design.status === "APPROVED" || r.design.status === "PUBLISHED");
  const enabledCount = rows.filter((r) => r.rights?.allowFilmSales).length;

  const columns: DataTableColumn<Row>[] = [
    {
      key: "title",
      header: "Design",
      render: (_v, r) => (
        <Link href={`/dashboard/designer/designs/${r.design.id}`} className="font-medium text-brand-ink hover:text-brand-blue">
          {r.design.title}
        </Link>
      ),
    },
    { key: "status", header: "Design status", render: (_v, r) => <StatusBadge status={r.design.status} /> },
    {
      key: "film",
      header: "Film sales",
      render: (_v, r) => (
        <span className={"text-xs font-semibold " + (r.rights?.allowFilmSales ? "text-semantic-success" : "text-brand-muted")}>
          {r.rights?.allowFilmSales ? "Enabled" : "Off"}
        </span>
      ),
    },
    { key: "rate", header: "Royalty %", render: (_v, r) => <span className="text-sm text-brand-ink">{r.rights?.filmRoyaltyRate ?? "—"}</span> },
    {
      key: "consent",
      header: "Last consent",
      render: (_v, r) =>
        r.rights?.filmConsentGrantedAt ? (
          <span className="text-xs text-brand-muted">{new Date(r.rights.filmConsentGrantedAt).toLocaleDateString()}</span>
        ) : (
          <span className="text-xs text-brand-muted">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (_v, r) => (
        <div className="flex justify-end gap-2">
          <Link href={`/dashboard/designer/designs/${r.design.id}/rights`}>
            <Button variant="ghost" size="sm">Configure</Button>
          </Link>
          <Button
            variant={r.rights?.allowFilmSales ? "danger" : "primaryPeach"}
            size="sm"
            loading={working === r.design.id}
            onClick={() => toggle(r)}
          >
            {r.rights?.allowFilmSales ? "Revoke" : "Enable"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout role="designer">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-ink">Film Rights</h1>
          <p className="text-brand-muted mt-1">
            Per-design consent for DTF / UV-DTF transfer film sales. Independent from product sales.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={<ShieldCheck className="text-brand-blue" />} label="Total designs" value={rows.length} />
          <StatCard icon={<Film className="text-brand-peach" />} label="Film-enabled" value={enabledCount} />
          <StatCard icon={<Film className="text-brand-muted" />} label="Eligible (approved+)" value={eligible.length} />
        </div>

        {loading ? (
          <Skeleton className="h-64" />
        ) : error ? (
          <ErrorState title="Could not load" description={error} retry={<Button onClick={load}>Retry</Button>} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No designs yet"
            description="Upload a design first, then come back to configure film rights."
            action={
              <Link href="/dashboard/designer/designs/new">
                <Button variant="primaryBlue">Upload design</Button>
              </Link>
            }
          />
        ) : (
          <Card>
            <DataTable rows={rows} columns={columns} mobileMode="cards" />
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-surface-card flex items-center justify-center">{icon}</div>
        <div>
          <div className="text-xs text-brand-muted">{label}</div>
          <div className="text-2xl font-bold text-brand-ink">{value}</div>
        </div>
      </div>
    </Card>
  );
}
