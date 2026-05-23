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
  cartItemCount?: number;
  onCartOpen?: () => void;
  cartIcon?: React.ReactNode;
  localeSwitcher?: React.ReactNode;
  navLabels?: {
    shop?: string;
    categories?: string;
    films?: string;
    sellOnRashpod?: string;
    customOrder?: string;
    business?: string;
    about?: string;
    signIn?: string;
    startSelling?: string;
  };
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
  cartItemCount = 0,
  onCartOpen,
  cartIcon,
  localeSwitcher,
  navLabels,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const finalSignInUrl = signInUrl || `${dashboardUrl}/auth/login`;
  const finalStartSellingUrl = startSellingUrl || `${dashboardUrl}/auth/register`;

  const navLinks = [
    { href: shopUrl, label: navLabels?.shop ?? "Shop" },
    { href: `${shopUrl}#categories`, label: navLabels?.categories ?? "Categories" },
    { href: filmsUrl, label: navLabels?.films ?? "Films" },
    { href: "/sell-on-rashpod", label: navLabels?.sellOnRashpod ?? "Sell on RashPOD" },
    { href: "/custom-order", label: navLabels?.customOrder ?? "Custom order" },
    { href: "/business", label: navLabels?.business ?? "Start Your Business", hasChevron: true },
    { href: aboutUrl, label: navLabels?.about ?? "About Us" },
  ];

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-blue focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue"
      >
        Skip to content
      </a>
      <header className={cn("sticky top-0 z-sticky bg-brand-bg/95 backdrop-blur-md", className)}>
        <div className="mx-auto flex h-14 max-w-storefront items-center justify-between gap-5 px-4 sm:px-5 md:h-[76px]">
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
            {localeSwitcher}
            {onCartOpen ? (
              <button
                type="button"
                className="relative inline-flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-surface-borderSoft transition-colors hover:bg-surface-borderSoft"
                onClick={onCartOpen}
                aria-label={`Open cart${cartItemCount ? `, ${cartItemCount} items` : ""}`}
              >
                {cartIcon}
                {cartItemCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand-peach px-1 text-[10px] font-bold text-white">
                    {cartItemCount > 99 ? "99+" : cartItemCount}
                  </span>
                ) : null}
              </button>
            ) : null}
            <Link href={finalSignInUrl}>
              <span className="inline-flex h-[34px] items-center justify-center rounded-[10px] border border-brand-peach bg-transparent px-4 text-[13px] font-medium text-brand-ink transition-colors hover:bg-brand-peach hover:text-white">
                {navLabels?.signIn ?? "Sign in"}
              </span>
            </Link>
            <Link href={finalStartSellingUrl}>
              <span className="inline-flex h-[34px] items-center justify-center rounded-[10px] bg-brand-peach px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#EA8F6E]">
                {navLabels?.startSelling ?? "Start Selling"}
              </span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-1 lg:hidden">
            {onCartOpen ? (
              <button
                type="button"
                className="relative rounded-lg p-2 transition-colors hover:bg-surface-borderSoft"
                onClick={onCartOpen}
                aria-label={`Open cart${cartItemCount ? `, ${cartItemCount} items` : ""}`}
              >
                {cartIcon ?? <Menu size={24} />}
                {cartItemCount > 0 ? (
                  <span className="absolute right-0 top-0 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand-peach px-1 text-[10px] font-bold text-white">
                    {cartItemCount > 99 ? "99+" : cartItemCount}
                  </span>
                ) : null}
              </button>
            ) : null}
            <button
              className="rounded-lg p-2 transition-colors hover:bg-surface-borderSoft"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer — portaled to body so it isn't clipped by sticky header */}
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
            {localeSwitcher ? <div className="pb-2">{localeSwitcher}</div> : null}
            <Link href={finalSignInUrl} onClick={() => setMobileMenuOpen(false)}>
              <span className="inline-flex h-11 w-full items-center justify-center rounded-[12px] border border-brand-peach text-brand-ink">
                {navLabels?.signIn ?? "Sign in"}
              </span>
            </Link>
            <Link href={finalStartSellingUrl} onClick={() => setMobileMenuOpen(false)}>
              <span className="inline-flex h-11 w-full items-center justify-center rounded-[12px] bg-brand-peach text-white">
                {navLabels?.startSelling ?? "Start Selling"}
              </span>
            </Link>
          </div>
        </nav>
      </Drawer>
    </>
  );
};
PublicHeader.displayName = "PublicHeader";
