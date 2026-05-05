"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ArrowRight } from "lucide-react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface CategoryTileProps {
  category: string;
  title: string;
  variant?: "blue" | "peach";
  imageUrl?: string;
  className?: string;
  onClick?: () => void;
}

export function CategoryTile({ category, title, variant = "blue", imageUrl, className, onClick }: CategoryTileProps) {
  const isBlue = variant === "blue";

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      className={cn(
        "relative rounded-[24px] p-7 min-h-[240px] flex flex-col items-start justify-between cursor-pointer overflow-hidden shadow-sm",
        isBlue ? "bg-brand-blue" : "bg-brand-peach",
        className
      )}
      onClick={onClick}
    >
      <div className="relative z-10 flex flex-col gap-1">
        <span className={cn("text-[16px] font-medium", isBlue ? "text-brand-peach" : "text-brand-blue")}>
          {category}
        </span>
        <h2 className={cn("text-[32px] md:text-[44px] font-bold leading-tight", isBlue ? "text-brand-white" : "text-brand-ink")}>
          {title}
        </h2>
        <div className={cn(
          "mt-4 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-colors",
          isBlue ? "bg-brand-peach text-brand-white hover:bg-brand-peach-second" : "bg-white text-brand-ink hover:bg-surface-app"
        )}>
          SHOP NOW <ArrowRight className="ml-2 w-4 h-4" />
        </div>
      </div>

      {imageUrl && (
        <div className="absolute right-[-10%] bottom-[-10%] w-[60%] h-[110%] pointer-events-none">
          <motion.img 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            src={imageUrl} 
            alt={title} 
            className="w-full h-full object-contain drop-shadow-2xl" 
          />
        </div>
      )}
    </motion.div>
  );
}
