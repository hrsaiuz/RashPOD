import type { ReactNode } from "react";
import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import localFont from "next/font/local";
import { MotionProvider } from "@rashpod/ui";
import { AuthProvider } from "./auth/auth-provider";
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
    const res = await fetch(`${apiUrl}/branding`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  const name = branding?.theme?.storeName || "RashPOD";

  return {
    title: { default: `${name} Dashboard`, template: `%s | ${name} Dashboard` },
    description: "RashPOD operations and designer dashboard",
    icons: branding?.faviconUrl ? [{ rel: "icon", url: branding.faviconUrl }] : undefined,
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${googleSans.variable} ${dmSans.variable} ${inter.variable}`}>
      <body className="font-rash antialiased min-h-screen bg-brand-bg">
        <MotionProvider>
          <AuthProvider>{children}</AuthProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
