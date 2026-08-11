"use client";

import { useEffect, useMemo, useRef, useState, type InputHTMLAttributes } from "react";
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
import { Plus, Search, Image as ImageIcon, ShieldCheck } from "lucide-react";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";
import { api, type BulkCommercialRightsResult, type Design } from "../../../../lib/api";
import { BulkRightsModal, type BulkRightsChanges } from "../../../../components/designer/BulkRightsModal";
import { useToast } from "../../../../components/feedback/toast-provider";

const TABS: { key: "ALL" | Design["status"]; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "DRAFT", label: "Drafts" },
  { key: "SUBMITTED", label: "Submitted" },
  { key: "APPROVED", label: "Approved" },
  { key: "NEEDS_FIX", label: "Needs fix" },
  { key: "REJECTED", label: "Rejected" },
];
const MAX_BULK_SELECTION = 100;

export default function DesignerDesignsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["key"]>("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/login?next=/dashboard/designer/designs");
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  useEffect(() => {
    setSelected([]);
  }, [activeTab, search]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const rows = await api.get<Design[]>("/designs");
      setDesigns(rows);
      setSelected([]);
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

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allFilteredSelected = filtered.length > 0 && filtered.every((design) => selectedSet.has(design.id));
  const someFilteredSelected = filtered.some((design) => selectedSet.has(design.id));
  const shouldClearFiltered = allFilteredSelected || (someFilteredSelected && selected.length >= MAX_BULK_SELECTION);

  function toggleSelected(id: string) {
    if (!selectedSet.has(id) && selected.length >= MAX_BULK_SELECTION) {
      toast({ tone: "info", title: `Select up to ${MAX_BULK_SELECTION} designs at a time` });
      return;
    }
    setSelected((current) =>
      current.includes(id) ? current.filter((designId) => designId !== id) : [...current, id],
    );
  }

  function toggleAllFiltered() {
    const filteredIds = new Set(filtered.map((design) => design.id));
    if (shouldClearFiltered) {
      setSelected((current) => current.filter((designId) => !filteredIds.has(designId)));
      return;
    }

    const idsToAdd = filtered.map((design) => design.id).filter((designId) => !selectedSet.has(designId));
    const available = Math.max(0, MAX_BULK_SELECTION - selected.length);
    setSelected((current) => [...current, ...idsToAdd.slice(0, available)]);
    if (idsToAdd.length > available) {
      toast({
        tone: "info",
        title: `Selection limit reached (${MAX_BULK_SELECTION})`,
        description: `Bulk rights actions support up to ${MAX_BULK_SELECTION} designs at a time.`,
      });
    }
  }

  function openBulkRights() {
    if (selected.length === 0) return;
    setBulkError("");
    setBulkOpen(true);
  }

  async function applyBulkRights(changes: BulkRightsChanges) {
    if (selected.length === 0) return;
    setBulkSaving(true);
    setBulkError("");
    try {
      const result = await api.patch<BulkCommercialRightsResult>("/designs/commercial-rights/bulk", {
        designIds: selected,
        ...changes,
        ...(changes.filmSalesAction
          ? {
              reason:
                changes.filmSalesAction === "ENABLE"
                  ? "Bulk film-sale consent granted from the designer designs table"
                  : "Bulk film-sale consent revoked from the designer designs table",
            }
          : {}),
      });
      setBulkOpen(false);
      toast({
        tone: "success",
        title: `Rights updated for ${result.updatedCount} design${result.updatedCount === 1 ? "" : "s"}`,
        description:
          result.unchangedCount > 0
            ? `${result.unchangedCount} selected design${result.unchangedCount === 1 ? " was" : "s were"} already set that way.`
            : undefined,
      });
      await load();
    } catch (e) {
      const nextError = e instanceof Error ? e.message : "Bulk rights update failed";
      setBulkError(nextError);
      toast({ tone: "error", title: "Could not update rights", description: nextError });
    } finally {
      setBulkSaving(false);
    }
  }

  const columns: DataTableColumn<Design>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      render: (_, row) => (
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 accent-brand-blue"
            checked={selectedSet.has(row.id)}
            onChange={() => toggleSelected(row.id)}
            aria-label={`Select ${row.title}`}
          />
          <Link href={`/dashboard/designer/designs/${row.id}`} className="font-medium text-brand-ink hover:text-brand-blue">
            {row.title}
          </Link>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (val) => <StatusBadge status={String(val)} />,
    },
    {
      key: "commercialRights",
      header: "Rights",
      render: (_, row) => <RightsSummary rights={row.commercialRights} />,
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

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full max-w-sm">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
              <Input
                placeholder="Search designs…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-surface-borderSoft px-4 text-sm text-brand-ink">
                <SelectionCheckbox
                  checked={allFilteredSelected}
                  indeterminate={someFilteredSelected && !allFilteredSelected}
                  disabled={filtered.length === 0}
                  onChange={toggleAllFiltered}
                  aria-label={shouldClearFiltered ? "Clear filtered selection" : "Select all filtered designs"}
                />
                {shouldClearFiltered ? "Clear filtered" : "Select filtered"}
              </label>
              {selected.length > 0 ? (
                <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                  Clear
                </Button>
              ) : null}
              <Button variant="secondary" size="sm" disabled={selected.length === 0} onClick={openBulkRights}>
                <ShieldCheck size={17} />
                Manage rights{selected.length > 0 ? ` (${selected.length})` : ""}
              </Button>
            </div>
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
              caption="Uploaded designs and commercial rights"
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

        <BulkRightsModal
          open={bulkOpen}
          selectedCount={selected.length}
          saving={bulkSaving}
          error={bulkError}
          onClose={() => setBulkOpen(false)}
          onApply={(changes) => void applyBulkRights(changes)}
        />
      </div>
    </DashboardLayout>
  );
}

function SelectionCheckbox({ indeterminate, ...props }: InputHTMLAttributes<HTMLInputElement> & { indeterminate: boolean }) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return <input ref={ref} type="checkbox" className="h-4 w-4 accent-brand-blue" {...props} />;
}

function RightsSummary({ rights }: { rights?: Design["commercialRights"] }) {
  if (!rights) return <span className="text-xs text-brand-muted">Not configured</span>;

  return (
    <div className="flex max-w-xs flex-wrap gap-1.5">
      <RightPill label="Products" enabled={rights.allowProductSales} />
      <RightPill label="Marketplace" enabled={rights.allowMarketplacePublishing} />
      <RightPill label="Film" enabled={rights.allowFilmSales && !rights.filmConsentRevokedAt} film />
      <RightPill label="Corporate" enabled={rights.allowCorporateBidding} />
    </div>
  );
}

function RightPill({ label, enabled, film = false }: { label: string; enabled: boolean; film?: boolean }) {
  return (
    <span
      className={
        "rounded-pill px-2.5 py-1 text-[11px] font-semibold " +
        (enabled
          ? film
            ? "bg-brand-peachLight text-brand-peach"
            : "bg-brand-blueLight/55 text-brand-blue"
          : "bg-surface-app text-brand-muted")
      }
    >
      {label} {enabled ? "on" : "off"}
    </span>
  );
}

