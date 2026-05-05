import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";

import "./globals.css";
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://rashpod-dashboard-6533fe6ega-uc.a.run.app";

export const metadata: Metadata = {
  title: { default: "RashPOD", template: "%s | RashPOD" },
  description: "Upload your designs. Sell products. Earn royalties.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_WEB_URL || "https://rashpod.uz"),
  openGraph: {
    siteName: "RashPOD",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-rash antialiased min-h-screen">
        <header style={{ background: "white", borderBottom: "1px solid #E8EAFB", padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 24, position: "sticky", top: 0, zIndex: 50 }}>
          <Link href="/" style={{ fontWeight: 700, fontSize: 18, color: "#788AE0", textDecoration: "none", letterSpacing: -0.5 }}>RashPOD</Link>
          <nav style={{ display: "flex", gap: 20, marginLeft: "auto", alignItems: "center" }}>
            <Link href="/shop" style={{ color: "#4B5563", textDecoration: "none", fontSize: 14 }}>Shop</Link>
            <Link href="/designers" style={{ color: "#4B5563", textDecoration: "none", fontSize: 14 }}>Designers</Link>
            <Link href="/film" style={{ color: "#4B5563", textDecoration: "none", fontSize: 14 }}>Films</Link>
            <a href={`${DASHBOARD_URL}/auth/login`} style={{ color: "#788AE0", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Sign in</a>
            <a href={`${DASHBOARD_URL}/auth/register?role=designer`} style={{ background: "#F39E7C", color: "white", padding: "8px 16px", borderRadius: 999, textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
              Start selling
            </a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
