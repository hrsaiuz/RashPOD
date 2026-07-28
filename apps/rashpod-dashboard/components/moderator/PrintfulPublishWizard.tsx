"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Package,
  RefreshCw,
  Search,
  Send,
  Store as StoreIcon,
} from "lucide-react";
import { Button, Card, Input, Select, StatusBadge } from "@rashpod/ui";
import { api } from "../../lib/api";
import { ModeratorActionDialog } from "./ModeratorActionDialog";
import { useDashboardFeedback } from "../feedback/use-dashboard-feedback";

type PrintfulStore = {
  id: string;
  name: string;
  type: string;
  website?: string | null;
  directPublishingSupported: boolean;
  publishingMode: "PRINTFUL_PRODUCTS_API" | "EXTERNAL_PLATFORM_CONNECTOR_REQUIRED";
};

type PrintfulCategory = {
  id: number;
  parentId?: number | null;
  title: string;
  imageUrl?: string | null;
};

type PrintfulProduct = {
  id: number;
  title: string;
  type?: string | null;
  typeName?: string | null;
  brand?: string | null;
  imageUrl?: string | null;
  variantCount: number;
};

type PrintfulVariant = {
  id: number;
  name: string;
  color?: string | null;
  colorCode?: string | null;
  size?: string | null;
  imageUrl?: string | null;
  price?: string | null;
  inStock: boolean;
};

type PrintfulProductDetail = PrintfulProduct & {
  techniques: string[];
  placements: string[];
  variants: PrintfulVariant[];
};

type PrintfulPublication = {
  id: string;
  storeId?: string | null;
  storeName: string;
  status: string;
  providerSyncProductId?: string | null;
  errorMessage?: string | null;
  lastSyncedAt?: string | null;
};

const STEPS = [
  { id: 1, label: "Product", description: "Category and blank product" },
  { id: 2, label: "Variants", description: "Sizes, colors, and print setup" },
  { id: 3, label: "Stores", description: "Publishing destinations" },
  { id: 4, label: "Review", description: "Confirm and queue" },
] as const;

