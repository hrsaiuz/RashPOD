"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "flat" | "lift";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", children, onClick, onMouseEnter, onMouseLeave, ...props }, ref) => {
    const variants = {
      default: "bg-white shadow-soft border border-surface-borderSoft",
      flat: "bg-white border border-surface-borderSoft",
      lift: "bg-white shadow-lift border border-surface-borderSoft",
    };

    const baseClassName = cn("rounded-2xl p-6", variants[variant], className);

    if (variant === "lift") {
      return (
        <motion.div
          ref={ref}
          whileHover={{ y: -4, scale: 1.01 }}
          transition={{ duration: 0.18 }}
          className={baseClassName}
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <div
        ref={ref}
        className={baseClassName}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";
