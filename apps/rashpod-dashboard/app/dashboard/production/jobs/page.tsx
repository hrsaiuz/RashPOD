"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Download, Eye, FilePlus2, Filter, RefreshCw, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, Card, DataTable, EmptyState, KpiTile, PageHeader, StatusBadge } from "@rashpod/ui";
import { useAuth } from "../../../auth/auth-provider";
import DashboardLayout from "../../dashboard-layout";

type ProductionJob = {
  id: string;
  status: string;
  queueType: string;
  priority?: number | null;
  assignedOperatorId?: string | null;
  blockerReason?: string | null;
  productionFileStatus?: string | null;
  mockupPreviewUrl?: string | null;
  dueAt?: string | null;
  createdAt?: string | null;
  paymentStatus?: string | null;
  isPaid?: boolean;
  productSnapshotJson?: { listingTitle?: string; productTypeName?: string; baseProductName?: string; quantity?: number } | null;
  selectedOptionsJson?: { size?: string; color?: string; material?: string; printSide?: string } | null;
  order: { id: string; customerName?: string | null; customerPhone?: string | null; deliveryType?: string | null; status?: string | null };
  orderItem?: { id: string; listingTitle?: string | null; quantity: number; mockupImageUrl?: string | null } | null;
};

type Overview = { total: number; queued: number; blocked: number; fileFailures: number; highPriority: number; overdue: number; readyForPickup: number; readyForDelivery: number };

const FILTERS = [
  ["", "All"],
  ["queued", "Queued"],
  ["file-missing", "File"],
  ["ready-for-print", "Ready"],
  ["in-production", "Production"],
  ["qc", "QC"],
  ["ready", "Fulfillment"],
  ["blocked", "Blocked"],
  ["completed", "Done"],
];

const SORTS = [
  ["priority", "Priority"],
  ["dueDate", "Due date"],
  ["oldest", "Oldest"],
  ["newest", "Newest"],
  ["status", "Status"],
];

