import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

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
      <body style={{ margin: 0, background: "#F0F2FA", color: "#1A1D2E", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
        <header style={{ background: "white", borderBottom: "1px solid #E8EAFB", padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 24, position: "sticky", top: 0, zIndex: 50 }}>
          <a href="/" style={{ fontWeight: 700, fontSize: 18, color: "#788AE0", textDecoration: "none", letterSpacing: -0.5 }}>RashPOD</a>
          <nav style={{ display: "flex", gap: 20, marginLeft: "auto", alignItems: "center" }}>
            <a href="/shop" style={{ color: "#4B5563", textDecoration: "none", fontSize: 14 }}>Shop</a>
            <a href="/designers" style={{ color: "#4B5563", textDecoration: "none", fontSize: 14 }}>Designers</a>
            <a href="/film" style={{ color: "#4B5563", textDecoration: "none", fontSize: 14 }}>Films</a>
            <a href="/auth/login" style={{ color: "#788AE0", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Sign in</a>
            <a href="/auth/register" style={{ background: "#F39E7C", color: "white", padding: "8px 16px", borderRadius: 999, textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
              Start selling
            </a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
