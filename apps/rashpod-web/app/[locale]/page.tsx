import { setRequestLocale } from "next-intl/server";
import { getStorefrontBranding } from "../../lib/branding";
import { fetchDesigners, fetchListings } from "../../lib/catalog";
import HomePageClient from "./HomePageClient";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [branding, products, designers] = await Promise.all([
    getStorefrontBranding(),
    fetchListings({ limit: "8" }),
    fetchDesigners(6),
  ]);

  const homeMedia = {
    homeHeroImageUrl: branding?.homeHeroImageUrl ?? undefined,
    homeHeroImageAlt: branding?.homeHeroImageAlt ?? undefined,
    homeDesignerSectionImageUrl: branding?.homeDesignerSectionImageUrl ?? undefined,
    homeDesignerSectionImageAlt: branding?.homeDesignerSectionImageAlt ?? undefined,
  };

  return (
    <HomePageClient
      homeMedia={homeMedia}
      initialProducts={products.slice(0, 8)}
      initialDesigners={designers.slice(0, 6)}
    />
  );
}
