"use client";

import { ChangeEvent, useEffect, useRef, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
  StatusBadge,
} from "@rashpod/ui";
import { ArrowLeft, Boxes, Globe2, Image as ImageIcon, Send, ShieldCheck, ShoppingBag, Upload as UploadIcon } from "lucide-react";
import { useAuth } from "../../../../auth/auth-provider";
import DashboardLayout from "../../../dashboard-layout";
import { DesignPreviewCard } from "../../../../../components/design/DesignPreviewCard";
import { DesignerDesignStoryPanel } from "../../../../../components/design-story/DesignerDesignStoryPanel";
import { useToast } from "../../../../../components/feedback/toast-provider";
import {
  api,
  resolveUploadMimeType,
  uploadToSignedUrl,
  type CommercialRights,
  type Design,
  type DesignUploadPlacementOption,
  type DesignUploadProductTypeOption,
  type DesignWorkflowDetail,
  type UploadUrlResponse,
} from "../../../../../lib/api";

const MAX_BYTES = 50 * 1024 * 1024;

const STATUS_TIMELINE: Design["status"][] = [
  "DRAFT",
  "PENDING_MODERATION",
  "APPROVED_LOCAL",
  "APPROVED_GLOBAL",
  "READY_FOR_MOCKUP",
  "READY_TO_PUBLISH",
  "PUBLISHED",
];

type DesignerDesignDetail = DesignWorkflowDetail;

