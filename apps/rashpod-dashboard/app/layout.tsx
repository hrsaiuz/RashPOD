import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "./auth/auth-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "RashPOD Dashboard", template: "%s | RashPOD Dashboard" },
  description: "RashPOD operations and designer dashboard",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-rash antialiased min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
