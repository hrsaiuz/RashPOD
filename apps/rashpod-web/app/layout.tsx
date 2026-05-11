import type { ReactNode } from "react";
import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import { PublicHeader, PublicFooter, MotionProvider, getDashboardUrl } from "@rashpod/ui";

import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-inter",
  display: "swap",
});

async function getBranding(): Promise<{
  storefrontLogoUrl: string | null;
  faviconUrl: string | null;
  theme: { storeName?: string; storeTagline?: string };
} | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;
  if (!apiUrl) return null;
  try {
    const res = await fetch(`${apiUrl}/branding`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
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

export default async function RootLayout({ children }: { children: ReactNode }) {
  const dashboardUrl = getDashboardUrl();
  const branding = await getBranding();
  const brandName = branding?.theme?.storeName || "RashPOD";

  return (
    <html lang="en" className={`${dmSans.variable} ${inter.variable}`}>
      <body className="font-rash antialiased">
        <MotionProvider>
          <PublicHeader
            signInUrl="/auth/login"
            startSellingUrl={`${dashboardUrl}/auth/register?role=designer`}
            shopUrl="/shop"
            designersUrl="/designers"
            filmsUrl="/film"
            aboutUrl="/about"
            logoUrl={branding?.storefrontLogoUrl ?? null}
            brandName={brandName}
          />
          <main id="main-content" className="min-h-screen bg-brand-bg">
            {children}
          </main>
          <PublicFooter />
        </MotionProvider>
      </body>
    </html>
  );
}
