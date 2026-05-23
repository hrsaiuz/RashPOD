import * as React from "react";
import { cn } from "../lib/utils";

export type PageContainerVariant = "storefront" | "dashboard" | "narrow" | "form";

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: PageContainerVariant;
  /** Tighter vertical padding for dense pages */
  compact?: boolean;
}

const variantClasses: Record<PageContainerVariant, string> = {
  storefront: "max-w-storefront",
  dashboard: "max-w-dashboard",
  narrow: "max-w-content",
  form: "max-w-form",
};

export function PageContainer({
  variant = "storefront",
  compact = false,
  className,
  children,
  ...props
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-5 md:px-6",
        compact ? "py-6 md:py-8" : "py-8 md:py-10 lg:py-12",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

PageContainer.displayName = "PageContainer";

/** @deprecated Use PageContainer variant="storefront" */
export function StorePage({ children, narrow = false }: { children: React.ReactNode; narrow?: boolean }) {
  return (
    <PageContainer variant={narrow ? "narrow" : "storefront"}>
      {children}
    </PageContainer>
  );
}
