"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeDollarSign,
  Gift,
  PackageCheck,
  Tags,
} from "lucide-react";
import { Button, EmptyState, ErrorState, getApiBase, ProductCard, ProductCategoryBentoCard } from "@rashpod/ui";
import type { DesignerSummary, ProductListing } from "../../lib/catalog";
import type { HomeCategoryTile } from "../../lib/branding";
import { normalizeDesigners, normalizeProducts } from "../../lib/catalog";
import { Link } from "../../i18n/navigation";
import { useLocale, useTranslations } from "next-intl";

export interface HomeBrandingMedia {
  homeHeroImageUrl?: string;
  homeHeroImageAlt?: string;
  homeDesignerSectionImageUrl?: string;
  homeDesignerSectionImageAlt?: string;
  homeCategoryTiles?: HomeCategoryTile[];
}

const MARKETPLACES = [
  { src: "https://storage.googleapis.com/rashpod-assets/media/ui_asset/1782409856866-Slide1.JPG", name: "Amazon", width: 150, height: 49 },
  { src: "https://storage.googleapis.com/rashpod-assets/media/ui_asset/1782409873743-Slide2.JPG", name: "Etsy", width: 126, height: 50 },
  { src: "https://storage.googleapis.com/rashpod-assets/media/ui_asset/1782409879648-Slide3.JPG", name: "eBay", width: 126, height: 50 },
  { src: "https://storage.googleapis.com/rashpod-assets/media/ui_asset/1782409885447-Slide4.JPG", name: "Uzum Market", width: 136, height: 52 },
  { src: "https://storage.googleapis.com/rashpod-assets/media/ui_asset/1782409891181-Slide5.JPG", name: "Wildberries", width: 158, height: 52 },
];

const HOME_MAX = "max-w-storefront";
const HOME_GUTTER = "px-4 sm:px-5";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

interface HomePageClientProps {
  homeMedia: HomeBrandingMedia;
  initialProducts?: ProductListing[];
  initialDesigners?: DesignerSummary[];
}

export default function HomePageClient({
  homeMedia,
  initialProducts,
  initialDesigners,
}: HomePageClientProps) {
  const apiBase = getApiBase();
  const locale = useLocale();
  const t = useTranslations("home");

  const [products, setProducts] = useState<ProductListing[]>(initialProducts ?? []);
  const [designers, setDesigners] = useState<DesignerSummary[]>(initialDesigners ?? []);
  const [productsError, setProductsError] = useState(false);
  const [designersError, setDesignersError] = useState(false);

  const loadCatalog = useCallback(() => {
    const controller = new AbortController();
    const opts = { signal: controller.signal };

    fetch(`${apiBase}/shop/listings?limit=8&locale=${encodeURIComponent(locale)}`, opts)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load products");
        return res.json();
      })
      .then((data) => {
        setProducts(normalizeProducts(data));
        setProductsError(false);
      })
      .catch(() => {
        setProducts((current) => {
          if (current.length === 0) setProductsError(true);
          return current;
        });
      });

    fetch(`${apiBase}/shop/designers?limit=6`, opts)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load designers");
        return res.json();
      })
      .then((data) => {
        setDesigners(normalizeDesigners(data));
        setDesignersError(false);
      })
      .catch(() => {
        setDesigners((current) => {
          if (current.length === 0) setDesignersError(true);
          return current;
        });
      });

    return controller;
  }, [apiBase, locale]);

  useEffect(() => {
    const controller = loadCatalog();
    return () => controller.abort();
  }, [loadCatalog]);

  const retryCatalog = useCallback(() => {
    setProductsError(false);
    setDesignersError(false);
    loadCatalog();
  }, [loadCatalog]);

  const collections = useMemo(
    () => products.slice(4, 8).concat(products.slice(0, Math.max(0, 4 - products.slice(4, 8).length))).slice(0, 4),
    [products],
  );

  return (
    <div className="bg-white text-brand-ink">
      <FigmaHero media={homeMedia} />
      <ServiceStrip />
      <CategoryMosaic tiles={homeMedia.homeCategoryTiles ?? []} />
      <HomepageProductCarousel
        title={t("bestsellingDesigns")}
        products={products.slice(0, 4)}
        badge={t("bestSeller")}
        error={productsError}
        empty={!productsError && products.length === 0}
        onRetry={retryCatalog}
      />
      <MarketplaceLogoStrip />
      <CollectionCarousel
        products={collections}
        error={productsError}
        empty={!productsError && products.length === 0}
        onRetry={retryCatalog}
      />
      <ClubCta />
      <DesignerCarousel designers={designers} error={designersError} empty={!designersError && designers.length === 0} onRetry={retryCatalog} />
      <ActionCards />
    </div>
  );
}