export default function DesignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const id = String(params.id);
  const [design, setDesign] = useState<DesignerDesignDetail | null>(null);
  const [rights, setRights] = useState<CommercialRights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [action, setAction] = useState<"" | "submitting" | "version">("");
  const [uploadPlacement, setUploadPlacement] = useState("FRONT");
  const [configuredPlacements, setConfiguredPlacements] = useState<DesignUploadPlacementOption[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/auth/login?next=/dashboard/designer/designs/${id}`);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, id]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [d, r, options] = await Promise.all([
        api.get<DesignerDesignDetail>(`/designer/designs/${id}`),
        api.get<CommercialRights | null>(`/designs/${id}/commercial-rights`).catch(() => null),
        api.get<DesignUploadProductTypeOption[]>("/designer/designs/upload-options").catch(() => []),
      ]);
      setDesign(d);
      setRights(r);
      const requestedProduct = options.flatMap((item) => item.baseProducts).find((item) => item.id === d.requestedBaseProductId);
      const placements = requestedProduct?.placements
        ?? (d.requestedBaseProductId ? [] : LEGACY_PLACEMENT_OPTIONS.map((code) => ({ code, name: placementLabel(code), mockupTemplateId: "", printAreaId: "" })));
      setConfiguredPlacements(placements);
      if (placements.length) {
        setUploadPlacement((current) => placements.some((item) => item.code === current) ? current : placements[0].code);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load design");
    } finally {
      setLoading(false);
    }
  }

  async function submitForReview() {
    setAction("submitting");
    try {
      await api.post(`/designer/designs/${id}/submit-for-moderation`);
      await load();
      toast({ tone: "success", title: "Design sent for moderation" });
    } catch (e) {
      const nextError = e instanceof Error ? e.message : "Submit failed";
      setError(nextError);
      toast({ tone: "error", title: "Could not send design", description: nextError });
    } finally {
      setAction("");
    }
  }

  async function onPickVersion(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const placement = uploadPlacement;
    if (f.size > MAX_BYTES) {
      setError("File too large (max 50 MB).");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const mimeType = resolveUploadMimeType(f);
    setAction("version");
    setError("");
    try {
      const dimensions = await readImageDimensions(f);
      const upload = await api.post<UploadUrlResponse>("/files/upload-url", {
        purpose: "DESIGN_ORIGINAL",
        filename: f.name,
        mimeType,
        sizeBytes: f.size,
        designId: id,
      });
      await uploadToSignedUrl(upload.url, f, mimeType, upload.headers);
      await api.post("/files/complete-upload", {
        fileId: upload.fileId,
        uploadedSizeBytes: f.size,
        uploadedMimeType: mimeType,
      });
      await api.post(`/designer/designs/${id}/versions`, {
        fileId: upload.fileId,
        ...(dimensions ?? {}),
        dpi: 300,
        placement,
      });
      await load();
      toast({ tone: "success", title: `${placementLabel(placement)} artwork uploaded` });
    } catch (err) {
      const nextError = err instanceof Error ? err.message : "Version upload failed";
      setError(nextError);
      toast({ tone: "error", title: "Version upload failed", description: nextError });
    } finally {
      setAction("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const editable = Boolean(design && (design.status === "DRAFT" || design.status === "NEEDS_FIX" || design.status === "REJECTED"));
  const hasRequiredArtwork = Boolean(design && (design.requestedBaseProductId
    ? design.versions?.some((version) => version.placement && configuredPlacements.some((placement) => placement.code === version.placement))
    : design.versions?.length));
  const canSubmit = editable && hasRequiredArtwork;
  const latestVersion = design?.versions?.find((version) => version.placement === "FRONT")
    ?? design?.versions?.find((version) => !version.placement)
    ?? design?.versions?.[0];

  return (
    <DashboardLayout role="designer">
      <div className="space-y-6 max-w-4xl">
        <Link
          href="/dashboard/designer/designs"
          className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-ink"
        >
          <ArrowLeft size={16} /> Back to designs
        </Link>

        {loading ? (
          <Skeleton className="h-40" />
        ) : error ? (
          <ErrorState title="Could not load" description={error} retry={<Button onClick={load}>Retry</Button>} />
        ) : design ? (
          <>
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold text-brand-ink">{design.title}</h1>
                <p className="text-brand-muted mt-1">{design.description || "No description"}</p>
              </div>
              <StatusBadge status={design.status} />
            </div>

            <DesignPreviewCard
              title="Design artwork"
              src={design.previewImageUrl}
              alt={design.title}
              widthPx={latestVersion?.widthPx}
              heightPx={latestVersion?.heightPx}
            />

            <Card>
              <h2 className="text-lg font-semibold text-brand-ink mb-4">Lifecycle</h2>
              <ol className="flex flex-wrap gap-2">
                {STATUS_TIMELINE.map((step) => {
                  const reached = statusRank(design.status) >= statusRank(step);
                  return (
                    <li
                      key={step}
                      className={
                        "px-3 h-9 inline-flex items-center rounded-pill text-xs font-semibold " +
                        (reached ? "bg-brand-blue text-white" : "bg-surface-card text-brand-muted")
                      }
                    >
                      {step.replace(/_/g, " ")}
                    </li>
                  );
                })}
              </ol>
              <p className="text-xs text-brand-muted mt-3">
                Updated {new Date(design.updatedAt).toLocaleString()}
              </p>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-brand-ink mb-2">Placement artwork</h2>
              <p className="mb-4 text-sm text-brand-muted">
                {design.requestedBaseProduct
                  ? `Only placements configured for ${design.requestedBaseProduct.name} are available.`
                  : "This legacy design is not tied to a base product. Choose from the original placement list."}
              </p>
              {configuredPlacements.length ? (
                <label className="mb-4 block max-w-sm text-sm font-semibold text-brand-ink">
                  Upload for placement
                  <select
                    className="mt-2 min-h-11 w-full rounded-xl border border-surface-borderSoft bg-white px-3 font-normal outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20 disabled:cursor-not-allowed disabled:opacity-50"
                    value={uploadPlacement}
                    onChange={(event) => setUploadPlacement(event.target.value)}
                    disabled={Boolean(action)}
                  >
                    {configuredPlacements.map((placement) => <option key={placement.code} value={placement.code}>{placement.name || placementLabel(placement.code)}</option>)}
                  </select>
                </label>
              ) : (
                <div role="alert" className="mb-4 rounded-2xl border border-status-warning/30 bg-status-warning/5 p-4 text-sm text-brand-muted">
                  This product has no active placement configuration. Ask an administrator to configure its mockup template before uploading more artwork.
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="primaryBlue"
                  loading={action === "submitting"}
                  disabled={!canSubmit || Boolean(action)}
                  onClick={submitForReview}
                >
                  <Send size={16} />
                  {canSubmit ? "Submit for review" : editable ? "Upload artwork before submitting" : `Cannot submit (${design.status})`}
                </Button>
                <Button
                  variant="secondary"
                  loading={action === "version"}
                  disabled={!editable || Boolean(action) || configuredPlacements.length === 0}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadIcon size={16} />
                  Upload {placementLabel(uploadPlacement)} artwork
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                  onChange={onPickVersion}
                />
                <Link href={`/dashboard/designer/designs/${id}/rights`}>
                  <Button variant="ghost">
                    <ShieldCheck size={16} />
                    Manage rights
                  </Button>
                </Link>
              </div>
              {design.versions?.length ? (
                <ul className="mt-5 grid gap-2 sm:grid-cols-2" aria-label="Uploaded placement artwork">
                  {configuredPlacements.map((placement) => {
                    const version = design.versions?.find((item) => item.placement === placement.code);
                    const defaultVersion = design.versions?.find((item) => !item.placement);
                    const status = version ? "Uploaded" : defaultVersion ? "Uses default" : "Optional";
                    return (
                      <li key={placement.code} className="flex min-h-11 items-center justify-between rounded-xl border border-surface-borderSoft px-3 text-sm">
                        <span className="font-medium text-brand-ink">{placement.name || placementLabel(placement.code)}</span>
                        <span className={version ? "text-semantic-success" : "text-brand-muted"}>{status}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </Card>

            <PipelineOverview design={design} />

            <DesignerDesignStoryPanel designId={id} designTitle={design.title} storySummary={design.story} />

            <Card>
              <h2 className="text-lg font-semibold text-brand-ink mb-4">Commercial rights</h2>
              {rights ? (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <RightsRow label="Product sales" on={rights.allowProductSales} />
                  <RightsRow label="Marketplace publishing" on={rights.allowMarketplacePublishing} />
                  <RightsRow label="Film sales (DTF/UV-DTF)" on={rights.allowFilmSales} />
                  <RightsRow label="Corporate bidding" on={rights.allowCorporateBidding} />
                </ul>
              ) : (
                <EmptyState title="No rights configured" description="Open the rights page to configure commercial usage." />
              )}
            </Card>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}

const LEGACY_PLACEMENT_OPTIONS = ["FRONT", "BACK", "LEFT_CHEST", "RIGHT_CHEST", "LEFT_SLEEVE", "RIGHT_SLEEVE", "FULL_WRAP"] as const;

function placementLabel(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function readImageDimensions(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const dimensions = { widthPx: bitmap.width, heightPx: bitmap.height };
    bitmap.close();
    return dimensions;
  } catch {
    return null;
  }
}

function RightsRow({ label, on }: { label: string; on: boolean }) {
  return (
    <li className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-card">
      <span className="text-brand-ink">{label}</span>
      <span className={"text-xs font-semibold " + (on ? "text-semantic-success" : "text-brand-muted")}>
        {on ? "Enabled" : "Off"}
      </span>
    </li>
  );
}

function PipelineOverview({ design }: { design: DesignerDesignDetail }) {
  const selections = design.productSelections ?? [];
  const listings = design.listings ?? [];
  const mockups = selections.flatMap((selection) => Array.isArray(selection.mockupAssets) ? selection.mockupAssets : []);
  const publications = listings.flatMap((listing) => listing.marketplacePublications ?? []);

  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <Boxes size={18} className="text-brand-blue" />
        <h2 className="text-lg font-semibold text-brand-ink">Product Pipeline</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PipelineMetric icon={<Boxes size={18} />} label="Selections" value={selections.length} />
        <PipelineMetric icon={<ImageIcon size={18} />} label="Mockups" value={mockups.length} />
        <PipelineMetric icon={<ShoppingBag size={18} />} label="Listings" value={listings.length} />
        <PipelineMetric icon={<Globe2 size={18} />} label="Publications" value={publications.length} />
      </div>

      {selections.length ? (
        <div className="mt-5 space-y-3">
          {selections.map((selection) => (
            <div key={selection.id} className="rounded-xl border border-surface-borderSoft p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand-ink">{selection.pipeline === "LOCAL" ? objectName(selection.localBaseProduct, "Local product") : objectName(selection.printfulProductTemplate, "Printful product")}</p>
                  <p className="mt-1 text-sm text-brand-muted">{selection.pipeline.replace(/_/g, " ")} · {selection.placement}</p>
                </div>
                <StatusBadge status={selection.status} />
              </div>
              {selection.errorMessage ? <p className="mt-3 text-sm text-semantic-danger">{selection.errorMessage}</p> : null}
              {Array.isArray(selection.mockupAssets) && selection.mockupAssets.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selection.mockupAssets.map((asset) => {
                    const row = asset as { id?: string; mockupType?: string; status?: string };
                    return <StatusChip key={row.id ?? row.mockupType} label={row.mockupType ?? "Mockup"} status={row.status ?? "PENDING"} />;
                  })}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No product selections yet" description="Approved products and mockup progress will appear after moderation." />
      )}

      {listings.length ? (
        <div className="mt-5 space-y-3">
          <h3 className="text-sm font-semibold uppercase text-brand-muted">Listings</h3>
          {listings.map((listing) => (
            <div key={listing.id} className="rounded-xl border border-surface-borderSoft p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand-ink">{listing.title}</p>
                  <p className="mt-1 text-sm text-brand-muted">{listing.price} {listing.currency}</p>
                </div>
                <StatusBadge status={listing.status} />
              </div>
              {listing.marketplacePublications?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {listing.marketplacePublications.map((publication) => <StatusChip key={publication.id} label={publication.marketplace} status={publication.status} />)}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function PipelineMetric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-surface-borderSoft p-4">
      <div className="mb-2 text-brand-blue">{icon}</div>
      <p className="text-2xl font-bold text-brand-ink tabular-nums">{value}</p>
      <p className="text-xs font-medium uppercase text-brand-muted">{label}</p>
    </div>
  );
}

function StatusChip({ label, status }: { label: string; status: string }) {
  return (
    <span className="inline-flex min-h-8 items-center gap-2 rounded-pill border border-surface-borderSoft px-3 text-xs font-semibold text-brand-ink">
      <span className="text-brand-muted">{label.replace(/_/g, " ")}</span>
      <StatusBadge status={status} />
    </span>
  );
}

function objectName(value: unknown, fallback: string) {
  if (value && typeof value === "object") {
    const item = value as { name?: unknown; displayName?: unknown };
    if (typeof item.name === "string") return item.name;
    if (typeof item.displayName === "string") return item.displayName;
  }
  return fallback;
}

function statusRank(status: string) {
  if (status === "SUBMITTED") return statusRank("PENDING_MODERATION");
  if (status === "APPROVED") return statusRank("APPROVED_LOCAL");
  const index = STATUS_TIMELINE.indexOf(status as Design["status"]);
  return index === -1 ? 0 : index;
}
