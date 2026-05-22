"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, ClipboardCheck, Download, FilePlus2, PackageCheck, PackageOpen, QrCode, RefreshCw, Search, Truck, Upload, UserCheck, XCircle } from "lucide-react";
import { api, uploadToSignedUrl } from "../../../lib/api";
import { useAuth } from "../../auth/auth-provider";
import DashboardLayout from "../dashboard-layout";

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => { detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>> };
  }
}

type Overview = { queue: number; assignedToMe: number; blocked: number; urgentIssues: number; pickup: number; delivery: number };
type QueueResponse = { items: WorkshopItem[]; nextCursor?: string | null };
type ScanResponse = { targetUrl: string; code: string; entityType: string; entityId: string; payload?: unknown };
type UploadSignResponse = { fileId: string; url: string; headers?: Record<string, string>; uploadHeaders?: Record<string, string> };

type WorkshopItem = {
  id: string;
  shortCode?: string | null;
  orderId: string;
  orderNumber: string;
  status: string;
  priority?: number | null;
  dueAt?: string | null;
  overdue?: boolean;
  customerName?: string | null;
  customerInitials?: string | null;
  product: string;
  baseProduct?: string | null;
  options?: { size?: unknown; color?: unknown; material?: unknown; printSide?: unknown };
  quantity?: number | null;
  source?: string | null;
  productionFileStatus?: string | null;
  qcStatus?: string | null;
  assignedOperatorId?: string | null;
  packedAt?: string | null;
  issueCount?: number;
  mockupPreviewUrl?: string | null;
  customerPhoneLast4?: string | null;
  customerNote?: string | null;
  deliveryType?: string | null;
  pickupLocation?: string | null;
  deliveryAddressSummary?: string | null;
  placementSnapshotJson?: unknown;
  printAreaSnapshotJson?: unknown;
  productionFileAssetId?: string | null;
  notes?: string | null;
  blockerReason?: string | null;
  failureReason?: string | null;
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
  qcEvidence?: unknown[];
  issues?: unknown[];
};

type Issue = { id: string; type: string; severity: string; status: string; note: string; createdAt: string; productionJobId: string; orderId?: string | null; productionJob?: { order?: { customerName?: string | null }; orderItem?: { listingTitle?: string | null } | null } | null };

const nav = [
  ["/dashboard/production/mobile", "Queue", PackageOpen],
  ["/dashboard/production/scan", "Scan", QrCode],
  ["/dashboard/production/qc", "QC", ClipboardCheck],
  ["/dashboard/production/packing", "Pack", PackageCheck],
  ["/dashboard/production/pickup", "Pickup", CheckCircle2],
  ["/dashboard/production/delivery", "Delivery", Truck],
  ["/dashboard/production/issues", "Issues", AlertTriangle],
] as const;

export function WorkshopHome() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [queue, setQueue] = useState<WorkshopItem[]>([]);
  const [filter, setFilter] = useState("assigned-to-me");
  const [search, setSearch] = useState("");
  const { loading, error, load } = useWorkshopLoad(async () => {
    const [overviewRes, queueRes] = await Promise.all([
      api.get<Overview>("/workshop/overview"),
      api.get<QueueResponse>(`/workshop/queue?${new URLSearchParams({ filter, sort: "priority", limit: "40", ...(search ? { q: search } : {}) })}`),
    ]);
    setOverview(overviewRes);
    setQueue(queueRes.items);
  }, [filter, search]);

  return (
    <WorkshopShell title="Workshop" subtitle="Mobile production desk">
      <div style={topActionsStyle}>
        <Link href="/dashboard/production/scan" style={primaryLinkStyle}><QrCode size={18} /> Scan</Link>
        <button onClick={load} style={iconTextButtonStyle}><RefreshCw size={16} /> Refresh</button>
      </div>
      {overview ? <OverviewGrid overview={overview} /> : null}
      <SearchBar value={search} onChange={setSearch} />
      <FilterTabs value={filter} onChange={setFilter} tabs={[["assigned-to-me", "Mine"], ["unassigned", "Open"], ["ready-for-print", "Print"], ["qc", "QC"], ["blocked", "Blocked"], ["delivery", "Handoff"]]} />
      <State loading={loading} error={error} empty={!queue.length} emptyText="No workshop items in this view." />
      <ItemList items={queue} />
    </WorkshopShell>
  );
}

