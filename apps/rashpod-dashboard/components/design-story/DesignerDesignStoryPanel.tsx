"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type RefObject } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  Skeleton,
  StatusBadge,
  Textarea,
} from "@rashpod/ui";
import {
  BookOpen,
  Check,
  Copy,
  ImagePlus,
  Languages,
  Link2,
  QrCode,
  RefreshCw,
  Send,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  ApiError,
  api,
  resolveUploadMimeType,
  uploadToSignedUrl,
  type DesignStoryDetail,
  type DesignerStoryResponse,
  type StoryLocale,
  type UploadUrlResponse,
} from "../../lib/api";
import {
  hasCompleteStoryTranslations,
  type StoryTranslationDrafts,
} from "./design-story-wizard";
import { useToast } from "../feedback/toast-provider";

type Props = {
  designId: string;
  designTitle: string;
  storySummary?: { status?: string | null } | null;
  onStatusChange?: (status: string | null) => void;
};

type WizardStep = 1 | 2 | 3 | 4;
type TranslationField = "title" | "body";
type TargetLocale = "ru" | "en";

const AUDIO_ACCEPT = ".mp3,.wav,.m4a,.ogg,.webm,audio/*";
const VIDEO_ACCEPT = ".mp4,.mov,.m4v,.webm,.ogv,video/*";
const EMPTY_TRANSLATIONS: StoryTranslationDrafts = {
  ru: { title: "", body: "" },
  en: { title: "", body: "" },
};
const STEPS: Array<{ step: WizardStep; label: string; hint: string }> = [
  { step: 1, label: "Write in Uzbek", hint: "Title, link and story" },
  { step: 2, label: "AI translation", hint: "Generate Russian and English" },
  { step: 3, label: "Review", hint: "Edit all AI drafts" },
  { step: 4, label: "Media & submit", hint: "Add media and request review" },
];

