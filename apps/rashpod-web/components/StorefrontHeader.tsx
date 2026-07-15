"use client";

import { useTranslations } from "next-intl";
import { PublicHeader } from "@rashpod/ui";
import { ShoppingBag } from "lucide-react";
import { useCart } from "./cart/CartProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";

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
  const { openCart, itemCount } = useCart();

  return (
    <PublicHeader
      signInUrl={signInUrl}
      startSellingUrl={startSellingUrl}
      shopUrl="/shop"
      designersUrl="/designers"
      filmsUrl="/film"
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
