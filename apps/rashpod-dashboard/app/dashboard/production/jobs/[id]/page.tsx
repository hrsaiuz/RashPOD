"use client";

import Link from "next/link";
import Image from "next/image";
import { use, useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, CheckCircle2, Download, FilePlus2, PackageCheck, Play, RotateCcw, Truck, UserCheck, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, Card, FormField, Input, PageHeader, StatusBadge } from "@rashpod/ui";
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
      <Link href="/dashboard/production/jobs" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-brand-blue hover:underline">
        <ArrowLeft size={16} /> Back to queue
      </Link>
      <PageHeader
        title="Production Item"
        description={job ? `#${job.order.id.slice(-6)} · ${formatStatus(job.status)} · ${job.productionFileStatus || "MISSING FILE"}` : undefined}
        actions={job ? <StatusBadge status={job.status.toLowerCase()} label={formatStatus(job.status)} /> : undefined}
      />

      {error ? (
        <div role="alert" className="mb-4 rounded-xl border border-semantic-dangerBg bg-semantic-dangerBg p-4 text-sm text-semantic-dangerText">
          {error}
        </div>
      ) : null}
      {loading ? <p className="text-brand-muted">Loading production item...</p> : null}
      {!loading && !job ? <p className="text-brand-muted">Production item not found.</p> : null}

      {job ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
          <Card className="self-start p-4 sm:p-5">
            <div className="relative mb-4 aspect-square overflow-hidden rounded-xs bg-brand-bg">
              {job.mockupPreviewUrl || job.orderItem?.mockupImageUrl ? (
                <Image src={(job.mockupPreviewUrl || job.orderItem?.mockupImageUrl)!} alt="Production preview" fill sizes="360px" className="object-cover" />
              ) : null}
            </div>
            <Metric label="Order" value={`#${job.order.id.slice(-6)}`} />
            <Metric label="Customer" value={String(job.customerSnapshotJson?.name || job.order.customerName || "-")} />
            <Metric label="Phone" value={String(job.customerSnapshotJson?.phone || job.order.customerPhone || "-")} />
            <Metric label="Delivery" value={String(job.customerSnapshotJson?.deliveryAddress || job.order.deliveryAddress || job.order.pickupLocation || "-")} />
            <Metric label="Operator" value={job.assignedOperatorId || "Unassigned"} />
          </Card>

          <div className="grid gap-4">
            <Panel title="Production Item">
              <Metric label="Listing" value={String(job.productSnapshotJson?.listingTitle || job.orderItem?.listingTitle || "-")} />
              <Metric label="Product" value={String(job.productSnapshotJson?.baseProductName || job.productSnapshotJson?.productTypeName || "-")} />
              <Metric label="Quantity" value={String(job.productSnapshotJson?.quantity || job.orderItem?.quantity || 1)} />
              <Metric label="Options" value={formatOptions(job.selectedOptionsJson)} />
              <Metric label="Blocker" value={job.blockerReason || job.failureReason || "-"} />
            </Panel>

            <Panel title="File And Start">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <StatusBadge status={fileStatusKey(job.productionFileStatus)} label={job.productionFileStatus || "MISSING"} />
                <div className="flex flex-wrap gap-2">
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
              <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FieldInput label="Produced" value={producedQuantity} onChange={setProducedQuantity} />
                <FieldInput label="Accepted" value={acceptedQuantity} onChange={setAcceptedQuantity} />
                <FieldInput label="Rejected" value={rejectedQuantity} onChange={setRejectedQuantity} />
              </div>
              <FieldTextarea label="QC note" value={note} onChange={setNote} />
              <FieldTextarea label="Reason / defect" value={reason} onChange={setReason} />
              <div className="mt-3 flex flex-wrap gap-2">
                <ActionButton disabled={submitting || !["IN_PRODUCTION", "PRINTING"].includes(job.status)} onClick={() => void status("QUALITY_CHECK", { producedQuantity: numberValue(producedQuantity) })}><PackageCheck size={15} /> Send QC</ActionButton>
                <ActionButton disabled={submitting || !["QUALITY_CHECK", "QC"].includes(job.status)} onClick={() => void qc(true)}><CheckCircle2 size={15} /> Pass QC</ActionButton>
                <ActionButton disabled={submitting || !["QUALITY_CHECK", "QC"].includes(job.status)} onClick={() => void qc(false)} tone="danger"><XCircle size={15} /> Fail QC</ActionButton>
                <ActionButton disabled={submitting} onClick={() => void call("reprint", "POST", { reason: reason || "Reprint requested" })}><RotateCcw size={15} /> Reprint</ActionButton>
              </div>
              <Metric label="QC status" value={job.qcStatus || "Not checked"} />
              <Metric label="QC failure" value={job.qcFailedReason || job.defectReason || "-"} />
            </Panel>

            <Panel title="Fulfillment">
              <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FieldInput label="Provider" value={provider} onChange={setProvider} />
                <FieldInput label="Tracking" value={trackingRef} onChange={setTrackingRef} />
              </div>
              <div className="flex flex-wrap gap-2">
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
              <FieldTextarea label="Internal note" value={note} onChange={setNote} />
              <FieldTextarea label="Reason" value={reason} onChange={setReason} />
              <div className="mt-3 flex flex-wrap gap-2">
                <ActionButton disabled={submitting || !note.trim()} onClick={() => void call("notes", "PATCH", { note })}>Save note</ActionButton>
                <ActionButton disabled={submitting || !reason.trim()} onClick={() => void call("block", "PATCH", { reason })} tone="danger">Block</ActionButton>
                <ActionButton disabled={submitting || !reason.trim()} onClick={() => void call("cancel", "PATCH", { reason })} tone="danger">Cancel</ActionButton>
              </div>
            </Panel>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-semibold text-brand-ink">{title}</h2>
      {children}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[128px_minmax(0,1fr)] gap-3 border-b border-brand-line py-2">
      <span className="text-xs text-brand-muted">{label}</span>
      <span className="break-words text-sm text-brand-text">{value}</span>
    </div>
  );
}

function FieldInput({ label: inputLabel, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <FormField label={inputLabel}>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </FormField>
  );
}

function FieldTextarea({ label: inputLabel, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <FormField label={inputLabel} className="mt-3">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="w-full resize-y rounded-xs border border-brand-line bg-white px-3 py-2 text-sm text-brand-text"
      />
    </FormField>
  );
}

function ActionButton({ children, disabled, onClick, tone = "neutral" }: { children: ReactNode; disabled?: boolean; onClick: () => void; tone?: "neutral" | "danger" }) {
  return (
    <Button variant={tone === "danger" ? "danger" : "secondary"} size="sm" disabled={disabled} onClick={onClick}>
      {children}
    </Button>
  );
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

function formatStatus(value: string) {
  return value.replace(/_/g, " ").toLowerCase().replace(/(^|\s)\S/g, (match) => match.toUpperCase());
}

function fileStatusKey(status?: string | null) {
  if (status === "READY") return "approved";
  if (status === "FAILED" || status === "MISSING_SOURCE") return "failed";
  if (status === "QUEUED" || status === "GENERATING") return "submitted";
  return "pending";
}
