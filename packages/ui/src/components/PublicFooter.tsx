"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "../lib/utils";
import { Globe, Mail, ExternalLink } from "lucide-react";

export interface PublicFooterLink {
  href: string;
  label: string;
}

export interface PublicFooterProps {
  shopLinks?: PublicFooterLink[];
  designerLinks?: PublicFooterLink[];
  companyLinks?: PublicFooterLink[];
  termsUrl?: string;
  privacyUrl?: string;
  cookiesUrl?: string;
  className?: string;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({
  shopLinks = [
    { href: "/shop", label: "All Products" },
    { href: "/shop/new", label: "New Arrivals" },
    { href: "/shop/bestsellers", label: "Bestsellers" },
    { href: "/films", label: "DTF/UV-DTF Films" },
  ],
  designerLinks = [
    { href: "/designers", label: "Designer Directory" },
    { href: "/auth/register", label: "Start Selling" },
    { href: "/docs/guidelines", label: "Design Guidelines" },
    { href: "/docs/royalties", label: "Royalties" },
  ],
  companyLinks = [
    { href: "/about", label: "About RashPOD" },
    { href: "/contact", label: "Contact" },
    { href: "/careers", label: "Careers" },
    { href: "/blog", label: "Blog" },
  ],
  termsUrl = "/legal/terms",
  privacyUrl = "/legal/privacy",
  cookiesUrl = "/legal/cookies",
  className,
}) => {
  return (
    <footer className={cn("bg-white border-t border-surface-borderSoft mt-20", className)}>
      <div className="max-w-[1280px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-bold text-brand-blue mb-3">RashPOD</h3>
            <p className="text-sm text-brand-muted">
              Upload your designs. Sell products. Earn royalties.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-semibold text-brand-ink mb-3">Shop</h4>
            <ul className="space-y-2">
              {shopLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-brand-muted hover:text-brand-blue transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Designers */}
          <div>
            <h4 className="font-semibold text-brand-ink mb-3">For Designers</h4>
            <ul className="space-y-2">
              {designerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-brand-muted hover:text-brand-blue transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-brand-ink mb-3">Company</h4>
            <ul className="space-y-2">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-brand-muted hover:text-brand-blue transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="pt-8 border-t border-surface-borderSoft flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm text-brand-muted">
            <span>© 2026 RashPOD</span>
            <Link href={termsUrl} className="hover:text-brand-blue transition-colors">
              Terms
            </Link>
            <Link href={privacyUrl} className="hover:text-brand-blue transition-colors">
              Privacy
            </Link>
            <Link href={cookiesUrl} className="hover:text-brand-blue transition-colors">
              Cookies
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 rounded-lg hover:bg-surface-borderSoft transition-colors" aria-label="Language">
              <Globe size={18} className="text-brand-muted" />
            </button>
            <a href="mailto:hello@rashpod.com" aria-label="Email">
              <Mail size={18} className="text-brand-muted hover:text-brand-blue transition-colors" />
            </a>
            <a href="https://rashpod.com" target="_blank" rel="noopener noreferrer" aria-label="Website">
              <ExternalLink size={18} className="text-brand-muted hover:text-brand-blue transition-colors" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
PublicFooter.displayName = "PublicFooter";
