import * as React from "react";
import { cn } from "../lib/utils";

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** Use text-3xl for dashboard landing overviews only */
  size?: "default" | "large";
  className?: string;
}

export function PageHeader({ title, description, actions, size = "default", className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-start md:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <h1
          className={cn(
            "font-bold text-brand-ink",
            size === "large" ? "text-h2 md:text-h1" : "text-h3 md:text-h2"
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-body text-brand-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}

PageHeader.displayName = "PageHeader";
