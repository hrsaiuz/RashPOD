import type { ReactNode } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DM_Sans, Inter } from "next/font/google";
import localFont from "next/font/local";
import { MotionProvider } from "@rashpod/ui";
import { AuthProvider } from "./auth/auth-provider";
import { ToastProvider } from "../components/feedback/toast-provider";
import { DashboardI18nProvider } from "../components/i18n/dashboard-i18n-provider";
import {
  DASHBOARD_LOCALE_COOKIE,
  getDashboardLocale,
  translateDashboardCopy,
} from "../lib/i18n";
import { loadDashboardMessages } from "../lib/i18n-server";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});
const googleSans = localFont({
  src: [
    { path: "./fonts/google-sans-regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/google-sans-medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/google-sans-bold.ttf", weight: "700", style: "normal" },
    { path: "./fonts/google-sans-italic.ttf", weight: "400", style: "italic" },
  ],
  variable: "--font-google-sans",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-inter",
  display: "swap",
});

async function getBranding(): Promise<{
  faviconUrl: string | null;
  theme?: { storeName?: string };
} | null> {
  const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;

  try {
    const res = await fetch(`${apiUrl}/branding`, {
      next: { revalidate: 60 * 60 * 24 * 7, tags: ["branding"] },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  const locale = getDashboardLocale((await cookies()).get(DASHBOARD_LOCALE_COOKIE)?.value);
  const name = branding?.theme?.storeName || "RashPOD";

  return {
    title: {
      default: `${name} ${translateDashboardCopy(locale, "Dashboard")}`,
      template: `%s | ${name} ${translateDashboardCopy(locale, "Dashboard")}`,
    },
    description: translateDashboardCopy(locale, "RashPOD operations and designer dashboard"),
    icons: branding?.faviconUrl ? [{ rel: "icon", url: branding.faviconUrl }] : undefined,
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = getDashboardLocale((await cookies()).get(DASHBOARD_LOCALE_COOKIE)?.value);
  const messages = await loadDashboardMessages(locale);
  return (
    <html lang={locale} className={`${googleSans.variable} ${dmSans.variable} ${inter.variable}`}>
      <body className="font-rash antialiased min-h-screen bg-brand-bg">
        <DashboardI18nProvider initialLocale={locale} initialMessages={messages}>
          <MotionProvider>
            <ToastProvider>
              <AuthProvider>{children}</AuthProvider>
            </ToastProvider>
          </MotionProvider>
        </DashboardI18nProvider>
      </body>
    </html>
  );
}
