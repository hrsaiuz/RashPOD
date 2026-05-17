"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeDollarSign,
  Gift,
  PackageCheck,
  Tags,
} from "lucide-react";
import { getApiBase, getDashboardUrl } from "@rashpod/ui";

interface ProductListing {
  id: string;
  slug: string;
  title: string;
  designer: string;
  price: number;
  imageUrl?: string;
  category?: string;
}

interface Designer {
  id: string;
  handle: string;
  displayName: string;
  listingsCount: number;
  avatarUrl?: string;
  location?: string;
}

interface HomeBrandingMedia {
  homeHeroImageUrl?: string;
  homeHeroImageAlt?: string;
  homeDesignerSectionImageUrl?: string;
  homeDesignerSectionImageAlt?: string;
}

const FALLBACK_PRODUCTS: ProductListing[] = [
  { id: "p1", slug: "classic-black-t-shirt", title: "CLASSIC Black T-Shirt", designer: "Shuwaan", price: 159000, category: "Funny Quets" },
  { id: "p2", slug: "samarkand-white-t-shirt", title: "CLASSIC Black T-Shirt", designer: "Shuwaan", price: 169000, category: "Admired People" },
  { id: "p3", slug: "black-signature-t-shirt", title: "CLASSIC Black T-Shirt", designer: "Shuwaan", price: 179000, category: "Uzbakistan Cities" },
  { id: "p4", slug: "postal-stamp-t-shirt", title: "CLASSIC Black T-Shirt", designer: "Shuwaan", price: 159000, category: "Funny Quets" },
  { id: "p5", slug: "black-quets-t-shirt", title: "FUNNY QUETS", designer: "Shuwaan", price: 159000, category: "Funny Quets" },
  { id: "p6", slug: "admired-people-tee", title: "ADMIRED PEOPLE", designer: "Shuwaan", price: 169000, category: "Admired People" },
  { id: "p7", slug: "uzbakistan-cities-tee", title: "UZBAKISTAN CITIES", designer: "Shuwaan", price: 179000, category: "Uzbakistan Cities" },
  { id: "p8", slug: "new-black-quets-t-shirt", title: "FUNNY QUETS", designer: "Shuwaan", price: 159000, category: "Funny Quets" },
];

const FALLBACK_DESIGNERS: Designer[] = [
  { id: "d1", handle: "aziz", displayName: "Aziz", listingsCount: 24, location: "Tashkent" },
  { id: "d2", handle: "nargiza", displayName: "Nargiza", listingsCount: 18, location: "Bukhara" },
  { id: "d3", handle: "madina", displayName: "Madina", listingsCount: 31, location: "Samarkand" },
  { id: "d4", handle: "nilufar", displayName: "Nilufar", listingsCount: 14, location: "Samarkand" },
  { id: "d5", handle: "jasur", displayName: "Jasur", listingsCount: 21, location: "Tashkent" },
  { id: "d6", handle: "kamila", displayName: "Kamila", listingsCount: 15, location: "Andijan" },
];

const MARKETPLACES = [
  { label: "a", name: "Amazon", className: "font-serif text-[74px]" },
  { label: "Etsy", name: "Etsy", className: "font-serif text-[44px]" },
  { label: "S", name: "Shopify", className: "font-serif text-[60px]" },
  { label: "U", name: "Uz marketplace", className: "text-[54px] font-semibold" },
  { label: "wb", name: "Wildberries", className: "text-[48px] font-semibold" },
];

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

const getOptionalString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined;

