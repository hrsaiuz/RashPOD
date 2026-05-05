"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "../lib/utils";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-2 text-sm", className)}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight size={16} className="text-brand-muted" />}
          {item.href ? (
            <Link
              href={item.href}
              className="text-brand-muted hover:text-brand-blue transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-brand-ink font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
Breadcrumbs.displayName = "Breadcrumbs";
