"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primaryBlue" | "primaryPeach" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primaryBlue", size = "md", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-full font-semibold transition-colors focus:outline-none focus:ring-4 focus:ring-focus disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
      primaryBlue: "bg-brand-blue text-white shadow-blueGlow hover:bg-brand-blue-second",
      primaryPeach: "bg-brand-peach text-white shadow-peachGlow hover:bg-brand-peach-second",
      outline: "border border-brand-blue text-brand-blue hover:bg-brand-blue/5",
      ghost: "text-brand-text hover:bg-surface-border-soft",
      danger: "bg-semantic-danger text-white hover:bg-semantic-danger/90",
    };

    const sizes = {
      sm: "h-[38px] px-4 text-[13px]",
      md: "h-12 px-6 text-[14px]",
      lg: "h-14 px-[30px] text-[16px]",
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";
