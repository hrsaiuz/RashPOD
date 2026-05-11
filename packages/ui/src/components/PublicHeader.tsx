"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "../lib/utils";
import { Menu, X, Globe } from "lucide-react";
import { Drawer } from "./Drawer";
import { Button } from "./Button";

export interface PublicHeaderProps {
  dashboardUrl?: string;
  shopUrl?: string;
  designersUrl?: string;
  filmsUrl?: string;
  aboutUrl?: string;
  signInUrl?: string;
  startSellingUrl?: string;
  logoUrl?: string | null;
  brandName?: string;
  className?: string;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({
  dashboardUrl = "http://localhost:3003",
  shopUrl = "/shop",
  designersUrl = "/designers",
  filmsUrl = "/films",
  aboutUrl = "/about",
  signInUrl,
  startSellingUrl,
  logoUrl,
  brandName = "RashPOD",
  className,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const finalSignInUrl = signInUrl || `${dashboardUrl}/auth/login`;
  const finalStartSellingUrl = startSellingUrl || `${dashboardUrl}/auth/register`;

  const navLinks = [
    { href: shopUrl, label: "Shop" },
    { href: designersUrl, label: "Designers" },
    { href: filmsUrl, label: "Films" },
    { href: aboutUrl, label: "About" },
  ];

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-blue focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue"
      >
        Skip to content
      </a>
      <header className={cn("sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-surface-borderSoft", className)}>
        <div className="max-w-[1280px] mx-auto px-6 h-[76px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-brand-blue">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={brandName} className="h-9 w-auto" />
            ) : (
              brandName
            )}
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-brand-ink hover:text-brand-blue transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <button className="p-2 rounded-lg hover:bg-surface-borderSoft transition-colors" aria-label="Language">
              <Globe size={20} className="text-brand-muted" />
            </button>
            <Link href={finalSignInUrl}>
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href={finalStartSellingUrl}>
              <Button variant="primaryPeach" size="sm">
                Start selling
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-surface-borderSoft transition-colors"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Menu"
          >
            <Menu size={24} />
          </button>
        </div>

        {/* Mobile Drawer */}
        <Drawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} side="right">
          <nav className="flex flex-col gap-4" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-base font-medium text-brand-ink hover:text-brand-blue transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-surface-borderSoft pt-4 mt-4 flex flex-col gap-3">
              <Link href={finalSignInUrl} onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" size="md" className="w-full">
                  Sign in
                </Button>
              </Link>
              <Link href={finalStartSellingUrl} onClick={() => setMobileMenuOpen(false)}>
                <Button variant="primaryPeach" size="md" className="w-full">
                  Start selling
                </Button>
              </Link>
            </div>
          </nav>
        </Drawer>
      </header>
    </>
  );
};
PublicHeader.displayName = "PublicHeader";
