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
import { getApiBase, getDashboardUrl, ProductCard } from "@rashpod/ui";

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
  profileImageUrl?: string;
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

const HOME_MAX = "max-w-storefront";
const HOME_GUTTER = "px-4 sm:px-5";

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
      profileImageUrl: getOptionalString(item.profileImageUrl) ?? getOptionalString(item.coverUrl),
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
      <DesignerCarousel designers={designers} />
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
    </section>
  );
}

function HeroLetter({ letter, decorated }: { letter: string; decorated?: "target" | "wheel" }) {
  return (
    <span className="relative inline-block">
      {letter}
      {decorated === "target" && (
        <span className="absolute left-[0.18em] top-[0.5em] grid h-[0.37em] w-[0.37em] -translate-y-1/2 place-items-center rounded-full bg-white" aria-hidden="true">
          <span className="grid h-[88%] w-[88%] place-items-center rounded-full bg-brand-blue">
            <span className="grid h-[68%] w-[68%] place-items-center rounded-full bg-white">
              <span className="grid h-[62%] w-[62%] place-items-center rounded-full bg-brand-blue">
                <span className="h-[46%] w-[46%] rounded-full bg-white" />
              </span>
            </span>
          </span>
        </span>
      )}
      {decorated === "wheel" && (
        <span className="absolute left-[0.34em] top-[0.48em] h-[0.38em] w-[0.38em] -translate-x-1/2 -translate-y-1/2 rounded-full" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, index) => (
            <span
              key={index}
              className="absolute left-1/2 top-1/2 h-[0.15em] w-[0.075em] origin-[50%_0.01em] rounded-full bg-brand-blue"
              style={{ transform: `translate(-50%, -50%) rotate(${index * 30}deg) translateY(-0.12em)` }}
            />
          ))}
          <span className="absolute left-1/2 top-1/2 h-[0.1em] w-[0.1em] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
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
          <div key={label} className="relative flex h-[109px] items-center overflow-hidden rounded-[14px] bg-brand-bg px-7">
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
          <ProductCard
            key={`${product.id}-${index}`}
            variant="featured"
            slug={product.slug}
            title={product.title}
            price={product.price}
            imageUrl={product.imageUrl}
            designer={{ displayName: product.designer }}
            badge={badge}
            secondaryBadge={index === 1 ? "new" : undefined}
            description="high quality, 100% cotton, perfect for vibrant"
            className="min-w-[255px] snap-start xl:min-w-0"
          />
        ))}
      </div>
    </section>
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
          <ProductCard
            key={`${product.id}-collection-${index}`}
            variant="featured"
            slug={product.slug}
            title={product.category ?? product.title}
            price={product.price}
            imageUrl={product.imageUrl}
            designer={{ displayName: product.designer }}
            badge="New"
            secondaryBadge="new"
            className="min-w-[255px] snap-start xl:min-w-0"
          />
        ))}
      </div>
    </section>
  );
}

function ClubCta({ dashboardUrl }: { dashboardUrl: string }) {
  return (
    <section className="relative my-14 overflow-hidden bg-white">
      <div className="relative h-[272px] bg-brand-bg pt-[54px]">
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

function DesignerCarousel({ designers }: { designers: Designer[] }) {
  const shown = designers.slice(0, 5);

  return (
    <section className="bg-white py-10">
      <SectionHeader title="Meet Our Wonderful Designers" href="/designers" />
      <div className={`mx-auto flex ${HOME_MAX} gap-5 overflow-x-auto ${HOME_GUTTER} pb-7 pt-2 xl:overflow-visible`}>
        {shown.map((designer) => (
          <DesignerCard key={designer.id} designer={designer} />
        ))}
      </div>
      <p className="text-[20px] uppercase text-brand-subtle">Designers 6</p>
    </section>
  );
}

function DesignerCard({ designer }: { designer: Designer }) {
  const imageUrl = designer.avatarUrl ?? designer.profileImageUrl;

  return (
    <Link href={`/designer/${designer.handle}`} className="group min-w-[187px] flex-[0_0_187px] overflow-hidden rounded-[8px] border border-black bg-brand-blueLight transition-[flex-basis,transform] duration-300 hover:flex-[0_0_400px] hover:scale-[1.015] motion-reduce:transition-none xl:flex-[1_1_0] xl:hover:flex-[2.15_1_0]">
      <div className="relative h-[646px] overflow-hidden">
        {imageUrl ? (
          <Image src={imageUrl} alt={designer.displayName} fill sizes="(min-width: 1280px) 400px, 260px" className="grayscale object-cover object-center transition-transform duration-500 group-hover:scale-[1.14] group-hover:grayscale-0 motion-reduce:transition-none" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-brand-blueLight text-[72px] font-black uppercase text-brand-blue" aria-hidden="true">
            {designer.displayName.charAt(0)}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 z-20 flex h-[148px] translate-y-full items-center justify-center bg-white/58 opacity-0 backdrop-blur-md transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 motion-reduce:transition-none">
          <span className="rounded-[8px] bg-brand-peach px-7 py-3 text-[14px] font-bold text-white">{designer.displayName}'s Designs</span>
        </div>
        <div className="absolute left-6 top-6 z-20 translate-y-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 motion-reduce:transition-none">
          <h3 className="text-[36px] font-black uppercase leading-none text-black">{designer.displayName}</h3>
          <p className="mt-2 text-[15px] text-black">from</p>
          <p className="ml-6 text-[18px] text-black">{designer.location ?? "Samarkand"}</p>
        </div>
      </div>
    </Link>
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
      button: "bg-brand-bg text-brand-ink",
    },
    {
      titleTop: "custom",
      titleBottom: "ORDERS",
      body: "Create branded products for teams, events, campaigns, and corporate gifts",
      href: "/corporate",
      cta: "Request a quote",
      className: "bg-brand-ink text-white",
      button: "bg-brand-blue text-white",
    },
    {
      titleTop: "your",
      titleBottom: "BUSINESS",
      body: "Order ready-to-press films for apparel, stickers, packaging, and production runs",
      href: "/film",
      cta: "Explore films",
      className: "bg-brand-bg text-brand-ink",
      button: "bg-brand-ink text-white",
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
