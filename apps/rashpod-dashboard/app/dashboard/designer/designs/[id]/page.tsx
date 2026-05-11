"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
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
import { ArrowLeft, Send, Upload as UploadIcon, ShieldCheck } from "lucide-react";
import { useAuth } from "../../../../auth/auth-provider";
import DashboardLayout from "../../../dashboard-layout";
import {
  api,
  uploadToSignedUrl,
  type CommercialRights,
  type Design,
  type UploadUrlResponse,
} from "../../../../../lib/api";

const STATUS_TIMELINE: Design["status"][] = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "READY_FOR_MOCKUP",
  "READY_TO_PUBLISH",
  "PUBLISHED",
];

export default function DesignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const id = String(params.id);
  const [design, setDesign] = useState<Design | null>(null);
  const [rights, setRights] = useState<CommercialRights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [action, setAction] = useState<"" | "submitting" | "version">("");
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
      const [designs, r] = await Promise.all([
        api.get<Design[]>("/designs"),
        api.get<CommercialRights | null>(`/designs/${id}/commercial-rights`).catch(() => null),
      ]);
      const found = designs.find((d) => d.id === id);
      if (!found) {
        setError("Design not found or you do not have access.");
      } else {
        setDesign(found);
        setRights(r);
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
      await api.post(`/designs/${id}/submit`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setAction("");
    }
  }

  async function onPickVersion(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setAction("version");
    try {
      const upload = await api.post<UploadUrlResponse>("/files/upload-url", {
        filename: f.name,
        mimeType: f.type || "application/octet-stream",
        sizeBytes: f.size,
      });
      await uploadToSignedUrl(upload.url, f, upload.headers);
      await api.post("/files/complete-upload", {
        fileId: upload.fileId,
        uploadedSizeBytes: f.size,
        uploadedMimeType: f.type,
      });
      await api.post(`/designs/${id}/versions`, {
        fileId: upload.fileId,
        widthPx: 0,
        heightPx: 0,
        dpi: 300,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Version upload failed");
    } finally {
      setAction("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const canSubmit = design && (design.status === "DRAFT" || design.status === "NEEDS_FIX");

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

            <Card>
              <h2 className="text-lg font-semibold text-brand-ink mb-4">Lifecycle</h2>
              <ol className="flex flex-wrap gap-2">
                {STATUS_TIMELINE.map((step) => {
                  const reached = STATUS_TIMELINE.indexOf(design.status) >= STATUS_TIMELINE.indexOf(step);
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
              <h2 className="text-lg font-semibold text-brand-ink mb-4">Actions</h2>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="primaryBlue"
                  loading={action === "submitting"}
                  disabled={!canSubmit}
                  onClick={submitForReview}
                >
                  <Send size={16} />
                  {canSubmit ? "Submit for review" : `Cannot submit (${design.status})`}
                </Button>
                <Button
                  variant="secondary"
                  loading={action === "version"}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadIcon size={16} />
                  Upload new version
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
            </Card>

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
