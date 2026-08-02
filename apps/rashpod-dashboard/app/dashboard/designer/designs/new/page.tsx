"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  ErrorState,
  FormField,
  Input,
  Textarea,
} from "@rashpod/ui";
import { ArrowLeft, Upload as UploadIcon, FileImage, CheckCircle2, AlertCircle, Send } from "lucide-react";
import { useAuth } from "../../../../auth/auth-provider";
import DashboardLayout from "../../../dashboard-layout";
import { DesignPreviewCard } from "../../../../../components/design/DesignPreviewCard";
import { DesignerDesignStoryPanel } from "../../../../../components/design-story/DesignerDesignStoryPanel";
import { useToast } from "../../../../../components/feedback/toast-provider";
import { api, resolveUploadMimeType, uploadToSignedUrlWithProgress, type Design, type DesignWorkflowDetail, type UploadUrlResponse } from "../../../../../lib/api";

const ACCEPTED = ["image/png", "image/jpeg", "image/svg+xml"];
const MAX_BYTES = 50 * 1024 * 1024;
const COMPLEMENTARY_PLACEMENTS = ["BACK", "LEFT_CHEST", "RIGHT_CHEST", "LEFT_SLEEVE", "RIGHT_SLEEVE"] as const;

type Step = "form" | "pending_upload" | "uploading" | "verifying" | "ready" | "failed" | "success";

function uploadStepMessage(step: string, err: unknown): string {
  const detail = err instanceof Error ? err.message : "Upload failed";
  switch (step) {
    case "create-design":
      return `Could not create design record: ${detail}`;
    case "upload-url":
      return `Could not prepare upload: ${detail}`;
    case "storage-upload":
      return `Storage upload failed: ${detail}`;
    case "complete-upload":
      return `Upload verification failed: ${detail}`;
    case "create-version":
      return `Could not attach file to design: ${detail}`;
    default:
      return detail;
  }
}

