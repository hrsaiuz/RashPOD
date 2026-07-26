"use client";

import { ReactNode, useEffect, useId, useState } from "react";
import { AlertCircle, CheckCircle2, TriangleAlert } from "lucide-react";
import { Button, Modal } from "@rashpod/ui";

export function PageShell({
  title,
  description,
  icon,
  action,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-2xl bg-brand-blueLight/60 p-3 text-brand-blue" aria-hidden="true">{icon}</div>
          <div>
            <h1 className="text-2xl font-bold text-brand-ink sm:text-3xl">{title}</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-brand-muted sm:text-base">{description}</p>
          </div>
        </div>
        {action}
      </header>
      {children}
    </div>
  );
}

export type Feedback = { kind: "success" | "error"; message: string } | null;

export function FeedbackBanner({ feedback, onDismiss }: { feedback: Feedback; onDismiss?: () => void }) {
  if (!feedback) return null;
  const success = feedback.kind === "success";
  return (
    <div
      role={success ? "status" : "alert"}
      aria-live={success ? "polite" : "assertive"}
      className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
        success
          ? "border-semantic-successBg bg-semantic-successBg text-semantic-successText"
          : "border-semantic-dangerBg bg-semantic-dangerBg text-semantic-dangerText"
      }`}
    >
      {success ? <CheckCircle2 size={19} aria-hidden="true" /> : <AlertCircle size={19} aria-hidden="true" />}
      <span className="flex-1">{feedback.message}</span>
      {onDismiss ? (
        <button type="button" onClick={onDismiss} className="min-h-11 rounded-pill px-3 font-semibold hover:bg-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current">
          Dismiss
        </button>
      ) : null}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmationText,
  loading,
  danger = true,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  confirmationText?: string;
  loading?: boolean;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const inputId = useId();
  const [typed, setTyped] = useState("");
  const valid = !confirmationText || typed === confirmationText;
  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!loading) {
          setTyped("");
          onCancel();
        }
      }}
      title={title}
      footer={(
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" disabled={loading} onClick={() => { setTyped(""); onCancel(); }}>Cancel</Button>
          <Button variant={danger ? "danger" : "primaryBlue"} loading={loading} disabled={!valid} onClick={() => { onConfirm(); }}>
            {confirmLabel}
          </Button>
        </div>
      )}
    >
      <div className="space-y-4">
        <div className="flex gap-3 rounded-2xl bg-semantic-warningBg p-4 text-sm leading-6 text-semantic-warningText">
          <TriangleAlert className="mt-0.5 shrink-0" size={19} aria-hidden="true" />
          <div>{description}</div>
        </div>
        {confirmationText ? (
          <div>
            <label htmlFor={inputId} className="mb-2 block text-sm font-semibold text-brand-ink">
              Type <span className="font-mono">{confirmationText}</span> to confirm
            </label>
            <input
              id={inputId}
              data-autofocus="true"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              className="h-12 w-full rounded-[14px] border border-brand-line bg-white px-4 text-sm focus:outline-none focus:ring-4 focus:ring-brand-blue/20"
            />
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
  disabled,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  if (totalPages <= 1) return <p className="text-sm text-brand-muted">{total} total</p>;
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-line px-4 py-3">
      <p className="text-sm text-brand-muted">{total} total · Page {page} of {totalPages}</p>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}>Previous</Button>
        <Button size="sm" variant="secondary" disabled={disabled || page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</Button>
      </div>
    </nav>
  );
}

export function parseJsonObject(value: string, label: string) {
  try {
    const parsed = JSON.parse(value || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error(`${label} must be a valid JSON object`);
  }
}
