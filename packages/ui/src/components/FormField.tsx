"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface FormFieldProps {
  label?: string;
  helperText?: string;
  error?: boolean;
  errorMessage?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ label, helperText, error, errorMessage, required, htmlFor, children, className }, ref) => {
    const id = htmlFor || React.useId();

    return (
      <div ref={ref} className={cn("w-full", className)}>
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-brand-ink mb-2">
            {label}
            {required && <span className="text-semantic-danger ml-1">*</span>}
          </label>
        )}
        <div>
          {React.isValidElement(children)
            ? React.cloneElement(children as React.ReactElement<any>, { id, error })
            : children}
        </div>
        {helperText && !error && (
          <p className="mt-1 text-xs text-brand-muted">{helperText}</p>
        )}
        {error && errorMessage && (
          <p className="mt-1 text-xs text-semantic-dangerText">{errorMessage}</p>
        )}
      </div>
    );
  }
);
FormField.displayName = "FormField";
