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
};

export function StorefrontHeader({
  signInUrl,
  startSellingUrl,
  logoUrl,
  brandName,
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
      aboutUrl="/about"
      logoUrl={logoUrl}
      brandName={brandName}
      cartItemCount={itemCount}
      onCartOpen={openCart}
      cartIcon={<ShoppingBag size={22} />}
      navLabels={{
        shop: t("shop"),
        categories: t("categories"),
        films: t("films"),
        sellOnRashpod: t("sellOnRashpod"),
        customOrder: t("customOrder"),
        business: t("business"),
        about: t("about"),
        signIn: t("signIn"),
        startSelling: t("startSelling"),
      }}
      localeSwitcher={<LanguageSwitcher />}
    />
  );
}
