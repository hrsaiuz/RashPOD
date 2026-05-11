"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Card,
  ErrorState,
  FormField,
  Input,
  Textarea,
} from "@rashpod/ui";
import { ArrowLeft, Upload as UploadIcon, FileImage, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../../../auth/auth-provider";
import DashboardLayout from "../../../dashboard-layout";
import { api, uploadToSignedUrl, type Design, type UploadUrlResponse } from "../../../../../lib/api";

const ACCEPTED = ["image/png", "image/jpeg", "image/svg+xml", "application/postscript"];
const MAX_BYTES = 50 * 1024 * 1024;

type Step = "form" | "uploading" | "success";

export default function NewDesignPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("form");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);

  function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ACCEPTED.includes(f.type) && !f.name.match(/\.(ai|eps)$/i)) {
      setError("Unsupported file type. Use PNG, JPEG, SVG, AI, or EPS.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("File too large (max 50 MB).");
      return;
    }
    setError("");
    setFile(f);
  }

  async function readImageDimensions(f: File): Promise<{ width: number; height: number } | null> {
    if (!f.type.startsWith("image/")) return null;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(f);
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !file || !title.trim()) return;
    setError("");
    setStep("uploading");

    try {
      // 1. Create design (without file yet)
      setProgress("Creating design record…");
      const design = await api.post<Design>("/designs", {
        title: title.trim(),
        description: description.trim() || undefined,
      });

      // 2. Request signed upload URL
      setProgress("Preparing upload…");
      const upload = await api.post<UploadUrlResponse>("/files/upload-url", {
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });

      // 3. PUT file to GCS
      setProgress("Uploading file to storage…");
      await uploadToSignedUrl(upload.url, file, upload.headers);

      // 4. Mark file ready
      setProgress("Finalising upload…");
      await api.post("/files/complete-upload", {
        fileId: upload.fileId,
        uploadedSizeBytes: file.size,
        uploadedMimeType: file.type,
      });

      // 5. Create design version
      setProgress("Creating version…");
      const dims = await readImageDimensions(file);
      await api.post(`/designs/${design.id}/versions`, {
        fileId: upload.fileId,
        widthPx: dims?.width ?? 0,
        heightPx: dims?.height ?? 0,
        dpi: 300,
      });

      setCreatedId(design.id);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStep("form");
    }
  }

  return (
    <DashboardLayout role="designer">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/dashboard/designer/designs" className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-ink">
          <ArrowLeft size={16} /> Back to designs
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-brand-ink mb-1">Upload Design</h1>
          <p className="text-brand-muted">PNG, JPEG, SVG, AI, or EPS. Max 50 MB. Prefer transparent background and 300 DPI.</p>
        </div>

        {step === "success" && createdId ? (
          <Card>
            <div className="flex flex-col items-center text-center py-6">
              <CheckCircle2 size={48} className="text-semantic-success mb-3" />
              <h2 className="text-xl font-semibold text-brand-ink mb-2">Design uploaded</h2>
              <p className="text-brand-muted mb-6">
                It is now in <strong>Draft</strong>. Open it to submit for moderator review.
              </p>
              <div className="flex gap-3">
                <Link href={`/dashboard/designer/designs/${createdId}`}>
                  <Button variant="primaryBlue">Open design</Button>
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
                      {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type || "unknown"}
                    </div>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept=".png,.jpg,.jpeg,.svg,.ai,.eps,image/png,image/jpeg,image/svg+xml"
                    onChange={onPickFile}
                  />
                </label>
              </FormField>

              {error && (
                <ErrorState title="Upload failed" description={error} />
              )}

              {step === "uploading" && (
                <p className="text-sm text-brand-muted">{progress}</p>
              )}

              <Button type="submit" loading={step === "uploading"} disabled={!title.trim() || !file}>
                <UploadIcon size={18} /> Upload design
              </Button>
            </form>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

