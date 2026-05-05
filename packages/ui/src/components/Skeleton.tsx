"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  circle?: boolean;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, circle, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "animate-pulse bg-surface-borderSoft",
          circle ? "rounded-full" : "rounded-xl",
          className
        )}
        {...props}
      />
    );
  }
);
Skeleton.displayName = "Skeleton";