function FigmaHero({ media }: { media: HomeBrandingMedia }) {
  const t = useTranslations("home");
  return (
    <section className="relative overflow-hidden bg-white">
      <div className={`mx-auto grid ${media.homeHeroImageUrl ? "min-h-[765px] lg:grid-cols-[0.48fr_0.52fr]" : "min-h-[620px] lg:grid-cols-1"} ${HOME_MAX} grid-cols-1 items-center gap-7 ${HOME_GUTTER} pb-7 pt-14 lg:pt-7`}>
        <motion.div {...fadeUp} className={`relative z-10 ${media.homeHeroImageUrl ? "max-w-[520px]" : "mx-auto w-full max-w-[720px]"}`}>
          <h1 className="leading-none tracking-[0] text-brand-ink">
            <span className="block text-[clamp(28px,2.55vw,36px)] font-normal">{t("hero.shopOriginal")}</span>
            <span className="relative mt-1 flex items-baseline text-[clamp(74px,6.3vw,112px)] font-normal leading-[0.86] text-semantic-filmText">
              {t("hero.designs")}
            </span>
            <span className="block text-center text-[clamp(43px,3.55vw,61px)] font-normal leading-[0.82] text-brand-blue">
              {t("hero.sellYourOwn")}
            </span>
            <span className="block text-center text-[clamp(29px,2.64vw,41px)] font-normal leading-[1.12]">
              {t("hero.printedOnDemand")}
            </span>
          </h1>
          <p className="mt-10 max-w-[520px] text-[18px] leading-[1.52] text-brand-ink">
            {t("hero.storefrontSubtitle")}
          </p>
          <div className="mt-12 flex flex-wrap gap-5">
            <Link
              href="/designer-application"
              className="inline-flex h-[75px] min-w-[189px] items-center justify-center rounded-md bg-brand-blue px-9 text-[16px] font-extrabold tracking-[0.12em] text-brand-ink shadow-none transition-transform hover:scale-[1.02]"
            >
              {t("hero.cta")}
            </Link>
            <Link
              href="/shop"
              className="inline-flex h-[75px] min-w-[189px] items-center justify-center rounded-md bg-brand-peach px-9 text-[16px] font-extrabold tracking-[0.12em] text-brand-ink shadow-none transition-transform hover:scale-[1.02]"
            >
              {t("hero.shopCta")}
            </Link>
          </div>
          <p className="mt-5 text-[15px] text-brand-ink">{t("hero.proof")}</p>
        </motion.div>

        {media.homeHeroImageUrl ? (
          <motion.div
            {...fadeUp}
            className="relative min-h-[553px] lg:min-h-[723px]"
          >
            <Image
              src={media.homeHeroImageUrl}
              alt={media.homeHeroImageAlt ?? t("hero.imageAlt")}
              fill
              priority
              sizes="(min-width: 1024px) 646px, 100vw"
              className="relative z-10 object-contain object-bottom"
            />
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}

function ServiceStrip() {
  const t = useTranslations("home");
  const services = [
    { label: t("services.designed"), icon: Gift, shape: "flower" },
    { label: t("services.produced"), icon: PackageCheck, shape: "arch" },
    { label: t("services.sold"), icon: Tags, shape: "flower" },
    { label: t("services.royalties"), icon: BadgeDollarSign, shape: "pin" },
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

function HomepageProductCarousel({
  title,
  products,
  badge,
  error,
  empty,
  onRetry,
}: {
  title: string;
  products: ProductListing[];
  badge: string;
  error?: boolean;
  empty?: boolean;
  onRetry?: () => void;
}) {
  const t = useTranslations("home");
  return (
    <section className="bg-white py-9">
      <SectionHeader title={title} href="/shop" />
      {error ? (
        <CatalogFeedback
          kind="error"
          title={t("productLoadError")}
          description={t("productLoadErrorDescription")}
          onRetry={onRetry}
        />
      ) : empty ? (
        <CatalogFeedback
          kind="empty"
          title={t("noProducts")}
          description={t("noProductsDescription")}
        />
      ) : (
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
              description={t("productCardDescription")}
              className="min-w-[255px] snap-start xl:min-w-0"
            />
          ))}
        </div>
      )}
    </section>
  );
}

function MarketplaceLogoStrip() {
  const slidingLogos = [...MARKETPLACES, ...MARKETPLACES];

  return (
    <section className="overflow-hidden bg-white py-7 md:py-8">
      <div className="relative mx-auto max-w-[1440px]">
        <motion.div
          className="flex w-max items-center gap-8 px-5 md:gap-10"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 22, ease: "linear", repeat: Infinity }}
        >
          {slidingLogos.map((logo, index) => (
            <div key={`${logo.name}-${index}`} className="grid h-[92px] min-w-[180px] place-items-center md:min-w-[210px]">
              <Image
                src={logo.src}
                alt={logo.name}
                width={logo.width}
                height={logo.height}
                className="h-auto max-h-[72px] w-auto object-contain md:max-h-[82px]"
              />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

const DEFAULT_CATEGORY_TILES: HomeCategoryTile[] = [
  { key: "t-shirt", category: "clothes", productName: "t-shirt", href: "/shop?categories=t-shirt", variant: "blue", size: "wide" },
  { key: "postal-card", category: "prints", productName: "postal card", href: "/shop?categories=postal-card", variant: "peach" },
  { key: "mug", category: "ceramics", productName: "mug", href: "/shop?categories=mug", variant: "blue" },
  { key: "hoodie", category: "clothes", productName: "hoodie", href: "/shop?categories=hoodie", variant: "peach" },
  { key: "hat", category: "clothes", productName: "hat", href: "/shop?categories=hat", variant: "blue" },
  { key: "poster", category: "prints", productName: "poster in frame", href: "/shop?categories=poster", variant: "peach", size: "wide" },
];

function CategoryMosaic({ tiles }: { tiles: HomeCategoryTile[] }) {
  const t = useTranslations("home");
  const configured = DEFAULT_CATEGORY_TILES.map((fallback) => ({
    ...fallback,
    ...(tiles.find((tile) => tile.key === fallback.key) ?? {}),
  }));

  return (
    <motion.section {...fadeUp} className="bg-white py-12 sm:py-16" aria-labelledby="home-categories-title">
      <div className={`mx-auto ${HOME_MAX} ${HOME_GUTTER}`}>
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-peach">{t("madeYourWay")}</p>
            <h2 id="home-categories-title" className="mt-2 text-[clamp(31px,3vw,44px)] font-normal text-black">{t("browseByCategory")}</h2>
          </div>
          <Link href="/shop" className="hidden text-sm font-semibold text-brand-blue hover:underline sm:inline">{t("viewAllProducts")}</Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {configured.map((tile, index) => (
            <Link
              key={tile.key}
              href={tile.href}
              className={tile.size === "wide" ? "sm:col-span-2" : ""}
              aria-label={t("shopCategory", { category: tile.productName })}
            >
              <ProductCategoryBentoCard
                category={tile.category}
                productName={tile.productName}
                imageUrl={tile.imageUrl}
                imageAlt={tile.altText ?? undefined}
                variant={tile.variant ?? (index % 2 === 0 ? "blue" : "peach")}
                showShopButton={tile.size === "wide"}
                className="h-full"
              />
            </Link>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function CollectionCarousel({
  products,
  error,
  empty,
  onRetry,
}: {
  products: ProductListing[];
  error?: boolean;
  empty?: boolean;
  onRetry?: () => void;
}) {
  const t = useTranslations("home");
  return (
    <section className="bg-white py-10">
      <SectionHeader title={t("newCollections")} href="/shop?sort=newest" />
      {error ? (
        <CatalogFeedback
          kind="error"
          title={t("collectionLoadError")}
          description={t("collectionLoadErrorDescription")}
          onRetry={onRetry}
        />
      ) : empty ? (
        <CatalogFeedback
          kind="empty"
          title={t("noCollections")}
          description={t("noCollectionsDescription")}
        />
      ) : (
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
              badge={t("newBadge")}
              secondaryBadge="new"
              className="min-w-[255px] snap-start xl:min-w-0"
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ClubCta() {
  const t = useTranslations("home");
  return (
    <section className="relative my-10 overflow-hidden bg-white md:my-14">
      <div className="relative bg-brand-bg px-5 py-10 md:h-[272px] md:pt-[54px]">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -left-10 top-0 h-[82px] w-[82px] rounded-br-full bg-brand-blue" />
          <div className="absolute bottom-0 left-[17%] hidden h-[109px] w-[134px] rounded-t-full border-[41px] border-brand-blue md:block" />
          <div className="absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-[38%] gap-0">
            {Array.from({ length: 4 }).map((_, index) => (
              <span key={index} className="h-[48px] w-[28px] rounded-b-full bg-brand-peachLight md:h-[72px] md:w-[41px]" />
            ))}
          </div>
          <div className="absolute bottom-0 right-[9%] hidden h-[121px] w-[112px] rounded-t-full bg-brand-peach md:block">
            <span className="absolute left-1/2 top-[-36px] h-[54px] w-[50px] -translate-x-1/2 bg-brand-peach" />
          </div>
          <div className="absolute -right-6 top-0 hidden h-[125px] w-[125px] md:block">
            {Array.from({ length: 28 }).map((_, index) => (
              <span
                key={index}
                className="absolute left-1/2 top-1/2 h-[7px] w-[73px] origin-left bg-brand-blue"
                style={{ transform: `rotate(${index * 12.85}deg)` }}
              />
            ))}
          </div>
        </div>
        <div className="relative mx-auto grid max-w-[1105px] grid-cols-1 items-center gap-6 text-center md:grid-cols-3 md:items-start md:gap-7">
          <p className="text-[16px] tracking-[0.12em] text-black md:pt-[104px] md:text-[18px] md:tracking-[0.17em]">
            {t("club.firstDrop")}
          </p>
          <div className="flex flex-col items-center">
            <h2 className="mb-6 text-[24px] font-extrabold text-black md:mb-[58px] md:text-[26px]">{t("club.title")}</h2>
            <Link
              href="/auth/register"
              className="relative inline-flex h-[56px] min-w-[176px] items-center justify-center rounded-pill bg-brand-blue px-9 text-[18px] font-extrabold tracking-[0.08em] text-brand-ink md:h-[67px] md:text-[20px]"
            >
              {t("club.join")}
              <span className="absolute -right-4 -top-4 text-[40px] leading-none text-brand-peach md:text-[48px]">*</span>
            </Link>
          </div>
          <p className="text-[16px] text-black md:pt-[104px] md:text-[18px]">{t("club.reward")}</p>
        </div>
      </div>
      <div className="h-[40px] bg-white md:h-[68px]" />
    </section>
  );
}

function DesignerCarousel({
  designers,
  error,
  empty,
  onRetry,
}: {
  designers: DesignerSummary[];
  error?: boolean;
  empty?: boolean;
  onRetry?: () => void;
}) {
  const t = useTranslations("home");
  const shown = designers.slice(0, 5);

  return (
    <section className="bg-white py-10">
      <SectionHeader title={t("meetDesigners")} href="/designers" />
      {error ? (
        <CatalogFeedback
          kind="error"
          title={t("designerLoadError")}
          description={t("designerLoadErrorDescription")}
          onRetry={onRetry}
        />
      ) : empty ? (
        <CatalogFeedback
          kind="empty"
          title={t("noDesigners")}
          description={t("noDesignersDescription")}
        />
      ) : (
        <div className={`mx-auto flex ${HOME_MAX} snap-x gap-5 overflow-x-auto ${HOME_GUTTER} pb-7 pt-2 xl:overflow-visible`}>
          {shown.map((designer) => (
            <DesignerCard key={designer.id} designer={designer} />
          ))}
        </div>
      )}
    </section>
  );
}

function CatalogFeedback({
  kind,
  title,
  description,
  onRetry,
}: {
  kind: "error" | "empty";
  title: string;
  description: string;
  onRetry?: () => void;
}) {
  const t = useTranslations("home");
  return (
    <div className={`mx-auto ${HOME_MAX} ${HOME_GUTTER}`}>
      {kind === "error" ? (
        <ErrorState
          title={title}
          description={description}
          retry={
            onRetry ? (
              <Button variant="primaryBlue" size="md" onClick={() => onRetry()}>
                {t("retry")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <EmptyState title={title} description={description} />
      )}
    </div>
  );
}

function DesignerCard({ designer }: { designer: DesignerSummary }) {
  const t = useTranslations("home");
  const imageUrl = designer.avatarUrl ?? designer.profileImageUrl;

  return (
    <Link
      href={`/designer/${designer.handle}`}
      className="group min-w-[187px] flex-[0_0_187px] snap-start overflow-hidden rounded-[8px] border border-black bg-brand-blueLight transition-[flex-basis,transform] duration-300 hover:flex-[0_0_400px] hover:scale-[1.015] motion-reduce:transition-none xl:flex-[1_1_0] xl:hover:flex-[2.15_1_0]"
    >
      <div className="relative h-[646px] overflow-hidden">
        {imageUrl ? (
          <Image src={imageUrl} alt={designer.displayName} fill sizes="(min-width: 1280px) 400px, 260px" className="grayscale object-cover object-center transition-transform duration-500 group-hover:scale-[1.14] group-hover:grayscale-0 motion-reduce:transition-none" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-brand-blueLight text-[72px] font-black uppercase text-brand-blue" aria-hidden="true">
            {designer.displayName.charAt(0)}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 z-20 flex h-[148px] translate-y-0 items-center justify-center bg-white/58 opacity-100 backdrop-blur-md transition-all duration-300 sm:translate-y-full sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 motion-reduce:transition-none">
          <span className="rounded-xs bg-brand-peach px-7 py-3 text-[14px] font-bold text-brand-ink">{t("designerDesigns", { name: designer.displayName })}</span>
        </div>
        <div className="absolute left-6 top-6 z-20 translate-y-0 opacity-100 transition-all duration-300 sm:translate-y-3 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 motion-reduce:transition-none">
          <h3 className="text-[36px] font-black uppercase leading-none text-black">{designer.displayName}</h3>
          <p className="mt-2 text-[15px] text-black">{t("from")}</p>
          <p className="ml-6 text-[18px] text-black">{designer.location ?? t("defaultLocation")}</p>
        </div>
      </div>
    </Link>
  );
}

function ActionCards() {
  const t = useTranslations("home");
  const cards = [
    {
      titleTop: t("actions.designersTop"),
      titleBottom: t("actions.designersBottom"),
      body: t("actions.designersBody"),
      href: "/designer-application",
      cta: t("actions.designersCta"),
      className: "bg-brand-peach text-black",
      button: "bg-brand-bg text-brand-ink",
    },
    {
      titleTop: t("actions.customTop"),
      titleBottom: t("actions.customBottom"),
      body: t("actions.customBody"),
      href: "/custom-order",
      cta: t("actions.customCta"),
      className: "bg-brand-ink text-white",
      button: "bg-brand-blue text-brand-ink",
    },
    {
      titleTop: t("actions.businessTop"),
      titleBottom: t("actions.businessBottom"),
      body: t("actions.businessBody"),
      href: "/film",
      cta: t("actions.businessCta"),
      className: "bg-brand-bg text-brand-ink",
      button: "bg-brand-ink text-white",
    },
    {
      titleTop: t("actions.shopTop"),
      titleBottom: t("actions.shopBottom"),
      body: t("actions.shopBody"),
      href: "/shop",
      cta: t("actions.shopCta"),
      className: "bg-brand-blue text-brand-ink",
      button: "bg-brand-peach text-brand-ink",
    },
  ];

  return (
    <section className="bg-white pb-[68px] pt-9">
      <div className={`mx-auto ${HOME_MAX} ${HOME_GUTTER}`}>
        <h2 className="mb-9 text-[clamp(29px,2.72vw,39px)] font-normal text-black">{t("actions.title")}</h2>
        <div className={`mx-auto flex ${HOME_MAX} snap-x gap-5 overflow-x-auto ${HOME_GUTTER} pb-7 pt-2 xl:grid xl:grid-cols-4 xl:overflow-visible`}>
          {cards.map((card) => (
            <Link
              key={card.titleTop}
              href={card.href}
              className={`relative flex h-[420px] min-w-[280px] snap-start flex-col overflow-hidden rounded-[8px] p-0 sm:min-w-[300px] xl:h-[646px] xl:min-w-0 ${card.className}`}
            >
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
  const t = useTranslations("home");
  return (
    <div className={`mx-auto mb-6 flex ${HOME_MAX} items-center justify-between ${HOME_GUTTER}`}>
      <h2 className="text-[clamp(31px,2.55vw,36px)] font-normal leading-tight text-black">{title}</h2>
      <Link href={href} className="grid h-[53px] w-[53px] place-items-center rounded-full border border-semantic-filmText text-semantic-filmText transition-colors hover:bg-brand-peach hover:text-brand-ink" aria-label={t("viewSection", { title })}>
        <ArrowRight size={32} strokeWidth={1.4} />
      </Link>
    </div>
  );
}
