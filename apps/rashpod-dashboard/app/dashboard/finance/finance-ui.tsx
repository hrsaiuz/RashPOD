"use client";

import Link from "next/link";
import * as React from "react";
import { RefreshCw } from "lucide-react";
import { Button, Card, PageHeader, Skeleton, StatusBadge } from "@rashpod/ui";

export function money(value = 0, currency = "UZS") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "UZS" ? 0 : 2,
  }).format(value || 0);
}

export function formatLabel(value: string) {
  return value.replace(/_/g, " ").toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());
}

export function FinanceAlert({ message }: { message: string }) {
  return (
    <div role="alert" className="mb-4 rounded-xl border border-semantic-dangerBg bg-semantic-dangerBg p-4 text-sm text-semantic-dangerText">
      {message}
    </div>
  );
}

export function FinancePageHeader({
  title,
  description,
  onRefresh,
  actions,
}: {
  title: string;
  description?: string;
  onRefresh?: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <PageHeader
      title={title}
      description={description}
      actions={
        <>
          {actions}
          {onRefresh ? (
            <Button variant="secondary" size="sm" onClick={onRefresh}>
              <RefreshCw size={15} className="mr-2" />
              Refresh
            </Button>
          ) : null}
        </>
      }
    />
  );
}

export function FinancePanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Card className={`p-4 ${className ?? ""}`}>{children}</Card>;
}

export function FinanceInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`min-h-10 rounded-xs border border-brand-line bg-white px-3 text-sm text-brand-text ${props.className ?? ""}`}
    />
  );
}

export function FinanceSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`min-h-10 rounded-xs border border-brand-line bg-white px-3 text-sm text-brand-text ${props.className ?? ""}`}
    />
  );
}

export function FinanceBackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-brand-blue hover:underline">
      {children}
    </Link>
  );
}

export function FinanceLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-xs font-bold text-brand-blue hover:underline">
      {children}
    </Link>
  );
}

export function FinanceStatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase().replace(/-/g, "_");
  const danger = ["reversed", "cancelled", "canceled", "failed", "mismatched", "manual_review", "unreconciled"].includes(key);
  const success = ["payable", "paid", "approved", "confirmed", "earned", "matched", "completed"].includes(key);
  const warning = ["pending", "draft", "requested", "processing", "adjustment"].includes(key);
  if (danger) return <StatusBadge status="rejected" label={formatLabel(status)} />;
  if (success) return <StatusBadge status="approved" label={formatLabel(status)} />;
  if (warning) return <StatusBadge status="submitted" label={formatLabel(status)} />;
  return <StatusBadge status={key} label={formatLabel(status)} />;
}

export function FinanceTableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-brand-line">
          <td colSpan={cols} className="px-4 py-3">
            <Skeleton className="h-4 w-2/3" />
          </td>
        </tr>
      ))}
    </>
  );
}

export function FinanceTable({
  columns,
  loading,
  empty,
  emptyMessage,
  children,
}: {
  columns: string[];
  loading: boolean;
  empty?: boolean;
  emptyMessage: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-brand-line bg-surface-app">
              {columns.map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <FinanceTableSkeleton rows={5} cols={columns.length} />
            ) : empty ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-brand-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function FinanceIconButton({
  title,
  disabled,
  onClick,
  children,
}: {
  title: string;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className="inline-grid h-8 w-8 place-items-center rounded-xs border border-brand-line bg-white text-brand-blue transition-colors hover:bg-brand-blueLight/30 disabled:cursor-not-allowed disabled:opacity-45"
    >
      {children}
    </button>
  );
}

export function FinanceRow({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-brand-line last:border-b-0">{children}</tr>;
}

export function FinanceCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-top text-brand-text ${className ?? ""}`}>{children}</td>;
}
