"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageSquare,
  Package,
  ShoppingBag,
  Star,
  Truck,
} from "lucide-react";
import { ErrorState, Skeleton, getApiBase } from "@rashpod/ui";
import { useCart } from "../../../../components/cart/CartProvider";
import { COLOR_SWATCHES, swatchStyle } from "../../../../lib/product-swatches";
import { api } from "../../../../lib/api";

type ProductDetail = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  price: number;
  currency?: string;
  imageUrl?: string | null;
  images?: string[];
  type?: string;
  designer: {
    id?: string;
    displayName: string;
    handle: string;
    avatarUrl?: string | null;
  };
  variants?: {
    sizes?: string[];
    colors?: string[];
  };
  reviews?: {
    average: number;
    count: number;
  };
};

type ListingCard = {
  id: string;
  slug: string;
  title: string;
  price: number;
  currency?: string;
  imageUrl?: string | null;
  designer?: { displayName?: string };
};

const FALLBACK_IMAGE_KEYS = ["mockup-main", "mockup-side", "mockup-flat", "mockup-pack"];

const DEFAULT_SIZES = ["Small", "Medium", "Large", "XL", "XXL"];

export default function ProductPageClient({
  slug,
  initialProduct = null,
  initialRelated = [],
}: {
  slug: string;
  initialProduct?: ProductDetail | null;
  initialRelated?: ListingCard[];
}) {
  const apiBase = getApiBase();
  const { addItem } = useCart();
  const [product, setProduct] = useState<ProductDetail | null>(initialProduct);
  const [related, setRelated] = useState<ListingCard[]>(initialRelated);
  const [loading, setLoading] = useState(!initialProduct);
  const [error, setError] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_SWATCHES[0].label);
  const [selectedSize, setSelectedSize] = useState(DEFAULT_SIZES[0]);
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);

  useEffect(() => {
    if (initialProduct) {
      setSelectedSize(initialProduct.variants?.sizes?.[0] || DEFAULT_SIZES[0]);
      setSelectedColor(initialProduct.variants?.colors?.[0] || COLOR_SWATCHES[0].label);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`${apiBase}/shop/listings/${slug}`);
        if (!res.ok) throw new Error("Product not found");
        const data = (await res.json()) as ProductDetail;
        if (cancelled) return;
        setProduct(data);
        setSelectedSize(data.variants?.sizes?.[0] || DEFAULT_SIZES[0]);
        setSelectedColor(data.variants?.colors?.[0] || COLOR_SWATCHES[0].label);

        const relatedRes = await fetch(`${apiBase}/shop/listings?limit=4`);
        if (relatedRes.ok) {
          const rows = (await relatedRes.json()) as ListingCard[] | { items?: ListingCard[] };
          const items = Array.isArray(rows) ? rows : rows.items || [];
          setRelated(items.filter((item) => item.slug !== slug).slice(0, 4));
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [apiBase, slug, initialProduct]);

  useEffect(() => {
    if (!product?.id) return;
    let cancelled = false;
    async function loadWishlistStatus() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const data = (await res.json()) as { user?: unknown };
        if (!data.user || cancelled) return;
        const status = await api.get<{ wishlisted: boolean }>(`/customer/wishlist/${product!.id}/status`);
        if (!cancelled) setWishlisted(status.wishlisted);
      } catch {
        if (!cancelled) setWishlisted(false);
      }
    }
    void loadWishlistStatus();
    return () => {
      cancelled = true;
    };
  }, [product?.id]);

  const images = useMemo(() => {
    const productImages = product?.images?.filter(Boolean) || [];
    if (product?.imageUrl && !productImages.includes(product.imageUrl)) productImages.unshift(product.imageUrl);
    return productImages;
  }, [product]);

  if (loading) {
    return (
      <div className="mx-auto max-w-storefront px-5 py-8">
        <Skeleton className="mb-8 h-10 w-[410px] rounded-[9px]" />
        <div className="grid gap-24 lg:grid-cols-[520px_1fr]">
          <Skeleton className="aspect-[0.86] rounded-[30px]" />
          <div className="space-y-5">
            <Skeleton className="h-9 w-44" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-storefront px-5 py-20">
        <ErrorState title="Product not found" description="We could not find this product." />
      </div>
    );
  }

  const price = toMoney(product.price, product.currency);
  const relatedCards = related;
  const sizes = product.variants?.sizes?.length ? product.variants.sizes : DEFAULT_SIZES;

  async function toggleWishlist() {
    if (!product || wishlistBusy) return;
    setWishlistBusy(true);
    try {
      if (wishlisted) {
        await api.delete(`/customer/wishlist/${product.id}`);
        setWishlisted(false);
      } else {
        await api.post("/customer/wishlist", { listingId: product.id });
        setWishlisted(true);
      }
    } catch {
      window.location.href = `/auth/login?next=${encodeURIComponent(`/product/${product.slug}`)}`;
    } finally {
      setWishlistBusy(false);
    }
  }

  function handleAddToCart() {
    addItem({
      listingId: product!.id,
      slug: product!.slug,
      title: product!.title,
      price: toCartPrice(product!.price),
      imageUrl: images[selectedImage],
      designerName: product!.designer.displayName,
      size: selectedSize,
      color: selectedColor,
      material: "cotton",
      printSide: "front",
      quantity,
    });
  }

  return (
    <>
    <div className="bg-white pb-24 lg:pb-12">
      <div className="mx-auto max-w-storefront px-4 pb-12 pt-4 sm:px-5">
        <BreadcrumbTrail current="Products" />

        <section className="mt-7 grid gap-8 lg:grid-cols-[520px_1fr] lg:gap-24">
          <div>
            <div className="relative aspect-[0.88] overflow-hidden rounded-[31px] bg-brand-bg">
              {images[selectedImage] ? (
                <Image src={images[selectedImage]} alt={product.title} fill priority sizes="(max-width: 1024px) 100vw, 520px" className="object-cover" />
              ) : (
                <ProductImagePlaceholder />
              )}
            </div>
            <div className="mt-7 flex items-center gap-4">
              <button className="text-brand-peach" aria-label="Previous image" onClick={() => setSelectedImage((selectedImage - 1 + images.length) % images.length)}>
                <ChevronLeft size={34} strokeWidth={1.6} />
              </button>
              <div className="flex gap-4 overflow-x-auto">
                {(images.length ? images.slice(0, 4) : FALLBACK_IMAGE_KEYS).map((image, index) => (
                  <button
                    key={image}
                    onClick={() => setSelectedImage(index)}
                    aria-pressed={selectedImage === index}
                    className={`relative h-[83px] w-[92px] shrink-0 overflow-hidden rounded-[10px] border-2 ${selectedImage === index ? "border-brand-blue" : "border-transparent"}`}
                  >
                    {images[index] ? (
                      <Image src={images[index]} alt={`${product.title} preview ${index + 1}`} fill sizes="92px" className="object-cover" />
                    ) : (
                      <ProductImagePlaceholder compact />
                    )}
                  </button>
                ))}
              </div>
              <button className="text-brand-peach" aria-label="Next image" onClick={() => setSelectedImage((selectedImage + 1) % images.length)}>
                <ChevronRight size={34} strokeWidth={1.6} />
              </button>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-start justify-between gap-5">
              <div>
                <h1 className="text-h2 font-black lowercase leading-none text-brand-ink">{product.title}</h1>
                <p className="mt-4 max-w-[160px] text-body leading-tight text-brand-muted">designed by {product.designer.displayName}</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="grid h-[38px] min-w-[38px] place-items-center rounded-[10px] bg-brand-bg text-black"
                  aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                  aria-pressed={wishlisted}
                  disabled={wishlistBusy}
                  onClick={() => void toggleWishlist()}
                >
                  <Heart size={20} className={wishlisted ? "fill-brand-peach text-brand-peach" : "text-brand-peach"} />
                </button>
              </div>
            </div>

            <div className="mt-1 border-t border-brand-line py-5">
              <div className="flex flex-wrap items-center gap-5">
                <p className="text-h2 font-black text-brand-ink">{price}</p>
                {product.reviews?.average ? (
                  <span className="inline-flex h-[28px] items-center gap-2 rounded-full bg-brand-bg px-4 text-[13px] font-bold text-brand-peach">
                    <Star size={15} /> {product.reviews.average.toFixed(1)}
                  </span>
                ) : null}
                {product.reviews?.count ? (
                  <span className="inline-flex h-[28px] items-center gap-2 rounded-full bg-brand-bg px-4 text-[13px] font-bold text-brand-blue">
                    <MessageSquare size={15} /> {product.reviews.count} Reviews
                  </span>
                ) : null}
              </div>
            </div>

            <div className="border-t border-brand-line py-5">
              <h2 className="mb-4 text-body font-medium text-brand-ink">Choose a Color</h2>
              <div className="flex flex-wrap gap-5">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.label}
                    aria-label={swatch.label}
                    onClick={() => setSelectedColor(swatch.label)}
                    className={`grid h-[52px] w-[52px] place-items-center rounded-full ${selectedColor === swatch.label ? "ring-2 ring-brand-peachLight ring-offset-4" : ""}`}
                    style={swatchStyle(swatch.value)}
                  >
                    {selectedColor === swatch.label ? <Check size={26} className="text-white" /> : null}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-caption text-brand-ink">The colors may differ by up to 15% from what you see in the image.</p>
            </div>

            <div className="border-t border-brand-line py-5">
              <h2 className="mb-5 text-body font-medium text-brand-ink">Choose a Size</h2>
              <div className="flex flex-wrap gap-3">
                {sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-xs px-3 text-sm ${selectedSize === size ? "bg-brand-bg text-brand-blue" : "bg-brand-bg text-brand-ink"}`}
                  >
                    <span className={`h-4 w-4 rounded-full border ${selectedSize === size ? "border-brand-blue bg-brand-blue" : "border-brand-ink"}`} />
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden border-t border-brand-line py-5 lg:block">
              <div className="flex flex-wrap gap-4">
                <div className="inline-flex h-[53px] min-w-[140px] items-center justify-between rounded-md bg-brand-bg px-6 text-lg font-bold text-brand-ink">
                  <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity">-</button>
                  <span>{quantity}</span>
                  <button type="button" onClick={() => setQuantity(quantity + 1)} aria-label="Increase quantity">+</button>
                </div>
                <button type="button" onClick={handleAddToCart} className="h-[53px] min-w-[250px] rounded-md bg-brand-peach px-8 text-base font-bold text-white">
                  Add To Cart
                </button>
              </div>
            </div>

            <div className="rounded-md bg-brand-bg p-4">
              <DeliveryRow icon={<Truck size={19} />} title="Free Delivery" detail="Enter your Postal code for Delivery Availability" />
              <div className="my-4 h-px bg-brand-line" />
              <DeliveryRow icon={<ShoppingBag size={18} />} title="Return Delivery" detail="Free 30 days Delivery Return. Details" />
            </div>
          </div>
        </section>

        <ProductCopy description={product.description} title={product.title} />

        {relatedCards.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-6 text-[28px] font-black text-black">You Might Like</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {relatedCards.map((item) => <RelatedCard key={item.id} item={item} />)}
          </div>
        </section>
        ) : null}
      </div>
    </div>

    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-line bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-storefront items-center gap-3 px-1">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-brand-ink">{price}</p>
          <p className="truncate text-xs text-brand-muted">{selectedSize} · {selectedColor}</p>
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          className="ml-auto inline-flex h-12 min-w-[148px] shrink-0 items-center justify-center rounded-md bg-brand-peach px-5 text-sm font-bold text-white"
        >
          Add to cart
        </button>
      </div>
    </div>
    </>
  );
}

function BreadcrumbTrail({ current }: { current: string }) {
  return (
    <nav className="inline-flex min-h-10 max-w-full items-center gap-3 overflow-x-auto rounded-xs bg-brand-bg px-4 text-sm text-brand-text sm:gap-5 sm:text-base">
      {["Home", "Category", "Tshirts"].map((item) => (
        <span key={item} className="flex shrink-0 items-center gap-3 sm:gap-5">
          <Link href={item === "Home" ? "/" : "/shop"} className="hover:text-brand-blue">{item}</Link>
          <ChevronRight size={18} className="text-brand-subtle" />
        </span>
      ))}
      <span className="shrink-0 font-bold text-brand-ink">{current}</span>
    </nav>
  );
}

function DeliveryRow({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <div className="flex gap-4">
      <span className="mt-1 text-brand-peach">{icon}</span>
      <div>
        <h3 className="text-body font-bold text-brand-ink">{title}</h3>
        <p className="mt-1 text-sm text-brand-muted underline">{detail}</p>
      </div>
    </div>
  );
}

function ProductCopy({ description, title }: { description?: string | null; title: string }) {
  const paragraphs = description
    ? description.split(/\n{2,}/).filter(Boolean)
    : [
        `${title} is printed on demand by RashPOD using high-quality materials and local production.`,
        "Each order supports independent designers with transparent royalty tracking.",
      ];

  return (
    <section className="mt-16 max-w-[1040px] lg:mt-28">
      <h2 className="text-section font-bold text-brand-ink">Product Description</h2>
      <div className="mt-6 max-w-[1060px] space-y-4 text-body leading-relaxed text-brand-muted">
        {paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 48)}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}

function RelatedCard({ item }: { item: ListingCard }) {
  return (
    <Link href={`/product/${item.slug}`} className="block rounded-md bg-white p-4 shadow-soft sm:p-6">
      <div className="relative aspect-[0.95] overflow-hidden rounded-[22px] bg-brand-bg">
        {item.imageUrl ? <Image src={item.imageUrl} alt={item.title} fill sizes="280px" className="object-cover" /> : <Package className="m-auto h-full w-20 text-brand-blue" />}
      </div>
      <h3 className="mt-5 text-body font-bold text-brand-ink">{item.title}</h3>
      <p className="mt-4 text-caption text-brand-muted">Designed by {item.designer?.displayName ?? "Designer"}</p>
    </Link>
  );
}


function ProductImagePlaceholder({ compact }: { compact?: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-brand-bg">
      <div className={compact ? "relative h-12 w-12 rounded-md bg-white" : "relative h-[72%] w-[72%] rounded-[28px] bg-white shadow-soft"}>
        <Package className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-brand-blue" />
        {!compact ? null : null}
      </div>
    </div>
  );
}

function toCartPrice(price: number) {
  if (!Number.isFinite(price) || price <= 0) return 71.56;
  return price > 1000 ? Math.round(price / 100) / 100 : price;
}

function toMoney(price: number, currency?: string) {
  if (!Number.isFinite(price) || price <= 0) return "$71.56";
  if (currency && currency !== "USD" && price > 1000) return `${Math.round(price).toLocaleString()} ${currency}`;
  return `$${toCartPrice(price).toFixed(2)}`;
}
