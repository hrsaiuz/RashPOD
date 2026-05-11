"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  DataTable,
  DataTableColumn,
  EmptyState,
  ErrorState,
  Input,
  StatusBadge,
} from "@rashpod/ui";
import { Plus, Search, Image as ImageIcon } from "lucide-react";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";
import { api, type Design } from "../../../../lib/api";

const TABS: { key: "ALL" | Design["status"]; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "DRAFT", label: "Drafts" },
  { key: "SUBMITTED", label: "Submitted" },
  { key: "APPROVED", label: "Approved" },
  { key: "NEEDS_FIX", label: "Needs fix" },
  { key: "REJECTED", label: "Rejected" },
];

export default function DesignerDesignsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["key"]>("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/login?next=/dashboard/designer/designs");
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const rows = await api.get<Design[]>("/designs");
      setDesigns(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load designs");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return designs.filter((d) => {
      if (activeTab !== "ALL" && d.status !== activeTab) return false;
      if (q && !d.title.toLowerCase().includes(q) && !(d.description ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [designs, activeTab, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: designs.length };
    for (const d of designs) c[d.status] = (c[d.status] ?? 0) + 1;
    return c;
  }, [designs]);

  const columns: DataTableColumn<Design>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      render: (_, row) => (
        <Link href={`/dashboard/designer/designs/${row.id}`} className="font-medium text-brand-ink hover:text-brand-blue">
          {row.title}
        </Link>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (val) => <StatusBadge status={String(val)} />,
    },
    {
      key: "updatedAt",
      header: "Updated",
      sortable: true,
      render: (val) => <span className="text-brand-muted">{new Date(String(val)).toLocaleDateString()}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (_, row) => (
        <div className="flex gap-2 justify-end">
          <Link href={`/dashboard/designer/designs/${row.id}`}>
            <Button variant="ghost" size="sm">Open</Button>
          </Link>
          <Link href={`/dashboard/designer/designs/${row.id}/rights`}>
            <Button variant="secondary" size="sm">Rights</Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout role="designer">
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-brand-ink mb-1">My Designs</h1>
            <p className="text-brand-muted">Upload, review, and manage your designs.</p>
          </div>
          <Link href="/dashboard/designer/designs/new">
            <Button variant="primaryBlue">
              <Plus size={18} />
              Upload Design
            </Button>
          </Link>
        </div>

        <Card>
          <div className="flex flex-wrap gap-2 mb-4">
            {TABS.map((tab) => {
              const active = tab.key === activeTab;
              const count = counts[tab.key] ?? 0;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={
                    "px-4 h-9 rounded-pill text-sm font-medium transition-colors " +
                    (active
                      ? "bg-brand-blue text-white"
                      : "bg-surface-card text-brand-ink hover:bg-surface-borderSoft")
                  }
                >
                  {tab.label}
                  <span className="ml-2 opacity-70 tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="relative mb-4 max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <Input
              placeholder="Search designs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {error ? (
            <ErrorState
              title="Failed to load designs"
              description={error}
              retry={<Button onClick={load}>Retry</Button>}
            />
          ) : (
            <DataTable
              columns={columns}
              rows={filtered}
              loading={loading}
              mobileMode="cards"
              emptyState={
                <EmptyState
                  icon={<ImageIcon size={40} />}
                  title="No designs yet"
                  description="Upload your first design to start the moderation flow."
                  action={
                    <Link href="/dashboard/designer/designs/new">
                      <Button variant="primaryBlue">Upload Design</Button>
                    </Link>
                  }
                />
              }
            />
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

