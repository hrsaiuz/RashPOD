"use client";

import { ChangeEvent, FormEvent, useState } from "react";
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
import { api, resolveUploadMimeType, uploadToSignedUrlWithProgress, type Design, type UploadUrlResponse } from "../../../../../lib/api";

const ACCEPTED = ["image/png", "image/jpeg", "image/svg+xml"];
const MAX_BYTES = 50 * 1024 * 1024;

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
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(f);
    });
  }

  async function submitForModeration() {
    if (!createdId) return;
    setSubmittingForReview(true);
    setError("");
    try {
      await api.post(`/designer/designs/${createdId}/submit-for-moderation`);
      setSubmittedForReview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit for moderation failed");
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
          <Card>
            <div className="flex flex-col items-center text-center py-6">
              <CheckCircle2 size={48} className="text-semantic-success mb-3" />
              <h2 className="text-xl font-semibold text-brand-ink mb-2">Design uploaded</h2>
              <p className="text-brand-muted mb-6">
                {submittedForReview ? (
                  <>Your design is now <strong>pending moderation</strong>.</>
                ) : (
                  <>It is saved as <strong>Draft</strong>. Submit it for moderator review when ready.</>
                )}
              </p>
              {error ? <div className="mb-4 w-full"><ErrorState title="Submit failed" description={error} /></div> : null}
              <div className="flex flex-wrap justify-center gap-3">
                {!submittedForReview ? (
                  <Button variant="primaryBlue" loading={submittingForReview} onClick={() => void submitForModeration()}>
                    <Send size={16} /> Submit for moderation
                  </Button>
                ) : null}
                <Link href={`/dashboard/designer/designs/${createdId}`}>
                  <Button variant={submittedForReview ? "primaryBlue" : "secondary"}>Open design</Button>
                </Link>
                <Link href="/dashboard/designer/designs">
                  <Button variant="secondary">Back to list</Button>
                </Link>
              </div>
            </div>
          </Card>
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

              <FormField label="Design file" required>
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

function uploadLabel(step: Step) {
  if (step === "pending_upload") return "Pending upload";
  if (step === "uploading") return "Uploading";
  if (step === "verifying") return "Verifying";
  if (step === "ready") return "Ready";
  if (step === "failed") return "Failed";
  return "Upload";
}
