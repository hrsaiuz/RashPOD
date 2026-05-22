"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Download, Eye, FilePlus2, Filter, RefreshCw, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
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

function Skeleton() {
  return (
    <tr>
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <td key={i} style={{ padding: "12px 16px", borderBottom: "1px solid #F0F2FA" }}>
          <div style={{ height: 14, borderRadius: 6, background: "#F0F2FA", width: i === 2 ? 180 : 92 }} />
        </td>
      ))}
    </tr>
  );
}

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
      if (jobsRes.status === 401 || jobsRes.status === 403 || overviewRes.status === 401 || overviewRes.status === 403) { router.push("/auth/login"); return; }
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

  return (
    <DashboardLayout role="production">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, color: "#1A1D2E" }}>Production Queue</h1>
          <p style={{ margin: "4px 0 0", color: "#6B7280", fontSize: 13 }}>Paid items, production files, QC, and fulfillment handoff.</p>
        </div>
        <button onClick={load} style={toolbarButtonStyle}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {overview ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))", gap: 10, marginBottom: 16 }}>
          <Stat label="Total" value={overview.total} />
          <Stat label="Queued" value={overview.queued} />
          <Stat label="Blocked" value={overview.blocked} tone={overview.blocked ? "danger" : undefined} />
          <Stat label="File issues" value={overview.fileFailures} tone={overview.fileFailures ? "warning" : undefined} />
          <Stat label="High priority" value={overview.highPriority} />
          <Stat label="Overdue" value={overview.overdue} tone={overview.overdue ? "danger" : undefined} />
          <Stat label="Pickup" value={overview.readyForPickup} />
          <Stat label="Delivery" value={overview.readyForDelivery} />
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#6B7280", fontSize: 13 }}><Filter size={15} /> Queue</span>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={selectStyle}>{FILTERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={selectStyle}>{SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      </div>

      {error && <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 16, marginBottom: 20, color: "#B42318", fontSize: 14 }}>{error}</div>}

      <div style={{ background: "white", border: "1px solid #E8EAFB", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1120 }}>
            <thead>
              <tr style={{ background: "#F8F9FF" }}>
                {["Order", "Item", "File", "Status", "Operator", "Due", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#6B7280", fontWeight: 600, borderBottom: "1px solid #E8EAFB" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} />)
                : jobs.length === 0
                ? <tr><td colSpan={7} style={{ padding: 24, color: "#9CA3AF", textAlign: "center" }}>No production items match this queue.</td></tr>
                : jobs.map((job) => {
                    const itemTitle = job.orderItem?.listingTitle || job.productSnapshotJson?.listingTitle || "Order item";
                    const options = job.selectedOptionsJson || {};
                    const blocked = job.status === "BLOCKED" || Boolean(job.blockerReason);
                    return (
                      <tr key={job.id} style={{ borderBottom: "1px solid #F0F2FA" }}>
                        <td style={{ padding: "12px 16px", color: "#374151", minWidth: 170 }}>
                          <div style={{ fontFamily: "monospace", fontSize: 12 }}>#{job.order.id.slice(-6)}</div>
                          <div style={{ marginTop: 4, color: "#6B7280" }}>{job.order.customerName || "Customer"}</div>
                          <Badge tone={job.isPaid ? "success" : "warning"}>{job.paymentStatus || (job.isPaid ? "PAID" : "PAYMENT")}</Badge>
                        </td>
                        <td style={{ padding: "12px 16px", color: "#1F2937", minWidth: 260 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <strong>{itemTitle}</strong>
                            {job.priority ? <Badge tone="warning">P{job.priority}</Badge> : null}
                            {blocked ? <Badge tone="danger">Blocked</Badge> : null}
                          </div>
                          <div style={{ marginTop: 4, color: "#6B7280", fontSize: 12 }}>{job.productSnapshotJson?.baseProductName || job.productSnapshotJson?.productTypeName || job.queueType}</div>
                          <div style={{ marginTop: 2, color: "#9CA3AF", fontSize: 12 }}>{[options.size, options.color, options.material, options.printSide].filter(Boolean).join(" / ") || "No options"} · Qty {job.orderItem?.quantity ?? job.productSnapshotJson?.quantity ?? 1}</div>
                        </td>
                        <td style={{ padding: "12px 16px" }}><Badge tone={fileTone(job.productionFileStatus)}>{job.productionFileStatus || "MISSING"}</Badge></td>
                        <td style={{ padding: "12px 16px" }}><Badge tone={statusTone(job.status)}>{label(job.status)}</Badge></td>
                        <td style={{ padding: "12px 16px", color: "#374151" }}>{job.assignedOperatorId ? job.assignedOperatorId.slice(0, 8) : "Unassigned"}</td>
                        <td style={{ padding: "12px 16px", color: "#6B7280" }}>{job.dueAt ? new Date(job.dueAt).toLocaleDateString() : "-"}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <IconButton title="Assign to me" disabled={updating === job.id} onClick={() => void action(job.id, "assign") }><UserCheck size={15} /></IconButton>
                            <IconButton title="Request file" disabled={updating === job.id} onClick={() => void action(job.id, job.productionFileStatus === "FAILED" ? "retry-file" : "request-file") }><FilePlus2 size={15} /></IconButton>
                            <IconButton title="Download file" disabled={updating === job.id || job.productionFileStatus !== "READY"} onClick={() => void action(job.id, "download-file") }><Download size={15} /></IconButton>
                            <IconButton title="Open" asLink href={`/dashboard/production/jobs/${job.id}`}><Eye size={15} /></IconButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "danger" | "warning" }) {
  const color = tone === "danger" ? "#B42318" : tone === "warning" ? "#B45309" : "#1F2937";
  return <div style={{ background: "white", border: "1px solid #E8EAFB", borderRadius: 8, padding: 12 }}><div style={{ color: "#6B7280", fontSize: 12 }}>{label}</div><div style={{ color, fontSize: 22, fontWeight: 800 }}>{value}</div></div>;
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "info" }) {
  const styles: Record<string, CSSProperties> = {
    neutral: { background: "#F0F2FA", color: "#374151" },
    success: { background: "#D1FAE5", color: "#047857" },
    warning: { background: "#FEF3C7", color: "#92400E" },
    danger: { background: "#FEF2F2", color: "#B42318" },
    info: { background: "#DBEAFE", color: "#1D4ED8" },
  };
  return <span style={{ borderRadius: 999, padding: "4px 9px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", ...styles[tone] }}>{children}</span>;
}

function IconButton({ children, title, disabled, onClick, asLink, href }: { children: ReactNode; title: string; disabled?: boolean; onClick?: () => void; asLink?: boolean; href?: string }) {
  const style: CSSProperties = { display: "inline-grid", placeItems: "center", width: 32, height: 32, borderRadius: 8, border: "1px solid #E8EAFB", background: disabled ? "#F3F4F6" : "white", color: disabled ? "#9CA3AF" : "#788AE0", cursor: disabled ? "not-allowed" : "pointer" };
  if (asLink && href) return <Link title={title} aria-label={title} href={href} style={{ ...style, textDecoration: "none" }}>{children}</Link>;
  return <button title={title} aria-label={title} disabled={disabled} onClick={onClick} style={style}>{children}</button>;
}

function fileTone(status?: string | null): "neutral" | "success" | "warning" | "danger" | "info" {
  if (status === "READY") return "success";
  if (status === "FAILED" || status === "MISSING_SOURCE") return "danger";
  if (status === "QUEUED" || status === "GENERATING") return "info";
  return "warning";
}

function statusTone(status: string): "neutral" | "success" | "warning" | "danger" | "info" {
  if (["READY_FOR_PICKUP", "READY_FOR_DELIVERY", "DELIVERED", "COMPLETED", "READY_FOR_PRINT"].includes(status)) return "success";
  if (["BLOCKED", "CANCELED", "QC_FAILED", "REPRINT_REQUIRED"].includes(status)) return "danger";
  if (["WAITING_FOR_FILE", "FILE_CHECK"].includes(status)) return "warning";
  if (["FILE_GENERATING", "IN_PRODUCTION", "PRINTING", "QUALITY_CHECK", "QC", "OUT_FOR_DELIVERY"].includes(status)) return "info";
  return "neutral";
}

function label(value: string) {
  return value.replace(/_/g, " ").toLowerCase().replace(/(^|\s)\S/g, (match) => match.toUpperCase());
}

const toolbarButtonStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #E8EAFB", background: "white", borderRadius: 8, padding: "8px 12px", color: "#374151", cursor: "pointer" };
const selectStyle: CSSProperties = { border: "1px solid #E8EAFB", borderRadius: 8, background: "white", color: "#374151", padding: "8px 10px", fontSize: 13 };
