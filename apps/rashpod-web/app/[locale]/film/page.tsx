import type { Metadata } from "next";
import { fetchFilmListings } from "../../../lib/catalog";
import FilmPageClient from "./FilmPageClient";

export const metadata: Metadata = {
  title: "Film",
  description:
    "Browse DTF and UV-DTF transfer film listings from RashPOD designers. Order ready-made films or upload your own.",
};

export default async function FilmPage() {
  const films = await fetchFilmListings();

  return <FilmPageClient initialFilms={films} />;
}
