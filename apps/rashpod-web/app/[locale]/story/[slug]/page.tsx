import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductCard } from "../../../../components/ProductCard";
import { fetchStoryBySlug } from "../../../../lib/catalog";

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const story = await fetchStoryBySlug(slug, locale);
  if (!story) return { title: "Story" };
  return {
    title: story.title,
    description: story.body.slice(0, 160),
    openGraph: story.coverImageUrl ? { images: [{ url: story.coverImageUrl }] } : undefined,
  };
}

export default async function StoryPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const [t, story] = await Promise.all([
    getTranslations({ locale, namespace: "storyPage" }),
    fetchStoryBySlug(slug, locale),
  ]);

  if (!story) notFound();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ffffff_0%,#f0f2fa_55%,#e7ecff_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-[0_24px_80px_rgba(120,138,224,0.18)] backdrop-blur">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_.85fr]">
            <div className="p-6 sm:p-8 lg:p-10">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#788AE0]">{t("eyebrow")}</p>
              <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight text-slate-900 sm:text-5xl">{story.title}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                {story.designer?.displayName ? <span>{t("byDesigner", { designer: story.designer.displayName })}</span> : null}
                {story.fallbackUsed ? <span className="rounded-full bg-[#f0f2fa] px-3 py-1 font-semibold text-[#788AE0]">{t("fallbackNotice")}</span> : null}
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {story.audioUrl ? (
                  <div className="rounded-[24px] border border-[#d9def7] bg-[#f7f8ff] p-4">
                    <p className="mb-3 text-sm font-semibold text-slate-900">{t("audioTitle")}</p>
                    <audio controls className="w-full" src={story.audioUrl}>
                      {t("audioUnsupported")}
                    </audio>
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-[#d9def7] bg-[#f7f8ff] p-4 text-sm text-slate-500">
                    <p className="font-semibold text-slate-900">{t("audioTitle")}</p>
                    <p className="mt-2">{t("audioUnavailable")}</p>
                  </div>
                )}
                {story.qrCodeImageUrl ? (
                  <div className="rounded-[24px] border border-[#d9def7] bg-[#f7f8ff] p-4">
                    <p className="mb-3 text-sm font-semibold text-slate-900">{t("qrTitle")}</p>
                    <img src={story.qrCodeImageUrl} alt={t("qrAlt", { title: story.title })} className="h-36 w-36 rounded-[20px] bg-white p-2" />
                  </div>
                ) : null}
              </div>
            </div>
            <div className="relative min-h-[300px] bg-[#e7ecff]">
              {story.coverImageUrl ? (
                <img src={story.coverImageUrl} alt={story.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center p-8 text-center text-slate-500">{t("coverMissing")}</div>
              )}
            </div>
          </div>
        </section>

        {story.videoUrl ? (
          <section className="mt-8 overflow-hidden rounded-[32px] border border-white/60 bg-slate-950 shadow-[0_24px_80px_rgba(17,24,39,0.18)]">
            <div className="border-b border-white/10 px-6 py-4 text-sm font-semibold text-white">{t("videoTitle")}</div>
            <video controls className="aspect-video w-full bg-black" src={story.videoUrl}>
              {t("videoUnsupported")}
            </video>
          </section>
        ) : null}

        <section className="mt-8 rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_18px_60px_rgba(120,138,224,0.16)] sm:p-8 lg:p-10">
          <div className="prose prose-slate max-w-none whitespace-pre-wrap text-[17px] leading-8 text-slate-700">{story.body}</div>
        </section>

        <section className="mt-8 rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_18px_60px_rgba(120,138,224,0.16)] sm:p-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#788AE0]">{t("listingsEyebrow")}</p>
              <h2 className="mt-3 text-2xl font-black text-slate-900">{t("listingsTitle")}</h2>
            </div>
          </div>
          {story.listings.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[#d9def7] bg-[#f7f8ff] px-6 py-10 text-sm text-slate-500">{t("listingsEmpty")}</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {story.listings.map((listing) => (
                <ProductCard
                  key={listing.id}
                  slug={listing.slug}
                  title={listing.title}
                  designer={{
                    displayName: listing.designer?.displayName ?? story.designer?.displayName ?? "Designer",
                    handle: listing.designer?.handle ?? story.designer?.handle ?? undefined,
                  }}
                  price={listing.price}
                  imageUrl={listing.imageUrl ?? undefined}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
