"use client";

import { useLocale, useTranslations } from "next-intl";
import { PublicHeader } from "@rashpod/ui";
import { ShoppingBag } from "lucide-react";
import { useCart } from "./cart/CartProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { routing, type AppLocale } from "../i18n/routing";

type StorefrontHeaderProps = {
  signInUrl: string;
  startSellingUrl: string;
  logoUrl?: string | null;
  brandName?: string;
  shopCategories?: Array<{ name: string; slug: string; category: string }>;
};

export function StorefrontHeader({
  signInUrl,
  startSellingUrl,
  logoUrl,
  brandName,
  shopCategories,
}: StorefrontHeaderProps) {
  const t = useTranslations("nav");
  const locale = useLocale() as AppLocale;
  const { openCart, itemCount } = useCart();
  const localePrefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  const localize = (href: string) =>
    href.startsWith("http") || href.startsWith("#") ? href : `${localePrefix}${href.startsWith("/") ? href : `/${href}`}`;

  return (
    <PublicHeader
      homeUrl={localize("/")}
      signInUrl={localize(signInUrl)}
      startSellingUrl={localize(startSellingUrl)}
      shopUrl={localize("/shop")}
      designersUrl={localize("/designers")}
      filmsUrl={localize("/film")}
      sellOnRashpodUrl={localize("/designer-application")}
      customOrderUrl={localize("/custom-order")}
      logoUrl={logoUrl}
      brandName={brandName}
      shopCategories={shopCategories}
      cartItemCount={itemCount}
      onCartOpen={openCart}
      cartIcon={<ShoppingBag size={22} />}
      navLabels={{
        shop: t("shop"),
        categories: t("categories"),
        films: t("films"),
        sellOnRashpod: t("sellOnRashpod"),
        customOrder: t("customOrder"),
        signIn: t("signIn"),
        startSelling: t("startSelling"),
        allProducts: t("allProducts"),
        newArrivals: t("newArrivals"),
        bestsellers: t("bestsellers"),
        designerCollections: t("designerCollections"),
        filmReady: t("filmReady"),
        shopMenu: t("shopMenu"),
      }}
      localeSwitcher={<LanguageSwitcher />}
    />
  );
}
