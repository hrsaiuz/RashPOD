"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Bookmark, BookOpen, ChevronDown, Headphones, Heart, Pause, Play, Share2, Video } from "lucide-react";
import { ProductCard } from "../../../../components/ProductCard";
import { api, ApiError } from "../../../../lib/api";
import type { PublicDesignStory } from "../../../../lib/catalog";

type Engagement = { storyId: string; liked: boolean; bookmarked: boolean };

export function StoryExperience({ story, locale }: { story: PublicDesignStory; locale: string }) {
  const t = useTranslations("storyPage");
  const [coverFailed, setCoverFailed] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);
  const [expanded, setExpanded] = useState(story.body.length < 760);
  const [engagement, setEngagement] = useState<Engagement>({ storyId: story.id, liked: false, bookmarked: false });
  const [engagementBusy, setEngagementBusy] = useState<"liked" | "bookmarked" | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [engagementLoading, setEngagementLoading] = useState(true);
  const [shareMessage, setShareMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" });
        const session = (await response.json()) as { user?: unknown };
        if (!session.user || cancelled) return;
        setAuthenticated(true);
        const current = await api.get<Engagement>(`/customer/stories/${story.id}/engagement`);
        if (!cancelled) {
          setEngagement(current);
        }
      } catch {
        if (!cancelled) setAuthenticated(false);
      } finally {
        if (!cancelled) setEngagementLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [story.id]);

  async function toggle(field: "liked" | "bookmarked") {
    if (engagementBusy) return;
    if (!authenticated) {
      const next = `/${locale}/story/${story.slug}`;
      window.location.assign(`/${locale}/auth/login?next=${encodeURIComponent(next)}`);
      return;
    }
    const previous = engagement;
    const updated = { ...previous, [field]: !previous[field] };
    setEngagement(updated);
    setEngagementBusy(field);
    try {
      setEngagement(await api.put<Engagement>(`/customer/stories/${story.id}/engagement`, {
        liked: updated.liked,
        bookmarked: updated.bookmarked,
      }));
    } catch (error) {
      setEngagement(previous);
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        const next = `/${locale}/story/${story.slug}`;
        window.location.assign(`/${locale}/auth/login?next=${encodeURIComponent(next)}`);
      }
    } finally {
      setEngagementBusy(null);
    }
  }

  async function share() {
    const url = story.publicUrl || window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: story.title, url });
      else await navigator.clipboard.writeText(url);
      setShareMessage(t("shareSuccess"));
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") setShareMessage(t("shareError"));
    }
  }

  const chips = useMemo(() => [
    { label: t("chipStory"), visible: true, className: "bg-brand-blue-light/55 text-brand-blue" },
    { label: t("chipAudio"), visible: Boolean(story.audioUrl), className: "bg-semantic-success/10 text-semantic-success" },
    { label: t("chipVideo"), visible: Boolean(story.videoUrl), className: "bg-brand-peach-light/60 text-brand-peach" },
    { label: t("chipProducts"), visible: story.listings.length > 0, className: "bg-surface-muted text-brand-ink" },
  ].filter((chip) => chip.visible), [story.audioUrl, story.listings.length, story.videoUrl, t]);

  return (
    <main className="min-h-screen bg-surface-page text-brand-ink">
      <div className="mx-auto max-w-storefront px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <nav aria-label={t("breadcrumbLabel")} className="mb-6 flex flex-wrap items-center gap-2 rounded-xl bg-brand-bg px-4 py-3 text-sm text-brand-muted">
          <Link href={`/${locale}`} className="rounded-sm hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue">{t("home")}</Link>
          <span aria-hidden="true">›</span><span>{t("eyebrow")}</span><span aria-hidden="true">›</span>
          <span aria-current="page" className="font-semibold text-brand-ink">{story.title}</span>
        </nav>

        <section className="grid items-center gap-8 lg:grid-cols-[minmax(320px,0.92fr)_minmax(0,1.08fr)] lg:gap-12" aria-labelledby="story-title">
          <div className="relative mx-auto w-full max-w-[560px]">
            <div className="aspect-[1.05] overflow-hidden rounded-[28px] border border-brand-line bg-brand-bg">
              {story.coverImageUrl && !coverFailed ? (
                <img src={story.coverImageUrl} onError={() => setCoverFailed(true)} alt={story.title} className="h-full w-full object-contain" fetchPriority="high" />
              ) : (
                <div className="flex h-full items-center justify-center px-8 text-center text-brand-muted"><BookOpen className="mr-3 text-brand-blue" aria-hidden="true" />{t("coverMissing")}</div>
              )}
            </div>
            {story.qrCodeImageUrl && !qrFailed ? (
              <div className="absolute -bottom-4 left-3 flex items-center gap-3 rounded-2xl border border-brand-line bg-white p-3 shadow-soft sm:left-5 sm:p-4">
                <div className="max-w-[130px]"><p className="text-xs font-bold text-brand-ink">{t("qrPrompt")}</p><p className="mt-1 text-[11px] leading-4 text-brand-muted">{t("qrHint")}</p></div>
                <img src={story.qrCodeImageUrl} onError={() => setQrFailed(true)} alt={t("qrAlt", { title: story.title })} className="h-16 w-16 bg-white object-contain sm:h-20 sm:w-20" />
              </div>
            ) : null}
          </div>

          <div className="pt-4 lg:pt-0">
            <div className="mb-3 flex justify-end gap-2">
              <ActionButton label={engagement.liked ? t("unlike") : t("like")} pressed={engagement.liked} busy={engagementLoading || engagementBusy === "liked"} onClick={() => void toggle("liked")}><Heart className={engagement.liked ? "fill-brand-peach text-brand-peach" : ""} /></ActionButton>
              <ActionButton label={engagement.bookmarked ? t("removeBookmark") : t("bookmark")} pressed={engagement.bookmarked} busy={engagementLoading || engagementBusy === "bookmarked"} onClick={() => void toggle("bookmarked")}><Bookmark className={engagement.bookmarked ? "fill-brand-blue text-brand-blue" : ""} /></ActionButton>
              <ActionButton label={t("share")} onClick={() => void share()}><Share2 /></ActionButton>
            </div>
            <h1 id="story-title" className="text-4xl font-black tracking-tight text-brand-ink sm:text-5xl">{story.title}</h1>
            {story.design?.description ? <p className="mt-3 max-w-2xl text-lg leading-7 text-brand-muted">{story.design.description}</p> : null}
            {story.designer?.displayName ? <p className="mt-3 text-sm font-semibold text-brand-ink">{t("byDesigner", { designer: story.designer.displayName })}</p> : null}
            <div className="mt-6 flex flex-wrap gap-2">{chips.map((chip) => <span key={chip.label} className={`rounded-lg px-3 py-2 text-xs font-semibold ${chip.className}`}>{chip.label}</span>)}</div>
            {story.fallbackUsed ? <p className="mt-5 text-sm font-medium text-brand-blue">{t("fallbackNotice")}</p> : null}
            <p className="mt-7 max-w-2xl whitespace-pre-line text-base leading-8 text-brand-text">{story.body.split(/\n\s*\n/)[0]}</p>
            <p className="sr-only" aria-live="polite">{shareMessage}</p>
          </div>
        </section>

        <StorySection icon={<BookOpen />} title={t("readTitle")} subtitle={t("readSubtitle")} className="mt-12">
          <div className={`relative mx-auto max-w-4xl whitespace-pre-wrap text-center text-base leading-8 text-brand-text ${expanded ? "" : "max-h-40 overflow-hidden"}`}>
            {story.body}
            {!expanded ? <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" aria-hidden="true" /> : null}
          </div>
          {story.body.length >= 760 ? <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="mx-auto mt-4 flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue">{expanded ? t("showLess") : t("showMore")}<ChevronDown className={`h-4 w-4 transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`} /></button> : null}
        </StorySection>

        {story.audioUrl ? <StorySection icon={<Headphones />} title={t("audioTitle")} subtitle={t("audioSubtitle")} className="mt-4"><StoryAudio src={story.audioUrl} unsupported={t("audioUnsupported")} playLabel={t("playAudio")} pauseLabel={t("pauseAudio")} /></StorySection> : null}
        {story.videoUrl ? <StorySection icon={<Video />} title={t("videoTitle")} subtitle={t("videoSubtitle")} className="mt-4"><video controls preload="metadata" poster={story.coverImageUrl || undefined} className="mx-auto aspect-video w-full max-w-2xl rounded-2xl bg-brand-ink object-contain" src={story.videoUrl}>{t("videoUnsupported")}</video></StorySection> : null}

        <section className="mt-8" aria-labelledby="related-products-title">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><h2 id="related-products-title" className="text-2xl font-black text-brand-ink">{t("listingsTitle")}</h2><Link href={`/${locale}/shop`} className="min-h-11 rounded-lg px-3 py-2 text-sm font-semibold text-brand-blue hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue">{t("viewAllProducts")} →</Link></div>
          {story.listings.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{story.listings.slice(0, 4).map((listing) => <ProductCard key={listing.id} slug={listing.slug} title={listing.title} designer={{ displayName: listing.designer?.displayName ?? story.designer?.displayName ?? "RashPOD", handle: listing.designer?.handle ?? story.designer?.handle ?? undefined }} price={listing.price} imageUrl={listing.imageUrl ?? undefined} />)}</div> : <div className="rounded-2xl border border-dashed border-brand-line bg-white px-6 py-10 text-center text-brand-muted">{t("listingsEmpty")}</div>}
        </section>

        <section className="mt-8 flex flex-col items-center justify-center gap-4 rounded-2xl border border-brand-line bg-brand-bg px-5 py-7 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-lg font-bold text-brand-ink">{t("cultureCta")}</p>
          <Link href={`/${locale}/shop`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-blue px-6 py-3 text-sm font-bold text-white shadow-soft transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 motion-reduce:transition-none">{t("exploreProducts")}</Link>
        </section>
      </div>
    </main>
  );
}

function ActionButton({ label, pressed, busy, onClick, children }: { label: string; pressed?: boolean; busy?: boolean; onClick: () => void; children: React.ReactElement<{ className?: string }> }) {
  return <button type="button" aria-label={label} aria-pressed={pressed} disabled={busy} onClick={onClick} className="grid h-11 w-11 place-items-center rounded-xl bg-brand-bg text-brand-ink transition-colors hover:bg-brand-blue-light/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:opacity-50 motion-reduce:transition-none">{children}</button>;
}

function StorySection({ icon, title, subtitle, className, children }: { icon: React.ReactNode; title: string; subtitle?: string; className?: string; children: React.ReactNode }) {
  return <section className={`rounded-2xl border border-brand-line bg-white px-5 py-6 sm:px-8 ${className || ""}`}><div className="mb-5 flex items-start justify-center gap-3 text-center"><span className="mt-0.5 text-brand-blue [&>svg]:h-6 [&>svg]:w-6" aria-hidden="true">{icon}</span><div><h2 className="text-lg font-bold text-brand-ink">{title}</h2>{subtitle ? <p className="mt-1 text-sm text-brand-muted">{subtitle}</p> : null}</div></div>{children}</section>;
}

function StoryAudio({ src, unsupported, playLabel, pauseLabel }: { src: string; unsupported: string; playLabel: string; pauseLabel: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const bars = useMemo(() => Array.from({ length: 48 }, (_, index) => 10 + ((index * 17) % 30)), []);
  function toggle() { const audio = audioRef.current; if (!audio) return; if (audio.paused) void audio.play(); else audio.pause(); }
  function seek(value: number) { if (!audioRef.current) return; audioRef.current.currentTime = value; setCurrentTime(value); }
  return <div className="mx-auto max-w-3xl"><audio ref={audioRef} src={src} preload="metadata" onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}>{unsupported}</audio><div className="flex items-center gap-4"><button type="button" onClick={toggle} aria-label={playing ? pauseLabel : playLabel} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-peach text-white shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-peach focus-visible:ring-offset-2">{playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}</button><div className="min-w-0 flex-1"><div aria-hidden="true" className="mb-2 flex h-10 items-center gap-1 overflow-hidden">{bars.map((height, index) => <span key={index} className={`w-1 shrink-0 rounded-full ${duration && index / bars.length <= currentTime / duration ? "bg-brand-blue" : "bg-brand-line"}`} style={{ height }} />)}</div><input type="range" min={0} max={duration || 0} step={0.1} value={Math.min(currentTime, duration || 0)} onChange={(event) => seek(Number(event.target.value))} aria-label={playLabel} className="h-2 w-full cursor-pointer accent-brand-blue" /><div className="mt-1 flex justify-between text-xs tabular-nums text-brand-muted"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div></div></div></div>;
}

function formatTime(value: number) { if (!Number.isFinite(value)) return "0:00"; const minutes = Math.floor(value / 60); return `${minutes}:${Math.floor(value % 60).toString().padStart(2, "0")}`; }
