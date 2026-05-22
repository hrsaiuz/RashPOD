"use client";

import Link from "next/link";
import Image from "next/image";
import { use, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft, CheckCircle2, Download, FilePlus2, PackageCheck, Play, RotateCcw, Truck, UserCheck, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../../auth/auth-provider";
import DashboardLayout from "../../../dashboard-layout";

type ProductionJobDetail = {
  id: string;
  status: string;
  queueType: string;
  priority?: number | null;
  assignedOperatorId?: string | null;
  blockerReason?: string | null;
  failureReason?: string | null;
  customerSnapshotJson?: Record<string, unknown> | null;
  productSnapshotJson?: Record<string, unknown> | null;
  placementSnapshotJson?: Record<string, unknown> | null;
  printAreaSnapshotJson?: Record<string, unknown> | null;
  assetSnapshotJson?: Record<string, unknown> | null;
  selectedOptionsJson?: Record<string, unknown> | null;
  productionFileStatus?: string | null;
  productionFileAssetId?: string | null;
  productionFileObjectKey?: string | null;
  mockupPreviewUrl?: string | null;
  qcStatus?: string | null;
  qcNote?: string | null;
  qcFailedReason?: string | null;
  producedQuantity?: number | null;
  acceptedQuantity?: number | null;
  rejectedQuantity?: number | null;
  defectReason?: string | null;
  deliveryProvider?: string | null;
  deliveryTrackingRef?: string | null;
  deliveryNote?: string | null;
  pickupNote?: string | null;
  notes?: string | null;
  order: { id: string; total?: string; currency?: string; customerName?: string | null; customerPhone?: string | null; deliveryAddress?: string | null; deliveryType?: string | null; pickupLocation?: string | null; status?: string | null };
  orderItem?: { id: string; listingTitle?: string | null; quantity: number; mockupImageUrl?: string | null } | null;
};

export default function ProductionJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [job, setJob] = useState<ProductionJobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [producedQuantity, setProducedQuantity] = useState("1");
  const [acceptedQuantity, setAcceptedQuantity] = useState("1");
  const [rejectedQuantity, setRejectedQuantity] = useState("0");
  const [provider, setProvider] = useState("");
  const [trackingRef, setTrackingRef] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setError("");
    try {
      const res = await fetch(`/api/proxy/production/items/${id}`);
      if (res.status === 401 || res.status === 403) { router.push("/auth/login"); return; }
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const data = await res.json();
      setJob(data);
      setNote(data.qcNote || data.notes || "");
      setReason(data.defectReason || data.blockerReason || "");
      const qty = String(data.orderItem?.quantity ?? data.productSnapshotJson?.quantity ?? 1);
      setProducedQuantity(String(data.producedQuantity ?? qty));
      setAcceptedQuantity(String(data.acceptedQuantity ?? qty));
      setRejectedQuantity(String(data.rejectedQuantity ?? 0));
      setProvider(data.deliveryProvider || "");
      setTrackingRef(data.deliveryTrackingRef || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load job.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isLoading || !user) return;
    void load();
  }, [user, isLoading, id]);

  async function call(path: string, method: "GET" | "PATCH" | "POST" = "POST", body: Record<string, unknown> = {}) {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/proxy/production/items/${id}/${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "GET" ? undefined : JSON.stringify(body),
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
      setSubmitting(false);
    }
  }

  async function status(status: string, extra: Record<string, unknown> = {}) {
    await call("status", "PATCH", { status, note: note || undefined, reason: reason || undefined, ...extra });
  }

  async function qc(passed: boolean) {
    await call(passed ? "qc/pass" : "qc/fail", "POST", {
      producedQuantity: numberValue(producedQuantity),
      acceptedQuantity: numberValue(acceptedQuantity),
      rejectedQuantity: numberValue(rejectedQuantity),
      defectReason: passed ? undefined : reason || note,
      note: note || undefined,
      reprintRequired: !passed,
    });
  }

  return (
    <DashboardLayout role="production">
      <Link href="/dashboard/production/jobs" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#788AE0", textDecoration: "none", marginBottom: 18 }}>
        <ArrowLeft size={16} /> Back to queue
      </Link>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, color: "#1A1D2E" }}>Production Item</h1>
          {job ? <p style={{ margin: "4px 0 0", color: "#6B7280", fontSize: 13 }}>#{job.order.id.slice(-6)} · {label(job.status)} · {job.productionFileStatus || "MISSING FILE"}</p> : null}
        </div>
        {job ? <Badge tone={statusTone(job.status)}>{label(job.status)}</Badge> : null}
      </div>

      {error ? <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 16, marginBottom: 20, color: "#B42318", fontSize: 14 }}>{error}</div> : null}
      {loading ? <div style={{ color: "#6B7280" }}>Loading production item...</div> : null}
      {!loading && !job ? <div style={{ color: "#6B7280" }}>Production item not found.</div> : null}

      {job ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)", gap: 20 }}>
          <section style={{ background: "white", border: "1px solid #E8EAFB", borderRadius: 8, padding: 18, alignSelf: "start" }}>
            <div style={{ position: "relative", aspectRatio: "1 / 1", overflow: "hidden", borderRadius: 8, background: "#F0F2FA", marginBottom: 16 }}>
              {job.mockupPreviewUrl || job.orderItem?.mockupImageUrl ? (
                <Image src={(job.mockupPreviewUrl || job.orderItem?.mockupImageUrl)!} alt="Production preview" fill sizes="360px" style={{ objectFit: "cover" }} />
              ) : null}
            </div>
            <Metric label="Order" value={`#${job.order.id.slice(-6)}`} />
            <Metric label="Customer" value={String(job.customerSnapshotJson?.name || job.order.customerName || "-")} />
            <Metric label="Phone" value={String(job.customerSnapshotJson?.phone || job.order.customerPhone || "-")} />
            <Metric label="Delivery" value={String(job.customerSnapshotJson?.deliveryAddress || job.order.deliveryAddress || job.order.pickupLocation || "-")} />
            <Metric label="Operator" value={job.assignedOperatorId || "Unassigned"} />
          </section>

          <section style={{ display: "grid", gap: 16 }}>
            <Panel title="Production Item">
              <Metric label="Listing" value={String(job.productSnapshotJson?.listingTitle || job.orderItem?.listingTitle || "-")} />
              <Metric label="Product" value={String(job.productSnapshotJson?.baseProductName || job.productSnapshotJson?.productTypeName || "-")} />
              <Metric label="Quantity" value={String(job.productSnapshotJson?.quantity || job.orderItem?.quantity || 1)} />
              <Metric label="Options" value={formatOptions(job.selectedOptionsJson)} />
              <Metric label="Blocker" value={job.blockerReason || job.failureReason || "-"} />
            </Panel>

            <Panel title="File And Start">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                <Badge tone={fileTone(job.productionFileStatus)}>{job.productionFileStatus || "MISSING"}</Badge>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <ActionButton disabled={submitting} onClick={() => void call("assign", "PATCH")}><UserCheck size={15} /> Assign me</ActionButton>
                  <ActionButton disabled={submitting} onClick={() => void call(job.productionFileStatus === "FAILED" ? "retry-file" : "request-file", "POST", { reason: reason || undefined })}><FilePlus2 size={15} /> File</ActionButton>
                  <ActionButton disabled={submitting || job.productionFileStatus !== "READY"} onClick={() => void call("download-file", "GET")}><Download size={15} /> Download</ActionButton>
                  <ActionButton disabled={submitting || job.productionFileStatus !== "READY"} onClick={() => void status("READY_FOR_PRINT")}><CheckCircle2 size={15} /> Ready</ActionButton>
                  <ActionButton disabled={submitting || job.status !== "READY_FOR_PRINT"} onClick={() => void status("IN_PRODUCTION")}><Play size={15} /> Start</ActionButton>
                </div>
              </div>
              <Metric label="File id" value={job.productionFileAssetId || "-"} />
              <Metric label="Object key" value={job.productionFileObjectKey || "-"} />
              <Metric label="Placement" value={formatJson(job.placementSnapshotJson)} />
              <Metric label="Print area" value={formatJson(job.printAreaSnapshotJson)} />
            </Panel>

            <Panel title="QC">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 12 }}>
                <Input label="Produced" value={producedQuantity} onChange={setProducedQuantity} />
                <Input label="Accepted" value={acceptedQuantity} onChange={setAcceptedQuantity} />
                <Input label="Rejected" value={rejectedQuantity} onChange={setRejectedQuantity} />
              </div>
              <Textarea label="QC note" value={note} onChange={setNote} />
              <Textarea label="Reason / defect" value={reason} onChange={setReason} />
              <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <ActionButton disabled={submitting || !["IN_PRODUCTION", "PRINTING"].includes(job.status)} onClick={() => void status("QUALITY_CHECK", { producedQuantity: numberValue(producedQuantity) })}><PackageCheck size={15} /> Send QC</ActionButton>
                <ActionButton disabled={submitting || !["QUALITY_CHECK", "QC"].includes(job.status)} onClick={() => void qc(true)}><CheckCircle2 size={15} /> Pass QC</ActionButton>
                <ActionButton disabled={submitting || !["QUALITY_CHECK", "QC"].includes(job.status)} onClick={() => void qc(false)} tone="danger"><XCircle size={15} /> Fail QC</ActionButton>
                <ActionButton disabled={submitting} onClick={() => void call("reprint", "POST", { reason: reason || "Reprint requested" })}><RotateCcw size={15} /> Reprint</ActionButton>
              </div>
              <Metric label="QC status" value={job.qcStatus || "Not checked"} />
              <Metric label="QC failure" value={job.qcFailedReason || job.defectReason || "-"} />
            </Panel>

            <Panel title="Fulfillment">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 12 }}>
                <Input label="Provider" value={provider} onChange={setProvider} />
                <Input label="Tracking" value={trackingRef} onChange={setTrackingRef} />
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <ActionButton disabled={submitting || job.qcStatus !== "PASSED"} onClick={() => void call("ready-for-pickup", "POST", { note: note || undefined })}><PackageCheck size={15} /> Pickup</ActionButton>
                <ActionButton disabled={submitting || job.qcStatus !== "PASSED"} onClick={() => void call("ready-for-delivery", "POST", { note: note || undefined, provider: provider || undefined, trackingRef: trackingRef || undefined })}><Truck size={15} /> Delivery</ActionButton>
                <ActionButton disabled={submitting || job.status !== "READY_FOR_DELIVERY"} onClick={() => void call("out-for-delivery", "POST", { note: note || undefined, provider: provider || undefined, trackingRef: trackingRef || undefined })}><Truck size={15} /> Out</ActionButton>
                <ActionButton disabled={submitting || !["READY_FOR_DELIVERY", "OUT_FOR_DELIVERY"].includes(job.status)} onClick={() => void call("delivered", "POST", { note: note || undefined })}><CheckCircle2 size={15} /> Delivered</ActionButton>
                <ActionButton disabled={submitting || !["READY_FOR_PICKUP", "DELIVERED", "READY_FOR_DELIVERY", "OUT_FOR_DELIVERY"].includes(job.status)} onClick={() => void call("complete", "POST", { note: note || undefined })}><CheckCircle2 size={15} /> Complete</ActionButton>
              </div>
              <Metric label="Provider" value={job.deliveryProvider || "-"} />
              <Metric label="Tracking" value={job.deliveryTrackingRef || "-"} />
            </Panel>

            <Panel title="Notes And Exceptions">
              <Textarea label="Internal note" value={note} onChange={setNote} />
              <Textarea label="Reason" value={reason} onChange={setReason} />
              <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <ActionButton disabled={submitting || !note.trim()} onClick={() => void call("notes", "PATCH", { note })}>Save note</ActionButton>
                <ActionButton disabled={submitting || !reason.trim()} onClick={() => void call("block", "PATCH", { reason })} tone="danger">Block</ActionButton>
                <ActionButton disabled={submitting || !reason.trim()} onClick={() => void call("cancel", "PATCH", { reason })} tone="danger">Cancel</ActionButton>
              </div>
            </Panel>
          </section>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <div style={{ background: "white", border: "1px solid #E8EAFB", borderRadius: 8, padding: 18 }}><h2 style={{ margin: "0 0 14px", fontSize: 15, color: "#1F2937" }}>{title}</h2>{children}</div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div style={{ display: "grid", gridTemplateColumns: "128px minmax(0, 1fr)", gap: 12, padding: "8px 0", borderBottom: "1px solid #F0F2FA" }}><span style={{ color: "#6B7280", fontSize: 12 }}>{label}</span><span style={{ color: "#374151", fontSize: 13, overflowWrap: "anywhere" }}>{value}</span></div>;
}