export function PrintfulPublishWizard({
  listingId,
  defaultPrice,
  onPublished,
}: {
  listingId: string;
  defaultPrice: string;
  onPublished?: () => void;
}) {
  const feedback = useDashboardFeedback();
  const [step, setStep] = useState(1);
  const [stores, setStores] = useState<PrintfulStore[]>([]);
  const [categories, setCategories] = useState<PrintfulCategory[]>([]);
  const [products, setProducts] = useState<PrintfulProduct[]>([]);
  const [productTotal, setProductTotal] = useState(0);
  const [productOffset, setProductOffset] = useState(0);
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [product, setProduct] = useState<PrintfulProductDetail | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<number[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [technique, setTechnique] = useState("dtg");
  const [placement, setPlacement] = useState("front");
  const [retailPrice, setRetailPrice] = useState(defaultPrice);
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [retryTarget, setRetryTarget] = useState<PrintfulPublication | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [publications, setPublications] = useState<PrintfulPublication[]>([]);
  const [publicationRefresh, setPublicationRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadSetup() {
      setLoadingSetup(true);
      setError("");
      try {
        const [nextStores, nextCategories] = await Promise.all([
          api.get<PrintfulStore[]>("/admin/printful/stores"),
          api.get<PrintfulCategory[]>("/admin/printful/categories"),
        ]);
        if (cancelled) return;
        setStores(nextStores);
        setCategories(nextCategories);
        const supportedStores = nextStores.filter((store) => store.directPublishingSupported);
        setSelectedStores(supportedStores.length === 1 ? [supportedStores[0]!.id] : []);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Printful connection could not be loaded.");
      } finally {
        if (!cancelled) setLoadingSetup(false);
      }
    }
    void loadSetup();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timeout: number | undefined;
    async function loadPublications() {
      try {
        const rows = await api.get<PrintfulPublication[]>(`/admin/printful/listings/${listingId}/publications`);
        if (cancelled) return;
        setPublications(rows);
        if (rows.some((row) => row.status === "QUEUED" || row.status === "PUBLISHING")) {
          timeout = window.setTimeout(loadPublications, 3000);
        }
      } catch {
        // Catalog setup errors already have a dedicated alert; status polling can retry after the next publish.
      }
    }
    void loadPublications();
    return () => {
      cancelled = true;
      if (timeout) window.clearTimeout(timeout);
    };
  }, [listingId, publicationRefresh]);

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
        const response = await api.get<{ items: PrintfulProduct[]; paging?: { total: number; offset: number; limit: number } }>(`/admin/printful/catalog-products?${params.toString()}`, {
          signal: controller.signal,
        });
        setProducts(response.items);
        setProductTotal(response.paging?.total ?? response.items.length);
        setProductOffset((response.paging?.offset ?? 0) + (response.paging?.limit ?? 100));
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

  const selectedCategory = categories.find((category) => String(category.id) === categoryId);
  const selectableVariants = product?.variants.filter((variant) => variant.inStock) ?? [];
  const selectedVariantRows = product?.variants.filter((variant) => selectedVariants.includes(variant.id)) ?? [];
  const selectedStoreRows = stores.filter((store) => selectedStores.includes(store.id));
  const supportedStores = stores.filter((store) => store.directPublishingSupported);
  const canContinue =
    step === 1 ? Boolean(product) :
    step === 2 ? selectedVariants.length > 0 && Boolean(technique) && Boolean(placement) && Number(retailPrice) > 0 :
    step === 3 ? selectedStores.length > 0 :
    true;

  const variantGroups = useMemo(() => {
    const groups = new Map<string, PrintfulVariant[]>();
    for (const variant of product?.variants ?? []) {
      const color = variant.color || "Default";
      groups.set(color, [...(groups.get(color) ?? []), variant]);
    }
    return [...groups.entries()];
  }, [product]);

  async function chooseProduct(item: PrintfulProduct) {
    setLoadingProduct(true);
    setError("");
    try {
      const detail = await api.get<PrintfulProductDetail>(`/admin/printful/catalog-products/${item.id}`);
      setProduct(detail);
      const available = detail.variants.filter((variant) => variant.inStock).map((variant) => variant.id);
      setSelectedVariants(available);
      setTechnique(detail.techniques.includes("dtg") ? "dtg" : detail.techniques[0] ?? "dtg");
      setPlacement(detail.placements.includes("front") ? "front" : detail.placements[0] ?? "front");
      setStep(2);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Printful product details could not be loaded.");
    } finally {
      setLoadingProduct(false);
    }
  }

  async function loadMoreProducts() {
    if (!categoryId || loadingProducts || productOffset >= productTotal) return;
    setLoadingProducts(true);
    setError("");
    try {
      const params = new URLSearchParams({ categoryId, limit: "100", offset: String(productOffset) });
      if (search.trim()) params.set("search", search.trim());
      const response = await api.get<{ items: PrintfulProduct[]; paging?: { total: number; offset: number; limit: number } }>(
        `/admin/printful/catalog-products?${params.toString()}`,
      );
      setProducts((current) => [...current, ...response.items.filter((item) => !current.some((existing) => existing.id === item.id))]);
      setProductTotal(response.paging?.total ?? response.items.length);
      setProductOffset((response.paging?.offset ?? productOffset) + (response.paging?.limit ?? 100));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "More Printful products could not be loaded.");
    } finally {
      setLoadingProducts(false);
    }
  }

  function toggleVariant(variantId: number) {
    setSelectedVariants((current) =>
      current.includes(variantId) ? current.filter((id) => id !== variantId) : [...current, variantId],
    );
  }

  function toggleStore(storeId: string) {
    if (!stores.find((store) => store.id === storeId)?.directPublishingSupported) return;
    setSelectedStores((current) =>
      current.includes(storeId) ? current.filter((id) => id !== storeId) : [...current, storeId],
    );
  }

  async function retryPublication() {
    if (!retryTarget) return false;
    setRetrying(true);
    setError("");
    try {
      await api.post(`/admin/printful/publications/${retryTarget.id}/retry`, {});
      setMessage(`${retryTarget.storeName} was queued for retry.`);
      feedback.success({ title: "Printful retry queued", description: retryTarget.storeName });
      setPublicationRefresh((value) => value + 1);
      setRetryTarget(null);
      return true;
    } catch (cause) {
      setError(feedback.error(cause, { title: "Could not retry Printful publication", fallback: "The Printful publication could not be retried." }));
      return false;
    } finally {
      setRetrying(false);
    }
  }

  async function publish() {
    if (!product) return false;
    setPublishing(true);
    setError("");
    setMessage("");
    try {
      const response = await api.post<{ publications: Array<{ id: string }> }>(`/admin/printful/listings/${listingId}/publish`, {
        catalogProductId: product.id,
        variantIds: selectedVariants,
        storeIds: selectedStores,
        rashpodProductType: product.typeName || product.type || selectedCategory?.title || "Printful product",
        placement,
        technique,
        retailPrice,
      });
      setMessage(`${response.publications.length} Printful publication${response.publications.length === 1 ? "" : "s"} queued.`);
      feedback.success({
        title: "Printful publishing queued",
        description: `${response.publications.length} store publication${response.publications.length === 1 ? "" : "s"} will be processed.`,
      });
      setPublicationRefresh((value) => value + 1);
      setStep(4);
      onPublished?.();
      return true;
    } catch (cause) {
      setError(feedback.error(cause, { title: "Could not queue Printful publishing", fallback: "Printful publishing could not be queued." }));
      return false;
    } finally {
      setPublishing(false);
    }
  }

  return (
    <Card className="space-y-6 border-brand-blue/20 bg-brand-blue/[0.025]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-blue">
            <StoreIcon size={18} aria-hidden="true" />
            <p className="text-xs font-bold uppercase tracking-[0.14em]">Printful publishing</p>
          </div>
          <h3 className="mt-2 text-xl font-semibold text-brand-ink">Choose a product and publish to connected stores</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-brand-muted">
            Browse the live Printful catalog, select sellable variants, then choose every store that should receive this product.
          </p>
        </div>
        {loadingSetup ? (
          <StatusBadge status="PROCESSING" label="Connecting" />
        ) : (
          <StatusBadge
            status={supportedStores.length ? "READY" : "BLOCKED"}
            label={`${supportedStores.length}/${stores.length} ready`}
          />
        )}
      </div>

      <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Printful publishing progress">
        {STEPS.map((item) => {
          const completed = step > item.id;
          const active = step === item.id;
          return (
            <li
              key={item.id}
              aria-current={active ? "step" : undefined}
              className={`rounded-2xl border px-4 py-3 ${
                active ? "border-brand-blue bg-white shadow-sm" : completed ? "border-semantic-success/30 bg-semantic-successBg" : "border-surface-borderSoft bg-white/60"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${active ? "bg-brand-blue text-white" : completed ? "bg-semantic-success text-white" : "bg-brand-bg text-brand-muted"}`}>
                  {completed ? <Check size={15} aria-hidden="true" /> : item.id}
                </span>
                <span className="text-sm font-semibold text-brand-ink">{item.label}</span>
              </div>
              <p className="mt-1 pl-9 text-xs text-brand-muted">{item.description}</p>
            </li>
          );
        })}
      </ol>

      {error ? (
        <div role="alert" className="rounded-2xl border border-semantic-danger/25 bg-semantic-dangerBg px-4 py-3 text-sm text-semantic-dangerText">
          <p className="font-semibold">Printful needs attention</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : null}
      {message ? (
        <div aria-live="polite" className="flex items-center gap-2 rounded-2xl border border-semantic-success/25 bg-semantic-successBg px-4 py-3 text-sm font-medium text-semantic-successText">
          <CheckCircle2 size={18} aria-hidden="true" /> {message}
        </div>
      ) : null}

      {publications.length ? (
        <section aria-labelledby="printful-publication-status" className="rounded-2xl border border-surface-borderSoft bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 id="printful-publication-status" className="font-semibold text-brand-ink">Connected-store publication status</h4>
              <p className="mt-1 text-xs text-brand-muted">Updates automatically while Printful publishing is in progress.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setPublicationRefresh((value) => value + 1)}>
              <RefreshCw size={14} aria-hidden="true" /> Refresh
            </Button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {publications.map((publication) => (
              <div key={publication.id} className="rounded-xl border border-surface-borderSoft px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-brand-ink">{publication.storeName}</p>
                    <p className="mt-0.5 text-xs text-brand-muted">Store {publication.storeId ?? "—"}</p>
                  </div>
                  <StatusBadge status={publication.status} />
                </div>
                {publication.providerSyncProductId ? <p className="mt-2 text-xs text-brand-muted">Sync product {publication.providerSyncProductId}</p> : null}
                {publication.errorMessage ? <p role="alert" className="mt-2 text-xs text-semantic-dangerText">{publication.errorMessage}</p> : null}
                {publication.status === "FAILED" ? (
                  <Button className="mt-3" size="sm" variant="secondary" onClick={() => setRetryTarget(publication)}>
                    <RefreshCw size={14} aria-hidden="true" /> Retry safely
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section aria-labelledby="printful-product-step" className="space-y-4">
          <div>
            <h4 id="printful-product-step" className="font-semibold text-brand-ink">1. Choose a Printful category and product</h4>
            <p className="mt-1 text-sm text-brand-muted">Products are loaded directly from the connected Printful account.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(220px,0.8fr)_minmax(260px,1.2fr)]">
            <label className="text-sm font-medium text-brand-ink">
              Category
              <Select className="mt-2 h-12" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setProduct(null); }}>
                <option value="">Select a category</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}
              </Select>
            </label>
            <label className="text-sm font-medium text-brand-ink">
              Search this category
              <span className="relative mt-2 block">
                <Search className="pointer-events-none absolute left-3 top-3.5 text-brand-muted" size={18} aria-hidden="true" />
                <Input className="h-12 pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Product name, brand, or type" />
              </span>
            </label>
          </div>
          {loadingProducts ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading Printful products">
              {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-64 animate-pulse rounded-2xl bg-brand-bg motion-reduce:animate-none" />)}
            </div>
          ) : products.length ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void chooseProduct(item)}
                  disabled={loadingProduct}
                  className="group min-h-56 overflow-hidden rounded-2xl border border-surface-borderSoft bg-white text-left transition hover:-translate-y-0.5 hover:border-brand-blue/50 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-brand-blue/20 disabled:cursor-wait disabled:opacity-60 motion-reduce:transform-none"
                >
                  <div className="flex aspect-[16/9] items-center justify-center bg-brand-bg">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt="" loading="lazy" className="h-full w-full object-contain p-3" />
                    ) : <Package size={36} className="text-brand-muted" aria-hidden="true" />}
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-brand-ink group-hover:text-brand-blue">{item.title}</p>
                    <p className="mt-1 text-xs text-brand-muted">{[item.brand, item.typeName, `${item.variantCount || "Multiple"} variants`].filter(Boolean).join(" · ")}</p>
                  </div>
                </button>
                ))}
              </div>
              {productOffset < productTotal ? (
                <div className="flex justify-center">
                  <Button variant="secondary" onClick={() => void loadMoreProducts()} disabled={loadingProducts}>
                    <RefreshCw size={16} aria-hidden="true" /> Load more products
                  </Button>
                </div>
              ) : null}
            </>
          ) : categoryId ? (
            <div className="rounded-2xl border border-dashed border-surface-borderSoft px-6 py-10 text-center">
              <Package className="mx-auto text-brand-muted" size={30} aria-hidden="true" />
              <p className="mt-3 font-semibold text-brand-ink">No products found</p>
              <p className="mt-1 text-sm text-brand-muted">Try another search or category.</p>
              {productOffset < productTotal ? (
                <Button className="mt-4" variant="secondary" onClick={() => void loadMoreProducts()} disabled={loadingProducts}>
                  <RefreshCw size={16} aria-hidden="true" /> Search more products
                </Button>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {step === 2 && product ? (
        <section aria-labelledby="printful-variant-step" className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 id="printful-variant-step" className="font-semibold text-brand-ink">2. Select variants and print configuration</h4>
              <p className="mt-1 text-sm text-brand-muted">{product.title} · {selectedVariants.length} of {selectableVariants.length} available variants selected</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setSelectedVariants(selectableVariants.map((variant) => variant.id))}>Select all</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedVariants([])}>Clear</Button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm font-medium text-brand-ink">
              Print technique
              <Select className="mt-2 h-12" value={technique} onChange={(event) => setTechnique(event.target.value)}>
                {(product.techniques.length ? product.techniques : ["dtg"]).map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}
              </Select>
            </label>
            <label className="text-sm font-medium text-brand-ink">
              Placement
              <Select className="mt-2 h-12" value={placement} onChange={(event) => setPlacement(event.target.value)}>
                {(product.placements.length ? product.placements : ["front"]).map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}
              </Select>
            </label>
            <label className="text-sm font-medium text-brand-ink">
              Retail price (USD)
              <Input className="mt-2 h-12" type="number" min="0.01" step="0.01" value={retailPrice} onChange={(event) => setRetailPrice(event.target.value)} />
            </label>
          </div>
          <div className="space-y-4">
            {variantGroups.map(([color, variants]) => (
              <fieldset key={color} className="rounded-2xl border border-surface-borderSoft bg-white p-4">
                <legend className="px-1 text-sm font-semibold text-brand-ink">{color}</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {variants.map((variant) => {
                    const selected = selectedVariants.includes(variant.id);
                    return (
                      <label key={variant.id} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${selected ? "border-brand-blue bg-brand-blue/5 text-brand-ink" : "border-surface-borderSoft text-brand-muted"} ${!variant.inStock ? "cursor-not-allowed opacity-45" : ""}`}>
                        <input type="checkbox" checked={selected} disabled={!variant.inStock} onChange={() => toggleVariant(variant.id)} />
                        <span>{variant.size || variant.name}</span>
                        {!variant.inStock ? <span className="text-xs">(unavailable)</span> : null}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section aria-labelledby="printful-store-step" className="space-y-4">
          <div>
            <h4 id="printful-store-step" className="font-semibold text-brand-ink">3. Choose connected Printful stores</h4>
            <p className="mt-1 text-sm text-brand-muted">Each selected store receives its own independently tracked publication.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {stores.map((store) => {
              const selected = selectedStores.includes(store.id);
              const supported = store.directPublishingSupported;
              return (
                <label key={store.id} className={`flex min-h-24 items-start gap-3 rounded-2xl border bg-white p-4 ${selected ? "border-brand-blue shadow-sm" : "border-surface-borderSoft"} ${supported ? "cursor-pointer" : "cursor-not-allowed opacity-65"}`}>
                  <input className="mt-1" type="checkbox" checked={selected} disabled={!supported} onChange={() => toggleStore(store.id)} />
                  <span>
                    <span className="block font-semibold text-brand-ink">{store.name}</span>
                    <span className="mt-1 block text-xs uppercase tracking-wide text-brand-muted">{store.type} · Store {store.id}</span>
                    {store.website ? <span className="mt-1 block break-all text-xs text-brand-blue">{store.website}</span> : null}
                    {!supported ? (
                      <span className="mt-2 block text-xs font-medium text-semantic-warningText">
                        Requires this platform&apos;s connector before Printful sync.
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
          {!stores.length && !loadingSetup ? (
            <div className="rounded-2xl border border-dashed border-semantic-warning/40 bg-semantic-warningBg px-5 py-6 text-sm text-semantic-warningText">
              No accessible Printful stores were returned. Verify the token scopes and store connection before publishing.
            </div>
          ) : null}
          {stores.length > 0 && supportedStores.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-semantic-warning/40 bg-semantic-warningBg px-5 py-6 text-sm text-semantic-warningText">
              None of the connected stores use Printful&apos;s native Manual orders/API platform. Add a native store or configure the required ecommerce-platform connector.
            </div>
          ) : null}
        </section>
      ) : null}

      {step === 4 && product ? (
        <section aria-labelledby="printful-review-step" className="space-y-4">
          <div>
            <h4 id="printful-review-step" className="font-semibold text-brand-ink">4. Review the publication</h4>
            <p className="mt-1 text-sm text-brand-muted">Publishing is queued in the worker so every target store is tracked and retryable.</p>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ReviewItem label="Product" value={product.title} />
            <ReviewItem label="Variants" value={`${selectedVariantRows.length} selected`} />
            <ReviewItem label="Print setup" value={`${technique.toUpperCase()} · ${placement}`} />
            <ReviewItem label="Retail price" value={`$${retailPrice}`} />
          </dl>
          <div>
            <p className="text-sm font-semibold text-brand-ink">Target stores</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedStoreRows.map((store) => <span key={store.id} className="rounded-pill border border-brand-blue/25 bg-white px-3 py-1.5 text-xs font-semibold text-brand-ink">{store.name}</span>)}
            </div>
          </div>
        </section>
      ) : null}

      {product ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-borderSoft pt-5">
          <Button variant="secondary" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1 || publishing}>
            <ArrowLeft size={16} aria-hidden="true" /> Back
          </Button>
          {step < 4 ? (
            <Button onClick={() => setStep((current) => Math.min(4, current + 1))} disabled={!canContinue || publishing}>
              Continue <ArrowRight size={16} aria-hidden="true" />
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => { setStep(1); setProduct(null); setMessage(""); }}>
                <RefreshCw size={16} aria-hidden="true" /> Choose another product
              </Button>
              <Button variant="primaryPeach" onClick={() => setConfirmOpen(true)} disabled={!canContinue || publishing}>
                <Send size={16} aria-hidden="true" /> Publish to {selectedStores.length} store{selectedStores.length === 1 ? "" : "s"}
              </Button>
            </div>
          )}
        </div>
      ) : null}

      <ModeratorActionDialog
        open={confirmOpen}
        title={`Publish to ${selectedStores.length} Printful store${selectedStores.length === 1 ? "" : "s"}?`}
        description={`${product?.title ?? "This product"} with ${selectedVariants.length} variants will be created in every selected store. Each destination will be queued and tracked separately.`}
        confirmLabel="Queue Printful publications"
        busy={publishing}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          if (await publish()) setConfirmOpen(false);
        }}
      />
      <ModeratorActionDialog
        open={Boolean(retryTarget)}
        title={`Retry ${retryTarget?.storeName ?? "this Printful publication"}?`}
        description="RashPOD will reuse stable external product identifiers. If Printful already created the product, it will be updated instead of duplicated."
        confirmLabel="Queue safe retry"
        busy={retrying}
        onCancel={() => setRetryTarget(null)}
        onConfirm={async () => {
          await retryPublication();
        }}
      />
    </Card>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-surface-borderSoft bg-white px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-brand-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-brand-ink">{value}</dd>
    </div>
  );
}
