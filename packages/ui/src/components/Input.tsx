"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  errorMessage?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, errorMessage, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={cn(
            "w-full h-12 px-4 rounded-xl border bg-white text-brand-ink text-sm",
            "transition-colors focus:outline-none focus:ring-4 focus:ring-brand-blue/20 focus:border-brand-blue",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error ? "border-semantic-danger" : "border-surface-border",
            className
          )}
          {...props}
        />
        {error && errorMessage && (
          <p className="mt-1 text-xs text-semantic-dangerText">{errorMessage}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
