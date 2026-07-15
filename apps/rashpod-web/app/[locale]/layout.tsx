import type { ReactNode } from "react";
import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PublicFooter, MotionProvider, getDashboardUrl } from "@rashpod/ui";
import { CartProvider } from "../../components/cart/CartProvider";
import { StorefrontHeader } from "../../components/StorefrontHeader";
import { getStorefrontBranding } from "../../lib/branding";
import { getShopSettings, resolveFreeDeliveryThreshold } from "../../lib/shop-settings";
import { OrganizationJsonLd } from "../../components/seo/OrganizationJsonLd";
import { routing, type AppLocale } from "../../i18n/routing";
import { fetchShopCategories } from "../../lib/catalog";

import "../globals.css";

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});
const googleSans = localFont({
  src: [
    { path: "../fonts/google-sans-regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/google-sans-medium.ttf", weight: "500", style: "normal" },
    { path: "../fonts/google-sans-bold.ttf", weight: "700", style: "normal" },
    { path: "../fonts/google-sans-italic.ttf", weight: "400", style: "italic" },
  ],
  variable: "--font-google-sans",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-inter",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getStorefrontBranding();
  const name = branding?.theme?.storeName || "RashPOD";
  const description = branding?.theme?.storeTagline || "Upload your designs. Sell products. Earn royalties.";
  return {
    title: { default: name, template: `%s | ${name}` },
    description,
    metadataBase: new URL(process.env.NEXT_PUBLIC_WEB_URL || "https://rashpod.uz"),
    icons: branding?.faviconUrl ? [{ rel: "icon", url: branding.faviconUrl }] : undefined,
    openGraph: { siteName: name, type: "website" },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as AppLocale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  const dashboardUrl = getDashboardUrl();
  const [branding, shopSettings, shopCategories] = await Promise.all([getStorefrontBranding(), getShopSettings(), fetchShopCategories()]);
  const brandName = branding?.theme?.storeName || "RashPOD";
  const freeDeliveryThreshold = resolveFreeDeliveryThreshold(shopSettings);

  return (
    <html lang={locale} className={`${googleSans.variable} ${dmSans.variable} ${inter.variable}`}>
      <body className="font-rash antialiased">
        <NextIntlClientProvider messages={messages}>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-modal focus:rounded-pill focus:bg-brand-blue focus:px-4 focus:py-2 focus:text-white">
            Skip to content
          </a>
          <OrganizationJsonLd brandName={brandName} />
          <MotionProvider>
            <CartProvider freeDeliveryThreshold={freeDeliveryThreshold}>
              <StorefrontHeader
                signInUrl="/auth/login"
                startSellingUrl={`${dashboardUrl}/auth/register?role=designer`}
                logoUrl={branding?.storefrontLogoUrl ?? null}
                brandName={brandName}
                shopCategories={shopCategories}
              />
              <main id="main-content" className="min-h-screen bg-brand-bg">
                {children}
              </main>
              <PublicFooter logoUrl={branding?.footerLogoUrl ?? null} brandName={brandName} />
            </CartProvider>
          </MotionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
