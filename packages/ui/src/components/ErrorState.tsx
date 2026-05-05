"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { AlertCircle } from "lucide-react";

export interface ErrorStateProps {
  title: string;
  description?: string;
  retry?: React.ReactNode;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  description,
  retry,
  className,
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-6 text-center", className)}>
      <div className="mb-4 text-semantic-danger">
        <AlertCircle size={48} />
      </div>
      <h3 className="text-lg font-semibold text-brand-ink mb-2">{title}</h3>
      {description && <p className="text-sm text-brand-muted max-w-md mb-6">{description}</p>}
      {retry && <div>{retry}</div>}
    </div>
  );
};
ErrorState.displayName = "ErrorState";
