"use client";

import { useEffect, useState } from "react";
import { Button, Card, EmptyState, ErrorState, Skeleton, StatusBadge, Textarea } from "@rashpod/ui";
import { Globe2, Languages, QrCode } from "lucide-react";
import { api, type DesignStatus, type StoryLocale, type StoryReviewResponse } from "../../lib/api";
import { ModeratorActionDialog } from "../moderator/ModeratorActionDialog";
import { useToast } from "../feedback/toast-provider";
import { isDesignApprovedForStoryPublication } from "./design-story-publication";

export function ModeratorDesignStoryReview({
  designId,
  designStatus,
}: {
  designId: string;
  designStatus: DesignStatus;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"" | "approve" | "reject" | "unpublish">("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [pendingAction, setPendingAction] = useState<"" | "approve" | "reject" | "unpublish">("");
  const [payload, setPayload] = useState<StoryReviewResponse | null>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designId, designStatus]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const next = await api.get<StoryReviewResponse>(`/admin/designs/${designId}/story-review`);
      setPayload(next);
      setNotes(next.story?.reviewNotes ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load story review");
    } finally {
      setLoading(false);
    }
  }

  async function runAction(kind: "approve" | "reject" | "unpublish") {
    setSaving(kind);
    setError("");
    setMessage("");
    try {
      const path = kind === "approve" ? "story-approve" : kind === "reject" ? "story-reject" : "story-unpublish";
      await api.post(`/admin/designs/${designId}/${path}`, kind === "reject" ? { notes } : undefined);
      await load();
      setMessage(kind === "approve" ? "Story published." : kind === "reject" ? "Story returned for changes." : "Story unpublished.");
      toast({
        tone: "success",
        title: kind === "approve" ? "Story published" : kind === "reject" ? "Story returned for changes" : "Story unpublished",
        description: kind === "approve" ? "The public story link is now active." : undefined,
      });
      return true;
    } catch (err) {
      const nextError = err instanceof Error ? err.message : "Action failed";
      setError(nextError);
      toast({ tone: "error", title: "Story action failed", description: nextError });
      return false;
    } finally {
      setSaving("");
    }
  }

  const story = payload?.story ?? null;
  const canReview = story?.status === "PENDING_REVIEW";
  const canUnpublish = story?.status === "PUBLISHED";
  const designApproved = isDesignApprovedForStoryPublication(designStatus);
  const incompleteLocales = story
    ? (["uz", "ru", "en"] as StoryLocale[]).filter(
        (locale) => !story.titleTranslations?.[locale]?.trim() || !story.bodyTranslations?.[locale]?.trim(),
      )
    : [];
  const canApprove = canReview && designApproved && story?.translationsCurrent !== false && incompleteLocales.length === 0;

  return (
    <Card>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-brand-ink">Story Review</h2>
          <p className="mt-1 text-sm text-brand-muted">Review the public story, QR, and localized media attached to this design.</p>
        </div>
        {story ? <StatusBadge status={story.status} /> : null}
      </div>

      {loading ? <Skeleton className="h-72" /> : error && !payload ? <ErrorState title="Could not load story review" description={error} retry={<Button onClick={load}>Retry</Button>} /> : !story ? <EmptyState title="No story draft yet" description="The designer has not created a story for this design." /> : (
        <div className="space-y-5">
          {error ? <p role="alert" className="rounded-2xl border border-semantic-error/20 bg-semantic-error/5 px-4 py-3 text-sm text-semantic-error">{error}</p> : null}
          {message ? <p aria-live="polite" className="rounded-2xl border border-semantic-success/20 bg-semantic-success/5 px-4 py-3 text-sm text-semantic-success">{message}</p> : null}

          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <div className="rounded-2xl border border-brand-line bg-surface-card p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-muted">
                <Globe2 size={14} />
                <span>Public URL</span>
              </div>
              {story.status === "PUBLISHED" ? (
                <a
                  href={story.publicUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex min-h-11 items-center break-all text-sm font-semibold text-brand-blue underline decoration-brand-blue/35 underline-offset-4"
                >
                  {story.publicUrl}
                </a>
              ) : (
                <p className="mt-3 break-all text-sm text-brand-muted" aria-disabled="true">{story.publicUrl}</p>
              )}
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {story.coverImageUrl ? <img src={story.coverImageUrl} alt={`${story.title} cover`} className="h-56 w-full rounded-2xl object-cover" /> : <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-brand-line bg-white text-brand-muted">No cover image</div>}
                {story.qrCodeImageUrl ? <img src={story.qrCodeImageUrl} alt={`QR for ${story.title}`} className="h-56 w-full rounded-2xl border border-brand-line bg-white object-contain p-4" /> : <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-brand-line bg-white text-brand-muted"><QrCode size={24} /></div>}
              </div>
            </div>

            <div className="rounded-2xl border border-brand-line bg-surface-card p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-muted">
                <Languages size={14} />
                <span>Publish controls</span>
              </div>
              {canReview ? (
                <>
                  {!canApprove ? (
                    <p role="alert" className="mb-4 rounded-xl border border-semantic-warning/25 bg-semantic-warning/5 px-3 py-3 text-sm text-semantic-warningText">
                      {!designApproved
                        ? "Approve the design first. Story publication becomes available immediately afterward."
                        : incompleteLocales.length
                        ? `Cannot publish: ${incompleteLocales.map(localeLabel).join(", ")} content is incomplete.`
                        : "Cannot publish: translations no longer match the current Uzbek source."}
                    </p>
                  ) : null}
                  <label htmlFor="story-review-notes" className="block text-sm font-medium text-brand-ink">Reviewer notes</label>
                  <Textarea id="story-review-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Explain what the designer should change." rows={6} className="mt-2" />
                  <p className="mt-2 text-xs text-brand-muted">Notes are required when returning a story for changes.</p>
                  <div className="mt-4 grid gap-2">
                    <Button variant="primaryBlue" onClick={() => setPendingAction("approve")} disabled={!canApprove}>Approve and publish</Button>
                    <Button variant="secondary" onClick={() => setPendingAction("reject")} disabled={!notes.trim()}>Return for changes</Button>
                  </div>
                </>
              ) : canUnpublish ? (
                <Button variant="danger" className="w-full" onClick={() => setPendingAction("unpublish")}>Unpublish story</Button>
              ) : (
                <p className="rounded-xl bg-surface-app px-3 py-3 text-sm leading-6 text-brand-muted">
                  {story.status === "NEEDS_CHANGES"
                    ? "Waiting for the designer to revise and resubmit this story."
                    : story.status === "UNPUBLISHED"
                      ? "This story is offline. The designer must submit it for review before it can be published again."
                      : "The designer has not submitted this draft for review yet."}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {(["uz", "ru", "en"] as StoryLocale[]).map((locale) => (
              <div key={locale} className="rounded-2xl border border-brand-line bg-surface-card p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-muted">{localeLabel(locale)}</p>
                <p className="mt-3 font-semibold text-brand-ink">{story.titleTranslations?.[locale] ?? "No title"}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-brand-muted">{story.bodyTranslations?.[locale] ?? "No body"}</p>
                <div className="mt-4 space-y-3">
                  {story.audioUrls?.[locale] ? <audio controls className="w-full" src={story.audioUrls[locale] ?? undefined} /> : <p className="text-xs text-brand-muted">No audio</p>}
                  {story.videoUrls?.[locale] ? <video controls className="aspect-video w-full rounded-xl bg-black" src={story.videoUrls[locale] ?? undefined} /> : <p className="text-xs text-brand-muted">No video</p>}
                </div>
              </div>
            ))}
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-brand-ink">Listings from this design</h3>
            {(payload?.listings.length ?? 0) === 0 ? <EmptyState title="No linked listings yet" description="Published storefront story pages will show listings from this design here." /> : (
              <div className="grid gap-3">
                {payload?.listings.map((listing) => (
                  <div key={listing.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-line bg-white px-4 py-3">
                    <div>
                      <p className="font-semibold text-brand-ink">{listing.title}</p>
                      <p className="text-sm text-brand-muted">{listing.slug}</p>
                    </div>
                    <StatusBadge status={listing.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <ModeratorActionDialog
        open={pendingAction !== ""}
        title={storyActionTitle(pendingAction)}
        description={storyActionDescription(pendingAction)}
        confirmLabel={pendingAction === "approve" ? "Publish story" : pendingAction === "reject" ? "Return for changes" : "Unpublish story"}
        destructive={pendingAction !== "approve"}
        busy={saving !== ""}
        onCancel={() => setPendingAction("")}
        onConfirm={async () => {
          const action = pendingAction;
          if (!action) return;
          if (await runAction(action)) setPendingAction("");
        }}
      />
    </Card>
  );
}

function localeLabel(locale: StoryLocale) {
  if (locale === "uz") return "Uzbek";
  if (locale === "ru") return "Russian";
  return "English";
}

function storyActionTitle(action: "" | "approve" | "reject" | "unpublish") {
  if (action === "approve") return "Publish this story?";
  if (action === "reject") return "Return this story for changes?";
  return "Unpublish this story?";
}

function storyActionDescription(action: "" | "approve" | "reject" | "unpublish") {
  if (action === "approve") return "The story will become publicly visible immediately. Confirm that all three language versions and media are ready.";
  if (action === "reject") return "The designer will need to address the reviewer notes and submit the story again.";
  return "The public story page will go offline until the designer submits it for review and a moderator approves it again.";
}
