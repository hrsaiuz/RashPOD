"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Download, Info, LoaderCircle, UploadCloud, X } from "lucide-react";
import {
  DASHBOARD_TRANSFER_EVENT,
  type DashboardTransferEvent,
} from "../../lib/background-transfer";

export type ToastTone = "success" | "error" | "info";

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
};

type ToastItem = ToastInput & {
  id: string;
};

type ToastContextValue = {
  toast: (input: ToastInput) => string;
  dismissToast: (id: string) => void;
};

type TransferItem = DashboardTransferEvent & { updatedAt: number };

type ActionIntent = {
  id: string;
  label: string;
  expiresAt: number;
  pending: number;
  failed: boolean;
  error?: string;
  manuallyHandled: boolean;
  timer?: number;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const timersRef = useRef(new Map<string, number>());
  const transferTimersRef = useRef(new Map<string, number>());
  const activeActionRef = useRef<ActionIntent | null>(null);

  const dismissToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const activeAction = activeActionRef.current;
      if (activeAction && activeAction.expiresAt > Date.now()) activeAction.manuallyHandled = true;
      const id = crypto.randomUUID();
      const item = { tone: "info" as const, duration: 4500, ...input, id };
      setToasts((current) => [...current.slice(-3), item]);
      const timer = window.setTimeout(() => dismissToast(id), item.duration);
      timersRef.current.set(id, timer);
      return id;
    },
    [dismissToast],
  );

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current.clear();
    transferTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    transferTimersRef.current.clear();
  }, []);

  useEffect(() => {
    const dismissTransfer = (id: string) => {
      const timer = transferTimersRef.current.get(id);
      if (timer !== undefined) window.clearTimeout(timer);
      transferTimersRef.current.delete(id);
      setTransfers((current) => current.filter((item) => item.id !== id));
    };

    const onTransfer = (event: Event) => {
      const detail = (event as CustomEvent<DashboardTransferEvent>).detail;
      if (!detail?.id) return;
      setTransfers((current) => {
        const next = current.filter((item) => item.id !== detail.id);
        return [...next.slice(-3), { ...detail, updatedAt: Date.now() }];
      });
      const previousTimer = transferTimersRef.current.get(detail.id);
      if (previousTimer !== undefined) window.clearTimeout(previousTimer);
      if (detail.status === "success") {
        transferTimersRef.current.set(detail.id, window.setTimeout(() => dismissTransfer(detail.id), 4500));
      }
    };

    window.addEventListener(DASHBOARD_TRANSFER_EVENT, onTransfer);
    return () => window.removeEventListener(DASHBOARD_TRANSFER_EVENT, onTransfer);
  }, []);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    const excludedMutationPath = (pathname: string) =>
      pathname.includes("/upload-url") ||
      pathname.includes("/complete-upload") ||
      pathname.includes("/admin/media/complete") ||
      pathname.includes("/notifications/") ||
      pathname.endsWith("/notifications/mark-all-read") ||
      pathname.startsWith("/api/auth/") ||
      pathname.startsWith("/api/revalidate-");

    const actionLabel = (element: Element | null) => {
      if (!element) return "Action";
      const selectedLabel = element instanceof HTMLSelectElement ? element.selectedOptions[0]?.textContent : null;
      const labelled = element.getAttribute("aria-label") || selectedLabel || element.textContent || (element as HTMLInputElement).value;
      return labelled?.replace(/\s+/g, " ").replace(/…/g, "").trim() || "Action";
    };

    const registerIntent = (label: string) => {
      const current = activeActionRef.current;
      if (current?.timer) window.clearTimeout(current.timer);
      activeActionRef.current = {
        id: crypto.randomUUID(),
        label,
        expiresAt: Date.now() + 8_000,
        pending: 0,
        failed: false,
        manuallyHandled: false,
      };
    };

    const onClick = (event: MouseEvent) => {
      if (!window.location.pathname.startsWith("/dashboard")) return;
      const target = event.target instanceof Element ? event.target.closest("button, [role='button'], input[type='submit']") : null;
      if (target && !target.hasAttribute("disabled")) registerIntent(actionLabel(target));
    };

    const onSubmit = (event: SubmitEvent) => {
      if (!window.location.pathname.startsWith("/dashboard")) return;
      registerIntent(actionLabel(event.submitter instanceof Element ? event.submitter : null));
    };

    const onChange = (event: Event) => {
      if (!window.location.pathname.startsWith("/dashboard") || !(event.target instanceof HTMLSelectElement)) return;
      registerIntent(actionLabel(event.target));
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("change", onChange, true);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : null;
      const method = (init?.method || request?.method || "GET").toUpperCase();
      let parsedUrl: URL | null = null;
      try {
        const rawUrl = request?.url || String(input);
        parsedUrl = new URL(rawUrl, window.location.href);
      } catch { /* fetch will report malformed URLs normally */ }
      const intent = activeActionRef.current;
      const track = Boolean(
        intent &&
        intent.expiresAt > Date.now() &&
        parsedUrl?.origin === window.location.origin &&
        ["POST", "PATCH", "PUT", "DELETE"].includes(method) &&
        !excludedMutationPath(parsedUrl.pathname),
      );

      if (track && intent) {
        intent.pending += 1;
        if (intent.timer) window.clearTimeout(intent.timer);
      }

      try {
        const response = await originalFetch(input, init);
        if (track && intent && !response.ok) {
          intent.failed = true;
          const errorPayload = await response.clone().json().catch(() => null) as { message?: unknown; error?: unknown } | null;
          intent.error = errorPayload?.message
            ? String(errorPayload.message)
            : errorPayload?.error
              ? String(errorPayload.error)
              : `Request failed (${response.status})`;
        }
        return response;
      } catch (error) {
        if (track && intent) {
          intent.failed = true;
          intent.error = error instanceof Error ? error.message : "The request could not be completed.";
        }
        throw error;
      } finally {
        if (track && intent) {
          intent.pending = Math.max(0, intent.pending - 1);
          intent.timer = window.setTimeout(() => {
            if (intent.pending > 0 || intent.manuallyHandled) return;
            const title = intent.failed ? "Action failed" : intent.label;
            toast({
              tone: intent.failed ? "error" : "success",
              title,
              description: intent.failed ? intent.error || "The action could not be completed." : "Action completed successfully.",
            });
            if (activeActionRef.current?.id === intent.id) activeActionRef.current = null;
          }, 300);
        }
      }
    };

    return () => {
      window.fetch = originalFetch;
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("change", onChange, true);
      const current = activeActionRef.current;
      if (current?.timer) window.clearTimeout(current.timer);
      activeActionRef.current = null;
    };
  }, [toast]);

  const value = useMemo(() => ({ toast, dismissToast }), [dismissToast, toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-20 z-toast flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3 sm:right-6"
        aria-live="polite"
        aria-atomic="false"
        data-testid="toast-viewport"
      >
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={() => dismissToast(item.id)} />
        ))}
      </div>
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-toast flex w-[min(26rem,calc(100vw-2rem))] flex-col gap-3 sm:bottom-6 sm:right-6"
        aria-live="polite"
        aria-atomic="false"
        aria-label="Background transfers"
        data-testid="transfer-viewport"
      >
        {transfers.map((item) => (
          <TransferCard
            key={item.id}
            item={item}
            onDismiss={() => {
              const timer = transferTimersRef.current.get(item.id);
              if (timer !== undefined) window.clearTimeout(timer);
              transferTimersRef.current.delete(item.id);
              setTransfers((current) => current.filter((entry) => entry.id !== item.id));
            }}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function TransferCard({ item, onDismiss }: { item: TransferItem; onDismiss: () => void }) {
  const Icon = item.kind === "upload" ? UploadCloud : Download;
  const statusLabel = item.status === "running"
    ? item.kind === "upload" ? "Uploading in background" : "Downloading in background"
    : item.status === "success" ? "Transfer complete" : "Transfer failed";
  const progress = item.progress;

  return (
    <div
      role={item.status === "error" ? "alert" : "status"}
      className="pointer-events-auto rounded-2xl border border-brand-line bg-white p-4 text-brand-ink shadow-lg"
    >
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${item.status === "error" ? "bg-semantic-dangerBg text-semantic-dangerText" : item.status === "success" ? "bg-semantic-successBg text-semantic-successText" : "bg-brand-blueLight/50 text-brand-blue"}`}>
          {item.status === "running" ? <LoaderCircle className="motion-safe:animate-spin" size={20} aria-hidden="true" /> : <Icon size={20} aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">{statusLabel}</p>
            {progress !== undefined ? <span className="text-xs font-semibold tabular-nums text-brand-muted">{progress}%</span> : null}
          </div>
          <p className="mt-0.5 truncate text-sm text-brand-muted" title={item.label}>{item.label}</p>
          {item.error ? <p className="mt-1 text-xs text-semantic-dangerText">{item.error}</p> : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="-mr-2 -mt-2 grid min-h-11 min-w-11 place-items-center rounded-full transition-colors hover:bg-surface-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
          aria-label="Dismiss transfer"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      {item.status === "running" ? (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-blueLight/40" aria-hidden="true">
          <div
            className="h-full origin-left rounded-full bg-brand-blue transition-transform duration-200"
            style={progress === undefined ? { width: "33%" } : { transform: `scaleX(${progress / 100})` }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside ToastProvider");
  return value;
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const tone = item.tone ?? "info";
  const Icon = tone === "success" ? CheckCircle2 : tone === "error" ? AlertCircle : Info;
  const styles =
    tone === "success"
      ? "border-semantic-success/25 bg-semantic-successBg text-semantic-successText"
      : tone === "error"
        ? "border-semantic-danger/25 bg-semantic-dangerBg text-semantic-dangerText"
        : "border-brand-blue/25 bg-white text-brand-ink";

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg ${styles}`}
    >
      <Icon className="mt-0.5 shrink-0" size={20} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{item.title}</p>
        {item.description ? <p className="mt-0.5 text-sm opacity-80">{item.description}</p> : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="-mr-1 -mt-1 grid min-h-11 min-w-11 place-items-center rounded-full transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
        aria-label="Dismiss notification"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
