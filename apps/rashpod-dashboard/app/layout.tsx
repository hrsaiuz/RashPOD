import type { ReactNode } from "react";
import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import { MotionProvider } from "@rashpod/ui";
import { AuthProvider } from "./auth/auth-provider";
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

export const metadata: Metadata = {
  title: { default: "RashPOD Dashboard", template: "%s | RashPOD Dashboard" },
  description: "RashPOD operations and designer dashboard",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${inter.variable}`}>
      <body className="font-rash antialiased min-h-screen bg-brand-bg">
        <MotionProvider>
          <AuthProvider>{children}</AuthProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
