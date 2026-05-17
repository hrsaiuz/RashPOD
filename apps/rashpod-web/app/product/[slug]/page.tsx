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

const COLOR_SWATCHES = [
  { label: "Peach", value: "#ead7c5" },
  { label: "Lime", value: "#bfd676" },
  { label: "Periwinkle", value: "#aab4f6" },
  { label: "Pink", value: "#f5c2ea" },
  { label: "Sage", value: "linear-gradient(180deg, #e1bda8 0 49%, #9cac7c 50% 100%)" },
];

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
  const [selectedColor, setSelectedColor] = useState(COLOR_SWATCHES[0].label);
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
      <div className="mx-auto max-w-[1232px] px-5 py-8">
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
      <div className="mx-auto max-w-[1232px] px-5 py-20">
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
      quantity,
    });
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-[1232px] px-5 pb-12 pt-4">
        <BreadcrumbTrail current="Products" />

        <section className="mt-7 grid gap-24 lg:grid-cols-[520px_1fr]">
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
                <h1 className="text-[30px] font-black lowercase leading-none text-black">{product.title}</h1>
                <p className="mt-4 max-w-[160px] text-[16px] leading-[1.05] text-[#50505B]">designed by {product.designer.displayName}</p>
              </div>
              <div className="flex gap-3">
                <IconPill><Heart size={20} className="text-brand-peach" /></IconPill>
                <IconPill><Bookmark size={21} /></IconPill>
                <IconPill><Share2 size={20} /></IconPill>
              </div>
            </div>

            <div className="mt-1 border-t border-[#DFE3F5] py-5">
              <div className="flex flex-wrap items-center gap-5">
                <div>
                  <p className="text-[30px] font-black text-black">{price}</p>
                  <p className="text-[18px] text-[#858585] line-through">{oldPrice}</p>
                </div>
                <span className="inline-flex h-[28px] items-center gap-2 rounded-full bg-brand-bg px-4 text-[13px] font-bold text-brand-peach">
                  <Star size={15} /> 4.8
                </span>
                <span className="inline-flex h-[28px] items-center gap-2 rounded-full bg-brand-bg px-4 text-[13px] font-bold text-brand-blue">
                  <MessageSquare size={15} /> 67 Reviews
                </span>
              </div>
              <p className="mt-2 text-[14px] text-[#8A8A8A]"><span className="font-bold text-[#36A349]">93%</span> of buyers have recommended this.</p>
            </div>

            <div className="border-t border-[#DFE3F5] py-5">
              <h2 className="mb-4 text-[16px] font-medium text-[#33333A]">Choose a Color</h2>
              <div className="flex flex-wrap gap-5">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.label}
                    aria-label={swatch.label}
                    onClick={() => setSelectedColor(swatch.label)}
                    className={`grid h-[52px] w-[52px] place-items-center rounded-full ${selectedColor === swatch.label ? "ring-2 ring-[#EBD9C9] ring-offset-4" : ""}`}
                    style={{ background: swatch.value }}
                  >
                    {selectedColor === swatch.label ? <Check size={26} className="text-white" /> : null}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-[12px] text-[#33333A]">The colors may differ by up to 15% from what you see in the image.</p>
            </div>

            <div className="border-t border-[#DFE3F5] py-5">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-[16px] font-medium text-[#33333A]">Choose a Size</h2>
                <button className="text-[15px] text-[#33333A]">Size Guide</button>
              </div>
              <div className="flex flex-wrap gap-3">
                {DEFAULT_SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`inline-flex h-[28px] items-center gap-2 rounded-[6px] px-3 text-[14px] ${selectedSize === size ? "bg-brand-bg text-brand-blue" : "bg-brand-bg text-[#33333A]"}`}
                  >
                    <span className={`h-4 w-4 rounded-full border ${selectedSize === size ? "border-brand-blue bg-brand-blue" : "border-[#33333A]"}`} />
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-[#DFE3F5] py-5">
              <div className="flex flex-wrap gap-4">
                <div className="inline-flex h-[53px] min-w-[140px] items-center justify-between rounded-[14px] bg-brand-bg px-6 text-[18px] font-black text-black">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                  <span>{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)}>+</button>
                </div>
                <button onClick={handleAddToCart} className="h-[53px] min-w-[250px] rounded-[14px] bg-brand-peach px-8 text-[16px] font-bold text-white">
                  Add To Cart
                </button>
              </div>
            </div>

            <div className="rounded-[10px] bg-brand-bg p-4">
              <DeliveryRow icon={<Truck size={19} />} title="Free Delivery" detail="Enter your Postal code for Delivery Availability" />
              <div className="my-4 h-px bg-[#E8EBF8]" />
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
  );
}

function BreadcrumbTrail({ current }: { current: string }) {
  return (
    <nav className="inline-flex min-h-[39px] items-center gap-5 rounded-[9px] bg-brand-bg px-4 text-[18px] text-[#3B3B43]">
      {["Home", "Category", "Tshirts"].map((item) => (
        <span key={item} className="contents">
          <Link href={item === "Home" ? "/" : "/shop"}>{item}</Link>
          <ChevronRight size={21} strokeWidth={2.1} />
        </span>
      ))}
      <span className="font-bold text-black">{current}</span>
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
        <h3 className="text-[16px] font-black text-black">{title}</h3>
        <p className="mt-1 text-[13px] text-[#555] underline">{detail}</p>
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
    <section className="mt-28 max-w-[1040px]">
      <h2 className="text-[28px] font-black text-black">Product Description</h2>
      <p className="mt-6 max-w-[1060px] text-[17px] leading-[1.65] text-[#8A8A8A]">
        When it's colder than the far side of the moon and spitting rain too, you've still got to look good.
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
      <h2 className="text-[28px] font-black text-black">{title}</h2>
      <ul className="mt-6 space-y-5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-4 text-[17px] text-[#8A8A8A]">
            <span className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full ${blue ? "bg-brand-bg text-brand-blue" : "bg-[#EEF0F7] text-black"}`}>
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
    <Link href={`/product/${item.slug}`} className="block rounded-[13px] bg-white p-6 shadow-[0_18px_35px_rgba(0,0,0,0.14)]">
      <div className="relative aspect-[0.95] overflow-hidden rounded-[22px] bg-brand-bg">
        {item.imageUrl ? <Image src={item.imageUrl} alt={item.title} fill sizes="280px" className="object-cover" /> : <Package className="m-auto h-full w-20 text-brand-blue" />}
        <span className="absolute left-6 top-6 rounded-[7px] bg-[#D67AD2] px-2 py-1 text-[9px] font-bold text-white">Best Seller</span>
      </div>
      <h3 className="mt-5 text-[16px] font-black text-black">CLASSIC&nbsp; Black T-Shirt</h3>
      <p className="mt-2 text-[13px] text-black">high quality, 100% cotton, perfect for vibrant</p>
      <p className="mt-4 text-[11px] text-[#8A8A8A]">Designed by Shuwaan</p>
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
    <div className="flex h-full w-full items-center justify-center bg-[#F0F2FA]">
      <div className={compact ? "relative h-12 w-12 rounded-[12px] bg-white" : "relative h-[72%] w-[72%] rounded-[28px] bg-white shadow-soft"}>
        <Package className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-brand-blue" />
        {!compact ? <span className="absolute left-8 top-8 rounded-[7px] bg-[#D67AD2] px-2 py-1 text-[10px] font-bold text-white">Best Seller</span> : null}
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
