import * as React from "react";
import { cn } from "../lib/utils";

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  as?: "section" | "div";
}

export function Section({ title, description, as: Tag = "section", className, children, ...props }: SectionProps) {
  return (
    <Tag className={cn("space-y-4 md:space-y-6", className)} {...props}>
      {(title || description) && (
        <div>
          {title ? <h2 className="text-section font-semibold text-brand-ink">{title}</h2> : null}
          {description ? <p className="mt-1 text-body text-brand-muted">{description}</p> : null}
        </div>
      )}
      {children}
    </Tag>
  );
}

Section.displayName = "Section";

/** Vertical stack with consistent section rhythm between major page blocks */
export function PageSections({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-8 md:gap-12 lg:gap-section", className)} {...props}>
      {children}
    </div>
  );
}

PageSections.displayName = "PageSections";