function Input({ label: inputLabel, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label style={{ display: "grid", gap: 5, color: "#6B7280", fontSize: 12 }}>{inputLabel}<input value={value} onChange={(event) => onChange(event.target.value)} style={inputStyle} /></label>;
}

function Textarea({ label: inputLabel, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label style={{ display: "grid", gap: 5, color: "#6B7280", fontSize: 12, marginTop: 10 }}>{inputLabel}<textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} /></label>;
}

function ActionButton({ children, disabled, onClick, tone = "neutral" }: { children: ReactNode; disabled?: boolean; onClick: () => void; tone?: "neutral" | "danger" }) {
  return <button disabled={disabled} onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #E8EAFB", borderRadius: 8, background: disabled ? "#F3F4F6" : tone === "danger" ? "#FEF2F2" : "white", color: disabled ? "#9CA3AF" : tone === "danger" ? "#B42318" : "#374151", padding: "8px 10px", fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer" }}>{children}</button>;
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "info" }) {
  const styles: Record<string, CSSProperties> = {
    neutral: { background: "#F0F2FA", color: "#374151" },
    success: { background: "#D1FAE5", color: "#047857" },
    warning: { background: "#FEF3C7", color: "#92400E" },
    danger: { background: "#FEF2F2", color: "#B42318" },
    info: { background: "#DBEAFE", color: "#1D4ED8" },
  };
  return <span style={{ borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", ...styles[tone] }}>{children}</span>;
}

function formatOptions(value?: Record<string, unknown> | null) {
  if (!value) return "-";
  return [value.size, value.color, value.material, value.printSide].filter(Boolean).map(String).join(" / ") || "-";
}

function formatJson(value?: Record<string, unknown> | null) {
  if (!value) return "-";
  const compact = Object.entries(value).filter(([, entry]) => entry != null && entry !== "").slice(0, 8);
  return compact.map(([key, entry]) => `${key}: ${String(entry)}`).join("; ") || "-";
}

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function label(value: string) {
  return value.replace(/_/g, " ").toLowerCase().replace(/(^|\s)\S/g, (match) => match.toUpperCase());
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

const inputStyle: CSSProperties = { width: "100%", border: "1px solid #E8EAFB", borderRadius: 8, padding: "9px 10px", color: "#374151", background: "white", fontSize: 13 };