export default function NewDesignPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("form");
  const [progress, setProgress] = useState("");
  const [uploadPercent, setUploadPercent] = useState(0);
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [submittingForReview, setSubmittingForReview] = useState(false);
  const [submittedForReview, setSubmittedForReview] = useState(false);
  const [storySubmittedForReview, setStorySubmittedForReview] = useState(false);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null);
  const [designDetail, setDesignDetail] = useState<DesignWorkflowDetail | null>(null);
  const [placementUploading, setPlacementUploading] = useState<string | null>(null);
  const [placementError, setPlacementError] = useState("");
  const placementInputRef = useRef<HTMLInputElement | null>(null);
  const placementTargetRef = useRef<string | null>(null);

  const localPreviewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const handleStoryStatusChange = useCallback((status: string | null) => {
    setStorySubmittedForReview(status === "PENDING_REVIEW" || status === "PUBLISHED");
  }, []);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  useEffect(() => {
    if (!createdId || step !== "success") return;
    void api.get<DesignWorkflowDetail>(`/designer/designs/${createdId}`)
      .then((detail) => {
        setDesignDetail(detail);
        setUploadedPreviewUrl(detail.previewImageUrl ?? null);
      })
      .catch(() => undefined);
  }, [createdId, step]);

  function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ACCEPTED.includes(f.type) && !f.name.match(/\.(png|jpe?g|svg)$/i)) {
      setError("Unsupported file type. Use PNG, JPEG, or SVG.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("File too large (max 50 MB).");
      return;
    }
    setError("");
    setFile(f);
    setStep("pending_upload");
    setProgress("Ready to upload. Submit when the title and file are correct.");
  }

  async function readImageDimensions(f: File): Promise<{ width: number; height: number } | null> {
    if (!f.type.startsWith("image/") && !f.name.match(/\.(png|jpe?g|webp)$/i)) return null;
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(f);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  }

  function choosePlacementArtwork(placement: string) {
    placementTargetRef.current = placement;
    placementInputRef.current?.click();
  }

  async function uploadPlacementArtwork(event: ChangeEvent<HTMLInputElement>) {
    const placement = placementTargetRef.current;
    const nextFile = event.target.files?.[0];
    event.target.value = "";
    if (!createdId || !placement || !nextFile) return;
    if (!ACCEPTED.includes(nextFile.type) && !nextFile.name.match(/\.(png|jpe?g|svg)$/i)) {
      setPlacementError("Unsupported file type. Use PNG, JPEG, or SVG.");
      return;
    }
    if (nextFile.size > MAX_BYTES) {
      setPlacementError("File too large (max 50 MB).");
      return;
    }

    setPlacementUploading(placement);
    setPlacementError("");
    try {
      const mimeType = resolveUploadMimeType(nextFile);
      const upload = await api.post<UploadUrlResponse>("/files/upload-url", {
        purpose: "DESIGN_ORIGINAL",
        filename: nextFile.name,
        mimeType,
        sizeBytes: nextFile.size,
        designId: createdId,
      });
      await uploadToSignedUrlWithProgress(upload.url, nextFile, mimeType, upload.headers, () => undefined);
      await api.post("/files/complete-upload", {
        fileId: upload.fileId,
        uploadedSizeBytes: nextFile.size,
        uploadedMimeType: mimeType,
      });
      const dimensions = await readImageDimensions(nextFile);
      await api.post(`/designs/${createdId}/versions`, {
        fileId: upload.fileId,
        widthPx: dimensions?.width ?? 0,
        heightPx: dimensions?.height ?? 0,
        dpi: 300,
        placement,
      });
      const detail = await api.get<DesignWorkflowDetail>(`/designer/designs/${createdId}`);
      setDesignDetail(detail);
      toast({ tone: "success", title: `${placementLabel(placement)} artwork added` });
    } catch (err) {
      const nextError = err instanceof Error ? err.message : "Placement artwork upload failed";
      setPlacementError(nextError);
      toast({ tone: "error", title: "Could not upload placement artwork", description: nextError });
    } finally {
      setPlacementUploading(null);
      placementTargetRef.current = null;
    }
  }

  async function submitForModeration() {
    if (!createdId) return;
    setSubmittingForReview(true);
    setError("");
    try {
      await api.post(`/designer/designs/${createdId}/submit-for-moderation`);
      setSubmittedForReview(true);
      toast({
        tone: "success",
        title: "Design sent for moderation",
        description: "The moderator can now review the artwork and its submitted story.",
      });
    } catch (err) {
      const nextError = err instanceof Error ? err.message : "Submit for moderation failed";
      setError(nextError);
      toast({ tone: "error", title: "Could not send design", description: nextError });
    } finally {
      setSubmittingForReview(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !file || !title.trim()) return;
    setError("");
    setStep("uploading");
    setUploadPercent(0);
    const mimeType = resolveUploadMimeType(file);

    let design: Design | null = null;
    try {
      setProgress("Creating design record…");
      design = await api.post<Design>("/designs", {
        title: title.trim(),
        description: description.trim() || undefined,
      });
    } catch (err) {
      setError(uploadStepMessage("create-design", err));
      setStep("failed");
      return;
    }

    let upload: UploadUrlResponse;
    try {
      setProgress("Preparing upload…");
      upload = await api.post<UploadUrlResponse>("/files/upload-url", {
        purpose: "DESIGN_ORIGINAL",
        filename: file.name,
        mimeType,
        sizeBytes: file.size,
        designId: design.id,
      });
    } catch (err) {
      setError(uploadStepMessage("upload-url", err));
      setStep("failed");
      return;
    }

    try {
      setProgress("Uploading file to storage…");
      await uploadToSignedUrlWithProgress(upload.url, file, mimeType, upload.headers, setUploadPercent);
    } catch (err) {
      setError(uploadStepMessage("storage-upload", err));
      setStep("failed");
      return;
    }

    try {
      setStep("verifying");
      setProgress("Finalising upload…");
      await api.post("/files/complete-upload", {
        fileId: upload.fileId,
        uploadedSizeBytes: file.size,
        uploadedMimeType: mimeType,
      });
    } catch (err) {
      setError(uploadStepMessage("complete-upload", err));
      setStep("failed");
      return;
    }

    try {
      setProgress("Creating version…");
      const dims = await readImageDimensions(file);
      await api.post(`/designs/${design.id}/versions`, {
        fileId: upload.fileId,
        widthPx: dims?.width ?? 0,
        heightPx: dims?.height ?? 0,
        dpi: 300,
        placement: "FRONT",
      });
    } catch (err) {
      setError(uploadStepMessage("create-version", err));
      setStep("failed");
      return;
    }

    setStep("ready");
    setProgress("Verified and ready for moderation.");
    setCreatedId(design.id);
    setStep("success");
    toast({
      tone: "success",
      title: "Design saved",
      description: "Add its story below, then send both items for moderation.",
    });
  }

  return (
    <DashboardLayout role="designer">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/dashboard/designer/designs" className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-ink">
          <ArrowLeft size={16} /> Back to designs
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-brand-ink mb-1">Upload Design</h1>
          <p className="text-brand-muted">PNG, JPEG, or SVG. Max 50 MB. Prefer transparent background and 300 DPI.</p>
        </div>

        {step === "success" && createdId ? (
          <div className="space-y-6">
            <Card>
              <ol className="grid gap-3 sm:grid-cols-3" aria-label="Design submission progress">
                <UploadProgressStep number={1} label="Design uploaded" complete />
                <UploadProgressStep number={2} label="Add story" complete={storySubmittedForReview} current={!storySubmittedForReview} />
                <UploadProgressStep number={3} label="Send for moderation" complete={submittedForReview} current={storySubmittedForReview && !submittedForReview} />
              </ol>
            </Card>
            <DesignPreviewCard
              title="Uploaded design"
              src={uploadedPreviewUrl ?? localPreviewUrl}
              alt={title || "Uploaded design"}
            />
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">Optional placement files</p>
                  <h2 className="mt-1 text-lg font-semibold text-brand-ink">Add complementary artwork</h2>
                  <p className="mt-1 max-w-xl text-sm text-brand-muted">Upload artwork that should differ from the main front design, such as a sleeve mark or back graphic. Each file stays linked to this design package.</p>
                </div>
                <span className="rounded-pill bg-brand-blueLight px-3 py-1 text-xs font-semibold text-brand-ink">Before moderation</span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {COMPLEMENTARY_PLACEMENTS.map((placement) => {
                  const uploaded = designDetail?.versions?.some((version) => version.placement === placement);
                  const loading = placementUploading === placement;
                  return (
                    <div key={placement} className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-brand-line bg-surface-card px-4 py-3">
                      <div>
                        <p className="font-semibold text-brand-ink">{placementLabel(placement)}</p>
                        <p className={`text-xs ${uploaded ? "text-semantic-successText" : "text-brand-muted"}`}>{uploaded ? "Artwork uploaded" : "Uses no artwork until added"}</p>
                      </div>
                      <Button variant="secondary" size="sm" loading={loading} disabled={Boolean(placementUploading) || submittedForReview} onClick={() => choosePlacementArtwork(placement)}>
                        <UploadIcon size={16} /> {uploaded ? "Replace" : "Upload"}
                      </Button>
                    </div>
                  );
                })}
              </div>
              <input ref={placementInputRef} type="file" className="hidden" accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml" onChange={(event) => void uploadPlacementArtwork(event)} />
              {placementError ? <div className="mt-4"><ErrorState title="Placement upload failed" description={placementError} /></div> : null}
              {submittedForReview ? <p className="mt-4 text-sm text-brand-muted">This package has already been sent for moderation.</p> : null}
            </Card>
            <DesignerDesignStoryPanel
              designId={createdId}
              designTitle={title}
              onStatusChange={handleStoryStatusChange}
              onReviewRequested={() => {
                setStorySubmittedForReview(true);
                setSubmittedForReview(true);
              }}
              reviewScope="design-and-story"
              submissionBlocked={Boolean(placementUploading)}
              submissionBlockReason="Wait for the complementary artwork upload to finish before sending this package for moderation."
            />
            <Card>
            <div className="flex flex-col items-center text-center py-6">
              <CheckCircle2 size={48} className="text-semantic-success mb-3" />
              <h2 className="text-xl font-semibold text-brand-ink mb-2">Complete your submission</h2>
              <p className="text-brand-muted mb-6">
                {submittedForReview ? (
                  <>Your design is now <strong>pending moderation</strong>. A submitted story will be reviewed alongside it.</>
                ) : (
                  <>The artwork is saved as a <strong>Draft</strong>. Finish the story above, then submit both items in one moderation request.</>
                )}
              </p>
              {error ? <div className="mb-4 w-full"><ErrorState title="Submit failed" description={error} /></div> : null}
              <div className="flex flex-wrap justify-center gap-3">
                {!submittedForReview ? (
                  <Button
                    variant="primaryBlue"
                    loading={submittingForReview}
                    disabled={!storySubmittedForReview}
                    onClick={() => void submitForModeration()}
                  >
                    <Send size={16} /> Retry design submission
                  </Button>
                ) : null}
                <Link href={`/dashboard/designer/designs/${createdId}`}>
                  <Button variant={submittedForReview ? "primaryBlue" : "secondary"}>Open design</Button>
                </Link>
                <Link href="/dashboard/designer/designs">
                  <Button variant="secondary">Back to list</Button>
                </Link>
              </div>
              {!submittedForReview && !storySubmittedForReview ? (
                <p className="mt-3 text-sm text-brand-muted">
                  Complete the story above to submit the design and story together.
                </p>
              ) : null}
            </div>
          </Card>
          </div>
        ) : (
          <Card>
            <form onSubmit={onSubmit} className="space-y-5">
              <FormField label="Title" required>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Tashkent Skyline"
                  required
                />
              </FormField>

              <FormField label="Description" helperText="Optional. Short context for the moderation team.">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notes about the artwork, inspiration, intended product fit…"
                />
              </FormField>

              <FormField label="Main front design" helperText="This is the primary artwork. You can add back, chest, and sleeve files immediately after it uploads." required>
                {localPreviewUrl ? (
                  <div className="mb-4">
                    <DesignPreviewCard title="Selected file" src={localPreviewUrl} alt={file?.name ?? "Selected design"} compact />
                  </div>
                ) : null}
                <label className="flex flex-col items-center justify-center gap-3 px-6 py-8 border-2 border-dashed border-surface-border rounded-2xl cursor-pointer hover:border-brand-blue transition-colors">
                  <FileImage size={36} className="text-brand-muted" />
                  <div className="text-sm text-brand-ink">
                    {file ? <strong>{file.name}</strong> : "Click to pick a file"}
                  </div>
                  {file && (
                    <div className="text-xs text-brand-muted">
                      {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type || resolveUploadMimeType(file)}
                    </div>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                    onChange={onPickFile}
                  />
                </label>
              </FormField>

              {error && (
                <ErrorState title="Upload failed" description={error} />
              )}

              {step !== "form" && step !== "success" && (
                <div className="rounded-2xl border border-brand-line bg-brand-bg p-4">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-brand-ink">{uploadLabel(step)}</span>
                    {step === "failed" ? <AlertCircle size={16} className="text-semantic-dangerText" /> : <span className="text-brand-muted">{step === "uploading" ? `${uploadPercent}%` : ""}</span>}
                  </div>
                  {step === "uploading" ? <div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-brand-blue transition-all" style={{ width: `${uploadPercent}%` }} /></div> : null}
                  {progress ? <p className="mt-2 text-sm text-brand-muted">{progress}</p> : null}
                </div>
              )}

              <Button type="submit" loading={step === "uploading" || step === "verifying"} disabled={!title.trim() || !file}>
                <UploadIcon size={18} /> Upload design
              </Button>
            </form>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function UploadProgressStep({ number, label, complete, current = false }: { number: number; label: string; complete: boolean; current?: boolean }) {
  return (
    <li
      className={`flex min-h-12 items-center gap-3 rounded-2xl border px-4 py-3 ${
        complete
          ? "border-semantic-success/25 bg-semantic-successBg"
          : current
            ? "border-brand-blue/30 bg-brand-blue/5"
            : "border-surface-borderSoft bg-white"
      }`}
      aria-current={current ? "step" : undefined}
    >
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${complete ? "bg-semantic-success text-white" : current ? "bg-brand-blue text-white" : "bg-surface-card text-brand-muted"}`}>
        {complete ? <CheckCircle2 size={18} aria-hidden="true" /> : number}
      </span>
      <span className="text-sm font-semibold text-brand-ink">{label}</span>
    </li>
  );
}

function uploadLabel(step: Step) {
  if (step === "pending_upload") return "Pending upload";
  if (step === "uploading") return "Uploading";
  if (step === "verifying") return "Verifying";
  if (step === "ready") return "Ready";
  if (step === "failed") return "Failed";
  return "Upload";
}

function placementLabel(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
