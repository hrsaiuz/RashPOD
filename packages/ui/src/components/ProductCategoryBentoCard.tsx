"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";
import { ArrowRight, Package } from "lucide-react";

export interface ProductCategoryBentoCardProps {
  /** Category group label e.g. "clothes", "prints", "ceramics" */
  category: string;
  /** Product type name e.g. "t-shirt", "hoodie" */
  productName: string;
  /** Color variant for the card background */
  variant?: "blue" | "peach";
  /** Optional product image URL (admin-uploaded via media library) */
  imageUrl?: string | null;
  /** Whether to show the "SHOP NOW" pill button */
  showShopButton?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

export function ProductCategoryBentoCard({
  category,
  productName,
  variant = "blue",
  imageUrl,
  showShopButton = false,
  className,
  onClick,
}: ProductCategoryBentoCardProps) {
  const isBlue = variant === "blue";

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.015 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative rounded-[20px] overflow-hidden cursor-pointer",
        "flex min-h-[200px] md:min-h-[240px]",
        isBlue ? "bg-brand-blue" : "bg-brand-peach",
        className
      )}
      onClick={onClick}
    >
      {/* Left: text content */}
      <div className="relative z-10 flex flex-col justify-between p-5 md:p-6 w-[48%] shrink-0">
        <div>
          <span
            className={cn(
              "text-[13px] font-medium leading-none",
              isBlue ? "text-brand-peachLight" : "text-brand-blueLight"
            )}
          >
            {category}
          </span>
          <h3
            className={cn(
              "text-[22px] md:text-[28px] font-bold leading-tight mt-1",
              isBlue ? "text-white" : "text-brand-ink"
            )}
          >
            {productName}
          </h3>
        </div>

        {showShopButton && (
          <div className="mt-4">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold uppercase tracking-wide transition-opacity hover:opacity-90",
                isBlue
                  ? "bg-brand-peach text-white"
                  : "bg-white text-brand-ink"
              )}
            >
              Shop now <ArrowRight size={13} />
            </span>
          </div>
        )}
      </div>

      {/* Right: image area */}
      <div className="relative flex-1 flex items-end justify-center overflow-visible">
        {/* Elliptical shadow beneath product */}
        <div
          className={cn(
            "absolute bottom-3 left-1/2 -translate-x-1/2 w-[70%] h-[14px] rounded-full blur-xl opacity-60",
            isBlue ? "bg-[#4a5ab0]" : "bg-[#c07a5a]"
          )}
          aria-hidden="true"
        />

        {imageUrl ? (
          <motion.img
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            src={imageUrl}
            alt={productName}
            className="relative w-[90%] h-[88%] object-contain drop-shadow-lg"
            draggable={false}
          />
        ) : (
          <div
            className={cn(
              "relative flex items-center justify-center w-20 h-20 rounded-2xl mb-10",
              isBlue ? "bg-white/10" : "bg-brand-ink/5"
            )}
          >
            <Package
              size={36}
              className={isBlue ? "text-white/30" : "text-brand-ink/20"}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
