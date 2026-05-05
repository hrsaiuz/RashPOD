"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "blue" | "peach" | "gray" | "green" | "red" | "yellow";
}

const variantStyles = {
  blue: "bg-brand-blueLight text-brand-blue",
  peach: "bg-brand-peachLight text-brand-peach",
  gray: "bg-semantic-pendingBg text-semantic-pendingText",
  green: "bg-semantic-successBg text-semantic-successText",
  red: "bg-semantic-dangerBg text-semantic-dangerText",
  yellow: "bg-semantic-warningBg text-semantic-warningText",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "gray", children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center px-2.5 py-1 rounded-pill text-xs font-medium",
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);
Badge.displayName = "Badge";
