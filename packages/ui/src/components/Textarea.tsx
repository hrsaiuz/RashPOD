"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full min-h-[120px] p-4 rounded-xl border bg-white text-brand-ink text-sm",
          "transition-colors focus:outline-none focus:ring-4 focus:ring-brand-blue/20 focus:border-brand-blue",
          "disabled:opacity-50 disabled:cursor-not-allowed resize-y",
          error ? "border-semantic-danger" : "border-surface-border",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
