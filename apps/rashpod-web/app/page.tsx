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
  { src: "/marketplaces/amazon.svg", name: "Amazon", width: 150, height: 49 },
  { src: "/marketplaces/etsy.svg", name: "Etsy", width: 126, height: 50 },
  { src: "/marketplaces/uzum.svg", name: "Uzum", width: 136, height: 52 },
  { src: "/marketplaces/wildberries.svg", name: "Wildberries", width: 158, height: 52 },
];

const HOME_MAX = "max-w-[1232px]";
const HOME_GUTTER = "px-5";

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
      <div className={`mx-auto grid min-h-[765px] ${HOME_MAX} grid-cols-1 items-center gap-7 ${HOME_GUTTER} pb-7 pt-14 lg:grid-cols-[0.48fr_0.52fr] lg:pt-7`}>
        <motion.div {...fadeUp} className="relative z-10 max-w-[520px]">
          <h1 className="leading-none tracking-[0] text-brand-ink">
            <span className="block text-[clamp(28px,2.55vw,36px)] font-normal">Shop original</span>
            <span className="relative mt-1 flex items-baseline text-[clamp(74px,6.3vw,112px)] font-normal leading-[0.86] text-brand-peach">
              <HeroLetter letter="d" decorated="target" />
              <HeroLetter letter="e" />
              <HeroLetter letter="s" />
              <HeroLetter letter="i" />
              <HeroLetter letter="g" decorated="wheel" />
              <HeroLetter letter="n" />
              <HeroLetter letter="s" />
            </span>
            <span className="block text-center text-[clamp(43px,3.55vw,61px)] font-normal leading-[0.82] text-brand-blue">
              Sell your own
            </span>
            <span className="block text-center text-[clamp(29px,2.64vw,41px)] font-normal leading-[1.12]">
              Printed on demand
            </span>
          </h1>
          <p className="mt-10 max-w-[520px] text-[18px] leading-[1.52] text-brand-ink">
            Discover unique products by independent designers - or upload your own artwork and earn royalties with RashPOD's local print-on-demand system.
          </p>
          <div className="mt-12 flex flex-wrap gap-5">
            <a
              href={`${dashboardUrl}/auth/register?role=designer`}
              className="inline-flex h-[75px] min-w-[189px] items-center justify-center rounded-[19px] bg-brand-blue px-9 text-[16px] font-extrabold tracking-[0.12em] text-white shadow-none transition-transform hover:scale-[1.02]"
            >
              Start Selling
            </a>
            <Link
              href="/shop"
              className="inline-flex h-[75px] min-w-[189px] items-center justify-center rounded-[19px] bg-brand-peach px-9 text-[16px] font-extrabold tracking-[0.12em] text-white shadow-none transition-transform hover:scale-[1.02]"
            >
              RashPOD Shop
            </Link>
          </div>
          <p className="mt-5 text-[15px] text-brand-ink">Local production - Transparent royalties - Made in Uzbekistan</p>
        </motion.div>

        <motion.div
          {...fadeUp}
          className={media.homeHeroImageUrl ? "relative min-h-[553px] lg:min-h-[723px]" : "hidden min-h-[553px] lg:block lg:min-h-[723px]"}
          aria-hidden={!media.homeHeroImageUrl}
        >
          {media.homeHeroImageUrl ? (
            <Image
              src={media.homeHeroImageUrl}
              alt={media.homeHeroImageAlt ?? "RashPOD designers and product artwork"}
              fill
              priority
              sizes="(min-width: 1024px) 646px, 100vw"
              className="relative z-10 object-contain object-bottom"
            />
          ) : null}
        </motion.div>
      </div>
      <p className="absolute bottom-7 left-0 text-[20px] uppercase text-brand-subtle">Best Selling 2</p>
    </section>
  );
}