export function WorkshopScan() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);

  useEffect(() => setRecent(JSON.parse(localStorage.getItem("rashpod-workshop-scans") || "[]")), []);

  async function submit(nextCode = code) {
    const trimmed = nextCode.trim();
    if (!trimmed) return;
    setScanning(true);
    setError("");
    try {
      const result = await api.post<ScanResponse>("/workshop/scan", { code: trimmed });
      const nextRecent = [result.code, ...recent.filter((item) => item !== result.code)].slice(0, 8);
      setRecent(nextRecent);
      localStorage.setItem("rashpod-workshop-scans", JSON.stringify(nextRecent));
      router.push(result.targetUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed.");
    } finally {
      setScanning(false);
    }
  }

  return (
    <WorkshopShell title="Scan" subtitle="QR or barcode lookup">
      <CameraScanner onDetect={(value) => void submit(value)} />
      <form onSubmit={(event) => { event.preventDefault(); void submit(); }} style={{ display: "grid", gap: 10, marginTop: 14 }}>
        <label style={labelStyle}>Code<input autoFocus value={code} onChange={(event) => setCode(event.target.value)} style={inputStyle} placeholder="ORD-... WPI-... PKG-..." /></label>
        <button disabled={scanning} style={primaryButtonStyle}><Search size={18} /> Open</button>
      </form>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {recent.length ? <Panel title="Recent"><div style={{ display: "grid", gap: 8 }}>{recent.map((item) => <button key={item} onClick={() => void submit(item)} style={wideButtonStyle}>{item}</button>)}</div></Panel> : null}
    </WorkshopShell>
  );
}