export default function ProductionJobsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState("priority");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const query = useMemo(() => new URLSearchParams({ ...(filter ? { filter } : {}), sort }).toString(), [filter, sort]);

  const load = async () => {
    setError("");
    try {
      const [jobsRes, overviewRes] = await Promise.all([
        fetch(`/api/proxy/production/items?${query}`),
        fetch(`/api/proxy/production/overview`),
      ]);
      if (jobsRes.status === 401 || jobsRes.status === 403 || overviewRes.status === 401 || overviewRes.status === 403) {
        router.push("/auth/login");
        return;
      }
      if (!jobsRes.ok) throw new Error(`Server error (${jobsRes.status})`);
      setJobs(await jobsRes.json());
      if (overviewRes.ok) setOverview(await overviewRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load production queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoading || !user) return;
    void load();
  }, [user, isLoading, query]);

  const action = async (id: string, path: string, body: Record<string, unknown> = {}) => {
    if (!user) return;
    setUpdating(id);
    setError("");
    try {
      const res = await fetch(`/api/proxy/production/items/${id}/${path}`, {
        method: path === "download-file" ? "GET" : path === "assign" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: path === "download-file" ? undefined : JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      if (path === "download-file") {
        const data = await res.json();
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setUpdating(null);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "order",
        header: "Order",
        render: (_: unknown, job: ProductionJob) => (
          <div className="min-w-[150px]">
            <div className="font-mono text-xs text-brand-text">#{job.order.id.slice(-6)}</div>
            <div className="mt-1 text-brand-muted">{job.order.customerName || "Customer"}</div>
            <StatusBadge
              status={job.isPaid ? "paid" : "pending"}
              label={job.paymentStatus || (job.isPaid ? "PAID" : "PAYMENT")}
              className="mt-2"
            />
          </div>
        ),
      },
      {
        key: "item",
        header: "Item",
        render: (_: unknown, job: ProductionJob) => {
          const itemTitle = job.orderItem?.listingTitle || job.productSnapshotJson?.listingTitle || "Order item";
          const options = job.selectedOptionsJson || {};
          const blocked = job.status === "BLOCKED" || Boolean(job.blockerReason);
          return (
            <div className="min-w-[220px]">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-brand-ink">{itemTitle}</strong>
                {job.priority ? <StatusBadge status="high" label={`P${job.priority}`} /> : null}
                {blocked ? <StatusBadge status="rejected" label="Blocked" /> : null}
              </div>
              <div className="mt-1 text-xs text-brand-muted">
                {job.productSnapshotJson?.baseProductName || job.productSnapshotJson?.productTypeName || job.queueType}
              </div>
              <div className="mt-0.5 text-xs text-brand-subtle">
                {[options.size, options.color, options.material, options.printSide].filter(Boolean).join(" / ") || "No options"} · Qty{" "}
                {job.orderItem?.quantity ?? job.productSnapshotJson?.quantity ?? 1}
              </div>
            </div>
          );
        },
      },
      {
        key: "file",
        header: "File",
        render: (_: unknown, job: ProductionJob) => (
          <StatusBadge status={fileStatusKey(job.productionFileStatus)} label={job.productionFileStatus || "MISSING"} />
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (_: unknown, job: ProductionJob) => (
          <StatusBadge status={job.status.toLowerCase()} label={formatStatus(job.status)} />
        ),
      },
      {
        key: "operator",
        header: "Operator",
        render: (_: unknown, job: ProductionJob) => (
          <span className="text-brand-text">{job.assignedOperatorId ? job.assignedOperatorId.slice(0, 8) : "Unassigned"}</span>
        ),
      },
      {
        key: "due",
        header: "Due",
        render: (_: unknown, job: ProductionJob) => (
          <span className="text-brand-muted">{job.dueAt ? new Date(job.dueAt).toLocaleDateString() : "-"}</span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (_: unknown, job: ProductionJob) => (
          <div className="flex flex-wrap gap-2">
            <ActionButton title="Assign to me" disabled={updating === job.id} onClick={() => void action(job.id, "assign")}>
              <UserCheck size={15} />
            </ActionButton>
            <ActionButton
              title="Request file"
              disabled={updating === job.id}
              onClick={() => void action(job.id, job.productionFileStatus === "FAILED" ? "retry-file" : "request-file")}
            >
              <FilePlus2 size={15} />
            </ActionButton>
            <ActionButton
              title="Download file"
              disabled={updating === job.id || job.productionFileStatus !== "READY"}
              onClick={() => void action(job.id, "download-file")}
            >
              <Download size={15} />
            </ActionButton>
            <Link
              href={`/dashboard/production/jobs/${job.id}`}
              title="Open"
              aria-label="Open"
              className="inline-grid h-8 w-8 place-items-center rounded-xs border border-brand-line bg-white text-brand-blue transition-colors hover:bg-brand-blueLight/30"
            >
              <Eye size={15} />
            </Link>
          </div>
        ),
      },
    ],
    [updating],
  );

  return (
    <DashboardLayout role="production">
      <PageHeader
        title="Production Queue"
        description="Paid items, production files, QC, and fulfillment handoff."
        actions={
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCw size={15} className="mr-2" />
            Refresh
          </Button>
        }
      />

      {overview ? (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          <KpiTile label="Total" value={overview.total} />
          <KpiTile label="Queued" value={overview.queued} />
          <KpiTile label="Blocked" value={overview.blocked} className={overview.blocked ? "text-semantic-dangerText" : undefined} />
          <KpiTile label="File issues" value={overview.fileFailures} />
          <KpiTile label="High priority" value={overview.highPriority} />
          <KpiTile label="Overdue" value={overview.overdue} className={overview.overdue ? "text-semantic-dangerText" : undefined} />
          <KpiTile label="Pickup" value={overview.readyForPickup} />
          <KpiTile label="Delivery" value={overview.readyForDelivery} />
        </div>
      ) : null}

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <span className="inline-flex items-center gap-2 text-sm text-brand-muted">
          <Filter size={15} /> Queue
        </span>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="min-h-10 rounded-xs border border-brand-line bg-white px-3 text-sm">
          {FILTERS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="min-h-10 rounded-xs border border-brand-line bg-white px-3 text-sm">
          {SORTS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </Card>

      {error ? (
        <div role="alert" className="mb-4 rounded-xl border border-semantic-dangerBg bg-semantic-dangerBg p-4 text-sm text-semantic-dangerText">
          {error}
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={jobs}
        loading={loading}
        mobileMode="cards"
        caption="Production queue"
        emptyState={<EmptyState title="Queue empty" description="No production items match this queue." />}
      />
    </DashboardLayout>
  );
}

function ActionButton({
  children,
  title,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className="inline-grid h-8 w-8 place-items-center rounded-xs border border-brand-line bg-white text-brand-blue transition-colors hover:bg-brand-blueLight/30 disabled:cursor-not-allowed disabled:opacity-45"
    >
      {children}
    </button>
  );
}

function fileStatusKey(status?: string | null) {
  if (status === "READY") return "approved";
  if (status === "FAILED" || status === "MISSING_SOURCE") return "failed";
  if (status === "QUEUED" || status === "GENERATING") return "submitted";
  return "pending";
}

function formatStatus(value: string) {
  return value.replace(/_/g, " ").toLowerCase().replace(/(^|\s)\S/g, (match) => match.toUpperCase());
}
