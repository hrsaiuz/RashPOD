import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { PublicHeader, PublicFooter, MotionProvider, getDashboardUrl } from "@rashpod/ui";

import "./globals.css";

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
  const dashboardUrl = getDashboardUrl();

  return (
    <html lang="en" className={inter.variable}>
      <body className="font-rash antialiased">
        <MotionProvider>
          <PublicHeader
            signInUrl="/auth/login"
            startSellingUrl={`${dashboardUrl}/auth/register?role=designer`}
            shopUrl="/shop"
            designersUrl="/designers"
            filmsUrl="/film"
            aboutUrl="/about"
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
