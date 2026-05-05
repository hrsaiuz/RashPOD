"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-6 text-center", className)}>
      {icon && <div className="mb-4 text-brand-muted">{icon}</div>}
      <h3 className="text-lg font-semibold text-brand-ink mb-2">{title}</h3>
      {description && <p className="text-sm text-brand-muted max-w-md mb-6">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
};
EmptyState.displayName = "EmptyState";
