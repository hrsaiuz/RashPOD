import type { Metadata } from "next";
import { fetchFilmBySlug } from "../../../../lib/catalog";
import FilmDetailClient from "./FilmDetailClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const film = await fetchFilmBySlug(slug);

  return {
    title: film?.title ?? "Film",
    description: film?.description ?? undefined,
    openGraph: film?.imageUrl ? { images: [{ url: film.imageUrl }] } : undefined,
  };
}

export default async function FilmDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const film = await fetchFilmBySlug(slug);

  return <FilmDetailClient slug={slug} initialFilm={film} />;
}
