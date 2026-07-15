"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button, Card, Drawer, EmptyState, ErrorState, MediaImage, Skeleton, getApiBase } from "@rashpod/ui";
import { Filter } from "lucide-react";
import type { FilmListing } from "../../../lib/catalog";
import { CatalogFilterPanel, type CatalogCategory, type CatalogDesigner } from "../../../components/catalog/CatalogFilterPanel";
import { useCatalogFilters } from "../../../components/catalog/useCatalogFilters";

type Meta = { total: number; page: number; perPage: number; totalPages: number };

function FilmContent({ initialFilms = [], initialDesigners = [], initialCategories = [] }: { initialFilms?: FilmListing[]; initialDesigners?: CatalogDesigner[]; initialCategories?: CatalogCategory[] }) {
  const t = useTranslations("shop");
  const filmT = useTranslations("film");
  const apiBase = getApiBase();
  const filters = useCatalogFilters();
  const firstRender = useRef(true);
  const [films, setFilms] = useState(initialFilms);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(!initialFilms.length);
  const [error, setError] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      if (initialFilms.length) return;
    }
    const controller = new AbortController();
    const params = new URLSearchParams(filters.queryString);
    params.set("type", "FILM");
    params.set("limit", "24");
    setLoading(true);
    setError(false);
    fetch(`${apiBase}/shop/listings?${params}`, { signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error("films"); return response.json(); })
      .then((data) => { setFilms((data.items ?? data) as FilmListing[]); setMeta(data.meta ?? null); })
      .catch((requestError) => { if (requestError instanceof Error && requestError.name !== "AbortError") setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [apiBase, filters.queryString, initialFilms.length]);

  const panel = <CatalogFilterPanel
    search={filters.search}
    onSearch={filters.setSearch}
    sort={filters.values.sort}
    onSort={(sort) => filters.setParams({ sort: sort === "newest" ? null : sort })}
    categories={initialCategories.filter((category) => category.category.toLowerCase() === "films" || category.name.toLowerCase().includes("film"))}
    selectedCategories={filters.values.categories}
    onCategories={(categories) => filters.setParams({ categories })}
    designers={initialDesigners}
    selectedDesigners={filters.values.designers}
    onDesigners={(designers) => filters.setParams({ designers })}
    priceMin={filters.values.priceMin}
    priceMax={filters.values.priceMax}
    onPrice={(priceMin, priceMax) => filters.setParams({ priceMin, priceMax })}
    activeCount={filters.activeCount}
    onReset={filters.reset}
    labels={{ filters: t("filters"), reset: t("reset"), search: t("search"), searchPlaceholder: filmT("searchPlaceholder"), sort: t("sort"), newest: t("newest"), popular: t("popular"), priceAsc: t("priceAsc"), priceDesc: t("priceDesc"), category: t("category"), priceRange: t("priceRange"), minimumPrice: t("minimumPrice"), maximumPrice: t("maximumPrice"), min: t("min"), max: t("max"), designer: t("designer"), availability: t("availability"), hasFilm: t("hasFilm") }}
  />;

  return (
    <div className="mx-auto max-w-storefront px-4 py-7 sm:px-6 md:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-peach">DTF · UV-DTF</p><h1 className="mt-1 text-3xl font-bold text-brand-ink sm:text-4xl">{filmT("title")}</h1></div>
        <Link href="/film/custom" className="inline-flex min-h-11 items-center rounded-pill bg-brand-peach px-5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-peach/25">{filmT("customFilm")}</Link>
      </div>
      <div className="mb-5 lg:hidden"><Button variant="secondary" onClick={() => setMobileOpen(true)} aria-expanded={mobileOpen}><Filter size={17} /> {t("filters")}{filters.activeCount ? ` (${filters.activeCount})` : ""}</Button></div>
      <div className="grid items-start gap-7 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="sticky top-24 hidden rounded-2xl border border-surface-borderSoft bg-white p-5 shadow-soft lg:block" aria-label={t("filters")}>{panel}</aside>
        <main className="min-w-0">
          {meta ? <p className="mb-4 text-sm text-brand-muted" aria-live="polite">{t("results", { shown: films.length, total: meta.total })}</p> : null}
          {loading ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 9 }, (_, index) => <Skeleton key={index} className="aspect-[4/5] rounded-2xl" />)}</div> : null}
          {error ? <ErrorState title={filmT("loadErrorTitle")} description={filmT("loadErrorDescription")} /> : null}
          {!loading && !error && !films.length ? <EmptyState title={filmT("emptyTitle")} description={filmT("emptyDescription")} action={filters.activeCount ? <Button onClick={filters.reset}>{t("clearFilters")}</Button> : undefined} /> : null}
          {!loading && !error && films.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{films.map((film) => <FilmCard key={film.id} film={film} />)}</div> : null}
          {meta && meta.totalPages > 1 ? <div className="mt-10 flex justify-center gap-3"><Button variant="secondary" disabled={meta.page <= 1} onClick={() => filters.setParams({ page: String(meta.page - 1) }, { keepPage: true })}>{t("previous")}</Button><span className="flex items-center text-sm text-brand-muted">{meta.page} / {meta.totalPages}</span><Button variant="secondary" disabled={meta.page >= meta.totalPages} onClick={() => filters.setParams({ page: String(meta.page + 1) }, { keepPage: true })}>{t("next")}</Button></div> : null}
        </main>
      </div>
      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} side="left" title={t("filters")} className="!w-[min(92vw,420px)]">{panel}<div className="sticky bottom-0 mt-5 grid grid-cols-2 gap-3 border-t border-surface-borderSoft bg-white pt-4"><Button variant="secondary" onClick={filters.reset}>{t("reset")}</Button><Button onClick={() => setMobileOpen(false)}>{t("apply")}</Button></div></Drawer>
    </div>
  );
}

function FilmCard({ film }: { film: FilmListing }) {
  return <Card className="group overflow-hidden !p-0 transition-transform motion-safe:hover:-translate-y-1"><Link href={`/film/${film.slug}`} className="block focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/25"><MediaImage src={film.imageUrl} alt={film.title} fallbackLabel={film.title} containerClassName="aspect-square bg-brand-bg" className="p-5 object-contain" loading="lazy" /><div className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">{film.designer.displayName}</p><h2 className="mt-2 text-lg font-bold text-brand-ink">{film.title}</h2><p className="mt-3 font-bold text-brand-ink">{money(film.price, film.currency)}</p></div></Link></Card>;
}

function money(value: number, currency: string) { return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: currency === "UZS" ? 0 : 2 }).format(value || 0); }

export default function FilmPageClient(props: Parameters<typeof FilmContent>[0]) { return <Suspense fallback={<Skeleton className="mx-auto mt-10 h-96 max-w-storefront" />}><FilmContent {...props} /></Suspense>; }
