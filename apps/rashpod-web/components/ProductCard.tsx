"use client";

import Link from "next/link";
import Image from "next/image";
import { Card } from "@rashpod/ui";
import { Heart, Package, ShoppingBag } from "lucide-react";

interface ProductCardProps {
  id: string;
  slug: string;
  title: string;
  price: number;
  imageUrl?: string;
  designer: {
    displayName: string;
    handle: string;
  };
}

export function ProductCard({ id, slug, title, price, imageUrl, designer }: ProductCardProps) {
  return (
    <Card variant="lift" className="group overflow-hidden !rounded-product !p-[18px]">
      <Link href={`/product/${slug}`}>
        <div className="relative mb-4 h-64 w-full overflow-hidden rounded-[22px] bg-brand-bg">
          <span
            className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-brand-muted shadow-xs transition-colors group-hover:text-brand-peach"
            aria-hidden="true"
          >
            <Heart size={16} />
          </span>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-brand-muted">
              <Package className="h-12 w-12" />
            </div>
          )}
        </div>
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="mb-1 line-clamp-2 font-semibold leading-snug text-brand-ink">{title}</h3>
            <p className="mb-2 text-sm text-brand-muted">by {designer.displayName}</p>
            <p className="text-lg font-bold text-brand-blue">{price.toLocaleString()} UZS</p>
          </div>
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-peach text-white shadow-fab transition-transform group-hover:scale-105">
            <ShoppingBag size={16} aria-hidden="true" />
          </span>
        </div>
      </Link>
    </Card>
  );
}
