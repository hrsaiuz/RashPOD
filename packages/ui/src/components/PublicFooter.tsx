"use client";

import * as React from "react";
import Link from "next/link";
import { Camera, Send } from "lucide-react";
import { cn } from "../lib/utils";

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
    { href: "/film", label: "DTF/UV-DTF Films" },
  ],
  designerLinks = [
    { href: "/designers", label: "Designer Directory" },
    { href: "/auth/register", label: "Start Selling" },
    { href: "/docs/guidelines", label: "Design Guidelines" },
    { href: "/docs/royalties", label: "Royalties" },
  ],
  companyLinks = [
    { href: "/about", label: "About Us" },
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
    <footer className={cn("relative overflow-hidden bg-brand-peach pt-[272px]", className)}>
      <div className="relative rounded-t-[37px] bg-white px-5 pb-7 pt-[68px] md:rounded-t-[54px]">
        <div className="mx-auto grid max-w-[1207px] grid-cols-1 gap-9 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.8fr]">
          <FooterColumn title="Shop" links={shopLinks} />
          <FooterColumn title="For Designers" links={designerLinks} />
          <FooterColumn title="Company" links={companyLinks} />

          <div>
            <h3 className="mb-6 text-[18px] font-extrabold text-black">Join the RASH POD Club</h3>
            <Link
              href="/auth/register"
              className="mb-6 inline-flex h-[54px] min-w-[141px] items-center justify-center rounded-[15px] bg-brand-blue px-7 text-[17px] font-extrabold tracking-[0.08em] text-white"
            >
              join Now
            </Link>
            <p className="mb-2 text-[18px] font-semibold tracking-[0.16em] text-black">Be the first to get the next drop</p>
            <p className="text-[16px] text-black">Receive a mystery design every month</p>
            <div className="mt-[68px] flex gap-7">
              <a href="https://t.me/rashpod" target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="text-black transition-transform hover:scale-110">
                <Send size={32} strokeWidth={2.3} />
              </a>
              <a href="https://instagram.com/rashpod" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-black transition-transform hover:scale-110">
                <Camera size={32} strokeWidth={2.3} />
              </a>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-12 flex max-w-[1207px] flex-wrap items-center gap-x-10 gap-y-4 text-[15px] text-[#4B4B55]">
          <span>© 2026 RashPOD, All rights reserved.</span>
          <Link href={termsUrl} className="hover:text-brand-blue">Terms</Link>
          <Link href={privacyUrl} className="hover:text-brand-blue">Privacy</Link>
          <Link href={cookiesUrl} className="hover:text-brand-blue">Cookies</Link>
        </div>

        <div className="pointer-events-none mx-auto mt-[68px] max-w-[1207px] overflow-hidden">
          <p className="select-none text-center text-[clamp(102px,15.3vw,209px)] font-black lowercase leading-[0.75] tracking-[-0.09em] text-brand-peach">
            rashpod
          </p>
        </div>
      </div>
    </footer>
  );
};

function FooterColumn({ title, links }: { title: string; links: PublicFooterLink[] }) {
  return (
    <div>
      <h3 className="mb-7 text-[16px] font-medium text-[#33333A]">{title}</h3>
      <ul className="space-y-5">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-[16px] text-[#5B5B66] transition-colors hover:text-brand-blue">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

PublicFooter.displayName = "PublicFooter";
