"use client";

import { use, useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageSquare,
  Package,
  Share2,
  ShoppingBag,
  Star,
  Truck,
} from "lucide-react";
import { ErrorState, Skeleton, getApiBase } from "@rashpod/ui";
import { useCart } from "../../../components/cart/CartProvider";
import { COLOR_SWATCHES, swatchStyle } from "../../../lib/product-swatches";

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

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const apiBase = getApiBase();
  const { addItem } = useCart();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [related, setRelated] = useState<ListingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_SWATCHES[0].label);
  const [selectedSize, setSelectedSize] = useState(DEFAULT_SIZES[0]);
  const [quantity, setQuantity] = useState(5);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`${apiBase}/shop/listings/${slug}`, { next: { revalidate: 60 } });
        if (!res.ok) throw new Error("Product not found");
        const data = (await res.json()) as ProductDetail;
        if (cancelled) return;
        setProduct(data);
        setSelectedSize(data.variants?.sizes?.[0] || DEFAULT_SIZES[0]);
        setSelectedColor(data.variants?.colors?.[0] || COLOR_SWATCHES[0].label);

        const relatedRes = await fetch(`${apiBase}/shop/listings?limit=4`, { next: { revalidate: 60 } });
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
  }, [apiBase, slug]);

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
  const oldPrice = toMoney(product.price, product.currency);
  const relatedCards = related.length ? related : createFallbackRelated(product);

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
                <IconPill><Heart size={20} className="text-brand-peach" /></IconPill>
                <IconPill><Bookmark size={21} /></IconPill>
                <IconPill><Share2 size={20} /></IconPill>
              </div>
            </div>

            <div className="mt-1 border-t border-brand-line py-5">
              <div className="flex flex-wrap items-center gap-5">
                <div>
                  <p className="text-h2 font-black text-brand-ink">{price}</p>
                  <p className="text-body text-brand-subtle line-through">{oldPrice}</p>
                </div>
                <span className="inline-flex h-[28px] items-center gap-2 rounded-full bg-brand-bg px-4 text-[13px] font-bold text-brand-peach">
                  <Star size={15} /> 4.8
                </span>
                <span className="inline-flex h-[28px] items-center gap-2 rounded-full bg-brand-bg px-4 text-[13px] font-bold text-brand-blue">
                  <MessageSquare size={15} /> 67 Reviews
                </span>
              </div>
              <p className="mt-2 text-sm text-brand-muted"><span className="font-bold text-semantic-successText">93%</span> of buyers have recommended this.</p>
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
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-body font-medium text-brand-ink">Choose a Size</h2>
                <button type="button" className="min-h-11 text-body text-brand-ink">Size Guide</button>
              </div>
              <div className="flex flex-wrap gap-3">
                {DEFAULT_SIZES.map((size) => (
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

        <ProductCopy />

        <section className="mt-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-[28px] font-black text-black">You Might Like</h2>
            <button className="grid h-[52px] w-[52px] place-items-center rounded-full border border-brand-peach text-brand-peach" aria-label="Next products">
              <ChevronRight size={34} />
            </button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {relatedCards.map((item) => <RelatedCard key={item.id} item={item} />)}
          </div>
        </section>
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

function IconPill({ children }: { children: ReactNode }) {
  return <button className="grid h-[38px] min-w-[38px] place-items-center rounded-[10px] bg-brand-bg text-black">{children}</button>;
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

function ProductCopy() {
  const benefits = [
    "Durable leather is easily cleanable so you can keep your look fresh.",
    "Water-repellent finish and internal membrane help keep your feet dry.",
    "Toe piece with star pattern adds durability.",
    "Synthetic insulation helps keep you warm.",
    "Originally designed for performance hoops, the Air unit delivers lightweight cushioning.",
    "Plush tongue wraps over the ankle to help keep out the moisture and cold.",
    "Rubber outsole with aggressive traction pattern adds durable grip.",
    "Durable leather is easily cleanable so you can keep your look fresh.",
  ];
  return (
    <section className="mt-16 max-w-[1040px] lg:mt-28">
      <h2 className="text-section font-bold text-brand-ink">Product Description</h2>
      <p className="mt-6 max-w-[1060px] text-body leading-relaxed text-brand-muted">
        When it&apos;s colder than the far side of the moon and spitting rain too, you&apos;ve still got to look good.
        From water-repellent leather to a rugged outsole, this product keeps your design bright, wearable,
        and ready for everyday movement.
      </p>
      <DetailList title="Benefits" items={benefits} blue />
      <DetailList title="Product Details" items={["Not intended for use as Personal Protective Equipment (PPE)", "Water-repellent finish and internal membrane help keep your feet dry."]} />
      <DetailList title="more Details" items={["Lunarlon midsole delivers ultra-plush responsiveness", "Encapsulated Air-Sole heel unit for lightweight cushioning", "Colour Shown: Ale Brown/Black/Goldtone/Ale Brown", "Style: 805899-202"]} />
    </section>
  );
}

function DetailList({ title, items, blue }: { title: string; items: string[]; blue?: boolean }) {
  return (
    <div className="mt-10">
      <h2 className="text-section font-bold text-brand-ink">{title}</h2>
      <ul className="mt-6 space-y-5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-4 text-body text-brand-muted">
            <span className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full ${blue ? "bg-brand-bg text-brand-blue" : "bg-brand-bg text-brand-ink"}`}>
              <Check size={14} strokeWidth={3} />
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RelatedCard({ item }: { item: ListingCard }) {
  return (
    <Link href={`/product/${item.slug}`} className="block rounded-md bg-white p-4 shadow-soft sm:p-6">
      <div className="relative aspect-[0.95] overflow-hidden rounded-[22px] bg-brand-bg">
        {item.imageUrl ? <Image src={item.imageUrl} alt={item.title} fill sizes="280px" className="object-cover" /> : <Package className="m-auto h-full w-20 text-brand-blue" />}
        <span className="absolute left-4 top-4 rounded-xs bg-brand-peach px-2 py-1 text-caption font-bold text-white sm:left-6 sm:top-6">Best Seller</span>
      </div>
      <h3 className="mt-5 text-body font-bold text-brand-ink">CLASSIC&nbsp; Black T-Shirt</h3>
      <p className="mt-2 text-sm text-brand-text">high quality, 100% cotton, perfect for vibrant</p>
      <p className="mt-4 text-caption text-brand-muted">Designed by Shuwaan</p>
    </Link>
  );
}

function createFallbackRelated(product: ProductDetail): ListingCard[] {
  return FALLBACK_IMAGE_KEYS.map((_, index) => ({
    id: `${product.id}-fallback-${index}`,
    slug: product.slug,
    title: product.title,
    price: product.price,
    currency: product.currency,
    imageUrl: null,
    designer: { displayName: product.designer.displayName },
  }));
}

function ProductImagePlaceholder({ compact }: { compact?: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-brand-bg">
      <div className={compact ? "relative h-12 w-12 rounded-md bg-white" : "relative h-[72%] w-[72%] rounded-[28px] bg-white shadow-soft"}>
        <Package className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-brand-blue" />
        {!compact ? <span className="absolute left-8 top-8 rounded-xs bg-brand-peach px-2 py-1 text-caption font-bold text-white">Best Seller</span> : null}
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
