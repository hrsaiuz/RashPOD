"use client";

import * as React from "react";
import { Boxes } from "lucide-react";
import { cn } from "../lib/utils";

export interface ProductPickerCardProps {
  id: string;
  name: string;
  imageUrl?: string | null;
  subtitle?: string | null;
  badge?: string | null;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: (id: string) => void;
  className?: string;
}

export function ProductPickerCard({
  id,
  name,
  imageUrl,
  subtitle,
  badge,
  selected = false,
  disabled = false,
  onSelect,
  className,
}: ProductPickerCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect?.(id)}
      className={cn(
        "group w-full overflow-hidden rounded-2xl border bg-white text-left shadow-soft transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20",
        selected ? "border-brand-blue ring-2 ring-brand-blue/30" : "border-surface-borderSoft hover:border-brand-blue/40",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
      aria-pressed={selected}
    >
      <div className="aspect-square flex items-center justify-center overflow-hidden bg-brand-bg">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={name} className="h-full w-full object-contain" />
        ) : (
          <Boxes className="text-brand-muted" size={40} />
        )}
      </div>
      <div className="space-y-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold text-brand-ink">{name}</p>
          {badge ? (
            <span className="shrink-0 rounded-pill bg-brand-blue/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-blue">
              {badge}
            </span>
          ) : null}
        </div>
        {subtitle ? <p className="truncate text-xs text-brand-muted">{subtitle}</p> : null}
      </div>
    </button>
  );
}

export interface ProductPickerGridProps {
  items: Array<{
    id: string;
    name: string;
    imageUrl?: string | null;
    subtitle?: string | null;
    badge?: string | null;
    disabled?: boolean;
  }>;
  selectedId?: string;
  onSelect: (id: string) => void;
  emptyLabel?: string;
  className?: string;
}

export function ProductPickerGrid({
  items,
  selectedId,
  onSelect,
  emptyLabel = "No products available.",
  className,
}: ProductPickerGridProps) {
  if (!items.length) {
    return <p className="text-sm text-brand-muted">{emptyLabel}</p>;
  }

  return (
    <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4", className)}>
      {items.map((item) => (
        <ProductPickerCard
          key={item.id}
          id={item.id}
          name={item.name}
          imageUrl={item.imageUrl}
          subtitle={item.subtitle}
          badge={item.badge}
          selected={selectedId === item.id}
          disabled={item.disabled}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