const normalizeProducts = (data: unknown): ProductListing[] => {
  const rows = Array.isArray(data) ? data : Array.isArray((data as { items?: unknown })?.items) ? (data as { items: unknown[] }).items : [];

  return rows
    .map((item: any) => ({
      id: String(item.id ?? ""),
      slug: String(item.slug ?? item.id ?? ""),
      title: String(item.title ?? "CLASSIC Black T-Shirt"),
      designer: String(item.designer?.displayName ?? item.designerName ?? "Shuwaan"),
      price: Number(item.price ?? 0),
      imageUrl: getOptionalString(item.imageUrl) ?? (Array.isArray(item.images) ? getOptionalString(item.images[0]) : undefined),
      category: getOptionalString(item.category) ?? getOptionalString(item.productType?.name),
    }))
    .filter((item) => item.id && item.slug)
    .slice(0, 8);
};

const normalizeDesigners = (data: unknown): Designer[] => {
  const rows = Array.isArray(data) ? data : Array.isArray((data as { items?: unknown })?.items) ? (data as { items: unknown[] }).items : [];

  return rows
    .map((item: any) => ({
      id: String(item.id ?? ""),
      handle: String(item.handle ?? item.id ?? ""),
      displayName: String(item.displayName ?? item.name ?? "Designer"),
      listingsCount: Number(item.listingsCount ?? item._count?.listings ?? 0),
      avatarUrl: getOptionalString(item.avatarUrl),
      location: getOptionalString(item.city) ?? getOptionalString(item.location),
    }))
    .filter((designer) => designer.id && designer.handle && designer.displayName)
    .slice(0, 6);
};

export default function HomePage() {
  const dashboardUrl = getDashboardUrl();
  const apiBase = getApiBase();

  const [products, setProducts] = useState<ProductListing[]>(FALLBACK_PRODUCTS);
  const [designers, setDesigners] = useState<Designer[]>(FALLBACK_DESIGNERS);
  const [homeMedia, setHomeMedia] = useState<HomeBrandingMedia>({});

  useEffect(() => {
    const controller = new AbortController();
    const opts = { signal: controller.signal };

    fetch(`${apiBase}/shop/listings?limit=8`, opts)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const mapped = normalizeProducts(data);
        if (mapped.length) setProducts(mapped);
      })
      .catch(() => undefined);

    fetch(`${apiBase}/shop/designers?limit=6`, opts)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const mapped = normalizeDesigners(data);
        if (mapped.length) setDesigners(mapped);
      })
      .catch(() => undefined);

    fetch(`${apiBase}/branding`, opts)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || typeof data !== "object") return;
        const theme = typeof data.theme === "object" && data.theme ? data.theme : {};
        setHomeMedia({
          homeHeroImageUrl: getOptionalString(data.homeHeroImageUrl) ?? getOptionalString((theme as Record<string, unknown>).homeHeroImageUrl),
          homeHeroImageAlt: getOptionalString(data.homeHeroImageAlt) ?? getOptionalString((theme as Record<string, unknown>).homeHeroImageAlt),
          homeDesignerSectionImageUrl:
            getOptionalString(data.homeDesignerSectionImageUrl) ??
            getOptionalString((theme as Record<string, unknown>).homeDesignerSectionImageUrl),
          homeDesignerSectionImageAlt:
            getOptionalString(data.homeDesignerSectionImageAlt) ??
            getOptionalString((theme as Record<string, unknown>).homeDesignerSectionImageAlt),
        });
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [apiBase]);

  const collections = useMemo(() => products.slice(4, 8).concat(products.slice(0, Math.max(0, 4 - products.slice(4, 8).length))).slice(0, 4), [products]);

  return (
    <div className="bg-white text-brand-ink">
      <FigmaHero media={homeMedia} dashboardUrl={dashboardUrl} />
      <ServiceStrip />
      <HomepageProductCarousel title="Bestselling Designs" products={products.slice(0, 4)} badge="Best Seller" />
      <MarketplaceLogoStrip />
      <CollectionCarousel products={collections} />
      <ClubCta dashboardUrl={dashboardUrl} />
      <DesignerCarousel designers={designers} media={homeMedia} />
      <ActionCards dashboardUrl={dashboardUrl} />
    </div>
  );
}

