"use client";

import { useEffect, useState } from "react";
import { Loader2, Package, Search } from "lucide-react";
import { Button, Input, Select } from "@rashpod/ui";
import { api } from "../../lib/api";

export type PrintfulCatalogVariant = {
  id: number;
  name: string;
  color?: string | null;
  colorCode?: string | null;
  size?: string | null;
  imageUrl?: string | null;
  price?: string | null;
  inStock: boolean;
};

export type PreparedPrintfulProduct = {
  template: Record<string, unknown> & { id: string; printfulCatalogProductId: string };
  presets: Array<Record<string, unknown> & { id: string }>;
  product: {
    id: number;
    title: string;
    type?: string | null;
    typeName?: string | null;
    brand?: string | null;
    imageUrl?: string | null;
    techniques: string[];
    placements: string[];
    variants: PrintfulCatalogVariant[];
  };
};

type Category = { id: number; title: string };
type Product = {
  id: number;
  title: string;
  type?: string | null;
  typeName?: string | null;
  brand?: string | null;
  imageUrl?: string | null;
  variantCount: number;
};

export function PrintfulModerationCatalog({
  selectedCatalogProductId,
  onPrepared,
}: {
  selectedCatalogProductId?: string | null;
  onPrepared: (prepared: PreparedPrintfulProduct) => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [preparingId, setPreparingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoadingSetup(true);
    api.get<Category[]>("/admin/printful/categories")
      .then((rows) => { if (!cancelled) setCategories(rows); })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Printful catalog could not be loaded."); })
      .finally(() => { if (!cancelled) setLoadingSetup(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!categoryId) {
      setProducts([]);
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoadingProducts(true);
      setError("");
      try {
        const params = new URLSearchParams({ categoryId, limit: "100" });
        if (search.trim()) params.set("search", search.trim());
        const response = await api.get<{ items: Product[] }>(`/admin/printful/catalog-products?${params.toString()}`, { signal: controller.signal });
        setProducts(response.items);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Printful products could not be loaded.");
      } finally {
        if (!controller.signal.aborted) setLoadingProducts(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [categoryId, search]);

  async function prepare(product: Product) {
    setPreparingId(product.id);
    setError("");
    try {
      const prepared = await api.post<PreparedPrintfulProduct>(`/admin/printful/catalog-products/${product.id}/prepare`, {
        rashpodProductType: product.typeName || product.type || "Printful product",
      });
      onPrepared(prepared);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This Printful product could not be prepared for moderation.");
    } finally {
      setPreparingId(null);
    }
  }

  return (
    <section aria-labelledby="moderation-printful-catalog" className="space-y-4">
      <div>
        <h4 id="moderation-printful-catalog" className="text-sm font-semibold text-brand-ink">Choose from the live Printful catalog</h4>
        <p className="mt-1 text-xs leading-5 text-brand-muted">Selecting a product imports its current variants, techniques, printable areas, and placement presets for this moderation decision.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-[minmax(220px,0.8fr)_minmax(260px,1.2fr)]">
        <label className="text-sm font-medium text-brand-ink">
          Category
          <Select className="mt-2 h-12" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={loadingSetup}>
            <option value="">{loadingSetup ? "Loading categories..." : "Select a category"}</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}
          </Select>
        </label>
        <label className="text-sm font-medium text-brand-ink">
          Search this category
          <span className="relative mt-2 block">
            <Search className="pointer-events-none absolute left-3 top-3.5 text-brand-muted" size={18} aria-hidden="true" />
            <Input className="h-12 pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Product name, brand, or type" disabled={!categoryId} />
          </span>
        </label>
      </div>
      {error ? (
        <div role="alert" className="rounded-xl border border-semantic-danger/25 bg-semantic-dangerBg px-4 py-3 text-sm text-semantic-dangerText">
          <p className="font-semibold">Printful catalog unavailable</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : null}
      {loadingProducts ? (
        <div className="flex min-h-32 items-center justify-center rounded-2xl border border-dashed border-surface-borderSoft text-sm text-brand-muted">
          <Loader2 className="mr-2 animate-spin motion-reduce:animate-none" size={18} aria-hidden="true" /> Loading products...
        </div>
      ) : products.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const selected = String(product.id) === selectedCatalogProductId;
            return (
              <article key={product.id} className={`overflow-hidden rounded-2xl border bg-white ${selected ? "border-brand-blue ring-2 ring-brand-blue/15" : "border-surface-borderSoft"}`}>
                <div className="flex aspect-[16/9] items-center justify-center bg-brand-bg">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.imageUrl} alt="" loading="lazy" className="h-full w-full object-contain p-3" />
                  ) : <Package size={34} className="text-brand-muted" aria-hidden="true" />}
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <p className="font-semibold text-brand-ink">{product.title}</p>
                    <p className="mt-1 text-xs text-brand-muted">{[product.brand, product.typeName, `${product.variantCount || "Multiple"} variants`].filter(Boolean).join(" · ")}</p>
                  </div>
                  <Button className="w-full" size="sm" variant={selected ? "secondary" : "primaryBlue"} onClick={() => void prepare(product)} disabled={preparingId !== null} loading={preparingId === product.id}>
                    {selected ? "Refresh printable areas" : "Use this product"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : categoryId && !error ? (
        <div className="rounded-2xl border border-dashed border-surface-borderSoft px-6 py-8 text-center text-sm text-brand-muted">No Printful products match this category and search.</div>
      ) : null}
    </section>
  );
}
