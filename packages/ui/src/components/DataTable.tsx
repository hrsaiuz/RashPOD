"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { ChevronUp, ChevronDown } from "lucide-react";
import { EmptyState } from "./EmptyState";
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

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}

function TableView<T extends Record<string, any>>({
  columns,
  rows,
  sortKey,
  sortDirection,
  handleSort,
  className,
  caption,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  sortKey: string | null;
  sortDirection: "asc" | "desc";
  handleSort: (key: string) => void;
  className?: string;
  caption?: string;
}) {
  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-surface-borderSoft bg-white shadow-soft", className)}>
      <table className="w-full bg-white">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-surface-borderSoft bg-surface-app">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-brand-muted sm:px-6 sm:py-4",
                  column.sortable && "cursor-pointer select-none hover:bg-brand-blueLight/35"
                )}
                onClick={column.sortable ? () => handleSort(column.key) : undefined}
              >
                <div className="flex items-center gap-2">
                  {column.header}
                  {column.sortable && sortKey === column.key && (
                    sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-borderSoft">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="transition-colors hover:bg-surface-app">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-sm text-brand-ink sm:px-6 sm:py-4">
                  {column.render ? column.render(row[column.key], row) : String(row[column.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CardsView<T extends Record<string, any>>({
  columns,
  rows,
  className,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="rounded-2xl border border-surface-borderSoft bg-white p-4 shadow-soft"
        >
          {columns.map((column) => (
            <div
              key={column.key}
              className="flex justify-between gap-4 border-b border-surface-borderSoft py-2 last:border-b-0"
            >
              <span className="text-sm font-medium text-brand-muted">{column.header}</span>
              <span className="text-right text-sm text-brand-ink">
                {column.render ? column.render(row[column.key], row) : String(row[column.key] ?? "")}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
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
  const isMobile = useIsMobile();

  const handleSort = (key: string) => {
    const newDirection = sortKey === key && sortDirection === "asc" ? "desc" : "asc";
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

  if (errorState) return errorState;

  if (rows.length === 0) {
    return emptyState || <EmptyState title="No data" description="There are no items to display." />;
  }

  const showCards = mobileMode === "cards" && isMobile;

  if (showCards) {
    return <CardsView columns={columns} rows={rows} className={className} />;
  }

  return (
    <TableView
      columns={columns}
      rows={rows}
      sortKey={sortKey}
      sortDirection={sortDirection}
      handleSort={handleSort}
      className={className}
      caption={caption}
    />
  );
}

DataTable.displayName = "DataTable";