function FigmaHero({ media, dashboardUrl }: { media: HomeBrandingMedia; dashboardUrl: string }) {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="mx-auto grid min-h-[900px] max-w-[1450px] grid-cols-1 items-center gap-8 px-6 pb-8 pt-16 lg:grid-cols-[0.48fr_0.52fr] lg:px-10 lg:pt-8">
        <motion.div {...fadeUp} className="relative z-10 max-w-[610px]">
          <h1 className="leading-none tracking-[0] text-brand-ink">
            <span className="block text-[clamp(30px,3vw,42px)] font-normal">Shop original</span>
            <span className="relative mt-1 block text-[clamp(86px,7.4vw,132px)] font-normal leading-[0.86] text-brand-peach">
              <span className="absolute left-2 top-[48%] h-[0.2em] w-[0.2em] rounded-full border-[0.06em] border-brand-blue" aria-hidden="true" />
              designs
            </span>
            <span className="block text-center text-[clamp(50px,4.2vw,72px)] font-normal leading-[0.82] text-brand-blue">
              Sell your own
            </span>
            <span className="block text-center text-[clamp(34px,3.1vw,48px)] font-normal leading-[1.12]">
              Printed on demand
            </span>
          </h1>
          <p className="mt-12 max-w-[610px] text-[21px] leading-[1.52] text-brand-ink">
            Discover unique products by independent designers - or upload your own artwork and earn royalties with RashPOD's local print-on-demand system.
          </p>
          <div className="mt-14 flex flex-wrap gap-6">
            <a
              href={`${dashboardUrl}/auth/register?role=designer`}
              className="inline-flex h-[88px] min-w-[222px] items-center justify-center rounded-[22px] bg-brand-blue px-10 text-[19px] font-extrabold tracking-[0.12em] text-white shadow-none transition-transform hover:scale-[1.02]"
            >
              Start Selling
            </a>
            <Link
              href="/shop"
              className="inline-flex h-[88px] min-w-[222px] items-center justify-center rounded-[22px] bg-brand-peach px-10 text-[19px] font-extrabold tracking-[0.12em] text-white shadow-none transition-transform hover:scale-[1.02]"
            >
              RashPOD Shop
            </Link>
          </div>
          <p className="mt-6 text-[17px] text-brand-ink">Local production - Transparent royalties - Made in Uzbekistan</p>
        </motion.div>

        <motion.div
          {...fadeUp}
          className={media.homeHeroImageUrl ? "relative min-h-[650px] lg:min-h-[850px]" : "hidden min-h-[650px] lg:block lg:min-h-[850px]"}
          aria-hidden={!media.homeHeroImageUrl}
        >
          {media.homeHeroImageUrl ? (
            <Image
              src={media.homeHeroImageUrl}
              alt={media.homeHeroImageAlt ?? "RashPOD designers and product artwork"}
              fill
              priority
              sizes="(min-width: 1024px) 760px, 100vw"
              className="relative z-10 object-contain object-bottom"
            />
          ) : null}
        </motion.div>
      </div>
      <p className="absolute bottom-8 left-0 text-[23px] uppercase text-brand-subtle">Best Selling 2</p>
    </section>
  );
}

