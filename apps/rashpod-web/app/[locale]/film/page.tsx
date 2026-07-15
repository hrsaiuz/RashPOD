import type { Metadata } from "next";
import { fetchDesigners, fetchFilmListings, fetchShopCategories } from "../../../lib/catalog";
import FilmPageClient from "./FilmPageClient";

export const metadata: Metadata = {
  title: "Film",
  description:
    "Browse DTF and UV-DTF transfer film listings from RashPOD designers. Order ready-made films or upload your own.",
};

export default async function FilmPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const one = (key: string) => Array.isArray(raw[key]) ? raw[key]?.[0] : raw[key];
  const params: Record<string, string> = { limit: "24", page: one("page") ?? "1", sort: one("sort") ?? "newest" };
  for (const key of ["q", "categories", "designers", "priceMin", "priceMax"] as const) {
    const value = one(key);
    if (value) params[key] = value;
  }
  const [films, designers, categories] = await Promise.all([fetchFilmListings(params), fetchDesigners(50), fetchShopCategories()]);

  return <FilmPageClient initialFilms={films} initialDesigners={designers.map(({ handle, displayName }) => ({ handle, displayName }))} initialCategories={categories} />;
}