export function WorkshopItemPage({ id }: { id: string }) {
  const [item, setItem] = useState<WorkshopItem | null>(null);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [accepted, setAccepted] = useState("1");
  const [rejected, setRejected] = useState("0");
  const [provider, setProvider] = useState("");
  const [trackingRef, setTrackingRef] = useState("");
  const [busy, setBusy] = useState(false);
  const { loading, error, setError, load } = useWorkshopLoad(async () => {
    const data = await api.get<WorkshopItem>(`/workshop/items/${id}`);
    setItem(data);
    setNote(data.qcNote || data.notes || "");
    setReason(data.defectReason || data.blockerReason || "");
    setAccepted(String(data.acceptedQuantity ?? data.quantity ?? 1));
    setRejected(String(data.rejectedQuantity ?? 0));
    setProvider(data.deliveryProvider || "");
    setTrackingRef(data.deliveryTrackingRef || "");
  }, [id]);

  async function action(path: string, body: Record<string, unknown> = {}, method: "GET" | "POST" = "POST") {
    setBusy(true);
    setError("");
    try {
      if (method === "GET") {
        const result = await api.get<{ url?: string }>(path);
        if (result.url) window.open(result.url, "_blank", "noopener,noreferrer");
      } else {
        await api.post<unknown>(path, { idempotencyKey: crypto.randomUUID(), ...body });
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadEvidence(file: File) {
    if (!item) return;
    setBusy(true);
    setError("");
    try {
      const signed = await api.post<UploadSignResponse>(`/workshop/items/${item.id}/qc/evidence/sign-upload`, { filename: file.name, mimeType: file.type || "image/jpeg", sizeBytes: file.size });
      await uploadToSignedUrl(signed.url, file, signed.headers || signed.uploadHeaders);
      await api.post(`/workshop/items/${item.id}/qc/evidence/${signed.fileId}/complete`, { uploadedSizeBytes: file.size, uploadedMimeType: file.type || "image/jpeg", note: note || undefined, defectReason: reason || undefined, acceptedQuantity: numberValue(accepted), rejectedQuantity: numberValue(rejected) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evidence upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkshopShell title="Production Item" subtitle={item ? `${item.orderNumber} · ${label(item.status)}` : "Mobile actions"}>
      <BackLink href="/dashboard/production/mobile" />
      <State loading={loading} error={error} empty={!item} emptyText="Production item not found." />
      {item ? (
        <div style={{ display: "grid", gap: 14, paddingBottom: 86 }}>
          <section style={heroStyle}>
            <div style={previewStyle}>{item.mockupPreviewUrl ? <Image src={item.mockupPreviewUrl} alt="Production preview" fill sizes="180px" style={{ objectFit: "cover" }} /> : <PackageOpen size={42} color="#A3AFE5" />}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}><Badge tone={statusTone(item.status)}>{label(item.status)}</Badge><Badge tone={fileTone(item.productionFileStatus)}>{item.productionFileStatus || "MISSING"}</Badge>{item.issueCount ? <Badge tone="danger">{item.issueCount} issue</Badge> : null}</div>
              <h2 style={{ margin: 0, color: "#1A1D2E", fontSize: 18 }}>{item.product}</h2>
              <p style={{ margin: "5px 0 0", color: "#6B7280", fontSize: 13 }}>{item.baseProduct || item.source || "Production"} · Qty {item.quantity ?? 1}</p>
              <p style={{ margin: "5px 0 0", color: "#6B7280", fontSize: 13 }}>{formatOptions(item.options)}</p>
            </div>
          </section>

          <Panel title="Order"><Metric label="Order" value={item.orderNumber} /><Metric label="Customer" value={item.customerName || "Customer"} /><Metric label="Phone" value={item.customerPhoneLast4 ? `...${item.customerPhoneLast4}` : "-"} /><Metric label="Handoff" value={item.pickupLocation || item.deliveryAddressSummary || item.deliveryType || "-"} /></Panel>

          <Panel title="File"><div style={buttonGridStyle}><ActionButton disabled={busy} onClick={() => void action(`/workshop/items/${item.id}/assign-to-me`)}><UserCheck size={17} /> Assign</ActionButton><ActionButton disabled={busy} onClick={() => void action(`/workshop/items/${item.id}/${item.productionFileStatus === "FAILED" ? "retry-file" : "request-file"}`, { reason: reason || note || undefined })}><FilePlus2 size={17} /> File</ActionButton><ActionButton disabled={busy || item.productionFileStatus !== "READY"} onClick={() => void action(`/workshop/items/${item.id}/download-production-file`, {}, "GET")}><Download size={17} /> Download</ActionButton></div></Panel>

          <Panel title="Progress"><div style={buttonGridStyle}>{statusButton(item, busy, "READY_FOR_PRINT", action)}{statusButton(item, busy, "IN_PRODUCTION", action)}{statusButton(item, busy, "QUALITY_CHECK", action)}<ActionButton disabled={busy || !reason.trim()} tone="danger" onClick={() => void action(`/workshop/items/${item.id}/block`, { reason })}><AlertTriangle size={17} /> Block</ActionButton></div></Panel>

          <Panel title="QC"><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><Field label="Accepted" value={accepted} onChange={setAccepted} /><Field label="Rejected" value={rejected} onChange={setRejected} /></div><Field label="QC note" value={note} onChange={setNote} textarea /><Field label="Reason" value={reason} onChange={setReason} textarea /><label style={{ ...wideButtonStyle, justifyContent: "center", cursor: busy ? "not-allowed" : "pointer" }}><Upload size={17} /> Photo<input disabled={busy} type="file" accept="image/*" capture="environment" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadEvidence(file); }} style={{ display: "none" }} /></label><div style={buttonGridStyle}><ActionButton disabled={busy} onClick={() => void action(`/workshop/items/${item.id}/qc/pass`, { acceptedQuantity: numberValue(accepted), rejectedQuantity: numberValue(rejected), note: note || undefined })}><CheckCircle2 size={17} /> Pass</ActionButton><ActionButton disabled={busy || !reason.trim()} tone="danger" onClick={() => void action(`/workshop/items/${item.id}/qc/fail`, { acceptedQuantity: numberValue(accepted), rejectedQuantity: numberValue(rejected), defectReason: reason, note: note || undefined, reprintRequired: true })}><XCircle size={17} /> Fail</ActionButton></div></Panel>

          <Panel title="Packing And Handoff"><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><Field label="Provider" value={provider} onChange={setProvider} /><Field label="Tracking" value={trackingRef} onChange={setTrackingRef} /></div><div style={buttonGridStyle}><ActionButton disabled={busy} onClick={() => void action(`/workshop/orders/${item.orderId}/pack-item`, { productionJobId: item.id, note: note || undefined })}><PackageCheck size={17} /> Pack</ActionButton><ActionButton disabled={busy} onClick={() => void action(`/workshop/orders/${item.orderId}/mark-packed`, { note: note || undefined })}><PackageCheck size={17} /> Packed</ActionButton><ActionButton disabled={busy} onClick={() => void action(`/workshop/orders/${item.orderId}/out-for-delivery`, { provider: provider || undefined, trackingRef: trackingRef || undefined, note: note || undefined })}><Truck size={17} /> Out</ActionButton><ActionButton disabled={busy} onClick={() => void action(`/workshop/orders/${item.orderId}/delivered`, { provider: provider || undefined, trackingRef: trackingRef || undefined, note: note || undefined })}><CheckCircle2 size={17} /> Done</ActionButton></div></Panel>

          <Panel title="Issue"><Field label="Issue note" value={reason} onChange={setReason} textarea /><div style={buttonGridStyle}><ActionButton disabled={busy || !reason.trim()} tone="danger" onClick={() => void action(`/workshop/items/${item.id}/issues`, { type: "WORKSHOP", severity: "HIGH", note: reason, blockItem: true })}><AlertTriangle size={17} /> Block Issue</ActionButton><ActionButton disabled={busy || !reason.trim()} onClick={() => void action(`/workshop/items/${item.id}/issues`, { type: "WORKSHOP", severity: "NORMAL", note: reason })}><AlertTriangle size={17} /> Report</ActionButton></div></Panel>

          <div style={stickyBarStyle}><Link href={`/api/proxy/workshop/labels/production-item/${item.id}`} target="_blank" style={secondaryLinkStyle}><QrCode size={18} /> Label</Link><button disabled={busy} onClick={load} style={primaryButtonStyle}><RefreshCw size={18} /> Refresh</button></div>
        </div>
      ) : null}
    </WorkshopShell>
  );
}

export function WorkshopQueuePage({ title, subtitle, endpoint, filter }: { title: string; subtitle: string; endpoint?: string; filter?: string }) {
  const [items, setItems] = useState<WorkshopItem[]>([]);
  const [search, setSearch] = useState("");
  const { loading, error, load } = useWorkshopLoad(async () => {
    const path = endpoint || `/workshop/queue?${new URLSearchParams({ filter: filter || "qc", sort: "priority", limit: "80", ...(search ? { q: search } : {}) })}`;
    const result = await api.get<QueueResponse>(path);
    setItems(result.items);
  }, [endpoint, filter, search]);

  return <WorkshopShell title={title} subtitle={subtitle}><div style={topActionsStyle}><SearchBar value={search} onChange={setSearch} /><button onClick={load} style={iconTextButtonStyle}><RefreshCw size={16} /> Refresh</button></div><State loading={loading} error={error} empty={!items.length} emptyText="No items here right now." /><ItemList items={items} /></WorkshopShell>;
}

export function WorkshopIssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [status, setStatus] = useState("OPEN");
  const { loading, error, setError, load } = useWorkshopLoad(async () => setIssues(await api.get<Issue[]>(`/workshop/issues?status=${encodeURIComponent(status)}`)), [status]);

  async function resolve(id: string) {
    setError("");
    try {
      await api.post(`/workshop/issues/${id}/resolve`, { idempotencyKey: crypto.randomUUID(), resolutionNote: "Resolved from mobile workshop" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resolve issue.");
    }
  }

  return (
    <WorkshopShell title="Issues" subtitle="Workshop exceptions">
      <FilterTabs value={status} onChange={setStatus} tabs={[["OPEN", "Open"], ["RESOLVED", "Resolved"]]} />
      <State loading={loading} error={error} empty={!issues.length} emptyText="No issues in this view." />
      <div style={{ display: "grid", gap: 10 }}>{issues.map((issue) => <article key={issue.id} style={itemCardStyle}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><Badge tone={issue.severity === "HIGH" || issue.severity === "URGENT" ? "danger" : "warning"}>{issue.severity}</Badge><Badge>{issue.status}</Badge></div><h2 style={cardTitleStyle}>{issue.type}</h2><p style={mutedStyle}>{issue.note}</p><p style={mutedStyle}>{issue.productionJob?.orderItem?.listingTitle || issue.productionJobId}</p><div style={buttonGridStyle}><Link href={`/dashboard/production/items/${issue.productionJobId}/mobile`} style={secondaryLinkStyle}>Open item</Link>{issue.status === "OPEN" ? <button onClick={() => void resolve(issue.id)} style={wideButtonStyle}>Resolve</button> : null}</div></article>)}</div>
    </WorkshopShell>
  );
}

function useWorkshopLoad(loadFn: () => Promise<void>, deps: unknown[]) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    setError("");
    try {
      await loadFn();
    } catch (err) {
      if (err && typeof err === "object" && "status" in err && ((err as { status: number }).status === 401 || (err as { status: number }).status === 403)) router.push("/auth/login");
      else setError(err instanceof Error ? err.message : "Failed to load workshop data.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { if (!isLoading && user) void load(); }, [user, isLoading, ...deps]);
  return { loading, error, setError, load };
}

function WorkshopShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <DashboardLayout role="production"><div style={{ maxWidth: 920, margin: "0 auto", paddingBottom: 24 }}><header style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14 }}><div><h1 style={{ margin: 0, fontSize: 24, color: "#1A1D2E" }}>{title}</h1><p style={{ margin: "4px 0 0", color: "#6B7280", fontSize: 13 }}>{subtitle}</p></div><Link href="/dashboard/production/jobs" style={secondaryLinkStyle}>Desktop</Link></header><nav style={navStyle}>{nav.map(([href, labelText, Icon]) => <Link key={href} href={href} style={navItemStyle}><Icon size={17} />{labelText}</Link>)}</nav>{children}</div></DashboardLayout>;
}

function CameraScanner({ onDetect }: { onDetect: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!enabled) return;
    let stream: MediaStream | null = null;
    let interval: ReturnType<typeof setInterval> | undefined;
    async function start() {
      if (!window.BarcodeDetector) { setMessage("Camera scanning is not supported in this browser."); return; }
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) videoRef.current.srcObject = stream;
      const detector = new window.BarcodeDetector({ formats: ["qr_code", "code_128", "ean_13", "ean_8"] });
      interval = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        const codes = await detector.detect(videoRef.current).catch(() => []);
        if (codes[0]?.rawValue) onDetect(codes[0].rawValue);
      }, 800);
    }
    void start().catch((err) => setMessage(err instanceof Error ? err.message : "Camera unavailable."));
    return () => { if (interval) clearInterval(interval); stream?.getTracks().forEach((track) => track.stop()); };
  }, [enabled, onDetect]);

  return <section style={scannerStyle}>{enabled ? <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 8, background: "#0B1020" }} /> : <button onClick={() => setEnabled(true)} style={primaryButtonStyle}><Camera size={18} /> Start Camera</button>}{message ? <p style={mutedStyle}>{message}</p> : null}</section>;
}

