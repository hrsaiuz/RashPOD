"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Card,
  Skeleton,
  EmptyState,
  ErrorState,
  Select,
  FormField,
  Input,
  Drawer,
  getApiBase,
} from "@rashpod/ui";
import { Filter, X, ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "../../components/ProductCard";

interface Listing {
  id: string;
  slug: string;
  title: string;
  price: number;
  imageUrl?: string;
  designer: {
    displayName: string;
    handle: string;
  };
  category?: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

function ShopContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiBase = getApiBase();

  const [listings, setListings] = useState<Listing[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Filter state
  const [categories, setCategories] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [designers, setDesigners] = useState<string[]>([]);
  const [hasFilm, setHasFilm] = useState(false);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  // Initialize from URL params
  useEffect(() => {
    const categoriesParam = searchParams.get("categories");
    const priceMinParam = searchParams.get("priceMin");
    const priceMaxParam = searchParams.get("priceMax");
    const designersParam = searchParams.get("designers");
    const hasFilmParam = searchParams.get("hasFilm");
    const sortParam = searchParams.get("sort");
    const pageParam = searchParams.get("page");

    if (categoriesParam) setCategories(categoriesParam.split(","));
    if (priceMinParam) setPriceMin(priceMinParam);
    if (priceMaxParam) setPriceMax(priceMaxParam);
    if (designersParam) setDesigners(designersParam.split(","));
    if (hasFilmParam) setHasFilm(hasFilmParam === "true");
    if (sortParam) setSort(sortParam);
    if (pageParam) setPage(parseInt(pageParam, 10));
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    setError(false);

    try {
      const params = new URLSearchParams();
      if (categories.length) params.set("categories", categories.join(","));
      if (priceMin) params.set("priceMin", priceMin);
      if (priceMax) params.set("priceMax", priceMax);
      if (designers.length) params.set("designers", designers.join(","));
      if (hasFilm) params.set("hasFilm", "true");
      if (sort) params.set("sort", sort);
      params.set("page", page.toString());
      params.set("limit", "24");

      const res = await fetch(`${apiBase}/shop/listings?${params.toString()}`, {
        next: { revalidate: 60 },
      });

      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      setListings(data.items || data);
      if (data.meta) setMeta(data.meta);
      setLoading(false);
    } catch (err) {
      setError(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();

    // Update URL
    const params = new URLSearchParams();
    if (categories.length) params.set("categories", categories.join(","));
    if (priceMin) params.set("priceMin", priceMin);
    if (priceMax) params.set("priceMax", priceMax);
    if (designers.length) params.set("designers", designers.join(","));
    if (hasFilm) params.set("hasFilm", "true");
    if (sort !== "newest") params.set("sort", sort);
    if (page > 1) params.set("page", page.toString());

    const newUrl = params.toString() ? `/shop?${params.toString()}` : "/shop";
    router.replace(newUrl, { scroll: false });
  }, [categories, priceMin, priceMax, designers, hasFilm, sort, page]);

  const clearFilters = () => {
    setCategories([]);
    setPriceMin("");
    setPriceMax("");
    setDesigners([]);
    setHasFilm(false);
    setSort("newest");
    setPage(1);
  };

  const hasActiveFilters =
    categories.length > 0 ||
    priceMin ||
    priceMax ||
    designers.length > 0 ||
    hasFilm;

  const SidebarContent = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-brand-ink mb-3">Category</h3>
        <div className="space-y-2">
          {["T-Shirts", "Mugs", "Posters", "Stickers"].map((cat) => (
            <label key={cat} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={categories.includes(cat)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setCategories([...categories, cat]);
                  } else {
                    setCategories(categories.filter((c) => c !== cat));
                  }
                  setPage(1);
                }}
                className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
              />
              <span className="text-sm text-brand-muted">{cat}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-brand-ink mb-3">Price Range</h3>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            className="w-full"
          />
          <span className="text-brand-muted">–</span>
          <Input
            type="number"
            placeholder="Max"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            className="w-full"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full"
          onClick={() => {
            setPriceMin("");
            setPriceMax("");
            setPage(1);
          }}
        >
          Clear price
        </Button>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-brand-ink mb-3">Designer</h3>
        {/* TODO: Fetch designers list from API */}
        <div className="space-y-2">
          {["Artist One", "Artist Two", "Artist Three"].map((des) => (
            <label key={des} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={designers.includes(des)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setDesigners([...designers, des]);
                  } else {
                    setDesigners(designers.filter((d) => d !== des));
                  }
                  setPage(1);
                }}
                className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
              />
              <span className="text-sm text-brand-muted">{des}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hasFilm}
            onChange={(e) => {
              setHasFilm(e.target.checked);
              setPage(1);
            }}
            className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
          />
          <span className="text-sm font-semibold text-brand-ink">Has film available</span>
        </label>
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="md" className="w-full" onClick={clearFilters}>
          Clear all filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-brand-ink mb-2">Shop</h1>
        <p className="text-brand-muted">Discover unique designs from local creators</p>
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
            Filters {hasActiveFilters && `(${[categories, designers, priceMin, priceMax, hasFilm].filter(Boolean).length})`}
          </Button>

          <FormField label="">
            <Select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="popular">Most Popular</option>
            </Select>
          </FormField>
        </div>

        {/* Main content */}
        <div className="flex-1">
          {/* Sort - Desktop */}
          <div className="hidden lg:flex items-center justify-between mb-6">
            <p className="text-sm text-brand-muted">
              {meta ? `Showing ${listings.length} of ${meta.total} products` : ""}
            </p>
            <FormField label="">
              <Select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="popular">Most Popular</option>
              </Select>
            </FormField>
          </div>

          {/* Products grid */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(24)].map((_, i) => (
                <Card key={i} variant="lift" className="overflow-hidden">
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
              title="Failed to load products"
              description="We couldn't load the product catalog. Please try again."
              retry={
                <Button variant="primaryBlue" size="md" onClick={fetchListings}>
                  Retry
                </Button>
              }
            />
          )}

          {!loading && !error && listings.length === 0 && (
            <EmptyState
              title="No products found"
              description="Try adjusting your filters or clearing them to see more products."
              action={
                hasActiveFilters ? (
                  <Button variant="primaryBlue" size="md" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          )}

          {!loading && !error && listings.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing) => (
                  <ProductCard key={listing.id} {...listing} />
                ))}
              </div>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-12">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === meta.totalPages || Math.abs(p - page) <= 2)
                      .map((p, idx, arr) => (
                        <>
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <span key={`ellipsis-${p}`} className="px-2 text-brand-muted">
                              ...
                            </span>
                          )}
                          <Button
                            key={p}
                            variant={p === page ? "primaryBlue" : "ghost"}
                            size="sm"
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </Button>
                        </>
                      ))}
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === meta.totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
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

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="max-w-[1280px] mx-auto px-6 py-10"><Skeleton className="h-96 w-full" /></div>}>
      <ShopContent />
    </Suspense>
  );
}

