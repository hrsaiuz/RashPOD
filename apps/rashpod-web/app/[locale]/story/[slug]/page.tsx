import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { fetchStoryBySlug } from "../../../../lib/catalog";
import { StoryExperience } from "./StoryExperience";

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const story = await fetchStoryBySlug(slug, locale);
  if (!story) return { title: "Story" };
  return {
    title: story.title,
    description: story.design?.description || story.body.slice(0, 160),
    openGraph: story.coverImageUrl ? { images: [{ url: story.coverImageUrl }] } : undefined,
  };
}

export default async function StoryPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const story = await fetchStoryBySlug(slug, locale);
  if (!story) notFound();
  return <StoryExperience story={story} locale={locale} />;
}
