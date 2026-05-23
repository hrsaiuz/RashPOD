"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Film, Search } from "lucide-react";
import { StorePage } from "../storefront-ui";
import { api } from "../../lib/api";

type FilmListing = { id: string; slug: string; title: string; description?: string | null; price: number; currency: string; imageUrl?: string | null; designer: { displayName: string; handle: string } };

export default function FilmPage() {
  const [films, setFilms] = useState<FilmListing[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true); setError("");
      try {
        const suffix = query.trim() ? `&q=${encodeURIComponent(query.trim())}` : "";
        setFilms(await api.get<FilmListing[]>(`/shop/listings?type=FILM&limit=60${suffix}`));
      } catch (err) { setError(err instanceof Error ? err.message : "Failed to load films."); }
      finally { setLoading(false); }
    }
    const timer = window.setTimeout(load, 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  return <StorePage><div className="grid gap-7 lg:grid-cols-[300px_1fr]"><aside className="rounded-[12px] bg-brand-bg p-5"><h1 className="mb-6 text-[18px] font-black uppercase text-black">Films</h1><label className="flex items-center gap-3 rounded-[10px] bg-white px-4 py-3 text-brand-subtle"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search films" className="w-full bg-transparent text-sm text-brand-ink outline-none" /></label><div className="mt-8 grid gap-3"><span className="rounded-[10px] bg-brand-blue px-4 py-3 text-sm font-bold text-white">DTF / UV-DTF transfer films</span><Link href="/film/custom" className="rounded-[10px] border border-brand-blue bg-white px-4 py-3 text-sm font-bold text-brand-blue">Upload custom film</Link></div></aside><section>{error ? <div className="mb-4 rounded-[12px] border border-semantic-dangerBg bg-semantic-dangerBg p-4 text-sm text-semantic-dangerText">{error}</div> : null}{loading ? <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-80 animate-pulse rounded-[12px] bg-brand-bg" />)}</div> : films.length === 0 ? <div className="grid min-h-[360px] place-items-center rounded-[12px] bg-brand-bg p-8 text-center"><div><Film className="mx-auto mb-4 text-brand-blue" size={42} /><h2 className="text-xl font-black text-black">No films yet</h2><p className="mt-2 text-sm text-brand-subtle">Published DTF / UV-DTF film listings will appear here.</p></div></div> : <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{films.map((film) => <Link key={film.id} href={`/film/${film.slug}`} className="rounded-[12px] bg-brand-bg p-6 transition hover:-translate-y-0.5 hover:shadow-product"><div className="relative aspect-square overflow-hidden rounded-[24px] bg-white"><div className="absolute left-4 top-4 rounded-[8px] bg-brand-peach px-3 py-2 text-[10px] font-bold text-white">FILM</div>{film.imageUrl ? <img src={film.imageUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-brand-blue"><Film size={56} /></div>}</div><h2 className="mt-5 text-[20px] font-black text-black">{film.title}</h2><p className="mt-1 text-[12px] text-brand-subtle">Designed by {film.designer.displayName}</p><div className="mt-6 flex items-center justify-between gap-3"><p className="text-[20px] font-black text-black">{money(film.price, film.currency)}</p><span className="rounded-[10px] bg-brand-peach px-5 py-3 text-[14px] font-bold text-white">Order film</span></div></Link>)}</div>}</section></div></StorePage>;
}

function money(value: number, currency: string) { return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: currency === "UZS" ? 0 : 2 }).format(value || 0); }
