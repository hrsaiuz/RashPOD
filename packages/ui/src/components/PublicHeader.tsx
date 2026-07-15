"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../lib/utils";
import { ChevronDown, Menu } from "lucide-react";
import { Drawer } from "./Drawer";

export interface PublicHeaderProps {
  dashboardUrl?: string;
  shopUrl?: string;
  designersUrl?: string;
  filmsUrl?: string;
  signInUrl?: string;
  startSellingUrl?: string;
  logoUrl?: string | null;
  brandName?: string;
  className?: string;
  cartItemCount?: number;
  onCartOpen?: () => void;
  cartIcon?: React.ReactNode;
  localeSwitcher?: React.ReactNode;
  shopCategories?: Array<{ name: string; slug: string; category: string }>;
  navLabels?: {
    shop?: string;
    categories?: string;
    films?: string;
    sellOnRashpod?: string;
    customOrder?: string;
    signIn?: string;
    startSelling?: string;
    allProducts?: string;
    newArrivals?: string;
    bestsellers?: string;
    designerCollections?: string;
    filmReady?: string;
    shopMenu?: string;
  };
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({
  dashboardUrl = "http://localhost:3003",
  shopUrl = "/shop",
  designersUrl = "/designers",
  filmsUrl = "/films",
  signInUrl,
  startSellingUrl,
  logoUrl,
  brandName = "RashPOD",
  className,
  cartItemCount = 0,
  onCartOpen,
  cartIcon,
  localeSwitcher,
  shopCategories = [],
  navLabels,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [shopMenuOpen, setShopMenuOpen] = React.useState(false);
  const [mobileShopOpen, setMobileShopOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const finalSignInUrl = signInUrl || `${dashboardUrl}/auth/login`;
  const finalStartSellingUrl = startSellingUrl || `${dashboardUrl}/auth/register`;

  const navLinks = [
    { href: filmsUrl, label: navLabels?.films ?? "Films" },
    { href: "/sell-on-rashpod", label: navLabels?.sellOnRashpod ?? "Sell on RashPOD" },
    { href: "/custom-order", label: navLabels?.customOrder ?? "Custom order" },
  ];
  const categoryGroups = React.useMemo(() => {
    const groups = new Map<string, typeof shopCategories>();
    shopCategories.forEach((item) => groups.set(item.category, [...(groups.get(item.category) ?? []), item]));
    return [...groups.entries()];
  }, [shopCategories]);
  const closeShopMenu = React.useCallback(() => setShopMenuOpen(false), []);
  const scheduleClose = React.useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(closeShopMenu, 140);
  }, [closeShopMenu]);
  const keepOpen = React.useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setShopMenuOpen(true);
  }, []);

  React.useEffect(() => closeShopMenu(), [pathname, closeShopMenu]);
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") closeShopMenu(); };
    const onPointer = (event: MouseEvent) => { if (!menuRef.current?.contains(event.target as Node)) closeShopMenu(); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onPointer); if (closeTimer.current) clearTimeout(closeTimer.current); };
  }, [closeShopMenu]);

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
            <div ref={menuRef} className="relative" onPointerEnter={keepOpen} onPointerLeave={scheduleClose}>
              <button
                type="button"
                className={cn("inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium transition-colors hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue", pathname.includes("/shop") && "text-brand-blue")}
                aria-haspopup="menu"
                aria-expanded={shopMenuOpen}
                aria-controls="shop-mega-menu"
                onClick={() => setShopMenuOpen((open) => !open)}
                onFocus={keepOpen}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") { event.preventDefault(); keepOpen(); requestAnimationFrame(() => menuRef.current?.querySelector<HTMLAnchorElement>("[role=menuitem]")?.focus()); }
                }}
              >
                {navLabels?.shop ?? "Shop"}<ChevronDown size={14} aria-hidden="true" className={cn("transition-transform", shopMenuOpen && "rotate-180")} />
              </button>
              {shopMenuOpen ? (
                <div id="shop-mega-menu" role="menu" aria-label={navLabels?.shopMenu ?? "Shop menu"} className="absolute left-1/2 top-full z-dropdown mt-2 w-[min(900px,calc(100vw-3rem))] -translate-x-1/3 rounded-2xl border border-surface-borderSoft bg-white p-6 shadow-lift" onPointerEnter={keepOpen} onPointerLeave={scheduleClose}>
                  <div className="grid gap-7 lg:grid-cols-[1.05fr_2fr_1fr]">
                    <MegaGroup title={navLabels?.shop ?? "Shop"} links={[
                      { href: shopUrl, label: navLabels?.allProducts ?? "All products" },
                      { href: `${shopUrl}?sort=newest`, label: navLabels?.newArrivals ?? "New arrivals" },
                      { href: `${shopUrl}?sort=popular`, label: navLabels?.bestsellers ?? "Bestsellers" },
                      { href: designersUrl, label: navLabels?.designerCollections ?? "Designer collections" },
                    ]} onNavigate={closeShopMenu} />
                    <div>
                      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-muted">{navLabels?.categories ?? "Categories"}</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                        {categoryGroups.map(([group, categories]) => <MegaGroup key={group} title={group} links={categories.map((category) => ({ href: `${shopUrl}?categories=${encodeURIComponent(category.slug)}`, label: category.name }))} onNavigate={closeShopMenu} compact />)}
                      </div>
                    </div>
                    <MegaGroup title={navLabels?.filmReady ?? "Film ready"} links={[{ href: filmsUrl, label: navLabels?.films ?? "Films" }, { href: "/custom-order", label: navLabels?.customOrder ?? "Custom order" }]} onNavigate={closeShopMenu} />
                  </div>
                </div>
              ) : null}
            </div>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-2 text-[13px] font-medium text-black transition-colors hover:text-brand-blue"
              >
                {link.label}
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
          <button type="button" className="flex min-h-11 items-center justify-between text-left text-base font-medium text-brand-ink" onClick={() => setMobileShopOpen((open) => !open)} aria-expanded={mobileShopOpen} aria-controls="mobile-shop-links">
            <span>{navLabels?.shop ?? "Shop"}</span><ChevronDown size={18} className={cn("transition-transform", mobileShopOpen && "rotate-180")} />
          </button>
          {mobileShopOpen ? (
            <div id="mobile-shop-links" className="space-y-1 border-l-2 border-brand-blueLight pl-4">
              {[{ href: shopUrl, label: navLabels?.allProducts ?? "All products" }, { href: `${shopUrl}?sort=newest`, label: navLabels?.newArrivals ?? "New arrivals" }, { href: `${shopUrl}?sort=popular`, label: navLabels?.bestsellers ?? "Bestsellers" }, ...shopCategories.map((category) => ({ href: `${shopUrl}?categories=${encodeURIComponent(category.slug)}`, label: category.name }))].map((link) => <Link role="menuitem" key={link.href} href={link.href} className="flex min-h-11 items-center text-sm text-brand-text hover:text-brand-blue" onClick={() => setMobileMenuOpen(false)}>{link.label}</Link>)}
            </div>
          ) : null}
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-between py-2 text-base font-medium text-brand-ink transition-colors hover:text-brand-blue"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>{link.label}</span>
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

function MegaGroup({ title, links, onNavigate, compact = false }: { title: string; links: Array<{ href: string; label: string }>; onNavigate: () => void; compact?: boolean }) {
  return <div><p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-muted">{title}</p><div className={cn("space-y-1", compact && "space-y-0")}>
    {links.map((link) => <Link role="menuitem" key={link.href} href={link.href} onClick={onNavigate} className="flex min-h-10 items-center rounded-lg px-2 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-blueLight/30 hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue">{link.label}</Link>)}
  </div></div>;
}