function OverviewGrid({ overview }: { overview: Overview }) {
  return <div style={overviewGridStyle}><Stat label="Queue" value={overview.queue} /><Stat label="Mine" value={overview.assignedToMe} /><Stat label="Blocked" value={overview.blocked} tone={overview.blocked ? "danger" : undefined} /><Stat label="Urgent" value={overview.urgentIssues} tone={overview.urgentIssues ? "danger" : undefined} /><Stat label="Pickup" value={overview.pickup} /><Stat label="Delivery" value={overview.delivery} /></div>;
}

function ItemList({ items }: { items: WorkshopItem[] }) {
  return <div style={{ display: "grid", gap: 10 }}>{items.map((item) => <Link key={item.id} href={`/dashboard/production/items/${item.id}/mobile`} style={{ ...itemCardStyle, textDecoration: "none" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><Badge tone={statusTone(item.status)}>{label(item.status)}</Badge>{item.overdue ? <Badge tone="danger">Overdue</Badge> : <Badge tone={fileTone(item.productionFileStatus)}>{item.productionFileStatus || "FILE"}</Badge>}</div><h2 style={cardTitleStyle}>{item.product}</h2><p style={mutedStyle}>{item.orderNumber} · {item.customerName || "Customer"} · Qty {item.quantity ?? 1}</p><p style={mutedStyle}>{item.baseProduct || item.source || "Production"} · {formatOptions(item.options)}</p></Link>)}</div>;
}

function SearchBar({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <label style={{ ...labelStyle, flex: 1 }}>Search<input value={value} onChange={(event) => onChange(event.target.value)} style={inputStyle} /></label>; }
function FilterTabs({ value, onChange, tabs }: { value: string; onChange: (value: string) => void; tabs: Array<[string, string]> }) { return <div style={tabsStyle}>{tabs.map(([id, title]) => <button key={id} onClick={() => onChange(id)} style={{ ...tabStyle, background: value === id ? "#788AE0" : "white", color: value === id ? "white" : "#374151" }}>{title}</button>)}</div>; }
function State({ loading, error, empty, emptyText }: { loading: boolean; error: string; empty: boolean; emptyText: string }) { return <>{error ? <Alert tone="danger">{error}</Alert> : null}{loading ? <Alert>Loading...</Alert> : null}{!loading && !error && empty ? <Alert>{emptyText}</Alert> : null}</>; }
function Alert({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "danger" }) { return <div role="status" style={{ border: `1px solid ${tone === "danger" ? "#FECACA" : "#E8EAFB"}`, background: tone === "danger" ? "#FEF2F2" : "white", color: tone === "danger" ? "#B42318" : "#374151", borderRadius: 8, padding: 12, margin: "10px 0", fontSize: 14 }}>{children}</div>; }
function Panel({ title, children }: { title: string; children: ReactNode }) { return <section style={panelStyle}><h2 style={{ margin: "0 0 12px", color: "#1F2937", fontSize: 15 }}>{title}</h2>{children}</section>; }
function Metric({ label: metricLabel, value }: { label: string; value: string }) { return <div style={{ display: "grid", gridTemplateColumns: "96px minmax(0, 1fr)", gap: 10, padding: "7px 0", borderTop: "1px solid #F0F2FA" }}><span style={{ color: "#6B7280", fontSize: 12 }}>{metricLabel}</span><span style={{ color: "#374151", fontSize: 13, overflowWrap: "anywhere" }}>{value}</span></div>; }
function Field({ label: fieldLabel, value, onChange, textarea }: { label: string; value: string; onChange: (value: string) => void; textarea?: boolean }) { return <label style={labelStyle}>{fieldLabel}{textarea ? <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} /> : <input value={value} onChange={(event) => onChange(event.target.value)} style={inputStyle} />}</label>; }
function ActionButton({ children, disabled, onClick, tone = "neutral" }: { children: ReactNode; disabled?: boolean; onClick: () => void; tone?: "neutral" | "danger" }) { return <button disabled={disabled} onClick={onClick} style={{ ...wideButtonStyle, background: disabled ? "#F3F4F6" : tone === "danger" ? "#FEF2F2" : "white", color: disabled ? "#9CA3AF" : tone === "danger" ? "#B42318" : "#374151", cursor: disabled ? "not-allowed" : "pointer" }}>{children}</button>; }
function BackLink({ href }: { href: string }) { return <Link href={href} style={{ ...secondaryLinkStyle, width: "fit-content", marginBottom: 10 }}><ArrowLeft size={17} /> Back</Link>; }
function Stat({ label: statLabel, value, tone }: { label: string; value: number; tone?: "danger" }) { return <div style={statStyle}><span style={{ color: "#6B7280", fontSize: 12 }}>{statLabel}</span><strong style={{ color: tone === "danger" ? "#B42318" : "#1F2937", fontSize: 22 }}>{value}</strong></div>; }
function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "info" }) { const styles: Record<string, CSSProperties> = { neutral: { background: "#F0F2FA", color: "#374151" }, success: { background: "#D1FAE5", color: "#047857" }, warning: { background: "#FEF3C7", color: "#92400E" }, danger: { background: "#FEF2F2", color: "#B42318" }, info: { background: "#DBEAFE", color: "#1D4ED8" } }; return <span style={{ borderRadius: 999, padding: "5px 9px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", ...styles[tone] }}>{children}</span>; }

