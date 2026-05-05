"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "flat" | "lift";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const variants = {
      default: "bg-white shadow-soft border border-surface-borderSoft",
      flat: "bg-white border border-surface-borderSoft",
      lift: "bg-white shadow-lift border border-surface-borderSoft",
    };

    const MotionDiv = variant === "lift" ? motion.div : "div";
    const motionProps = variant === "lift" ? {
      whileHover: { y: -4, scale: 1.01 },
      transition: { duration: 0.18 },
    } : {};

    return (
      <MotionDiv
        ref={ref}
        className={cn("rounded-2xl p-6", variants[variant], className)}
        {...(variant === "lift" ? motionProps : {})}
        {...props}
      >
        {children}
      </MotionDiv>
    );
  }
);
Card.displayName = "Card";
