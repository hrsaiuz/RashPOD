"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { ChevronUp, ChevronDown } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { Spinner } from "./Spinner";

export interface DataTableColumn<T = any> {
  key: string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
}

export interface DataTableProps<T = any> {
  columns: DataTableColumn<T>[];
  rows: T[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  errorState?: React.ReactNode;
  onSort?: (key: string, direction: "asc" | "desc") => void;
  mobileMode?: "scroll" | "cards";
  className?: string;
  caption?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  rows,
  loading = false,
  emptyState,
  errorState,
  onSort,
  mobileMode = "scroll",
  className,
  caption = "Data table",
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    const newDirection =
      sortKey === key && sortDirection === "asc" ? "desc" : "asc";
    setSortKey(key);
    setSortDirection(newDirection);
    onSort?.(key, newDirection);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (errorState) {
    return errorState;
  }

  if (rows.length === 0) {
    return emptyState || <EmptyState title="No data" description="There are no items to display." />;
  }

  // Desktop/Scroll mode
  if (mobileMode === "scroll" || typeof window === "undefined" || window.innerWidth >= 768) {
    return (
      <div className={cn("overflow-x-auto rounded-2xl border border-surface-borderSoft", className)}>
        <table className="w-full bg-white">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-surface-borderSoft bg-surface-card">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "px-6 py-4 text-left text-xs font-semibold text-brand-muted uppercase tracking-wider",
                    column.sortable && "cursor-pointer select-none hover:bg-surface-borderSoft"
                  )}
                  onClick={column.sortable ? () => handleSort(column.key) : undefined}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.sortable && sortKey === column.key && (
                      sortDirection === "asc" ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-borderSoft">
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="hover:bg-surface-borderSoft transition-colors"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-6 py-4 text-sm text-brand-ink"
                  >
                    {column.render
                      ? column.render(row[column.key], row)
                      : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Mobile Cards mode
  return (
    <div className={cn("space-y-4", className)}>
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="bg-white rounded-2xl p-4 border border-surface-borderSoft shadow-soft"
        >
          {columns.map((column) => (
            <div key={column.key} className="flex justify-between py-2 border-b last:border-b-0 border-surface-borderSoft">
              <span className="text-sm font-medium text-brand-muted">{column.header}</span>
              <span className="text-sm text-brand-ink">
                {column.render
                  ? column.render(row[column.key], row)
                  : row[column.key]}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
DataTable.displayName = "DataTable";
