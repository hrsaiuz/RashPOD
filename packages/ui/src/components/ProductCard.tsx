"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Package, Palette, ShoppingBag } from "lucide-react";
import { cn } from "../lib/utils";
import { formatPrice } from "../lib/format-price";
import { Card } from "./Card";

export type ProductCardVariant = "compact" | "featured" | "designer-grid";

export interface ProductCardProps {
  title: string;
  slug?: string;
  description?: string;
  price?: number | string;
  imageUrl?: string;
  designer?: {
    displayName: string;
    handle?: string;
  };
  badge?: string;
  secondaryBadge?: string;
  variant?: ProductCardVariant;
  className?: string;
  href?: string;
  onClick?: () => void;
  /** @deprecated Use price as number */
  legacyPrice?: string;
}

function ProductCardInner({
  title,
  description,
  price,
  imageUrl,
  designer,
  badge,
  secondaryBadge,
  variant = "compact",
  className,
}: Omit<ProductCardProps, "slug" | "href" | "onClick" | "legacyPrice">) {
  const priceLabel =
    typeof price === "number" ? formatPrice(price) : price ?? undefined;

  if (variant === "featured") {
    return (
      <motion.article
        whileHover={{ y: -4 }}
        className={cn(
          "h-full rounded-md bg-brand-surface p-4 shadow-soft sm:p-6 sm:rounded-lg",
          className
        )}
      >
        <div className="relative h-[220px] overflow-hidden rounded-product bg-brand-bg sm:h-[267px]">
          {badge ? (
            <span className="absolute left-4 top-4 z-10 rounded-xs bg-badge-bestSeller px-3 py-1.5 text-caption font-bold text-white">
              {badge}
            </span>
          ) : null}
          {secondaryBadge ? (
            <span className="absolute left-4 top-12 z-10 rounded-xs bg-brand-blue px-3 py-1.5 text-caption font-bold text-white">
              {secondaryBadge}
            </span>
          ) : null}
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Palette size={48} className="text-brand-blue" aria-hidden="true" />
            </div>
          )}
        </div>
        <h3 className="mt-4 text-body font-extrabold text-brand-ink line-clamp-2">{title}</h3>
        {description ? (
          <p className="mt-2 text-caption text-brand-muted line-clamp-2">{description}</p>
        ) : null}
        {designer ? (
          <p className="mt-2 text-caption text-brand-muted">Designed by {designer.displayName}</p>
        ) : null}
        {priceLabel ? (
          <p className="mt-2 text-price tabular-nums text-brand-blue">{priceLabel}</p>
        ) : null}
      </motion.article>
    );
  }

  if (variant === "designer-grid") {
    return (
      <Card variant="lift" className={cn("group overflow-hidden !rounded-product !p-[18px]", className)}>
        <div className="relative mb-4 h-56 w-full overflow-hidden rounded-[22px] bg-brand-bg sm:h-64">
          <span
            className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-brand-muted shadow-xs transition-colors group-hover:text-brand-peach"
            aria-hidden="true"
          >
            <Heart size={16} />
          </span>
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-brand-muted">
              <Package className="h-12 w-12" />
            </div>
          )}
        </div>
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="mb-1 line-clamp-2 font-semibold leading-snug text-brand-ink">{title}</h3>
            {designer ? <p className="mb-2 text-sm text-brand-muted">by {designer.displayName}</p> : null}
            {priceLabel ? (
              <p className="text-lg font-bold tabular-nums text-brand-blue">{priceLabel}</p>
            ) : null}
          </div>
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-peach text-white shadow-fab transition-transform group-hover:scale-105">
            <ShoppingBag size={16} aria-hidden="true" />
          </span>
        </div>
      </Card>
    );
  }

  // compact (default — shop grid)
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: "0 18px 40px rgba(16, 24, 40, 0.12)" }}
      className={cn(
        "group cursor-pointer rounded-product border border-surface-borderSoft bg-surface-card p-[18px] shadow-soft transition-shadow",
        className
      )}
    >
      <div className="relative mb-4 h-[220px] w-full overflow-hidden rounded-[22px] bg-brand-bg">
        <span
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-brand-muted shadow-xs transition-colors hover:text-brand-peach"
          aria-hidden="true"
        >
          <Heart size={16} />
        </span>
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Palette size={28} className="text-brand-blue" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-brand-ink">{title}</h3>
          {designer ? (
            <p className="mb-1 text-[13px] text-brand-muted">by {designer.displayName}</p>
          ) : description ? (
            <p className="text-[13px] text-brand-muted line-clamp-2">{description}</p>
          ) : null}
          {priceLabel ? (
            <span className="mt-1 block font-bold tabular-nums text-brand-blue">{priceLabel}</span>
          ) : null}
        </div>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-peach text-white shadow-fab transition-transform group-hover:scale-105">
          <ShoppingBag size={16} aria-hidden="true" />
        </span>
      </div>
    </motion.div>
  );
}

export function ProductCard({
  title,
  slug,
  href,
  onClick,
  legacyPrice,
  price,
  ...rest
}: ProductCardProps) {
  const resolvedPrice = price ?? legacyPrice;
  const linkHref = href ?? (slug ? `/product/${slug}` : undefined);

  const inner = (
    <ProductCardInner title={title} price={resolvedPrice} {...rest} />
  );

  if (linkHref) {
    return (
      <Link href={linkHref} className="block h-full">
        {inner}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block h-full w-full text-left">
        {inner}
      </button>
    );
  }

  return inner;
}

ProductCard.displayName = "ProductCard";
