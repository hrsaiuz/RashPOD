"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, DataTable, DataTableColumn, EmptyState, ErrorState, Input, StatusBadge } from "@rashpod/ui";
import { Image as ImageIcon, Search, SlidersHorizontal } from "lucide-react";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";
import { api, type ModerationQueueDesign } from "../../../../lib/api";

const TABS = [
  { key: "PENDING_MODERATION", label: "Pending" },
  { key: "REJECTED", label: "Rejected" },
  { key: "APPROVED_LOCAL", label: "Approved local" },
  { key: "APPROVED_GLOBAL", label: "Approved global" },
] as const;

export default function ModeratorDesignsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<ModerationQueueDesign[]>([]);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["key"]>("PENDING_MODERATION");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/login?next=/dashboard/moderator/designs");
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, activeTab]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ status: activeTab });
      const rows = await api.get<ModerationQueueDesign[]>(`/admin/designs/moderation-queue?${params.toString()}`);
      setItems(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load moderation queue");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const designer = item.designer?.displayName ?? item.designer?.email ?? "";
      return [item.title, item.description ?? "", designer].some((value) => value.toLowerCase().includes(q));
    });
  }, [items, search]);

  const columns: DataTableColumn<ModerationQueueDesign>[] = [
    {
      key: "title",
      header: "Design",
      sortable: true,
      render: (_, row) => (
        <div className="min-w-0">
          <Link href={`/dashboard/moderator/designs/${row.id}`} className="font-semibold text-brand-ink hover:text-brand-blue">
            {row.title}
          </Link>
          <p className="mt-1 text-xs text-brand-muted line-clamp-2">{row.description || "No description"}</p>
        </div>
      ),
    },
    {
      key: "designer",
      header: "Designer",
      render: (_, row) => <span className="text-brand-muted">{row.designer?.displayName ?? row.designer?.email ?? "Unknown"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (value) => <StatusBadge status={String(value)} />,
    },
    {
      key: "versions",
      header: "File",
      render: (_, row) => {
        const latest = row.versions?.[0];
        if (!latest) return <span className="text-brand-muted">No file</span>;
        const size = latest.widthPx && latest.heightPx ? `${latest.widthPx} x ${latest.heightPx}px` : "Metadata pending";
        return <span className="text-brand-muted">{size}</span>;
      },
    },
    {
      key: "updatedAt",
      header: "Updated",
      sortable: true,
      render: (value) => <span className="text-brand-muted">{new Date(String(value)).toLocaleDateString()}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (_, row) => (
        <div className="flex justify-end">
          <Link href={`/dashboard/moderator/designs/${row.id}`}>
            <Button variant="secondary" size="sm">Review</Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout role="moderator">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-brand-ink mb-1">Moderation Queue</h1>
            <p className="text-brand-muted">Review uploaded designs before they become local or global products.</p>
          </div>
          <Button variant="secondary" onClick={load} disabled={loading}>
            <SlidersHorizontal size={18} />
            Refresh
          </Button>
        </div>

        <Card>
          <div className="flex flex-wrap gap-2 mb-4">
            {TABS.map((tab) => {
              const active = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={
                    "px-4 h-10 rounded-pill text-sm font-medium transition-colors " +
                    (active ? "bg-brand-blue text-white" : "bg-surface-card text-brand-ink hover:bg-surface-borderSoft")
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative mb-4 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <Input
              placeholder="Search by title, description, or designer"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-10"
            />
          </div>

          {error ? (
            <ErrorState title="Failed to load moderation queue" description={error} retry={<Button onClick={load}>Retry</Button>} />
          ) : (
            <DataTable
              columns={columns}
              rows={filtered}
              loading={loading}
              mobileMode="cards"
              emptyState={
                <EmptyState
                  icon={<ImageIcon size={40} />}
                  title="No designs in this queue"
                  description="Designs will appear here after designers submit them for moderation."
                />
              }
            />
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
