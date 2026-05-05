"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
      whileHover={{ y: -4, boxShadow: "0 12px 28px rgba(16, 24, 40, 0.08)" }}
      className={cn(
        "bg-surface-card border border-surface-border-soft rounded-[28px] p-[18px] shadow-sm cursor-pointer transition-shadow",
        className
      )}
      onClick={onClick}
    >
      <div className="w-full h-[220px] bg-brand-bg rounded-[22px] mb-4 overflow-hidden relative">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-muted text-4xl">🎨</div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold text-[15px] text-brand-ink">{title}</h3>
        <p className="text-[13px] text-brand-muted line-clamp-2">{description}</p>
        {price && <span className="font-bold text-brand-blue mt-1">{price}</span>}
      </div>
    </motion.div>
  );
}
