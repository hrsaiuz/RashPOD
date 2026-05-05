"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Card,
  Button,
  Select,
  FormField,
  Skeleton,
  EmptyState,
  ErrorState,
  Drawer,
  getApiBase,
  getDashboardUrl,
} from "@rashpod/ui";
import { Filter, X, Film } from "lucide-react";

interface FilmListing {
  id: string;
  slug: string;
  title: string;
  dimensions: string;
  licenseRate: number;
  imageUrl?: string;
  designer: {
    displayName: string;
    handle: string;
  };
  allowFilmSales: boolean;
}

function FilmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiBase = getApiBase();
  const dashboardUrl = getDashboardUrl();

  const [films, setFilms] = useState<FilmListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [designerFilter, setDesignerFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    const designerParam = searchParams.get("designer");
    const sizeParam = searchParams.get("size");
    const sortParam = searchParams.get("sort");

    if (designerParam) setDesignerFilter(designerParam);
    if (sizeParam) setSizeFilter(sizeParam);
    if (sortParam) setSort(sortParam);
  }, []);

  const fetchFilms = async () => {
    setLoading(true);
    setError(false);

    try {
      const params = new URLSearchParams();
      if (designerFilter) params.set("designer", designerFilter);
      if (sizeFilter) params.set("size", sizeFilter);
      if (sort) params.set("sort", sort);

      const res = await fetch(`${apiBase}/shop/films?${params.toString()}`, {
        next: { revalidate: 60 },
      });

      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      setFilms(data.items || data);
      setLoading(false);
    } catch (err) {
      setError(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilms();

    const params = new URLSearchParams();
    if (designerFilter) params.set("designer", designerFilter);
    if (sizeFilter) params.set("size", sizeFilter);
    if (sort !== "newest") params.set("sort", sort);

    const newUrl = params.toString() ? `/film?${params.toString()}` : "/film";
    router.replace(newUrl, { scroll: false });
  }, [designerFilter, sizeFilter, sort]);

  const clearFilters = () => {
    setDesignerFilter("");
    setSizeFilter("");
    setSort("newest");
  };

  const hasActiveFilters = designerFilter || sizeFilter;

  const SidebarContent = () => (
    <div className="space-y-6">
      <div>
        <FormField label="Designer">
          <input
            type="text"
            placeholder="Filter by designer..."
            value={designerFilter}
            onChange={(e) => setDesignerFilter(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-surface-border bg-white text-sm focus:outline-none focus:ring-4 focus:ring-focus"
          />
        </FormField>
      </div>

      <div>
        <FormField label="Size">
          <Select value={sizeFilter} onChange={(e) => setSizeFilter(e.target.value)}>
            <option value="">All sizes</option>
            <option value="A4">A4</option>
            <option value="A3">A3</option>
            <option value="30x40">30x40 cm</option>
            <option value="40x50">40x50 cm</option>
          </Select>
        </FormField>
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="md" className="w-full" onClick={clearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-brand-ink mb-2">Film Catalog</h1>
        <p className="text-brand-muted">
          License high-quality designs for DTF/UV-DTF printing
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-24">
            <Card className="p-6">
              <SidebarContent />
            </Card>
          </div>
        </aside>

        {/* Mobile filter button */}
        <div className="lg:hidden flex items-center justify-between gap-4 mb-4">
          <Button
            variant="secondary"
            size="md"
            onClick={() => setMobileFiltersOpen(true)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters {hasActiveFilters && "(active)"}
          </Button>

          <FormField label="">
            <Select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Newest</option>
              <option value="popular">Most Popular</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </Select>
          </FormField>
        </div>

        {/* Main content */}
        <div className="flex-1">
          {/* Sort - Desktop */}
          <div className="hidden lg:flex items-center justify-between mb-6">
            <p className="text-sm text-brand-muted">
              {films.length} {films.length === 1 ? "film" : "films"} available
            </p>
            <FormField label="">
              <Select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="newest">Newest</option>
                <option value="popular">Most Popular</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </Select>
            </FormField>
          </div>

          {/* Films grid */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="w-full h-64" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {error && (
            <ErrorState
              title="Failed to load films"
              description="We couldn't load the film catalog. Please try again."
              retry={
                <Button variant="primaryBlue" size="md" onClick={fetchFilms}>
                  Retry
                </Button>
              }
            />
          )}

          {!loading && !error && films.length === 0 && (
            <EmptyState
              title="No films found"
              description="Try adjusting your filters or check back later for new films."
              action={
                hasActiveFilters ? (
                  <Button variant="primaryBlue" size="md" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          )}

          {!loading && !error && films.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {films.map((film) => (
                <Card key={film.id} variant="lift" className="overflow-hidden group">
                  <Link href={`/film/${film.slug}`}>
                    <div className="relative w-full h-64 bg-gray-100">
                      {film.imageUrl ? (
                        <Image
                          src={film.imageUrl}
                          alt={film.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Film className="w-12 h-12" />
                        </div>
                      )}
                      {!film.allowFilmSales && (
                        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          Not available
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-brand-ink mb-1 line-clamp-2">
                        {film.title}
                      </h3>
                      <p className="text-sm text-brand-muted mb-2">
                        by {film.designer.displayName}
                      </p>
                      <p className="text-sm text-brand-muted mb-2">{film.dimensions}</p>
                      <p className="text-lg font-bold text-brand-blue">
                        {film.licenseRate.toLocaleString()} UZS / license
                      </p>
                    </div>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filters drawer */}
      <Drawer open={mobileFiltersOpen} onClose={() => setMobileFiltersOpen(false)} side="left">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-brand-ink">Filters</h2>
          <button onClick={() => setMobileFiltersOpen(false)}>
            <X className="w-5 h-5 text-brand-muted" />
          </button>
        </div>
        <SidebarContent />
        <div className="mt-6">
          <Button
            variant="primaryBlue"
            size="md"
            className="w-full"
            onClick={() => setMobileFiltersOpen(false)}
          >
            Apply filters
          </Button>
        </div>
      </Drawer>
    </div>
  );
}

export default function FilmPage() {
  return (
    <Suspense fallback={<div className="max-w-[1280px] mx-auto px-6 py-10"><Skeleton className="h-96 w-full" /></div>}>
      <FilmContent />
    </Suspense>
  );
}
