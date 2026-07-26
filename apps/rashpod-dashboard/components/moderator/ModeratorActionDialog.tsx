"use client";

import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef } from "react";
import { Button } from "@rashpod/ui";

export function ModeratorActionDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  busy,
  confirmDisabled = false,
  initialFocus = "confirm",
  children,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  busy: boolean;
  confirmDisabled?: boolean;
  initialFocus?: "confirm" | "firstField";
  children?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    window.requestAnimationFrame(() => {
      if (initialFocus === "firstField") {
        const field = dialogRef.current?.querySelector<HTMLElement>("textarea:not([disabled]), input:not([disabled]), select:not([disabled])");
        if (field) {
          field.focus();
          return;
        }
      }
      confirmRef.current?.focus();
    });
    return () => previousFocusRef.current?.focus();
  }, [initialFocus, open]);

  if (!open) return null;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !busy) {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-modal grid place-items-center bg-brand-ink/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !busy) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        onKeyDown={handleKeyDown}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-md rounded-2xl border border-backoffice-border bg-backoffice-surface p-6 shadow-lg"
      >
        <h2 id={titleId} className="text-xl font-bold text-backoffice-text">{title}</h2>
        <p id={descriptionId} className="mt-2 text-sm leading-6 text-backoffice-subtle">{description}</p>
        {children ? <div className="mt-5">{children}</div> : null}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button
            ref={confirmRef}
            variant={destructive ? "danger" : "primaryPeach"}
            onClick={() => void onConfirm()}
            loading={busy}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
