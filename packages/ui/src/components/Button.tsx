"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "../lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref" | "children"> {
  variant?: "primaryBlue" | "primaryPeach" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primaryBlue", size = "md", loading = false, children, disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition-colors focus:outline-none focus:ring-4 focus:ring-brand-blue/20 disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
      primaryBlue: "bg-brand-blue text-white shadow-blueGlow hover:bg-brand-blueSecondary",
      primaryPeach: "bg-brand-peach text-white shadow-peachGlow hover:bg-brand-peachSecondary",
      secondary: "border border-brand-blue text-brand-blue hover:bg-brand-blue/5",
      ghost: "text-brand-ink hover:bg-surface-borderSoft",
      danger: "bg-semantic-danger text-white hover:bg-semantic-danger/90",
    };

    const sizes = {
      sm: "h-[38px] px-4 text-[13px]",
      md: "h-12 px-6 text-[14px]",
      lg: "h-14 px-[30px] text-[16px]",
    };

    const motionProps = !loading && !disabled ? {
      whileHover: { scale: 1.02 },
      whileTap: { scale: 0.98 },
    } : {};

    return (
      <motion.button
        ref={ref}
        {...motionProps}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" size={16} />}
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";
