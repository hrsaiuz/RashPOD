import type { ReactNode } from "react";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PublicFooter, MotionProvider } from "@rashpod/ui";
import { CartProvider } from "../../components/cart/CartProvider";
import { StorefrontHeader } from "../../components/StorefrontHeader";
import { getStorefrontBranding } from "../../lib/branding";
import { getShopSettings, resolveFreeDeliveryThreshold } from "../../lib/shop-settings";
import { OrganizationJsonLd } from "../../components/seo/OrganizationJsonLd";
import { routing, type AppLocale } from "../../i18n/routing";
import { fetchShopCategories } from "../../lib/catalog";

import "../globals.css";

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
  const footerT = await getTranslations({ locale, namespace: "footer" });
  const [branding, shopSettings, shopCategories] = await Promise.all([getStorefrontBranding(), getShopSettings(), fetchShopCategories()]);
  const brandName = branding?.theme?.storeName || "RashPOD";
  const freeDeliveryThreshold = resolveFreeDeliveryThreshold(shopSettings);
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  const localize = (path: string) => `${prefix}${path}`;

  return (
    <html lang={locale} className={googleSans.variable}>
      <body className="font-rash antialiased">
        <NextIntlClientProvider messages={messages}>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-modal focus:rounded-pill focus:bg-brand-blue focus:px-4 focus:py-2 focus:text-brand-ink">
            {footerT("skipToContent")}
          </a>
          <OrganizationJsonLd brandName={brandName} />
          <MotionProvider>
            <CartProvider freeDeliveryThreshold={freeDeliveryThreshold}>
              <StorefrontHeader
                signInUrl="/auth/login"
                startSellingUrl="/designer-application"
                logoUrl={branding?.storefrontLogoUrl ?? null}
                brandName={brandName}
                shopCategories={shopCategories}
              />
              <main id="main-content" className="min-h-screen bg-brand-bg">
                {children}
              </main>
              <PublicFooter
                logoUrl={branding?.footerLogoUrl ?? null}
                brandName={brandName}
                clubUrl={localize("/auth/register")}
                shopLinks={[
                  { href: localize("/shop"), label: footerT("allProducts") },
                  { href: localize("/shop?sort=newest"), label: footerT("newArrivals") },
                  { href: localize("/shop?sort=popular"), label: footerT("bestsellers") },
                  { href: localize("/film"), label: footerT("films") },
                ]}
                designerLinks={[
                  { href: localize("/designers"), label: footerT("designerDirectory") },
                  { href: localize("/designer-application"), label: footerT("startSelling") },
                  { href: localize("/how-it-works"), label: footerT("howItWorks") },
                  { href: localize("/designer-application"), label: footerT("applyAsDesigner") },
                ]}
                companyLinks={[
                  { href: localize("/about"), label: footerT("about") },
                  { href: localize("/contact"), label: footerT("contact") },
                  { href: localize("/faq"), label: footerT("faq") },
                  { href: localize("/legal/shipping-returns"), label: footerT("shippingReturns") },
                ]}
                termsUrl={localize("/legal/terms")}
                privacyUrl={localize("/legal/privacy")}
                cookiesUrl={localize("/legal/shipping-returns")}
                labels={{
                  shop: footerT("shop"),
                  designers: footerT("designers"),
                  company: footerT("company"),
                  clubTitle: footerT("clubTitle"),
                  joinNow: footerT("joinNow"),
                  nextDrop: footerT("nextDrop"),
                  monthlyDesign: footerT("monthlyDesign"),
                  rightsReserved: footerT("rightsReserved"),
                  terms: footerT("terms"),
                  privacy: footerT("privacy"),
                  shippingReturns: footerT("shippingReturns"),
                }}
              />
            </CartProvider>
          </MotionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
