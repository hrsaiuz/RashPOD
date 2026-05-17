"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Heart, Palette, ShoppingBag } from "lucide-react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ProductCardProps {
  title: string;
  description: string;
  price?: string;
  imageUrl?: string;
  className?: string;
  onClick?: () => void;
}

export function ProductCard({ title, description, price, imageUrl, className, onClick }: ProductCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: "0 18px 40px rgba(16, 24, 40, 0.12)" }}
      className={cn(
        "group bg-surface-card border border-surface-borderSoft rounded-product p-[18px] shadow-soft cursor-pointer transition-shadow",
        className
      )}
      onClick={onClick}
    >
      <div className="w-full h-[220px] bg-brand-bg rounded-[22px] mb-4 overflow-hidden relative">
        <span
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-brand-muted shadow-xs transition-colors hover:text-brand-peach"
          aria-hidden="true"
        >
          <Heart size={16} />
        </span>
        {imageUrl ? (
          <img src={imageUrl} alt={`Product: ${title}`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 text-brand-blue shadow-xs">
              <Palette size={28} aria-hidden="true" />
            </div>
          </div>
        )}
      </div>
      <div className="flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[15px] leading-snug text-brand-ink line-clamp-2">{title}</h3>
          <p className="text-[13px] text-brand-muted line-clamp-2">{description}</p>
          {price && <span className="font-bold text-brand-blue mt-1">{price}</span>}
        </div>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-peach text-white shadow-fab transition-transform group-hover:scale-105">
          <ShoppingBag size={16} aria-hidden="true" />
        </span>
      </div>
    </motion.div>
  );
}
