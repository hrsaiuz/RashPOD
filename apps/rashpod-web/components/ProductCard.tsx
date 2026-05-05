"use client";

import Link from "next/link";
import Image from "next/image";
import { Card } from "@rashpod/ui";
import { Package } from "lucide-react";

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
    <Card variant="lift" className="overflow-hidden group">
      <Link href={`/product/${slug}`}>
        <div className="relative w-full h-64 bg-gray-100">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <Package className="w-12 h-12" />
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-brand-ink mb-1 line-clamp-2">{title}</h3>
          <p className="text-sm text-brand-muted mb-2">by {designer.displayName}</p>
          <p className="text-lg font-bold text-brand-blue">{price.toLocaleString()} UZS</p>
        </div>
      </Link>
    </Card>
  );
}
