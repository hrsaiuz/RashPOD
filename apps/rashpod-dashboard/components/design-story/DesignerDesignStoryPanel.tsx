"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type RefObject } from "react";
import Link from "next/link";
import { Button, Card, EmptyState, ErrorState, Input, Skeleton, StatusBadge, Textarea } from "@rashpod/ui";
import { Copy, Link2, QrCode, RefreshCw, Send, Upload } from "lucide-react";
import { ApiError, api, resolveUploadMimeType, uploadToSignedUrl, type DesignStoryDetail, type DesignerStoryResponse, type StoryLocale, type UploadUrlResponse } from "../../lib/api";

type Props = {
  designId: string;
  designTitle: string;
  storySummary?: { status?: string | null } | null;
};

const AUDIO_ACCEPT = ".mp3,.wav,.m4a,.ogg,.webm,audio/*";
const VIDEO_ACCEPT = ".mp4,.mov,.m4v,.webm,.ogv,video/*";

export function DesignerDesignStoryPanel({ designId, designTitle }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [regeneratingQr, setRegeneratingQr] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [payload, setPayload] = useState<DesignerStoryResponse | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [sourceLocale, setSourceLocale] = useState<StoryLocale>("uz");
  const [body, setBody] = useState("");

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
  const canEditBody = title.trim().length > 0 && slug.trim().length > 0;
  const publishDisabled = !story || !body.trim() || saving || requesting;

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designId]);

  useEffect(() => {
    if (!story) return;
    setTitle(story.title);
    setSlug(story.slug);
    setSourceLocale(story.sourceLocale);
    setBody(story.bodyTranslations?.[story.sourceLocale] ?? "");
  }, [story]);

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
        setSourceLocale("uz");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load story");
    } finally {
      setLoading(false);
    }
  }

  async function saveDraft() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const saved = await api.post<DesignStoryDetail>(`/designer/designs/${designId}/story`, {
        title,
        slug,
        sourceLocale,
        source: { title, body },
      });
      setPayload((current) => current ? { ...current, story: saved } : null);
      setMessage("Story draft saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save story");
    } finally {
      setSaving(false);
    }
  }

  async function requestPublish() {
    setRequesting(true);
    setError("");
    setMessage("");
    try {
      await saveDraft();
      const next = await api.post<DesignStoryDetail>(`/designer/designs/${designId}/story/request-publish`);
      setPayload((current) => current ? { ...current, story: next } : null);
      setMessage("Story submitted for approval.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request publish");
    } finally {
      setRequesting(false);
    }
  }

  async function regenerateQr() {
    setRegeneratingQr(true);
    setError("");
    try {
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
    setError("");
    setMessage("");
    try {
      if (!story) await saveDraft();
      await uploadMedia(kind, file, locale);
    } catch (err) {
      const nextError = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Upload failed";
      setError(nextError);
    } finally {
      event.target.value = "";
    }
  }

  const localizedPreview = useMemo(() => {
    if (!story) return [];
    return (["uz", "ru", "en"] as StoryLocale[]).map((locale) => ({
      locale,
      title: story.titleTranslations?.[locale] ?? null,
      body: story.bodyTranslations?.[locale] ?? null,
      audioFileId: story.audioFileIds?.[locale] ?? null,
      videoFileId: story.videoFileIds?.[locale] ?? null,
    }));
  }, [story]);

  return (
    <Card>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-brand-ink">Design story</h2>
          <p className="mt-1 text-sm text-brand-muted">Create the public story, QR, and localized media for {designTitle}.</p>
        </div>
        {story ? <StatusBadge status={story.status} /> : null}
      </div>

      {loading ? <Skeleton className="h-64" /> : error && !payload ? <ErrorState title="Could not load story" description={error} retry={<Button onClick={load}>Retry</Button>} /> : (
        <div className="space-y-6">
          {error ? <p className="rounded-2xl border border-semantic-error/20 bg-semantic-error/5 px-4 py-3 text-sm text-semantic-error">{error}</p> : null}
          {message ? <p className="rounded-2xl border border-semantic-success/20 bg-semantic-success/5 px-4 py-3 text-sm text-semantic-success">{message}</p> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-brand-ink">
              Story title
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="The story behind this design" />
            </label>
            <label className="grid gap-2 text-sm text-brand-ink">
              Slug
              <Input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="story-behind-this-design" />
            </label>
          </div>

          <div className="grid gap-4 rounded-2xl border border-brand-line bg-surface-card p-4 md:grid-cols-[1.4fr_.8fr]">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-muted">Public URL</p>
                <p className="mt-2 break-all text-sm text-brand-ink">{story?.publicUrl ?? previewUrl(slug)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => void navigator.clipboard.writeText(story?.publicUrl ?? previewUrl(slug))} disabled={!canEditBody}>
                  <Copy size={16} />
                  Copy URL
                </Button>
                <Button variant="ghost" onClick={saveDraft} loading={saving} disabled={!title.trim() || !slug.trim()}>
                  <Link2 size={16} />
                  Save draft
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-brand-line bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-brand-ink">QR code</p>
                <Button variant="ghost" size="sm" onClick={regenerateQr} loading={regeneratingQr} disabled={!story}>
                  <RefreshCw size={14} />
                  Refresh
                </Button>
              </div>
              {story?.qrCodeImageUrl ? (
                <img src={story.qrCodeImageUrl} alt={`QR code for ${story.title}`} className="mx-auto h-40 w-40 rounded-2xl border border-brand-line bg-white object-contain p-2" />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-2xl border border-brand-line bg-surface-card text-brand-muted">
                  <QrCode size={28} />
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            <label className="grid gap-2 text-sm text-brand-ink">
              Source locale
              <select
                value={sourceLocale}
                onChange={(event) => setSourceLocale(event.target.value as StoryLocale)}
                className="h-11 rounded-2xl border border-brand-line bg-white px-3 text-sm text-brand-ink outline-none ring-0"
              >
                <option value="uz">Uzbek</option>
                <option value="ru">Russian</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-brand-ink">
              Story text
              <Textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={canEditBody ? "Write the story behind this design." : "Add a title and slug to unlock story text."}
                rows={10}
                disabled={!canEditBody}
              />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
            <div className="space-y-3 rounded-2xl border border-brand-line bg-surface-card p-4">
              <p className="text-sm font-semibold text-brand-ink">Cover image</p>
              {story?.coverImageUrl ? <img src={story.coverImageUrl} alt={`${story.title} cover`} className="h-44 w-full rounded-2xl object-cover" /> : <EmptyState title="No cover image yet" description="Upload one image for the story hero area." />}
              <Button variant="secondary" onClick={() => coverInputRef.current?.click()}>
                <Upload size={16} />
                Upload cover
              </Button>
              <input ref={coverInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void handleFileInput("cover", event)} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <LocalizedUploadCard label="Audio" accept={AUDIO_ACCEPT} story={story} refs={audioRefs} onSelect={(locale, event) => void handleFileInput("audio", event, locale)} type="audio" />
              <LocalizedUploadCard label="Video" accept={VIDEO_ACCEPT} story={story} refs={videoRefs} onSelect={(locale, event) => void handleFileInput("video", event, locale)} type="video" />
            </div>
          </div>

          {story ? (
            <div className="rounded-2xl border border-brand-line bg-surface-card p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-brand-ink">Localized content preview</h3>
                  <p className="text-xs text-brand-muted">AI translations are generated on publish request and can be reviewed before approval.</p>
                </div>
                <Button variant="primaryBlue" onClick={requestPublish} loading={requesting} disabled={publishDisabled}>
                  <Send size={16} />
                  Request publish
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {localizedPreview.map((item) => (
                  <div key={item.locale} className="rounded-2xl border border-brand-line bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-muted">{localeLabel(item.locale)}</p>
                    <p className="mt-3 font-semibold text-brand-ink">{item.title || "No title yet"}</p>
                    <p className="mt-2 line-clamp-6 text-sm text-brand-muted whitespace-pre-wrap">{item.body || "No body yet"}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-brand-muted">
                      <span>{item.audioFileId ? "Audio attached" : "No audio"}</span>
                      <span>{item.videoFileId ? "Video attached" : "No video"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div>
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

function LocalizedUploadCard(props: {
  label: string;
  accept: string;
  story: DesignStoryDetail | null;
  refs: Record<StoryLocale, RefObject<HTMLInputElement | null>>;
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
                <Button variant="secondary" onClick={() => props.refs[locale].current?.click()}>
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

function previewUrl(slug: string) {
  const clean = slug.trim().replace(/^\//, "");
  return clean ? `https://rashpod.uz/story/${clean}` : "https://rashpod.uz/story/your-slug";
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