export function DesignerDesignStoryPanel({ designId, designTitle, onStatusChange }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [regeneratingQr, setRegeneratingQr] = useState(false);
  const [uploading, setUploading] = useState("");
  const [copyingUrl, setCopyingUrl] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [payload, setPayload] = useState<DesignerStoryResponse | null>(null);
  const [step, setStep] = useState<WizardStep>(1);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [body, setBody] = useState("");
  const [translations, setTranslations] = useState<StoryTranslationDrafts>(EMPTY_TRANSLATIONS);
  const [translationsStale, setTranslationsStale] = useState(false);
  const previousStepRef = useRef<WizardStep>(1);

  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const audioRefs = {
    uz: useRef<HTMLInputElement | null>(null),
    ru: useRef<HTMLInputElement | null>(null),
    en: useRef<HTMLInputElement | null>(null),
  };
  const videoRefs = {
    uz: useRef<HTMLInputElement | null>(null),
    ru: useRef<HTMLInputElement | null>(null),
    en: useRef<HTMLInputElement | null>(null),
  };

  const story = payload?.story ?? null;
  const hasBasics = title.trim().length > 0 && slug.trim().length > 0;
  const hasUzbekSource = hasBasics && body.trim().length > 0;
  const translationsComplete = hasCompleteStoryTranslations(translations);
  const readyForReview = translationsComplete && !translationsStale;
  const selectedPublicUrl = buildStoryUrl(slug, "uz");
  const publishDisabled = !readyForReview || !story || saving || requesting;

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designId]);

  useEffect(() => {
    if (!story) return;
    const nextTranslations = {
      ru: {
        title: story.titleTranslations?.ru ?? "",
        body: story.bodyTranslations?.ru ?? "",
      },
      en: {
        title: story.titleTranslations?.en ?? "",
        body: story.bodyTranslations?.en ?? "",
      },
    };
    setTitle(story.titleTranslations?.uz ?? story.title);
    setSlug(story.slug);
    setBody(story.bodyTranslations?.uz ?? story.bodyTranslations?.[story.sourceLocale] ?? "");
    setTranslations(nextTranslations);
    setTranslationsStale(
      hasCompleteStoryTranslations(nextTranslations) &&
        story.translationsCurrent === false,
    );
  }, [story?.id, story?.updatedAt]);

  useEffect(() => {
    onStatusChange?.(story?.status ?? null);
  }, [onStatusChange, story?.status]);

  useEffect(() => {
    if (previousStepRef.current === step) return;
    previousStepRef.current = step;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`story-step-${step}`)?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const next = await api.get<DesignerStoryResponse>(`/designer/designs/${designId}/story`);
      setPayload(next);
      if (!next.story) {
        setTitle("");
        setSlug("");
        setBody("");
        setTranslations(EMPTY_TRANSLATIONS);
        setTranslationsStale(false);
        setStep(1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load story");
    } finally {
      setLoading(false);
    }
  }

  function updateUzbekSource(field: TranslationField, value: string) {
    if (field === "title") setTitle(value);
    else setBody(value);
    if (translations.ru.title || translations.ru.body || translations.en.title || translations.en.body) {
      setTranslationsStale(true);
    }
  }

  function updateTranslation(locale: TargetLocale, field: TranslationField, value: string) {
    setTranslations((current) => ({
      ...current,
      [locale]: { ...current[locale], [field]: value },
    }));
  }

  async function persistDraft(nextTranslations: StoryTranslationDrafts = translations) {
    if (!hasBasics) throw new Error("Add the Uzbek title and story link before saving.");
    const saved = await api.post<DesignStoryDetail>(`/designer/designs/${designId}/story`, {
      title,
      slug,
      sourceLocale: "uz",
      source: { title, body },
      translations: {
        uz: { title, body },
        ru: nextTranslations.ru,
        en: nextTranslations.en,
      },
    });
    setPayload((current) => current ? { ...current, story: saved } : {
      designId,
      designTitle,
      designStatus: "DRAFT",
      story: saved,
      listings: [],
    });
    return saved;
  }

  async function saveDraft() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await persistDraft();
      setMessage("Story draft saved.");
      toast({ tone: "success", title: "Story draft saved" });
    } catch (err) {
      const nextError = err instanceof Error ? err.message : "Failed to save story";
      setError(nextError);
      toast({ tone: "error", title: "Could not save story", description: nextError });
    } finally {
      setSaving(false);
    }
  }

  async function generateTranslations() {
    if (!hasUzbekSource) {
      setError("Complete the Uzbek title, story link and story text before translating.");
      setStep(1);
      return;
    }

    setTranslating(true);
    setError("");
    setMessage("");
    const jobs: Array<{ locale: TargetLocale; field: TranslationField; text: string }> = [
      { locale: "ru", field: "title", text: title.trim() },
      { locale: "ru", field: "body", text: body.trim() },
      { locale: "en", field: "title", text: title.trim() },
      { locale: "en", field: "body", text: body.trim() },
    ];

    try {
      await persistDraft(EMPTY_TRANSLATIONS);
      setTranslations(EMPTY_TRANSLATIONS);
      setTranslationsStale(false);

      const results = await Promise.allSettled(
        jobs.map((job) =>
          api.post<{ translatedText: string }>("/ai/translate", {
            text: job.text,
            targetLanguage: job.locale,
            entityType: "DESIGN",
            entityId: designId,
          }),
        ),
      );

      const next: StoryTranslationDrafts = {
        ru: { title: "", body: "" },
        en: { title: "", body: "" },
      };
      const failures: string[] = [];
      results.forEach((result, index) => {
        const job = jobs[index];
        if (result.status === "fulfilled" && result.value.translatedText.trim()) {
          next[job.locale][job.field] = result.value.translatedText.trim();
        } else {
          failures.push(`${localeLabel(job.locale)} ${job.field}`);
        }
      });

      setTranslations(next);
      setTranslationsStale(false);
      await persistDraft(next);
      if (failures.length) {
        setError(`Some translations could not be generated: ${failures.join(", ")}. Retry or complete them manually.`);
        setStep(3);
      } else {
        setMessage("Russian and English AI drafts are ready. Review them before submitting.");
        setStep(3);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setTranslating(false);
    }
  }

  async function requestPublish() {
    if (!readyForReview) {
      setError("Review and complete both Russian and English translations before submitting.");
      setStep(3);
      return;
    }
    setRequesting(true);
    setError("");
    setMessage("");
    try {
      await persistDraft();
      const next = await api.post<DesignStoryDetail>(`/designer/designs/${designId}/story/request-publish`);
      setPayload((current) => current ? { ...current, story: next } : null);
      setMessage("Story submitted for approval. AI translations remain drafts until a human approves publication.");
      toast({
        tone: "success",
        title: "Story sent for approval",
        description: "A moderator will review all three language versions.",
      });
    } catch (err) {
      const nextError = err instanceof Error ? err.message : "Failed to request publish";
      setError(nextError);
      toast({ tone: "error", title: "Could not send story", description: nextError });
    } finally {
      setRequesting(false);
    }
  }

  async function regenerateQr() {
    setRegeneratingQr(true);
    setError("");
    try {
      if (!story && hasBasics) await persistDraft();
      const next = await api.post<DesignStoryDetail>(`/designer/designs/${designId}/story/regenerate-qr`);
      setPayload((current) => current ? { ...current, story: next } : null);
      setMessage("QR code regenerated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate QR");
    } finally {
      setRegeneratingQr(false);
    }
  }

  async function uploadMedia(kind: "cover" | "audio" | "video", file: File, locale?: StoryLocale) {
    const purpose = kind === "cover" ? "STORY_COVER_IMAGE" : kind === "audio" ? "STORY_AUDIO" : "STORY_VIDEO";
    const mimeType = resolveUploadMimeType(file);
    const upload = await api.post<UploadUrlResponse>("/files/upload-url", {
      purpose,
      filename: file.name,
      mimeType,
      sizeBytes: file.size,
      designId,
    });
    await uploadToSignedUrl(upload.url, file, mimeType, upload.headers);
    await api.post("/files/complete-upload", {
      fileId: upload.fileId,
      uploadedSizeBytes: file.size,
      uploadedMimeType: mimeType,
    });

    const bodyPayload =
      kind === "cover"
        ? { coverImageFileId: upload.fileId }
        : kind === "audio"
          ? { audioFileIds: { [locale!]: upload.fileId } }
          : { videoFileIds: { [locale!]: upload.fileId } };
    const updated = await api.post<DesignStoryDetail>(`/designer/designs/${designId}/story/media`, bodyPayload);
    setPayload((current) => current ? { ...current, story: updated } : null);
    setMessage(`${labelForKind(kind, locale)} uploaded.`);
  }

  async function handleFileInput(kind: "cover" | "audio" | "video", event: ChangeEvent<HTMLInputElement>, locale?: StoryLocale) {
    const file = event.target.files?.[0];
    if (!file) return;
    const uploadKey = `${kind}:${locale ?? "default"}`;
    setUploading(uploadKey);
    setError("");
    setMessage("");
    try {
      if (!story) await persistDraft();
      await uploadMedia(kind, file, locale);
    } catch (err) {
      const nextError = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Upload failed";
      setError(nextError);
    } finally {
      setUploading("");
      event.target.value = "";
    }
  }

  async function copyPublicUrl() {
    setCopyingUrl(true);
    setError("");
    try {
      await navigator.clipboard.writeText(selectedPublicUrl);
      setMessage("Public story URL copied.");
    } catch {
      setError("Could not copy the URL. Select and copy it manually.");
    } finally {
      setCopyingUrl(false);
    }
  }

  const localizedPreview = useMemo(
    () => [
      { locale: "uz" as const, title, body },
      { locale: "ru" as const, ...translations.ru },
      { locale: "en" as const, ...translations.en },
    ],
    [body, title, translations],
  );

  return (
    <Card>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">Story builder</p>
          <h2 className="mt-1 text-xl font-semibold text-brand-ink">Tell the story behind {designTitle}</h2>
          <p className="mt-1 max-w-2xl text-sm text-brand-muted">
            Write once in Uzbek, translate with AI, then review every language before requesting publication.
          </p>
        </div>
        {story ? <StatusBadge status={story.status} /> : null}
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : error && !payload ? (
        <ErrorState title="Could not load story" description={error} retry={<Button onClick={load}>Retry</Button>} />
      ) : (
        <div className="space-y-6">
          <WizardStepper
            step={step}
            canOpenStep2={hasUzbekSource}
            canOpenStep3={readyForReview}
            onStepChange={setStep}
          />

          <div aria-live="polite" aria-atomic="true">
            {error ? (
              <p role="alert" className="rounded-2xl border border-semantic-dangerBg bg-semantic-dangerBg px-4 py-3 text-sm text-semantic-dangerText">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="rounded-2xl border border-semantic-successBg bg-semantic-successBg px-4 py-3 text-sm text-semantic-successText">
                {message}
              </p>
            ) : null}
          </div>

          {step === 1 ? (
            <section aria-labelledby="story-step-1" className="space-y-5">
              <StepHeading
                id="story-step-1"
                eyebrow="Step 1 of 4"
                title="Write the original story in Uzbek"
                description="This is the source of truth. AI will translate it into Russian and English in the next step."
                icon={<BookOpen size={20} />}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Uzbek story title" required helperText="Keep it short and memorable.">
                  <Input
                    value={title}
                    onChange={(event) => updateUzbekSource("title", event.target.value)}
                    placeholder="Dizayn ortidagi hikoya"
                    maxLength={160}
                    required
                  />
                </FormField>
                <FormField label="Story link" required helperText={`Public URL: ${selectedPublicUrl}`}>
                  <Input
                    value={slug}
                    onChange={(event) => setSlug(event.target.value)}
                    placeholder="dizayn-ortidagi-hikoya"
                    maxLength={160}
                    required
                  />
                </FormField>
              </div>
              <FormField label="Uzbek story text" required helperText="Describe the idea, inspiration, process, and meaning behind the artwork.">
                <Textarea
                  value={body}
                  onChange={(event) => updateUzbekSource("body", event.target.value)}
                  placeholder="Ushbu dizaynning g‘oyasi..."
                  rows={12}
                  maxLength={20000}
                  required
                />
              </FormField>
              {translationsStale ? (
                <p className="rounded-2xl border border-semantic-warningBg bg-semantic-warningBg px-4 py-3 text-sm text-semantic-warningText">
                  The Uzbek source changed. Generate fresh translations before submitting.
                </p>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="secondary" onClick={saveDraft} loading={saving} disabled={!hasBasics}>
                  Save draft
                </Button>
                <Button onClick={() => setStep(2)} disabled={!hasUzbekSource}>
                  Continue to translation
                </Button>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section aria-labelledby="story-step-2" className="space-y-5">
              <StepHeading
                id="story-step-2"
                eyebrow="Step 2 of 4"
                title="Generate Russian and English drafts"
                description="AI translates the Uzbek title and story. Nothing is published automatically."
                icon={<Languages size={20} />}
              />
              <div className="rounded-2xl border border-brand-line bg-surface-card p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-muted">Uzbek source</p>
                <p className="mt-3 text-lg font-semibold text-brand-ink">{title}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-brand-muted">{body}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <TranslationStatusCard locale="ru" complete={Boolean(translations.ru.title && translations.ru.body)} />
                <TranslationStatusCard locale="en" complete={Boolean(translations.en.title && translations.en.body)} />
              </div>
              <div className="rounded-2xl border border-brand-blue/20 bg-brand-blueLight/30 p-4 text-sm text-brand-ink">
                <span className="font-semibold">AI draft — please review before publishing.</span>{" "}
                Names, cultural references, and the intended tone may need manual correction.
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={generateTranslations} loading={translating} disabled={!hasUzbekSource}>
                  <Sparkles size={16} />
                  {translationsComplete ? "Regenerate translations" : "Translate with AI"}
                </Button>
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section aria-labelledby="story-step-3" className="space-y-5">
              <StepHeading
                id="story-step-3"
                eyebrow="Step 3 of 4"
                title="Review and edit the AI drafts"
                description="Compare both translations with the Uzbek original. You remain responsible for the final wording."
                icon={<Check size={20} />}
              />
              {translationsStale ? (
                <p role="alert" className="rounded-2xl border border-semantic-warningBg bg-semantic-warningBg px-4 py-3 text-sm text-semantic-warningText">
                  These translations are older than the Uzbek source. Return to AI translation and regenerate them.
                </p>
              ) : null}
              <div className="grid gap-5 xl:grid-cols-2">
                {(["ru", "en"] as TargetLocale[]).map((locale) => (
                  <div key={locale} className="space-y-4 rounded-2xl border border-brand-line bg-white p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-brand-ink">{localeLabel(locale)}</p>
                        <p className="text-xs text-brand-muted">AI draft · editable</p>
                      </div>
                      <StatusBadge
                        status={translations[locale].title && translations[locale].body ? "ready_to_publish" : "needs_fix"}
                        label={translations[locale].title && translations[locale].body ? "Draft complete" : "Translation needed"}
                      />
                    </div>
                    <FormField label={`${localeLabel(locale)} title`} required>
                      <Input
                        value={translations[locale].title}
                        onChange={(event) => updateTranslation(locale, "title", event.target.value)}
                        maxLength={200}
                        required
                      />
                    </FormField>
                    <FormField label={`${localeLabel(locale)} story`} required>
                      <Textarea
                        value={translations[locale].body}
                        onChange={(event) => updateTranslation(locale, "body", event.target.value)}
                        rows={12}
                        maxLength={20000}
                        required
                      />
                    </FormField>
                  </div>
                ))}
              </div>
              <details className="rounded-2xl border border-brand-line bg-surface-card p-4">
                <summary className="cursor-pointer font-semibold text-brand-ink">Show Uzbek original</summary>
                <p className="mt-3 font-semibold text-brand-ink">{title}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-brand-muted">{body}</p>
              </details>
              <div className="flex flex-wrap justify-between gap-2">
                <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={saveDraft} loading={saving} disabled={!translationsComplete}>
                    Save review
                  </Button>
                  <Button onClick={() => setStep(4)} disabled={!readyForReview}>
                    Continue to media
                  </Button>
                </div>
              </div>
            </section>
          ) : null}

          {step === 4 ? (
            <section aria-labelledby="story-step-4" className="space-y-6">
              <StepHeading
                id="story-step-4"
                eyebrow="Step 4 of 4"
                title="Add media and submit for approval"
                description="Media is optional. Review the three-language summary, then request human approval."
                icon={<ImagePlus size={20} />}
              />

              <div className="grid gap-4 md:grid-cols-[1.3fr_.7fr]">
                <div className="rounded-2xl border border-brand-line bg-surface-card p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-muted">Public URL</p>
                  {story?.status === "PUBLISHED" ? (
                    <a
                      href={story.publicUrl ?? selectedPublicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex min-h-11 items-center break-all text-sm font-semibold text-brand-blue underline decoration-brand-blue/35 underline-offset-4 hover:text-brand-ink"
                    >
                      {story.publicUrl ?? selectedPublicUrl}
                    </a>
                  ) : (
                    <p className="mt-2 break-all text-sm text-brand-muted" aria-disabled="true">
                      {selectedPublicUrl}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={copyPublicUrl}
                      loading={copyingUrl}
                      disabled={!hasBasics}
                    >
                      <Copy size={16} />
                      Copy URL
                    </Button>
                    <Button variant="ghost" onClick={saveDraft} loading={saving} disabled={!hasBasics}>
                      <Link2 size={16} />
                      Save draft
                    </Button>
                  </div>
                </div>
                <div className="rounded-2xl border border-dashed border-brand-line bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-brand-ink">QR code</p>
                    <Button variant="ghost" size="sm" onClick={regenerateQr} loading={regeneratingQr} disabled={!hasBasics}>
                      <RefreshCw size={14} />
                      Refresh
                    </Button>
                  </div>
                  {story?.qrCodeImageUrl ? (
                    <img src={story.qrCodeImageUrl} alt={`QR code for ${story.title}`} className="mx-auto h-40 w-40 rounded-2xl border border-brand-line bg-white object-contain p-2" />
                  ) : (
                    <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-brand-line bg-surface-card px-4 text-center text-brand-muted">
                      <QrCode size={28} aria-hidden="true" />
                      <p className="text-xs">Save the story, then generate its QR code.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
                <div className="space-y-3 rounded-2xl border border-brand-line bg-surface-card p-4">
                  <p className="text-sm font-semibold text-brand-ink">Cover image</p>
                  {story?.coverImageUrl ? (
                    <img src={story.coverImageUrl} alt={`${story.title} cover`} className="h-44 w-full rounded-2xl object-cover" />
                  ) : (
                    <EmptyState title="No cover image yet" description="Upload one image for the story hero area." />
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => coverInputRef.current?.click()}
                    loading={uploading === "cover:default"}
                    disabled={Boolean(uploading)}
                  >
                    <Upload size={16} />
                    Upload cover
                  </Button>
                  <input ref={coverInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void handleFileInput("cover", event)} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <LocalizedUploadCard
                    label="Audio"
                    accept={AUDIO_ACCEPT}
                    story={story}
                    refs={audioRefs}
                    uploading={uploading}
                    onSelect={(locale, event) => void handleFileInput("audio", event, locale)}
                    type="audio"
                  />
                  <LocalizedUploadCard
                    label="Video"
                    accept={VIDEO_ACCEPT}
                    story={story}
                    refs={videoRefs}
                    uploading={uploading}
                    onSelect={(locale, event) => void handleFileInput("video", event, locale)}
                    type="video"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-brand-line bg-surface-card p-5">
                <div className="mb-4">
                  <h3 className="font-semibold text-brand-ink">Final language review</h3>
                  <p className="text-sm text-brand-muted">All three versions will be sent to a human moderator.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {localizedPreview.map((item) => (
                    <div key={item.locale} className="rounded-2xl border border-brand-line bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-muted">{localeLabel(item.locale)}</p>
                      <p className="mt-3 font-semibold text-brand-ink">{item.title || "Missing title"}</p>
                      <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-sm text-brand-muted">{item.body || "Missing story"}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap justify-between gap-2">
                <Button variant="ghost" onClick={() => setStep(3)}>Back</Button>
                <Button onClick={requestPublish} loading={requesting} disabled={publishDisabled}>
                  <Send size={16} />
                  Request human approval
                </Button>
              </div>
            </section>
          ) : null}

          <div className="border-t border-brand-line pt-5">
            <h3 className="mb-3 text-sm font-semibold text-brand-ink">Listings created from this design</h3>
            {(payload?.listings?.length ?? 0) === 0 ? (
              <EmptyState title="No listings yet" description="Listings linked to this design will appear here." />
            ) : (
              <div className="grid gap-3">
                {payload?.listings.map((listing) => (
                  <div key={listing.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-line bg-white px-4 py-3">
                    <div>
                      <p className="font-semibold text-brand-ink">{listing.title}</p>
                      <p className="text-sm text-brand-muted">{listing.slug}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={listing.status} />
                      {listing.publicUrl ? <Link href={listing.publicUrl} className="text-sm font-semibold text-brand-blue">View listing</Link> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function WizardStepper({
  step,
  canOpenStep2,
  canOpenStep3,
  onStepChange,
}: {
  step: WizardStep;
  canOpenStep2: boolean;
  canOpenStep3: boolean;
  onStepChange: (step: WizardStep) => void;
}) {
  return (
    <nav aria-label="Story creation progress">
      <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((item) => {
          const complete = item.step < step;
          const locked =
            (item.step === 2 && !canOpenStep2) ||
            (item.step >= 3 && !canOpenStep3);
          const active = item.step === step;
          return (
            <li key={item.step}>
              <button
                type="button"
                onClick={() => onStepChange(item.step)}
                disabled={locked}
                aria-current={active ? "step" : undefined}
                className={[
                  "flex min-h-14 w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors",
                  active
                    ? "border-brand-blue bg-brand-blueLight/35 text-brand-ink"
                    : complete
                      ? "border-semantic-successBg bg-semantic-successBg text-brand-ink"
                      : "border-brand-line bg-white text-brand-muted",
                  locked ? "cursor-not-allowed opacity-50" : "hover:border-brand-blue",
                ].join(" ")}
              >
                <span className={[
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold",
                  active ? "bg-brand-ink text-white" : complete ? "bg-semantic-success text-white" : "bg-surface-card text-brand-ink",
                ].join(" ")}>
                  {complete ? <Check size={15} aria-hidden="true" /> : item.step}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="block truncate text-xs opacity-75">{item.hint}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StepHeading({
  id,
  eyebrow,
  title,
  description,
  icon,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-blueLight text-brand-ink" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-muted">{eyebrow}</p>
        <h3
          id={id}
          tabIndex={-1}
          className="mt-1 text-lg font-semibold text-brand-ink outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
        >
          {title}
        </h3>
        <p className="mt-1 max-w-3xl text-sm text-brand-muted">{description}</p>
      </div>
    </div>
  );
}

function TranslationStatusCard({ locale, complete }: { locale: TargetLocale; complete: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-brand-line bg-white p-4">
      <span className={[
        "grid h-10 w-10 place-items-center rounded-full",
        complete ? "bg-semantic-successBg text-semantic-successText" : "bg-surface-card text-brand-muted",
      ].join(" ")}>
        {complete ? <Check size={18} aria-hidden="true" /> : <Languages size={18} aria-hidden="true" />}
      </span>
      <div>
        <p className="font-semibold text-brand-ink">{localeLabel(locale)}</p>
        <p className="text-xs text-brand-muted">{complete ? "Draft ready for review" : "Waiting for AI translation"}</p>
      </div>
    </div>
  );
}

function LocalizedUploadCard(props: {
  label: string;
  accept: string;
  story: DesignStoryDetail | null;
  refs: Record<StoryLocale, RefObject<HTMLInputElement | null>>;
  uploading: string;
  type: "audio" | "video";
  onSelect: (locale: StoryLocale, event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="rounded-2xl border border-brand-line bg-surface-card p-4">
      <p className="mb-3 text-sm font-semibold text-brand-ink">{props.label}</p>
      <div className="grid gap-3">
        {(["uz", "ru", "en"] as StoryLocale[]).map((locale) => {
          const attached = props.type === "audio" ? props.story?.audioFileIds?.[locale] : props.story?.videoFileIds?.[locale];
          return (
            <div key={locale} className="rounded-2xl border border-brand-line bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand-ink">{localeLabel(locale)}</p>
                  <p className="text-xs text-brand-muted">{attached ? "File attached" : "No file attached"}</p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => props.refs[locale].current?.click()}
                  loading={props.uploading === `${props.type}:${locale}`}
                  disabled={Boolean(props.uploading)}
                >
                  <Upload size={16} />
                  Upload
                </Button>
              </div>
              <input
                ref={props.refs[locale]}
                type="file"
                accept={props.accept}
                className="hidden"
                onChange={(event) => props.onSelect(locale, event)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildStoryUrl(slug: string, locale: StoryLocale) {
  const clean = slug.trim().replace(/^\//, "");
  if (!clean) return locale === "uz" ? "https://rashpod.uz/story/your-slug" : `https://rashpod.uz/${locale}/story/your-slug`;
  return locale === "uz" ? `https://rashpod.uz/story/${clean}` : `https://rashpod.uz/${locale}/story/${clean}`;
}

function localeLabel(locale: StoryLocale) {
  if (locale === "uz") return "Uzbek";
  if (locale === "ru") return "Russian";
  return "English";
}

function labelForKind(kind: "cover" | "audio" | "video", locale?: StoryLocale) {
  if (kind === "cover") return "Cover image";
  return `${localeLabel(locale ?? "uz")} ${kind}`;
}
