"use client";

import { Fragment, Suspense, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, Drawer, EmptyState, ErrorState, Skeleton, getApiBase } from "@rashpod/ui";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { ProductCard } from "../../../components/ProductCard";
import { CatalogFilterPanel, type CatalogCategory, type CatalogDesigner } from "../../../components/catalog/CatalogFilterPanel";
import { useCatalogFilters } from "../../../components/catalog/useCatalogFilters";

interface Listing {
  id: string;
  slug: string;
  title: string;
  price: number;
  imageUrl?: string;
  designer: { displayName: string; handle: string };
  category?: string;
}

interface PaginationMeta { total: number; page: number; perPage: number; totalPages: number }

function ShopContent({ initialListings = [], initialMeta = null, initialDesigners = [], initialCategories = [] }: {
  initialListings?: Listing[];
  initialMeta?: PaginationMeta | null;
  initialDesigners?: CatalogDesigner[];
  initialCategories?: CatalogCategory[];
}) {
  const t = useTranslations("shop");
  const apiBase = getApiBase();
  const filters = useCatalogFilters();
  const firstRender = useRef(true);
  const [listings, setListings] = useState(initialListings);
  const [meta, setMeta] = useState<PaginationMeta | null>(initialMeta);
  const [loading, setLoading] = useState(!initialListings.length);
  const [error, setError] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      if (initialListings.length || initialMeta) return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    const params = new URLSearchParams(filters.queryString);
    params.set("limit", "24");
    fetch(`${apiBase}/shop/listings?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("catalog");
        return response.json();
      })
      .then((data) => {
        setListings(Array.isArray(data) ? data : data.items ?? []);
        setMeta(data.meta ?? null);
      })
      .catch((requestError) => {
        if (requestError instanceof Error && requestError.name !== "AbortError") setError(true);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [apiBase, filters.queryString, initialListings.length, initialMeta]);

  const panel = (
    <CatalogFilterPanel
      search={filters.search}
      onSearch={filters.setSearch}
      sort={filters.values.sort}
      onSort={(sort) => filters.setParams({ sort: sort === "newest" ? null : sort })}
      categories={initialCategories}
      selectedCategories={filters.values.categories}
      onCategories={(categories) => filters.setParams({ categories })}
      designers={initialDesigners}
      selectedDesigners={filters.values.designers}
      onDesigners={(designers) => filters.setParams({ designers })}
      priceMin={filters.values.priceMin}
      priceMax={filters.values.priceMax}
      onPrice={(priceMin, priceMax) => filters.setParams({ priceMin, priceMax })}
      hasFilm={filters.values.hasFilm}
      onHasFilm={(hasFilm) => filters.setParams({ hasFilm })}
      activeCount={filters.activeCount}
      onReset={filters.reset}
      labels={filterLabels(t)}
    />
  );

  return (
    <div className="mx-auto max-w-storefront px-4 py-7 sm:px-6 md:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-blue">RashPOD</p>
          <h1 className="mt-1 text-3xl font-bold text-brand-ink sm:text-4xl">{t("title")}</h1>
        </div>
        <p className="text-sm text-brand-muted" aria-live="polite">{meta ? t("results", { shown: listings.length, total: meta.total }) : ""}</p>
      </div>

      <div className="mb-5 lg:hidden">
        <Button variant="secondary" onClick={() => setMobileOpen(true)} aria-expanded={mobileOpen} aria-controls="shop-mobile-filters">
          <Filter size={17} aria-hidden="true" /> {t("filters")}{filters.activeCount ? ` (${filters.activeCount})` : ""}
        </Button>
      </div>

      <div className="grid items-start gap-7 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="sticky top-24 hidden rounded-2xl border border-surface-borderSoft bg-white p-5 shadow-soft lg:block" aria-label={t("filters")}>
          {panel}
        </aside>

        <main className="min-w-0">
          {loading ? <CatalogSkeleton /> : null}
          {error ? <ErrorState title={t("loadErrorTitle")} description={t("loadErrorDescription")} retry={<Button onClick={() => filters.setParams({}, { keepPage: true })}>{t("retry")}</Button>} /> : null}
          {!loading && !error && !listings.length ? <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} action={filters.activeCount ? <Button onClick={filters.reset}>{t("clearFilters")}</Button> : undefined} /> : null}
          {!loading && !error && listings.length ? (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{listings.map((listing) => <ProductCard key={listing.id} {...listing} />)}</div>
              {meta && meta.totalPages > 1 ? <Pagination page={meta.page} totalPages={meta.totalPages} onPage={(page) => filters.setParams({ page: page === 1 ? null : String(page) }, { keepPage: true })} /> : null}
            </>
          ) : null}
        </main>
      </div>

      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} side="left" title={t("filters")} className="!w-[min(92vw,420px)]">
        <div id="shop-mobile-filters">{panel}</div>
        <div className="sticky bottom-0 mt-5 grid grid-cols-2 gap-3 border-t border-surface-borderSoft bg-white pt-4">
          <Button variant="secondary" onClick={filters.reset}>{t("reset")}</Button>
          <Button onClick={() => setMobileOpen(false)}>{t("apply")}</Button>
        </div>
      </Drawer>
    </div>
  );
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter((value) => value === 1 || value === totalPages || Math.abs(value - page) <= 2);
  return (
    <nav className="mt-10 flex items-center justify-center gap-1" aria-label="Pagination">
      <Button variant="secondary" size="sm" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page"><ChevronLeft size={16} /></Button>
      {pages.map((value, index) => <Fragment key={value}>{index && pages[index - 1] !== value - 1 ? <span className="px-2">…</span> : null}<Button variant={value === page ? "primaryBlue" : "ghost"} size="sm" onClick={() => onPage(value)} aria-current={value === page ? "page" : undefined}>{value}</Button></Fragment>)}
      <Button variant="secondary" size="sm" onClick={() => onPage(page + 1)} disabled={page >= totalPages} aria-label="Next page"><ChevronRight size={16} /></Button>
    </nav>
  );
}

function CatalogSkeleton() {
  return <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading products">{Array.from({ length: 9 }, (_, index) => <Card key={index} className="overflow-hidden !p-0"><Skeleton className="aspect-square w-full" /><div className="space-y-2 p-4"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div></Card>)}</div>;
}

function filterLabels(t: ReturnType<typeof useTranslations>) {
  return { filters: t("filters"), reset: t("reset"), search: t("search"), searchPlaceholder: t("searchPlaceholder"), sort: t("sort"), newest: t("newest"), popular: t("popular"), priceAsc: t("priceAsc"), priceDesc: t("priceDesc"), category: t("category"), priceRange: t("priceRange"), minimumPrice: t("minimumPrice"), maximumPrice: t("maximumPrice"), min: t("min"), max: t("max"), designer: t("designer"), availability: t("availability"), hasFilm: t("hasFilm") };
}

export default function ShopPageClient(props: Parameters<typeof ShopContent>[0]) {
  return <Suspense fallback={<div className="mx-auto max-w-storefront px-6 py-10"><Skeleton className="h-96 w-full" /></div>}><ShopContent {...props} /></Suspense>;
}
