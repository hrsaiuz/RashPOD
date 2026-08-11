"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  ErrorState,
  FormField,
  Input,
  ProductPickerGrid,
  Select,
  Skeleton,
  Textarea,
} from "@rashpod/ui";
import { ArrowLeft, Upload as UploadIcon, FileImage, CheckCircle2, AlertCircle, Send, Shirt } from "lucide-react";
import { useAuth } from "../../../../auth/auth-provider";
import DashboardLayout from "../../../dashboard-layout";
import { DesignPreviewCard } from "../../../../../components/design/DesignPreviewCard";
import { DesignerDesignStoryPanel } from "../../../../../components/design-story/DesignerDesignStoryPanel";
import { useToast } from "../../../../../components/feedback/toast-provider";
import {
  api,
  resolveUploadMimeType,
  uploadToSignedUrlWithProgress,
  type Design,
  type DesignUploadBaseProductOption,
  type DesignUploadPlacementOption,
  type DesignUploadProductTypeOption,
  type DesignWorkflowDetail,
  type UploadUrlResponse,
} from "../../../../../lib/api";

const ACCEPTED = ["image/png", "image/jpeg", "image/svg+xml"];
const MAX_BYTES = 50 * 1024 * 1024;
type Step = "form" | "pending_upload" | "uploading" | "verifying" | "ready" | "failed" | "success";
type FormStep = 1 | 2 | 3;
type PlacementCode = DesignUploadPlacementOption["code"];

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
  const [formStep, setFormStep] = useState<FormStep>(1);
  const [uploadOptions, setUploadOptions] = useState<DesignUploadProductTypeOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [productTypeId, setProductTypeId] = useState("");
  const [requestedBaseProductId, setRequestedBaseProductId] = useState("");
  const [selectedPlacements, setSelectedPlacements] = useState<PlacementCode[]>([]);
  const [placementFiles, setPlacementFiles] = useState<Partial<Record<PlacementCode, File>>>({});
  const [uploadedPlacements, setUploadedPlacements] = useState<PlacementCode[]>([]);
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

  const selectedProductType = useMemo(() => uploadOptions.find((item) => item.id === productTypeId) ?? null, [productTypeId, uploadOptions]);
  const selectedBaseProduct = useMemo(
    () => selectedProductType?.baseProducts.find((item) => item.id === requestedBaseProductId) ?? null,
    [requestedBaseProductId, selectedProductType],
  );
  const selectedArtwork = useMemo(
    () => selectedPlacements.flatMap((placement) => {
      const artwork = placementFiles[placement];
      return artwork ? [{ placement, file: artwork }] : [];
    }),
    [placementFiles, selectedPlacements],
  );
  const primaryFile = selectedArtwork[0]?.file ?? null;
  const localPreviewUrl = useMemo(() => (primaryFile ? URL.createObjectURL(primaryFile) : null), [primaryFile]);
  const placementsReady = selectedPlacements.length > 0 && selectedPlacements.every((placement) => Boolean(placementFiles[placement]));
  const handleStoryStatusChange = useCallback((status: string | null) => {
    setStorySubmittedForReview(status === "PENDING_REVIEW" || status === "PUBLISHED");
  }, []);

  const loadUploadOptions = useCallback(async () => {
    setOptionsLoading(true);
    setOptionsError("");
    try {
      const options = await api.get<DesignUploadProductTypeOption[]>("/designer/designs/upload-options");
      setUploadOptions(options.filter((item) => item.baseProducts.length > 0));
    } catch (cause) {
      setOptionsError(cause instanceof Error ? cause.message : "Product options could not be loaded.");
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void loadUploadOptions();
  }, [loadUploadOptions, user]);

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

  function selectProductType(nextProductTypeId: string) {
    setProductTypeId(nextProductTypeId);
    setRequestedBaseProductId("");
    setSelectedPlacements([]);
    setPlacementFiles({});
    setError("");
  }

  function selectBaseProduct(baseProductId: string) {
    setRequestedBaseProductId(baseProductId);
    setSelectedPlacements([]);
    setPlacementFiles({});
    setError("");
  }

  function togglePlacement(placement: PlacementCode) {
    setSelectedPlacements((current) => current.includes(placement)
      ? current.filter((item) => item !== placement)
      : [...current, placement]);
    if (selectedPlacements.includes(placement)) {
      setPlacementFiles((current) => {
        const next = { ...current };
        delete next[placement];
        return next;
      });
    }
    setError("");
  }

  function onPickFile(placement: PlacementCode, event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    if (!ACCEPTED.includes(nextFile.type) && !nextFile.name.match(/\.(png|jpe?g|svg)$/i)) {
      setError("Unsupported file type. Use PNG, JPEG, or SVG.");
      event.target.value = "";
      return;
    }
    if (nextFile.size > MAX_BYTES) {
      setError("File too large (max 50 MB).");
      event.target.value = "";
      return;
    }
    setError("");
    setSelectedPlacements((current) => current.includes(placement) ? current : [...current, placement]);
    setPlacementFiles((current) => ({ ...current, [placement]: nextFile }));
    setStep("pending_upload");
    setProgress("Artwork is ready. Continue when every selected placement has a file.");
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
        ...(dimensions ? { widthPx: dimensions.width, heightPx: dimensions.height } : {}),
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
        description: storySubmittedForReview
          ? "The moderator can now review the artwork and its submitted story."
          : "The moderator can now review the artwork. You can add a story separately at any time.",
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
    if (!user || !requestedBaseProductId || !placementsReady || !title.trim()) return;
    setError("");
    setStep("uploading");
    setUploadPercent(0);

    let designId = createdId;
    if (!designId) {
      try {
        setProgress("Creating design record…");
        const design = await api.post<Design>("/designs", {
          title: title.trim(),
          description: description.trim() || undefined,
          requestedBaseProductId,
        });
        designId = design.id;
        setCreatedId(design.id);
      } catch (err) {
        setError(uploadStepMessage("create-design", err));
        setStep("failed");
        return;
      }
    }

    const pendingArtwork = selectedArtwork.filter((item) => !uploadedPlacements.includes(item.placement));
    for (const [pendingIndex, artwork] of pendingArtwork.entries()) {
      const mimeType = resolveUploadMimeType(artwork.file);
      const itemNumber = uploadedPlacements.length + pendingIndex + 1;
      const total = selectedArtwork.length;
      let upload: UploadUrlResponse;

      try {
        setProgress(`Preparing ${placementLabel(artwork.placement)} artwork (${itemNumber} of ${total})…`);
        upload = await api.post<UploadUrlResponse>("/files/upload-url", {
          purpose: "DESIGN_ORIGINAL",
          filename: artwork.file.name,
          mimeType,
          sizeBytes: artwork.file.size,
          designId,
        });
      } catch (err) {
        setError(`${placementLabel(artwork.placement)}: ${uploadStepMessage("upload-url", err)}`);
        setStep("failed");
        return;
      }

      try {
        setStep("uploading");
        setProgress(`Uploading ${placementLabel(artwork.placement)} artwork (${itemNumber} of ${total})…`);
        await uploadToSignedUrlWithProgress(upload.url, artwork.file, mimeType, upload.headers, (percent) => {
          setUploadPercent(Math.round(((itemNumber - 1 + percent / 100) / total) * 100));
        });
      } catch (err) {
        setError(`${placementLabel(artwork.placement)}: ${uploadStepMessage("storage-upload", err)}`);
        setStep("failed");
        return;
      }

      try {
        setStep("verifying");
        setProgress(`Verifying ${placementLabel(artwork.placement)} artwork (${itemNumber} of ${total})…`);
        await api.post("/files/complete-upload", {
          fileId: upload.fileId,
          uploadedSizeBytes: artwork.file.size,
          uploadedMimeType: mimeType,
        });
      } catch (err) {
        setError(`${placementLabel(artwork.placement)}: ${uploadStepMessage("complete-upload", err)}`);
        setStep("failed");
        return;
      }

      try {
        const dimensions = await readImageDimensions(artwork.file);
        await api.post(`/designs/${designId}/versions`, {
          fileId: upload.fileId,
          ...(dimensions ? { widthPx: dimensions.width, heightPx: dimensions.height } : {}),
          dpi: 300,
          placement: artwork.placement,
        });
        setUploadedPlacements((current) => current.includes(artwork.placement) ? current : [...current, artwork.placement]);
      } catch (err) {
        setError(`${placementLabel(artwork.placement)}: ${uploadStepMessage("create-version", err)}`);
        setStep("failed");
        return;
      }
    }

    setStep("ready");
    setProgress("Verified and ready for moderation.");
    setStep("success");
    toast({
      tone: "success",
      title: "Design saved",
      description: "Submit the artwork now, or optionally add its story first.",
    });
  }

  return (
    <DashboardLayout role="designer">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href="/dashboard/designer/designs" className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-ink">
          <ArrowLeft size={16} /> Back to designs
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-brand-ink mb-1">Upload Design</h1>
          <p className="text-brand-muted">Choose the product first, then upload artwork for every placement you want to offer.</p>
        </div>

        {step === "success" && createdId ? (
          <div className="space-y-6">
            <Card>
              <ol className="grid gap-3 sm:grid-cols-3" aria-label="Design submission progress">
                <UploadProgressStep number={1} label="Design uploaded" complete />
                <UploadProgressStep number={2} label="Story (optional)" complete={storySubmittedForReview} />
                <UploadProgressStep number={3} label="Send for moderation" complete={submittedForReview} current={!submittedForReview} />
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
                  <p className="mt-1 max-w-xl text-sm text-brand-muted">Your main placement is enough to submit. Optionally upload a sleeve mark, back graphic, or other artwork; each added file stays linked to this design package.</p>
                </div>
                <span className="rounded-pill bg-brand-blueLight px-3 py-1 text-xs font-semibold text-brand-ink">Before moderation</span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {(selectedBaseProduct?.placements ?? []).map((placement) => {
                  const uploaded = designDetail?.versions?.some((version) => version.placement === placement.code);
                  const loading = placementUploading === placement.code;
                  return (
                    <div key={placement.code} className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-brand-line bg-surface-card px-4 py-3">
                      <div>
                        <p className="font-semibold text-brand-ink">{placement.name || placementLabel(placement.code)}</p>
                        <p className={`text-xs ${uploaded ? "text-semantic-successText" : "text-brand-muted"}`}>{uploaded ? "Artwork uploaded" : "Uses no artwork until added"}</p>
                      </div>
                      <Button variant="secondary" size="sm" loading={loading} disabled={Boolean(placementUploading) || submittedForReview} onClick={() => choosePlacementArtwork(placement.code)}>
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
            <Card>
              <div className="flex flex-col items-center py-6 text-center">
                <CheckCircle2 size={48} className="mb-3 text-semantic-success" />
                <h2 className="mb-2 text-xl font-semibold text-brand-ink">Submit your design</h2>
                <p className="mb-6 max-w-xl text-brand-muted">
                  {submittedForReview ? (
                    <>Your design is now <strong>pending moderation</strong>. A submitted story will be reviewed alongside it.</>
                  ) : (
                    <>Your artwork is ready. The story is <strong>optional</strong>—submit the design now or add a story below first.</>
                  )}
                </p>
                {error ? <div className="mb-4 w-full"><ErrorState title="Submit failed" description={error} /></div> : null}
                <div className="flex flex-wrap justify-center gap-3">
                  {!submittedForReview ? (
                    <Button
                      variant="primaryBlue"
                      loading={submittingForReview}
                      disabled={Boolean(placementUploading)}
                      onClick={() => void submitForModeration()}
                    >
                      <Send size={16} /> Submit design for moderation
                    </Button>
                  ) : null}
                  <Link href={`/dashboard/designer/designs/${createdId}`}>
                    <Button variant={submittedForReview ? "primaryBlue" : "secondary"}>Open design</Button>
                  </Link>
                  <Link href="/dashboard/designer/designs">
                    <Button variant="secondary">Back to list</Button>
                  </Link>
                </div>
                {!submittedForReview && placementUploading ? (
                  <p className="mt-3 text-sm text-brand-muted">Wait for the complementary artwork upload to finish before submitting.</p>
                ) : null}
              </div>
            </Card>
            <DesignerDesignStoryPanel
              designId={createdId}
              designTitle={title}
              onStatusChange={handleStoryStatusChange}
              onReviewRequested={() => {
                setStorySubmittedForReview(true);
                setSubmittedForReview(true);
              }}
              reviewScope="story"
              submissionBlocked={Boolean(placementUploading)}
              submissionBlockReason="Wait for the complementary artwork upload to finish before sending this package for moderation."
            />
          </div>
        ) : (
          <Card>
            <ol className="mb-7 grid gap-3 sm:grid-cols-3" aria-label="Design upload steps">
              <UploadProgressStep number={1} label="Choose product" complete={formStep > 1} current={formStep === 1} />
              <UploadProgressStep number={2} label="Add placements" complete={formStep > 2} current={formStep === 2} />
              <UploadProgressStep number={3} label="Review & upload" complete={false} current={formStep === 3} />
            </ol>

            <form onSubmit={onSubmit} className="space-y-6">
              {formStep === 1 ? (
                <section aria-labelledby="upload-product-step" className="space-y-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">Step 1</p>
                    <h2 id="upload-product-step" className="mt-1 text-xl font-semibold text-brand-ink">What product is this design for?</h2>
                    <p className="mt-1 text-sm text-brand-muted">Your base product controls the available print placements and gives the moderator the right starting point.</p>
                  </div>

                  {optionsLoading ? <Skeleton className="h-52" /> : null}
                  {optionsError ? (
                    <div className="space-y-3">
                      <ErrorState title="Product options unavailable" description={optionsError} />
                      <Button type="button" variant="secondary" onClick={() => void loadUploadOptions()}>Try again</Button>
                    </div>
                  ) : null}
                  {!optionsLoading && !optionsError ? (
                    <>
                      <FormField label="Product type" helperText="Choose a category before selecting its base product." required>
                        <Select value={productTypeId} onChange={(event) => selectProductType(event.target.value)}>
                          <option value="">Select product type</option>
                          {uploadOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </Select>
                      </FormField>

                      {selectedProductType ? (
                        <div>
                          <p className="mb-3 text-sm font-medium text-brand-ink">Base product</p>
                          <ProductPickerGrid
                            items={selectedProductType.baseProducts.map((item) => ({
                              id: item.id,
                              name: item.name,
                              imageUrl: item.imageUrl,
                              subtitle: item.placements.length ? `${item.placements.length} placement${item.placements.length === 1 ? "" : "s"}` : "Placement setup incomplete",
                              badge: selectedProductType.name,
                              disabled: item.placements.length === 0,
                            }))}
                            selectedId={requestedBaseProductId}
                            onSelect={selectBaseProduct}
                            emptyLabel="No active base products are configured for this product type."
                          />
                        </div>
                      ) : null}

                      {selectedBaseProduct ? (
                        <div className="flex items-start gap-3 rounded-2xl border border-brand-blue/25 bg-brand-blue/5 p-4">
                          <Shirt className="mt-0.5 shrink-0 text-brand-blue" size={20} aria-hidden="true" />
                          <div>
                            <p className="font-semibold text-brand-ink">{selectedBaseProduct.name}</p>
                            <p className="mt-1 text-sm text-brand-muted">Available placements: {selectedBaseProduct.placements.map((item) => item.name || placementLabel(item.code)).join(", ")}.</p>
                          </div>
                        </div>
                      ) : null}

                      <div className="flex justify-end">
                        <Button type="button" disabled={!selectedBaseProduct || selectedBaseProduct.placements.length === 0} onClick={() => setFormStep(2)}>
                          Continue to placements
                        </Button>
                      </div>
                    </>
                  ) : null}
                </section>
              ) : null}

              {formStep === 2 ? (
                <section aria-labelledby="upload-placement-step" className="space-y-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">Step 2</p>
                    <h2 id="upload-placement-step" className="mt-1 text-xl font-semibold text-brand-ink">Choose one or more placements</h2>
                    <p className="mt-1 text-sm text-brand-muted">Upload a separate artwork file for each placement you select. PNG, JPEG, or SVG; maximum 50 MB per file.</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {(selectedBaseProduct?.placements ?? []).map((placement) => {
                      const selected = selectedPlacements.includes(placement.code);
                      const artwork = placementFiles[placement.code];
                      return (
                        <div key={placement.code} className={`rounded-2xl border p-4 transition ${selected ? "border-brand-blue bg-brand-blue/5 ring-2 ring-brand-blue/15" : "border-surface-borderSoft bg-white"}`}>
                          <label className="flex cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4 accent-brand-blue"
                              checked={selected}
                              onChange={() => togglePlacement(placement.code)}
                            />
                            <span>
                              <span className="block font-semibold text-brand-ink">{placement.name || placementLabel(placement.code)}</span>
                              <span className="mt-1 block text-xs text-brand-muted">Configured print area for {selectedBaseProduct?.name}.</span>
                            </span>
                          </label>
                          {selected ? (
                            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-surface-border px-4 py-5 text-center transition hover:border-brand-blue">
                              <FileImage size={28} className="text-brand-muted" aria-hidden="true" />
                              <span className="text-sm font-semibold text-brand-ink">{artwork ? artwork.name : "Choose artwork file"}</span>
                              {artwork ? <span className="text-xs text-brand-muted">{(artwork.size / 1024 / 1024).toFixed(2)} MB · Click to replace</span> : <span className="text-xs text-brand-muted">Required for this placement</span>}
                              <input
                                type="file"
                                className="sr-only"
                                accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                                onChange={(event) => onPickFile(placement.code, event)}
                              />
                            </label>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  {error ? <ErrorState title="Artwork file not accepted" description={error} /> : null}
                  <div className="flex flex-wrap justify-between gap-3">
                    <Button type="button" variant="secondary" onClick={() => setFormStep(1)}>Back</Button>
                    <Button type="button" disabled={!placementsReady} onClick={() => setFormStep(3)}>Review design</Button>
                  </div>
                </section>
              ) : null}

              {formStep === 3 ? (
                <section aria-labelledby="upload-review-step" className="space-y-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">Step 3</p>
                    <h2 id="upload-review-step" className="mt-1 text-xl font-semibold text-brand-ink">Review and upload</h2>
                    <p className="mt-1 text-sm text-brand-muted">Confirm the design details and placement files before creating the draft.</p>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.72fr)]">
                    <div className="space-y-5">
                      <FormField label="Title" required>
                        <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Tashkent Skyline" required />
                      </FormField>
                      <FormField label="Description" helperText="Optional. Short context for the moderation team.">
                        <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Notes about the artwork, inspiration, intended product fit…" />
                      </FormField>
                      <div className="rounded-2xl border border-surface-borderSoft bg-brand-bg/50 p-4 text-sm">
                        <p className="font-semibold text-brand-ink">{selectedProductType?.name} · {selectedBaseProduct?.name}</p>
                        <ul className="mt-3 space-y-2 text-brand-muted">
                          {selectedArtwork.map((artwork) => (
                            <li key={artwork.placement} className="flex items-center justify-between gap-3">
                              <span>{placementLabel(artwork.placement)}</span>
                              <span className="max-w-[60%] truncate font-medium text-brand-ink">{artwork.file.name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    {localPreviewUrl ? <DesignPreviewCard title="First placement preview" src={localPreviewUrl} alt={primaryFile?.name ?? "Selected design"} compact /> : null}
                  </div>

                  {error ? <ErrorState title="Upload failed" description={error} /> : null}
                  {step !== "form" && step !== "success" ? (
                    <div className="rounded-2xl border border-brand-line bg-brand-bg p-4" role="status">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-brand-ink">{uploadLabel(step)}</span>
                        {step === "failed" ? <AlertCircle size={16} className="text-semantic-dangerText" /> : <span className="text-brand-muted">{uploadPercent}%</span>}
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-brand-blue transition-all" style={{ width: `${uploadPercent}%` }} /></div>
                      {progress ? <p className="mt-2 text-sm text-brand-muted">{progress}</p> : null}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap justify-between gap-3">
                    <Button type="button" variant="secondary" disabled={Boolean(createdId)} onClick={() => setFormStep(2)}>Back</Button>
                    <Button type="submit" loading={step === "uploading" || step === "verifying"} disabled={!title.trim() || !requestedBaseProductId || !placementsReady}>
                      <UploadIcon size={18} /> {step === "failed" && createdId ? "Retry remaining artwork" : `Upload ${selectedArtwork.length} placement${selectedArtwork.length === 1 ? "" : "s"}`}
                    </Button>
                  </div>
                </section>
              ) : null}
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
