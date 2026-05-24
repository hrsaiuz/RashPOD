"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FilePlus2,
  PackageCheck,
  PackageOpen,
  QrCode,
  RefreshCw,
  Search,
  Truck,
  Upload,
  UserCheck,
  XCircle,
} from "lucide-react";
import { Button, Card, FormField, Input, StatusBadge } from "@rashpod/ui";
import { api, resolveUploadMimeType, uploadToSignedUrl } from "../../../lib/api";
import { useAuth } from "../../auth/auth-provider";
import DashboardLayout from "../dashboard-layout";

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => {
      detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
    };
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

type Issue = {
  id: string;
  type: string;
  severity: string;
  status: string;
  note: string;
  createdAt: string;
  productionJobId: string;
  orderId?: string | null;
  productionJob?: { order?: { customerName?: string | null }; orderItem?: { listingTitle?: string | null } | null } | null;
};

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
      <div className="mb-3 flex flex-wrap items-end gap-2.5">
        <Link href="/dashboard/production/scan" className={primaryLinkClass}>
          <QrCode size={18} /> Scan
        </Link>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw size={16} className="mr-2" /> Refresh
        </Button>
      </div>
      {overview ? <OverviewGrid overview={overview} /> : null}
      <SearchBar value={search} onChange={setSearch} />
      <FilterTabs
        value={filter}
        onChange={setFilter}
        tabs={[
          ["assigned-to-me", "Mine"],
          ["unassigned", "Open"],
          ["ready-for-print", "Print"],
          ["qc", "QC"],
          ["blocked", "Blocked"],
          ["delivery", "Handoff"],
        ]}
      />
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
      <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="mt-3.5 grid gap-2.5">
        <FormField label="Code">
          <Input autoFocus value={code} onChange={(event) => setCode(event.target.value)} placeholder="ORD-... WPI-... PKG-..." />
        </FormField>
        <Button type="submit" variant="primaryBlue" size="md" loading={scanning} className="w-full">
          <Search size={18} className="mr-2" /> Open
        </Button>
      </form>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {recent.length ? (
        <Panel title="Recent">
          <div className="grid gap-2">
            {recent.map((item) => (
              <button key={item} type="button" onClick={() => void submit(item)} className={wideButtonClass}>
                {item}
              </button>
            ))}
          </div>
        </Panel>
      ) : null}
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
      const signed = await api.post<UploadSignResponse>(`/workshop/items/${item.id}/qc/evidence/sign-upload`, {
        filename: file.name,
        mimeType: file.type || "image/jpeg",
        sizeBytes: file.size,
      });
      await uploadToSignedUrl(signed.url, file, signed.headers || signed.uploadHeaders);
      await api.post(`/workshop/items/${item.id}/qc/evidence/${signed.fileId}/complete`, {
        uploadedSizeBytes: file.size,
        uploadedMimeType: file.type || "image/jpeg",
        note: note || undefined,
        defectReason: reason || undefined,
        acceptedQuantity: numberValue(accepted),
        rejectedQuantity: numberValue(rejected),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evidence upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkshopShell title="Production Item" subtitle={item ? `${item.orderNumber} · ${formatStatus(item.status)}` : "Mobile actions"}>
      <BackLink href="/dashboard/production/mobile" />
      <State loading={loading} error={error} empty={!item} emptyText="Production item not found." />
      {item ? (
        <div className="grid gap-3.5 pb-24">
          <Card className="grid grid-cols-[104px_minmax(0,1fr)] gap-3.5 p-3.5">
            <div className="relative min-h-[104px] overflow-hidden rounded-xs bg-brand-bg grid place-items-center">
              {item.mockupPreviewUrl ? (
                <Image src={item.mockupPreviewUrl} alt="Production preview" fill sizes="180px" className="object-cover" />
              ) : (
                <PackageOpen size={42} className="text-brand-blueLight" />
              )}
            </div>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap gap-2">
                <WorkshopBadge tone={statusTone(item.status)}>{formatStatus(item.status)}</WorkshopBadge>
                <WorkshopBadge tone={fileTone(item.productionFileStatus)}>{item.productionFileStatus || "MISSING"}</WorkshopBadge>
                {item.issueCount ? <WorkshopBadge tone="danger">{item.issueCount} issue</WorkshopBadge> : null}
              </div>
              <h2 className="text-lg font-bold text-brand-ink">{item.product}</h2>
              <p className="mt-1 text-sm text-brand-muted">{item.baseProduct || item.source || "Production"} · Qty {item.quantity ?? 1}</p>
              <p className="mt-1 text-sm text-brand-muted">{formatOptions(item.options)}</p>
            </div>
          </Card>

          <Panel title="Order">
            <Metric label="Order" value={item.orderNumber} />
            <Metric label="Customer" value={item.customerName || "Customer"} />
            <Metric label="Phone" value={item.customerPhoneLast4 ? `...${item.customerPhoneLast4}` : "-"} />
            <Metric label="Handoff" value={item.pickupLocation || item.deliveryAddressSummary || item.deliveryType || "-"} />
          </Panel>

          <Panel title="File">
            <ActionGrid>
              <ActionButton disabled={busy} onClick={() => void action(`/workshop/items/${item.id}/assign-to-me`)}><UserCheck size={17} className="mr-2" /> Assign</ActionButton>
              <ActionButton disabled={busy} onClick={() => void action(`/workshop/items/${item.id}/${item.productionFileStatus === "FAILED" ? "retry-file" : "request-file"}`, { reason: reason || note || undefined })}><FilePlus2 size={17} className="mr-2" /> File</ActionButton>
              <ActionButton disabled={busy || item.productionFileStatus !== "READY"} onClick={() => void action(`/workshop/items/${item.id}/download-production-file`, {}, "GET")}><Download size={17} className="mr-2" /> Download</ActionButton>
            </ActionGrid>
          </Panel>

          <Panel title="Progress">
            <ActionGrid>
              {statusButton(item, busy, "READY_FOR_PRINT", action)}
              {statusButton(item, busy, "IN_PRODUCTION", action)}
              {statusButton(item, busy, "QUALITY_CHECK", action)}
              <ActionButton disabled={busy || !reason.trim()} tone="danger" onClick={() => void action(`/workshop/items/${item.id}/block`, { reason })}><AlertTriangle size={17} className="mr-2" /> Block</ActionButton>
            </ActionGrid>
          </Panel>

          <Panel title="QC">
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Accepted" value={accepted} onChange={setAccepted} />
              <Field label="Rejected" value={rejected} onChange={setRejected} />
            </div>
            <Field label="QC note" value={note} onChange={setNote} textarea />
            <Field label="Reason" value={reason} onChange={setReason} textarea />
            <label className={`${wideButtonClass} justify-center ${busy ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
              <Upload size={17} className="mr-2" /> Photo
              <input disabled={busy} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadEvidence(file); }} />
            </label>
            <ActionGrid>
              <ActionButton disabled={busy} onClick={() => void action(`/workshop/items/${item.id}/qc/pass`, { acceptedQuantity: numberValue(accepted), rejectedQuantity: numberValue(rejected), note: note || undefined })}><CheckCircle2 size={17} className="mr-2" /> Pass</ActionButton>
              <ActionButton disabled={busy || !reason.trim()} tone="danger" onClick={() => void action(`/workshop/items/${item.id}/qc/fail`, { acceptedQuantity: numberValue(accepted), rejectedQuantity: numberValue(rejected), defectReason: reason, note: note || undefined, reprintRequired: true })}><XCircle size={17} className="mr-2" /> Fail</ActionButton>
            </ActionGrid>
          </Panel>

          <Panel title="Packing And Handoff">
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Provider" value={provider} onChange={setProvider} />
              <Field label="Tracking" value={trackingRef} onChange={setTrackingRef} />
            </div>
            <ActionGrid>
              <ActionButton disabled={busy} onClick={() => void action(`/workshop/orders/${item.orderId}/pack-item`, { productionJobId: item.id, note: note || undefined })}><PackageCheck size={17} className="mr-2" /> Pack</ActionButton>
              <ActionButton disabled={busy} onClick={() => void action(`/workshop/orders/${item.orderId}/mark-packed`, { note: note || undefined })}><PackageCheck size={17} className="mr-2" /> Packed</ActionButton>
              <ActionButton disabled={busy} onClick={() => void action(`/workshop/orders/${item.orderId}/out-for-delivery`, { provider: provider || undefined, trackingRef: trackingRef || undefined, note: note || undefined })}><Truck size={17} className="mr-2" /> Out</ActionButton>
              <ActionButton disabled={busy} onClick={() => void action(`/workshop/orders/${item.orderId}/delivered`, { provider: provider || undefined, trackingRef: trackingRef || undefined, note: note || undefined })}><CheckCircle2 size={17} className="mr-2" /> Done</ActionButton>
            </ActionGrid>
          </Panel>

          <Panel title="Issue">
            <Field label="Issue note" value={reason} onChange={setReason} textarea />
            <ActionGrid>
              <ActionButton disabled={busy || !reason.trim()} tone="danger" onClick={() => void action(`/workshop/items/${item.id}/issues`, { type: "WORKSHOP", severity: "HIGH", note: reason, blockItem: true })}><AlertTriangle size={17} className="mr-2" /> Block Issue</ActionButton>
              <ActionButton disabled={busy || !reason.trim()} onClick={() => void action(`/workshop/items/${item.id}/issues`, { type: "WORKSHOP", severity: "NORMAL", note: reason })}><AlertTriangle size={17} className="mr-2" /> Report</ActionButton>
            </ActionGrid>
          </Panel>

          <div className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-2 gap-2.5 border-t border-brand-line bg-brand-bg/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
            <Link href={`/api/proxy/workshop/labels/production-item/${item.id}`} target="_blank" className={secondaryLinkClass}>
              <QrCode size={18} className="mr-2" /> Label
            </Link>
            <Button variant="primaryBlue" disabled={busy} onClick={load} className="w-full">
              <RefreshCw size={18} className="mr-2" /> Refresh
            </Button>
          </div>
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

  return (
    <WorkshopShell title={title} subtitle={subtitle}>
      <div className="mb-3 flex flex-wrap items-end gap-2.5">
        <SearchBar value={search} onChange={setSearch} />
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw size={16} className="mr-2" /> Refresh
        </Button>
      </div>
      <State loading={loading} error={error} empty={!items.length} emptyText="No items here right now." />
      <ItemList items={items} />
    </WorkshopShell>
  );
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
      <div className="grid gap-2.5">
        {issues.map((issue) => (
          <Card key={issue.id} className="p-3.5">
            <div className="flex justify-between gap-2">
              <WorkshopBadge tone={issue.severity === "HIGH" || issue.severity === "URGENT" ? "danger" : "warning"}>{issue.severity}</WorkshopBadge>
              <WorkshopBadge>{issue.status}</WorkshopBadge>
            </div>
            <h2 className="mt-2.5 text-base font-bold leading-snug text-brand-ink">{issue.type}</h2>
            <p className="mt-1 text-sm text-brand-muted break-words">{issue.note}</p>
            <p className="mt-1 text-sm text-brand-muted">{issue.productionJob?.orderItem?.listingTitle || issue.productionJobId}</p>
            <ActionGrid className="mt-2.5">
              <Link href={`/dashboard/production/items/${issue.productionJobId}/mobile`} className={secondaryLinkClass}>Open item</Link>
              {issue.status === "OPEN" ? (
                <button type="button" onClick={() => void resolve(issue.id)} className={wideButtonClass}>Resolve</button>
              ) : null}
            </ActionGrid>
          </Card>
        ))}
      </div>
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
  return (
    <DashboardLayout role="production">
      <div className="mx-auto max-w-content pb-[max(1rem,env(safe-area-inset-bottom))]">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-h3 font-bold text-brand-ink">{title}</h1>
            <p className="mt-1 text-sm text-brand-muted">{subtitle}</p>
          </div>
          <Link href="/dashboard/production/jobs" className={secondaryLinkClass}>Desktop</Link>
        </header>
        <nav className="mb-3.5 grid grid-cols-[repeat(auto-fit,minmax(86px,1fr))] gap-2">
          {nav.map(([href, labelText, Icon]) => (
            <Link key={href} href={href} className={navItemClass}>
              <Icon size={17} />
              {labelText}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </DashboardLayout>
  );
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

  return (
    <Card className="grid min-h-[172px] place-items-center p-3">
      {enabled ? (
        <video ref={videoRef} autoPlay muted playsInline className="aspect-[4/3] w-full rounded-xs bg-brand-ink object-cover" />
      ) : (
        <Button variant="primaryBlue" onClick={() => setEnabled(true)}>
          <Camera size={18} className="mr-2" /> Start Camera
        </Button>
      )}
      {message ? <p className="mt-2 text-sm text-brand-muted">{message}</p> : null}
    </Card>
  );
}

function OverviewGrid({ overview }: { overview: Overview }) {
  return (
    <div className="mb-3 grid grid-cols-[repeat(auto-fit,minmax(104px,1fr))] gap-2">
      <Stat label="Queue" value={overview.queue} />
      <Stat label="Mine" value={overview.assignedToMe} />
      <Stat label="Blocked" value={overview.blocked} tone={overview.blocked ? "danger" : undefined} />
      <Stat label="Urgent" value={overview.urgentIssues} tone={overview.urgentIssues ? "danger" : undefined} />
      <Stat label="Pickup" value={overview.pickup} />
      <Stat label="Delivery" value={overview.delivery} />
    </div>
  );
}

function ItemList({ items }: { items: WorkshopItem[] }) {
  return (
    <div className="grid gap-2.5">
      {items.map((item) => (
        <Link key={item.id} href={`/dashboard/production/items/${item.id}/mobile`} className={`${itemCardClass} no-underline`}>
          <div className="flex justify-between gap-2">
            <WorkshopBadge tone={statusTone(item.status)}>{formatStatus(item.status)}</WorkshopBadge>
            {item.overdue ? <WorkshopBadge tone="danger">Overdue</WorkshopBadge> : <WorkshopBadge tone={fileTone(item.productionFileStatus)}>{item.productionFileStatus || "FILE"}</WorkshopBadge>}
          </div>
          <h2 className="mt-2.5 text-base font-bold leading-snug text-brand-ink">{item.product}</h2>
          <p className="mt-1 text-sm text-brand-muted">{item.orderNumber} · {item.customerName || "Customer"} · Qty {item.quantity ?? 1}</p>
          <p className="mt-1 text-sm text-brand-muted">{item.baseProduct || item.source || "Production"} · {formatOptions(item.options)}</p>
        </Link>
      ))}
    </div>
  );
}

function SearchBar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <FormField label="Search" className="min-w-0 flex-1">
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </FormField>
  );
}

function FilterTabs({ value, onChange, tabs }: { value: string; onChange: (value: string) => void; tabs: Array<[string, string]> }) {
  return (
    <div className="-mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-2">
      {tabs.map(([id, title]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`min-h-10 shrink-0 rounded-pill border border-brand-line px-3.5 text-sm font-bold whitespace-nowrap ${value === id ? "border-brand-blue bg-brand-blue text-white" : "bg-white text-brand-ink"}`}
        >
          {title}
        </button>
      ))}
    </div>
  );
}

function Alert({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "danger" }) {
  return (
    <div
      role="status"
      className={tone === "danger" ? "my-2 rounded-xs border border-semantic-dangerBg bg-semantic-dangerBg p-3 text-sm text-semantic-dangerText" : "my-2 rounded-xs border border-brand-line bg-white p-3 text-sm text-brand-text"}
    >
      {children}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-3.5">
      <h2 className="mb-3 text-section font-semibold text-brand-ink">{title}</h2>
      {children}
    </Card>
  );
}

function State({ loading, error, empty, emptyText }: { loading: boolean; error: string; empty: boolean; emptyText: string }) {
  return (
    <>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {loading ? <Alert>Loading...</Alert> : null}
      {!loading && !error && empty ? <Alert>{emptyText}</Alert> : null}
    </>
  );
}

function Metric({ label: metricLabel, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-2.5 border-t border-brand-line py-2 first:border-t-0">
      <span className="text-xs text-brand-muted">{metricLabel}</span>
      <span className="break-words text-sm text-brand-text">{value}</span>
    </div>
  );
}

function Field({ label: fieldLabel, value, onChange, textarea }: { label: string; value: string; onChange: (value: string) => void; textarea?: boolean }) {
  if (textarea) {
    return (
      <FormField label={fieldLabel} className="mt-2.5">
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="w-full resize-y rounded-xs border border-brand-line bg-white px-3 py-2 text-sm text-brand-text min-h-[88px]" />
      </FormField>
    );
  }
  return (
    <FormField label={fieldLabel}>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </FormField>
  );
}

function ActionButton({ children, disabled, onClick, tone = "neutral" }: { children: ReactNode; disabled?: boolean; onClick: () => void; tone?: "neutral" | "danger" }) {
  return (
    <Button variant={tone === "danger" ? "danger" : "secondary"} size="sm" disabled={disabled} onClick={onClick} className="w-full justify-center">
      {children}
    </Button>
  );
}

function ActionGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`mt-2.5 grid grid-cols-[repeat(auto-fit,minmax(132px,1fr))] gap-2 ${className ?? ""}`}>{children}</div>;
}

function BackLink({ href }: { href: string }) {
  return (
    <Link href={href} className={`${secondaryLinkClass} mb-2.5 w-fit`}>
      <ArrowLeft size={17} className="mr-2" /> Back
    </Link>
  );
}

function Stat({ label: statLabel, value, tone }: { label: string; value: number; tone?: "danger" }) {
  return (
    <Card className="grid gap-1 p-3">
      <span className="text-xs text-brand-muted">{statLabel}</span>
      <strong className={`text-[22px] ${tone === "danger" ? "text-semantic-dangerText" : "text-brand-ink"}`}>{value}</strong>
    </Card>
  );
}

function WorkshopBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "info" }) {
  const status = { neutral: "draft", success: "approved", warning: "submitted", danger: "rejected", info: "submitted" }[tone];
  return <StatusBadge status={status} label={String(children)} />;
}

function statusButton(item: WorkshopItem, busy: boolean, status: string, action: (path: string, body?: Record<string, unknown>) => Promise<void>) {
  return (
    <ActionButton key={status} disabled={busy} onClick={() => action(`/workshop/items/${item.id}/status`, { status })}>
      <CheckCircle2 size={17} className="mr-2" /> {formatStatus(status)}
    </ActionButton>
  );
}

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatStatus(value: string) {
  return value.replace(/_/g, " ").toLowerCase().replace(/(^|\s)\S/g, (match) => match.toUpperCase());
}

function formatOptions(value?: WorkshopItem["options"]) {
  if (!value) return "No options";
  return [value.size, value.color, value.material, value.printSide].filter(Boolean).map(String).join(" / ") || "No options";
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

const navItemClass = "min-h-11 inline-flex items-center justify-center gap-1.5 rounded-xs border border-brand-line bg-white text-brand-ink no-underline text-sm font-bold";
const primaryLinkClass = "min-h-11 inline-flex items-center justify-center gap-2 rounded-pill border border-brand-blue bg-brand-blue px-4 text-sm font-bold text-white no-underline";
const secondaryLinkClass = "min-h-11 inline-flex items-center justify-center gap-2 rounded-pill border border-brand-line bg-white px-3.5 text-sm font-bold text-brand-ink no-underline";
const itemCardClass = "block rounded-xs border border-brand-line bg-white p-3.5 text-inherit";
const wideButtonClass = "min-h-11 inline-flex w-full items-center justify-center gap-2 rounded-xs border border-brand-line bg-white px-2.5 text-sm font-bold text-brand-ink";