function ServiceStrip() {
  const services = [
    { label: "Designed\nby creators", icon: Gift, shape: "flower" },
    { label: "Produced\nlocally", icon: PackageCheck, shape: "arch" },
    { label: "Sold\non demand", icon: Tags, shape: "flower" },
    { label: "Royalties\ntracked", icon: BadgeDollarSign, shape: "pin" },
  ];

  return (
    <section className="bg-white py-14">
      <div className="mx-auto grid max-w-[1450px] grid-cols-1 gap-6 px-6 md:grid-cols-2 xl:grid-cols-4">
        {services.map(({ label, icon: Icon, shape }) => (
          <div key={label} className="relative flex h-[128px] items-center overflow-hidden rounded-[16px] bg-[#EEF1FA] px-8">
            <ServiceShape shape={shape} />
            <Icon className="relative z-10 mr-10 h-[78px] w-[78px] stroke-[1.25] text-brand-ink" />
            <p className="relative z-10 whitespace-pre-line text-[34px] leading-[1.1] tracking-[0] text-brand-ink">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ServiceShape({ shape }: { shape: string }) {
  if (shape === "arch") {
    return <div className="absolute left-0 top-0 h-full w-[118px] rounded-r-full bg-brand-blueLight" aria-hidden="true" />;
  }
  if (shape === "pin") {
    return <div className="absolute left-6 top-6 h-[102px] w-[102px] rotate-45 rounded-[42px_42px_70px_42px] bg-brand-blueLight" aria-hidden="true" />;
  }
  return (
    <div className="absolute left-0 top-0 h-[128px] w-[128px]" aria-hidden="true">
      {Array.from({ length: 12 }).map((_, index) => (
        <span
          key={index}
          className="absolute left-[54px] top-[10px] h-[56px] w-[22px] origin-[11px_54px] rounded-full bg-brand-blueLight"
          style={{ transform: `rotate(${index * 30}deg)` }}
        />
      ))}
    </div>
  );
}

function HomepageProductCarousel({ title, products, badge }: { title: string; products: ProductListing[]; badge: string }) {
  return (
    <section className="bg-white py-10">
      <SectionHeader title={title} href="/shop" />
      <div className="mx-auto flex max-w-[1450px] snap-x gap-6 overflow-x-auto px-6 pb-8 pt-2 xl:grid xl:grid-cols-4 xl:overflow-visible">
        {products.map((product, index) => (
          <Link key={`${product.id}-${index}`} href={`/product/${product.slug}`} className="min-w-[300px] snap-start xl:min-w-0">
            <FigmaProductCard product={product} badge={badge} secondaryBadge={index === 1 ? "new" : undefined} />
          </Link>
        ))}
      </div>
    </section>
  );
}

function FigmaProductCard({ product, badge, secondaryBadge }: { product: ProductListing; badge: string; secondaryBadge?: string }) {
  return (
    <motion.article
      whileHover={{ y: -4 }}
      className="h-full rounded-[18px] bg-white p-7 shadow-[0_16px_38px_rgba(0,0,0,0.14)]"
    >
      <div className="relative h-[314px] overflow-hidden rounded-[32px] bg-[#F0F2FA]">
        <span className="absolute left-6 top-6 z-10 rounded-[8px] bg-[#D877CF] px-3 py-2 text-[10px] font-bold text-white">{badge}</span>
        {secondaryBadge && <span className="absolute left-6 top-[66px] z-10 rounded-[8px] bg-[#3473C4] px-3 py-2 text-[10px] font-bold text-white">{secondaryBadge}</span>}
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.title} fill sizes="320px" className="object-cover" />
        ) : (
          <ProductPlaceholder dark={product.slug.includes("black")} />
        )}
      </div>
      <h3 className="mt-6 text-[17px] font-extrabold tracking-[-0.01em] text-black">{product.title}</h3>
      <p className="mt-3 text-[14px] text-black">high quality, 100% cotton, perfect for vibrant</p>
      <p className="mt-4 text-[11px] text-[#777]">Designed by {product.designer}</p>
    </motion.article>
  );
}

function ProductPlaceholder({ dark }: { dark?: boolean }) {
  return (
    <div className={`absolute inset-0 ${dark ? "bg-[#162216]" : "bg-white"}`} aria-hidden="true">
      <div className={`absolute left-1/2 top-0 h-[360px] w-[260px] -translate-x-1/2 rounded-b-[70px] ${dark ? "bg-black" : "bg-white"} shadow-[inset_0_0_40px_rgba(0,0,0,0.09)]`} />
      <div className="absolute left-1/2 top-[42%] h-[74px] w-[74px] -translate-x-1/2 rounded-[18px] border-[6px] border-brand-peach bg-brand-blueLight" />
      <div className="absolute left-1/2 top-[58%] h-2 w-20 -translate-x-1/2 rounded-full bg-brand-peach" />
    </div>
  );
}

function MarketplaceLogoStrip() {
  return (
    <section className="overflow-x-auto bg-white py-8">
      <div className="mx-auto flex w-max min-w-full max-w-[1250px] items-center justify-between gap-10 px-8">
        {MARKETPLACES.map((logo) => (
          <div key={logo.name} className="grid h-[84px] min-w-[110px] place-items-center text-brand-ink drop-shadow-[2px_3px_0_rgba(120,138,224,0.28)]" aria-label={logo.name}>
            <span className={logo.className}>{logo.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CollectionCarousel({ products }: { products: ProductListing[] }) {
  return (
    <section className="bg-white py-12">
      <SectionHeader title="New Collections" href="/shop?sort=new" />
      <div className="mx-auto flex max-w-[1450px] snap-x gap-6 overflow-x-auto px-6 pb-8 pt-2 xl:grid xl:grid-cols-4 xl:overflow-visible">
        {products.map((product, index) => (
          <Link key={`${product.id}-collection-${index}`} href={`/product/${product.slug}`} className="min-w-[300px] snap-start xl:min-w-0">
            <article className="rounded-[16px] bg-[#EEF1FA] p-7">
              <div className="relative h-[318px] overflow-hidden rounded-[32px] bg-white">
                <span className="absolute left-5 top-6 z-10 rounded-[8px] bg-[#3473C4] px-3 py-2 text-[10px] font-bold lowercase text-white">new</span>
                {product.imageUrl ? (
                  <Image src={product.imageUrl} alt={product.title} fill sizes="320px" className="object-cover" />
                ) : (
                  <ProductPlaceholder dark={index === 0 || index === 3} />
                )}
              </div>
              <h3 className="mt-4 text-[17px] font-extrabold uppercase text-black">{product.category ?? product.title}</h3>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ClubCta({ dashboardUrl }: { dashboardUrl: string }) {
  return (
    <section className="relative my-16 overflow-hidden bg-[#F0F2FA] py-16">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-14 top-0 h-[96px] w-[96px] rounded-br-full bg-brand-blue" />
        <div className="absolute left-[17%] bottom-0 h-[128px] w-[158px] rounded-t-full border-[48px] border-brand-blue" />
        <div className="absolute left-[32%] -top-2 h-[58px] w-[156px] rounded-b-[28px] bg-brand-peachLight" />
        <div className="absolute right-[8%] bottom-0 h-[142px] w-[132px] rounded-t-full bg-brand-peach" />
        <div className="absolute -right-2 top-0 h-[118px] w-[118px] rounded-full border-[14px] border-dashed border-brand-blue" />
      </div>
      <div className="relative mx-auto grid max-w-[1300px] grid-cols-1 items-center gap-8 px-6 text-center md:grid-cols-3">
        <p className="text-[21px] tracking-[0.17em] text-black">Be the first to get the next drop</p>
        <div>
          <h2 className="mb-12 text-[31px] font-extrabold text-black">Join the RASH POD Club</h2>
          <a
            href={`${dashboardUrl}/auth/register`}
            className="relative inline-flex h-16 min-w-[166px] items-center justify-center rounded-[18px] bg-brand-blue px-9 text-[20px] font-extrabold tracking-[0.08em] text-white"
          >
            join Now
            <span className="absolute -right-4 -top-4 text-[48px] leading-none text-brand-peach">*</span>
          </a>
        </div>
        <p className="text-[19px] text-black">Receive a mystery design every month</p>
      </div>
    </section>
  );
}

function DesignerCarousel({ designers, media }: { designers: Designer[]; media: HomeBrandingMedia }) {
  const shown = designers.slice(0, 5);
  const center = shown[2] ?? shown[0] ?? FALLBACK_DESIGNERS[2];

  return (
    <section className="bg-white py-12">
      <SectionHeader title="Meet Our Wonderful Designers" href="/designers" />
      <div className="mx-auto flex max-w-[1450px] gap-5 overflow-x-auto px-6 pb-8 pt-2 xl:grid xl:grid-cols-[0.9fr_0.9fr_1.9fr_0.9fr_0.9fr] xl:overflow-visible">
        {shown.map((designer, index) =>
          index === 2 ? (
            <FeaturedDesignerCard key={designer.id} designer={center} imageUrl={media.homeDesignerSectionImageUrl} alt={media.homeDesignerSectionImageAlt} />
          ) : (
            <SideDesignerCard key={designer.id} designer={designer} index={index} />
          ),
        )}
      </div>
      <p className="text-[23px] uppercase text-brand-subtle">Designers 6</p>
    </section>
  );
}

function SideDesignerCard({ designer, index }: { designer: Designer; index: number }) {
  return (
    <Link href={`/designer/${designer.handle}`} className="group min-w-[220px] overflow-hidden rounded-[8px] border border-black bg-brand-blueLight xl:min-w-0">
      <div className="relative h-[760px] overflow-hidden">
        <div className="absolute inset-x-[10%] bottom-[8%] h-[560px] rounded-t-full bg-brand-peach transition-transform duration-300 group-hover:scale-105" />
        {designer.avatarUrl ? (
          <Image src={designer.avatarUrl} alt={designer.displayName} fill sizes="230px" className="grayscale object-cover object-bottom transition-transform duration-300 group-hover:scale-110" />
        ) : (
          <PortraitFallback gender={index % 2 === 0 ? "male" : "female"} />
        )}
      </div>
    </Link>
  );
}

function FeaturedDesignerCard({ designer, imageUrl, alt }: { designer: Designer; imageUrl?: string; alt?: string }) {
  return (
    <Link href={`/designer/${designer.handle}`} className="group min-w-[470px] overflow-hidden rounded-[8px] bg-brand-blueLight xl:min-w-0">
      <article className="relative h-[760px] overflow-hidden p-9">
        <div className="relative z-20">
          <h3 className="text-[42px] font-black uppercase leading-none text-black">{designer.displayName}</h3>
          <p className="mt-3 text-[16px] text-black">from</p>
          <p className="ml-8 text-[20px] text-black">{designer.location ?? "Samarkand"}</p>
        </div>
        <div className="absolute right-9 top-8 z-20 flex flex-col items-end gap-3">
          <span className="rounded-[9px] bg-[#D877CF] px-3 py-2 text-[11px] font-bold uppercase text-white">UIUX Designer</span>
          <span className="rounded-[9px] bg-[#2E70B8] px-3 py-2 text-[11px] font-bold uppercase text-white">Graphic Designer</span>
        </div>
        <div className="absolute left-[18%] top-[20%] h-[460px] w-[360px] rounded-[46%] border-[12px] border-brand-blue" />
        {imageUrl ? (
          <Image src={imageUrl} alt={alt ?? designer.displayName} fill sizes="480px" className="z-10 object-cover object-bottom transition-transform duration-500 group-hover:scale-110" />
        ) : (
          <PortraitFallback featured />
        )}
        <div className="absolute inset-x-0 bottom-0 z-30 flex h-[176px] items-center justify-center bg-white/58 backdrop-blur-md">
          <span className="rounded-[8px] bg-brand-peach px-8 py-4 text-[16px] font-bold text-white">{designer.displayName}'s Designs</span>
        </div>
      </article>
    </Link>
  );
}

function PortraitFallback({ gender, featured }: { gender?: "male" | "female"; featured?: boolean }) {
  return (
    <div className="absolute inset-0 z-10 transition-transform duration-500 group-hover:scale-110" aria-hidden="true">
      <div className={`${featured ? "left-[37%] top-[24%] h-[132px] w-[132px]" : "left-[27%] top-[20%] h-[126px] w-[126px]"} absolute rounded-full bg-[#E9C5B4]`} />
      <div className={`${featured ? "left-[34%] top-[18%] h-[172px] w-[190px]" : "left-[18%] top-[16%] h-[170px] w-[170px]"} absolute rounded-t-full ${gender === "male" ? "bg-[#1d1d1d]" : "bg-[#171717]"}`} />
      <div className={`${featured ? "left-[21%] bottom-[0] h-[470px] w-[320px] bg-white" : "left-[12%] bottom-0 h-[470px] w-[190px] bg-white"} absolute rounded-t-[80px] grayscale`} />
      <div className={`${featured ? "left-[49%] top-[42%] h-[32px] w-[110px]" : "left-[41%] top-[37%] h-[22px] w-[74px]"} absolute rounded-full bg-brand-peach`} />
    </div>
  );
}

function ActionCards({ dashboardUrl }: { dashboardUrl: string }) {
  const cards = [
    {
      titleTop: "DESIG",
      titleBottom: "NERS",
      body: "Upload artwork, publish products, and earn royalties without handling inventory",
      href: `${dashboardUrl}/auth/register?role=designer`,
      cta: "Start selling",
      className: "bg-brand-peach text-black",
      button: "bg-[#EEF1FA] text-black",
    },
    {
      titleTop: "custom",
      titleBottom: "ORDERS",
      body: "Create branded products for teams, events, campaigns, and corporate gifts",
      href: "/corporate",
      cta: "Request a quote",
      className: "bg-[#303137] text-white",
      button: "bg-brand-blue text-white",
    },
    {
      titleTop: "your",
      titleBottom: "BUSINESS",
      body: "Order ready-to-press films for apparel, stickers, packaging, and production runs",
      href: "/film",
      cta: "Explore films",
      className: "bg-[#F0F2FA] text-black",
      button: "bg-[#303137] text-white",
    },
    {
      titleTop: "SHOP",
      titleBottom: "now",
      body: "Buy apparel, original products by independent designers",
      href: "/shop",
      cta: "RASHPOD SHOP",
      className: "bg-brand-blue text-white",
      button: "bg-brand-peach text-white",
    },
  ];

  return (
    <section className="bg-white pb-20 pt-10">
      <div className="mx-auto max-w-[1450px] px-6">
        <h2 className="mb-10 text-[clamp(34px,3.2vw,46px)] font-normal text-black">Shop, design, order, or produce with RashPOD</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <Link key={card.titleTop} href={card.href} className={`relative flex h-[760px] flex-col overflow-hidden rounded-[8px] p-0 ${card.className}`}>
              <div className="pt-6 text-[clamp(64px,6vw,92px)] font-black uppercase leading-[0.78] tracking-[-0.06em]">
                <span className="block">{card.titleTop}</span>
                <span className="block">{card.titleBottom}</span>
              </div>
              <p className="mx-auto mt-auto max-w-[280px] pb-44 text-center text-[21px] font-medium leading-[1.25]">{card.body}</p>
              <span className={`absolute bottom-[102px] left-1/2 inline-flex h-16 -translate-x-1/2 items-center justify-center whitespace-nowrap rounded-[18px] px-7 text-[18px] font-extrabold tracking-[0.12em] ${card.button}`}>
                {card.cta}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="mx-auto mb-7 flex max-w-[1450px] items-center justify-between px-6">
      <h2 className="text-[clamp(36px,3vw,42px)] font-normal leading-tight text-black">{title}</h2>
      <Link href={href} className="grid h-[62px] w-[62px] place-items-center rounded-full border border-brand-peach text-brand-peach transition-colors hover:bg-brand-peach hover:text-white" aria-label={`View ${title}`}>
        <ArrowRight size={38} strokeWidth={1.4} />
      </Link>
    </div>
  );
}
