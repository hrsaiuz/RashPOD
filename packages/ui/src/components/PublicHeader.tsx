"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "../lib/utils";
import { ChevronDown, Menu } from "lucide-react";
import { Drawer } from "./Drawer";

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
    { href: `${shopUrl}#categories`, label: "Categories" },
    { href: "/sell-on-rashpod", label: "Sell on RashPOD" },
    { href: "/custom-order", label: "Custom order" },
    { href: "/business", label: "Start Your Business", hasChevron: true },
    { href: aboutUrl, label: "About Us" },
  ];

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-blue focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue"
      >
        Skip to content
      </a>
      <header className={cn("sticky top-0 z-20 bg-[#F0F2FA]/95 backdrop-blur-md", className)}>
        <div className="mx-auto flex h-[56px] max-w-[1232px] items-center justify-between gap-5 px-5">
          <Link href="/" className="flex shrink-0 items-center text-[29px] font-normal lowercase leading-none tracking-[0.16em] text-brand-blue">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={brandName} className="h-7 w-auto" />
            ) : (
              <span>{brandName}</span>
            )}
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-9 lg:flex" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-2 text-[13px] font-medium text-black transition-colors hover:text-brand-blue"
              >
                {link.label}
                {link.hasChevron && <ChevronDown size={14} strokeWidth={2.2} aria-hidden="true" />}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden items-center gap-4 lg:flex">
            <Link href={finalSignInUrl}>
              <span className="inline-flex h-[34px] items-center justify-center rounded-[10px] border border-brand-peach bg-transparent px-4 text-[13px] font-medium text-brand-ink transition-colors hover:bg-brand-peach hover:text-white">
                Sign in
              </span>
            </Link>
            <Link href={finalStartSellingUrl}>
              <span className="inline-flex h-[34px] items-center justify-center rounded-[10px] bg-brand-peach px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#EA8F6E]">
                Start Selling
              </span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="rounded-lg p-2 transition-colors hover:bg-surface-borderSoft lg:hidden"
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
                className="flex items-center justify-between py-2 text-base font-medium text-brand-ink transition-colors hover:text-brand-blue"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>{link.label}</span>
                {link.hasChevron && <ChevronDown size={16} aria-hidden="true" />}
              </Link>
            ))}
            <div className="border-t border-surface-borderSoft pt-4 mt-4 flex flex-col gap-3">
              <Link href={finalSignInUrl} onClick={() => setMobileMenuOpen(false)}>
                <span className="inline-flex h-11 w-full items-center justify-center rounded-[12px] border border-brand-peach text-brand-ink">
                  Sign in
                </span>
              </Link>
              <Link href={finalStartSellingUrl} onClick={() => setMobileMenuOpen(false)}>
                <span className="inline-flex h-11 w-full items-center justify-center rounded-[12px] bg-brand-peach text-white">
                  Start Selling
                </span>
              </Link>
            </div>
          </nav>
        </Drawer>
      </header>
    </>
  );
};
PublicHeader.displayName = "PublicHeader";