function HeroLetter({ letter, decorated }: { letter: string; decorated?: "target" | "wheel" }) {
  return (
    <span className="relative inline-block">
      {letter}
      {decorated === "target" && (
        <span className="absolute left-[0.17em] top-[0.48em] grid h-[0.34em] w-[0.34em] -translate-y-1/2 place-items-center rounded-full bg-brand-blue" aria-hidden="true">
          <span className="grid h-[72%] w-[72%] place-items-center rounded-full bg-white">
            <span className="grid h-[62%] w-[62%] place-items-center rounded-full bg-brand-blue">
              <span className="h-[43%] w-[43%] rounded-full bg-white" />
            </span>
          </span>
        </span>
      )}
      {decorated === "wheel" && (
        <span className="absolute left-[0.34em] top-[0.47em] h-[0.34em] w-[0.34em] -translate-x-1/2 -translate-y-1/2 rounded-full" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, index) => (
            <span
              key={index}
              className="absolute left-1/2 top-1/2 h-[0.06em] w-[0.17em] origin-left rounded-full bg-brand-blue"
              style={{ transform: `rotate(${index * 45}deg)` }}
            />
          ))}
          {Array.from({ length: 8 }).map((_, index) => (
            <span
              key={index}
              className="absolute h-[0.085em] w-[0.085em] rounded-full bg-brand-blue"
              style={{
                left: `${50 + Math.cos((index * Math.PI) / 4) * 35}%`,
                top: `${50 + Math.sin((index * Math.PI) / 4) * 35}%`,
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
        </span>
      )}
    </span>
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
    <section className="bg-white py-12">
      <div className={`mx-auto grid ${HOME_MAX} grid-cols-1 gap-5 ${HOME_GUTTER} md:grid-cols-2 xl:grid-cols-4`}>
        {services.map(({ label, icon: Icon, shape }) => (
          <div key={label} className="relative flex h-[109px] items-center overflow-hidden rounded-[14px] bg-[#EEF1FA] px-7">
            <ServiceShape shape={shape} />
            <Icon className="relative z-10 mr-8 h-[66px] w-[66px] stroke-[1.25] text-brand-ink" />
            <p className="relative z-10 whitespace-pre-line text-[29px] leading-[1.1] tracking-[0] text-brand-ink">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ServiceShape({ shape }: { shape: string }) {
  if (shape === "arch") {
    return <div className="absolute left-0 top-0 h-full w-[100px] rounded-r-full bg-brand-blueLight" aria-hidden="true" />;
  }
  if (shape === "pin") {
    return <div className="absolute left-5 top-5 h-[87px] w-[87px] rotate-45 rounded-[36px_36px_60px_36px] bg-brand-blueLight" aria-hidden="true" />;
  }
  return (
    <div className="absolute left-0 top-0 h-[109px] w-[109px]" aria-hidden="true">
      {Array.from({ length: 12 }).map((_, index) => (
        <span
          key={index}
          className="absolute left-[46px] top-[9px] h-[48px] w-[19px] origin-[9px_46px] rounded-full bg-brand-blueLight"
          style={{ transform: `rotate(${index * 30}deg)` }}
        />
      ))}
    </div>
  );
}

function HomepageProductCarousel({ title, products, badge }: { title: string; products: ProductListing[]; badge: string }) {
  return (
    <section className="bg-white py-9">
      <SectionHeader title={title} href="/shop" />
      <div className={`mx-auto flex ${HOME_MAX} snap-x gap-5 overflow-x-auto ${HOME_GUTTER} pb-7 pt-2 xl:grid xl:grid-cols-4 xl:overflow-visible`}>
        {products.map((product, index) => (
          <Link key={`${product.id}-${index}`} href={`/product/${product.slug}`} className="min-w-[255px] snap-start xl:min-w-0">
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
      className="h-full rounded-[15px] bg-white p-6 shadow-[0_14px_32px_rgba(0,0,0,0.14)]"
    >
      <div className="relative h-[267px] overflow-hidden rounded-[27px] bg-[#F0F2FA]">
        <span className="absolute left-5 top-5 z-10 rounded-[7px] bg-[#D877CF] px-3 py-2 text-[9px] font-bold text-white">{badge}</span>
        {secondaryBadge && <span className="absolute left-5 top-[56px] z-10 rounded-[7px] bg-[#3473C4] px-3 py-2 text-[9px] font-bold text-white">{secondaryBadge}</span>}
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.title} fill sizes="272px" className="object-cover" />
        ) : (
          <ProductPlaceholder dark={product.slug.includes("black")} />
        )}
      </div>
      <h3 className="mt-5 text-[15px] font-extrabold tracking-[-0.01em] text-black">{product.title}</h3>
      <p className="mt-3 text-[12px] text-black">high quality, 100% cotton, perfect for vibrant</p>
      <p className="mt-3 text-[10px] text-[#777]">Designed by {product.designer}</p>
    </motion.article>
  );
}

function ProductPlaceholder({ dark }: { dark?: boolean }) {
  return (
    <div className={`absolute inset-0 ${dark ? "bg-[#162216]" : "bg-white"}`} aria-hidden="true">
      <div className={`absolute left-1/2 top-0 h-[306px] w-[221px] -translate-x-1/2 rounded-b-[60px] ${dark ? "bg-black" : "bg-white"} shadow-[inset_0_0_34px_rgba(0,0,0,0.09)]`} />
      <div className="absolute left-1/2 top-[42%] h-[63px] w-[63px] -translate-x-1/2 rounded-[15px] border-[5px] border-brand-peach bg-brand-blueLight" />
      <div className="absolute left-1/2 top-[58%] h-2 w-20 -translate-x-1/2 rounded-full bg-brand-peach" />
    </div>
  );
}

function MarketplaceLogoStrip() {
  return (
    <section className="overflow-x-auto bg-white py-7">
      <div className="mx-auto flex w-max min-w-full max-w-[1063px] items-center justify-between gap-9 px-5">
        {MARKETPLACES.map((logo) => (
          <div key={logo.name} className="grid h-[71px] min-w-[110px] place-items-center drop-shadow-[2px_3px_0_rgba(120,138,224,0.22)]">
            <Image src={logo.src} alt={logo.name} width={logo.width} height={logo.height} className="h-auto max-h-[56px] w-auto object-contain" />
          </div>
        ))}
      </div>
    </section>
  );
}

function CollectionCarousel({ products }: { products: ProductListing[] }) {
  return (
    <section className="bg-white py-10">
      <SectionHeader title="New Collections" href="/shop?sort=new" />
      <div className={`mx-auto flex ${HOME_MAX} snap-x gap-5 overflow-x-auto ${HOME_GUTTER} pb-7 pt-2 xl:grid xl:grid-cols-4 xl:overflow-visible`}>
        {products.map((product, index) => (
          <Link key={`${product.id}-collection-${index}`} href={`/product/${product.slug}`} className="min-w-[255px] snap-start xl:min-w-0">
            <article className="rounded-[14px] bg-[#EEF1FA] p-6">
              <div className="relative h-[270px] overflow-hidden rounded-[27px] bg-white">
                <span className="absolute left-4 top-5 z-10 rounded-[7px] bg-[#3473C4] px-3 py-2 text-[9px] font-bold lowercase text-white">new</span>
                {product.imageUrl ? (
                  <Image src={product.imageUrl} alt={product.title} fill sizes="272px" className="object-cover" />
                ) : (
                  <ProductPlaceholder dark={index === 0 || index === 3} />
                )}
              </div>
              <h3 className="mt-3 text-[15px] font-extrabold uppercase text-black">{product.category ?? product.title}</h3>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ClubCta({ dashboardUrl }: { dashboardUrl: string }) {
  return (
    <section className="relative my-14 overflow-hidden bg-white">
      <div className="relative h-[272px] bg-[#F0F2FA] pt-[54px]">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-10 top-0 h-[82px] w-[82px] rounded-br-full bg-brand-blue" />
        <div className="absolute left-[17%] bottom-0 h-[109px] w-[134px] rounded-t-full border-[41px] border-brand-blue" />
        <div className="absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-[38%] gap-0">
          {Array.from({ length: 4 }).map((_, index) => (
            <span key={index} className="h-[72px] w-[41px] rounded-b-full bg-brand-peachLight" />
          ))}
        </div>
        <div className="absolute right-[9%] bottom-0 h-[121px] w-[112px] rounded-t-full bg-brand-peach">
          <span className="absolute left-1/2 top-[-36px] h-[54px] w-[50px] -translate-x-1/2 bg-brand-peach" />
        </div>
        <div className="absolute -right-6 top-0 h-[125px] w-[125px]">
          {Array.from({ length: 28 }).map((_, index) => (
            <span
              key={index}
              className="absolute left-1/2 top-1/2 h-[7px] w-[73px] origin-left bg-brand-blue"
              style={{ transform: `rotate(${index * 12.85}deg)` }}
            />
          ))}
        </div>
      </div>
      <div className="relative mx-auto grid max-w-[1105px] grid-cols-1 items-start gap-7 px-5 text-center md:grid-cols-3">
        <p className="pt-[104px] text-[18px] tracking-[0.17em] text-black">Be the first to get the next drop</p>
        <div>
          <h2 className="mb-[58px] text-[26px] font-extrabold text-black">Join the RASH POD Club</h2>
          <a
            href={`${dashboardUrl}/auth/register`}
            className="relative inline-flex h-[67px] min-w-[176px] items-center justify-center rounded-[18px] bg-brand-blue px-9 text-[20px] font-extrabold tracking-[0.08em] text-white"
          >
            join Now
            <span className="absolute -right-4 -top-4 text-[48px] leading-none text-brand-peach">*</span>
          </a>
        </div>
        <p className="pt-[104px] text-[18px] text-black">Receive a mystery design every month</p>
      </div>
      </div>
      <div className="h-[68px] bg-white" />
    </section>
  );
}

function DesignerCarousel({ designers, media }: { designers: Designer[]; media: HomeBrandingMedia }) {
  const shown = designers.slice(0, 5);
  const center = shown[2] ?? shown[0] ?? FALLBACK_DESIGNERS[2];

  return (
    <section className="bg-white py-10">
      <SectionHeader title="Meet Our Wonderful Designers" href="/designers" />
      <div className={`mx-auto flex ${HOME_MAX} gap-5 overflow-x-auto ${HOME_GUTTER} pb-7 pt-2 xl:overflow-visible`}>
        {shown.map((designer, index) =>
          index === 2 ? (
            <FeaturedDesignerCard key={designer.id} designer={center} imageUrl={media.homeDesignerSectionImageUrl} alt={media.homeDesignerSectionImageAlt} />
          ) : (
            <SideDesignerCard key={designer.id} designer={designer} index={index} />
          ),
        )}
      </div>
      <p className="text-[20px] uppercase text-brand-subtle">Designers 6</p>
    </section>
  );
}

function SideDesignerCard({ designer, index }: { designer: Designer; index: number }) {
  return (
    <Link href={`/designer/${designer.handle}`} className="group min-w-[187px] flex-[0_0_187px] overflow-hidden rounded-[8px] border border-black bg-brand-blueLight transition-[flex-basis,transform] duration-300 hover:flex-[0_0_250px] hover:scale-[1.015] motion-reduce:transition-none xl:flex-[0_0_190px]">
      <div className="relative h-[646px] overflow-hidden">
        <div className="absolute inset-x-[10%] bottom-[8%] h-[476px] rounded-t-full bg-brand-peach transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none" />
        {designer.avatarUrl ? (
          <Image src={designer.avatarUrl} alt={designer.displayName} fill sizes="230px" className="grayscale object-cover object-bottom transition-transform duration-300 group-hover:scale-[1.15] motion-reduce:transition-none" />
        ) : (
          <PortraitFallback gender={index % 2 === 0 ? "male" : "female"} />
        )}
      </div>
    </Link>
  );
}

function FeaturedDesignerCard({ designer, imageUrl, alt }: { designer: Designer; imageUrl?: string; alt?: string }) {
  return (
    <Link href={`/designer/${designer.handle}`} className="group min-w-[400px] flex-[0_0_400px] overflow-hidden rounded-[8px] bg-brand-blueLight transition-[flex-basis,transform] duration-300 hover:flex-[0_0_450px] hover:scale-[1.015] motion-reduce:transition-none">
      <article className="relative h-[646px] overflow-hidden p-8">
        <div className="relative z-20">
          <h3 className="text-[36px] font-black uppercase leading-none text-black">{designer.displayName}</h3>
          <p className="mt-3 text-[14px] text-black">from</p>
          <p className="ml-7 text-[17px] text-black">{designer.location ?? "Samarkand"}</p>
        </div>
        <div className="absolute right-8 top-7 z-20 flex flex-col items-end gap-3">
          <span className="rounded-[8px] bg-[#D877CF] px-3 py-2 text-[9px] font-bold uppercase text-white">UIUX Designer</span>
          <span className="rounded-[8px] bg-[#2E70B8] px-3 py-2 text-[9px] font-bold uppercase text-white">Graphic Designer</span>
        </div>
        <div className="absolute left-[18%] top-[20%] h-[391px] w-[306px] rounded-[46%] border-[10px] border-brand-blue transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none" />
        {imageUrl ? (
          <Image src={imageUrl} alt={alt ?? designer.displayName} fill sizes="420px" className="z-10 object-cover object-bottom transition-transform duration-500 group-hover:scale-110 motion-reduce:transition-none" />
        ) : (
          <PortraitFallback featured />
        )}
        <div className="absolute inset-x-0 bottom-0 z-30 flex h-[150px] items-center justify-center bg-white/58 backdrop-blur-md">
          <span className="rounded-[8px] bg-brand-peach px-7 py-3 text-[14px] font-bold text-white">{designer.displayName}'s Designs</span>
        </div>
      </article>
    </Link>
  );
}

function PortraitFallback({ gender, featured }: { gender?: "male" | "female"; featured?: boolean }) {
  return (
    <div className="absolute inset-0 z-10 transition-transform duration-500 group-hover:scale-110" aria-hidden="true">
      <div className={`${featured ? "left-[37%] top-[24%] h-[112px] w-[112px]" : "left-[27%] top-[20%] h-[107px] w-[107px]"} absolute rounded-full bg-[#E9C5B4]`} />
      <div className={`${featured ? "left-[34%] top-[18%] h-[146px] w-[162px]" : "left-[18%] top-[16%] h-[145px] w-[145px]"} absolute rounded-t-full ${gender === "male" ? "bg-[#1d1d1d]" : "bg-[#171717]"}`} />
      <div className={`${featured ? "left-[21%] bottom-[0] h-[400px] w-[272px] bg-white" : "left-[12%] bottom-0 h-[400px] w-[162px] bg-white"} absolute rounded-t-[68px] grayscale`} />
      <div className={`${featured ? "left-[49%] top-[42%] h-[27px] w-[94px]" : "left-[41%] top-[37%] h-[19px] w-[63px]"} absolute rounded-full bg-brand-peach`} />
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
    <section className="bg-white pb-[68px] pt-9">
      <div className={`mx-auto ${HOME_MAX} ${HOME_GUTTER}`}>
        <h2 className="mb-9 text-[clamp(29px,2.72vw,39px)] font-normal text-black">Shop, design, order, or produce with RashPOD</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <Link key={card.titleTop} href={card.href} className={`relative flex h-[646px] flex-col overflow-hidden rounded-[8px] p-0 ${card.className}`}>
              <div className="pt-5 text-[clamp(54px,5.1vw,78px)] font-black uppercase leading-[0.78] tracking-[-0.06em]">
                <span className="block">{card.titleTop}</span>
                <span className="block">{card.titleBottom}</span>
              </div>
              <p className="mx-auto mt-auto max-w-[238px] pb-[150px] text-center text-[18px] font-medium leading-[1.25]">{card.body}</p>
              <span className={`absolute bottom-[87px] left-1/2 inline-flex h-[54px] -translate-x-1/2 items-center justify-center whitespace-nowrap rounded-[15px] px-6 text-[15px] font-extrabold tracking-[0.12em] ${card.button}`}>
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
    <div className={`mx-auto mb-6 flex ${HOME_MAX} items-center justify-between ${HOME_GUTTER}`}>
      <h2 className="text-[clamp(31px,2.55vw,36px)] font-normal leading-tight text-black">{title}</h2>
      <Link href={href} className="grid h-[53px] w-[53px] place-items-center rounded-full border border-brand-peach text-brand-peach transition-colors hover:bg-brand-peach hover:text-white" aria-label={`View ${title}`}>
        <ArrowRight size={32} strokeWidth={1.4} />
      </Link>
    </div>
  );
}