function statusButton(item: WorkshopItem, busy: boolean, status: string, action: (path: string, body?: Record<string, unknown>) => Promise<void>) { return <ActionButton key={status} disabled={busy} onClick={() => action(`/workshop/items/${item.id}/status`, { status })}><CheckCircle2 size={17} /> {label(status)}</ActionButton>; }
function numberValue(value: string) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : undefined; }
function label(value: string) { return value.replace(/_/g, " ").toLowerCase().replace(/(^|\s)\S/g, (match) => match.toUpperCase()); }
function formatOptions(value?: WorkshopItem["options"]) { if (!value) return "No options"; return [value.size, value.color, value.material, value.printSide].filter(Boolean).map(String).join(" / ") || "No options"; }
function fileTone(status?: string | null): "neutral" | "success" | "warning" | "danger" | "info" { if (status === "READY") return "success"; if (status === "FAILED" || status === "MISSING_SOURCE") return "danger"; if (status === "QUEUED" || status === "GENERATING") return "info"; return "warning"; }
function statusTone(status: string): "neutral" | "success" | "warning" | "danger" | "info" { if (["READY_FOR_PICKUP", "READY_FOR_DELIVERY", "DELIVERED", "COMPLETED", "READY_FOR_PRINT"].includes(status)) return "success"; if (["BLOCKED", "CANCELED", "QC_FAILED", "REPRINT_REQUIRED"].includes(status)) return "danger"; if (["WAITING_FOR_FILE", "FILE_CHECK"].includes(status)) return "warning"; if (["FILE_GENERATING", "IN_PRODUCTION", "PRINTING", "QUALITY_CHECK", "QC", "OUT_FOR_DELIVERY"].includes(status)) return "info"; return "neutral"; }

const navStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(86px, 1fr))", gap: 8, marginBottom: 14 };
const navItemStyle: CSSProperties = { minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 8, border: "1px solid #E8EAFB", background: "white", color: "#374151", textDecoration: "none", fontSize: 13, fontWeight: 700 };
const topActionsStyle: CSSProperties = { display: "flex", alignItems: "end", gap: 10, marginBottom: 12, flexWrap: "wrap" };
const primaryButtonStyle: CSSProperties = { minHeight: 46, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, border: "1px solid #788AE0", borderRadius: 999, background: "#788AE0", color: "white", padding: "10px 16px", fontWeight: 800, cursor: "pointer", textDecoration: "none" };
const primaryLinkStyle: CSSProperties = { ...primaryButtonStyle };
const secondaryLinkStyle: CSSProperties = { minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, border: "1px solid #E8EAFB", borderRadius: 999, background: "white", color: "#374151", padding: "9px 14px", fontWeight: 800, cursor: "pointer", textDecoration: "none" };
const iconTextButtonStyle: CSSProperties = { ...secondaryLinkStyle };
const overviewGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(104px, 1fr))", gap: 8, marginBottom: 12 };
const statStyle: CSSProperties = { background: "white", border: "1px solid #E8EAFB", borderRadius: 8, padding: 12, display: "grid", gap: 4 };
const tabsStyle: CSSProperties = { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 8 };
const tabStyle: CSSProperties = { minHeight: 40, border: "1px solid #E8EAFB", borderRadius: 999, padding: "8px 13px", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" };
const inputStyle: CSSProperties = { width: "100%", minHeight: 44, border: "1px solid #E8EAFB", borderRadius: 8, padding: "9px 10px", color: "#374151", background: "white", fontSize: 14 };
const labelStyle: CSSProperties = { display: "grid", gap: 6, color: "#6B7280", fontSize: 12, fontWeight: 700 };
const itemCardStyle: CSSProperties = { background: "white", border: "1px solid #E8EAFB", borderRadius: 8, padding: 14, color: "inherit" };
const cardTitleStyle: CSSProperties = { margin: "10px 0 4px", color: "#1A1D2E", fontSize: 16, lineHeight: 1.25 };
const mutedStyle: CSSProperties = { margin: "4px 0 0", color: "#6B7280", fontSize: 13, overflowWrap: "anywhere" };
const panelStyle: CSSProperties = { background: "white", border: "1px solid #E8EAFB", borderRadius: 8, padding: 14 };
const heroStyle: CSSProperties = { display: "grid", gridTemplateColumns: "104px minmax(0, 1fr)", gap: 14, background: "white", border: "1px solid #E8EAFB", borderRadius: 8, padding: 14 };
const previewStyle: CSSProperties = { position: "relative", minHeight: 104, borderRadius: 8, overflow: "hidden", background: "#F0F2FA", display: "grid", placeItems: "center" };
const buttonGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))", gap: 8, marginTop: 10 };
const wideButtonStyle: CSSProperties = { minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, border: "1px solid #E8EAFB", borderRadius: 8, background: "white", color: "#374151", padding: "9px 10px", fontWeight: 800, textDecoration: "none" };
const stickyBarStyle: CSSProperties = { position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, background: "rgba(240,242,250,0.96)", borderTop: "1px solid #E8EAFB", padding: 12 };
const scannerStyle: CSSProperties = { background: "white", border: "1px solid #E8EAFB", borderRadius: 8, padding: 12, display: "grid", placeItems: "center", minHeight: 172 };
