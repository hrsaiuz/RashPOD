export type DashboardTransferKind = "upload" | "download";
export type DashboardTransferStatus = "running" | "success" | "error";

export type DashboardTransferEvent = {
  id: string;
  kind: DashboardTransferKind;
  label: string;
  status: DashboardTransferStatus;
  progress?: number;
  loadedBytes?: number;
  totalBytes?: number;
  error?: string;
};

export const DASHBOARD_TRANSFER_EVENT = "rashpod:dashboard-transfer";

function transferId(kind: DashboardTransferKind) {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${kind}-${suffix}`;
}

function emitTransfer(detail: DashboardTransferEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<DashboardTransferEvent>(DASHBOARD_TRANSFER_EVENT, { detail }));
}

export function beginDashboardTransfer(kind: DashboardTransferKind, label: string) {
  const id = transferId(kind);
  emitTransfer({ id, kind, label, status: "running", progress: 0 });
  return id;
}

export function updateDashboardTransfer(
  id: string,
  kind: DashboardTransferKind,
  label: string,
  loadedBytes: number,
  totalBytes?: number,
) {
  const progress = totalBytes && totalBytes > 0
    ? Math.min(100, Math.max(0, Math.round((loadedBytes / totalBytes) * 100)))
    : undefined;
  emitTransfer({ id, kind, label, status: "running", progress, loadedBytes, totalBytes });
}

export function completeDashboardTransfer(id: string, kind: DashboardTransferKind, label: string) {
  emitTransfer({ id, kind, label, status: "success", progress: 100 });
}

export function failDashboardTransfer(id: string, kind: DashboardTransferKind, label: string, cause: unknown) {
  const error = cause instanceof Error && cause.message.trim() ? cause.message : "The transfer could not be completed.";
  emitTransfer({ id, kind, label, status: "error", error });
}

function filenameFromDisposition(value: string | null) {
  if (!value) return null;
  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try { return decodeURIComponent(encoded.replace(/["']/g, "")); } catch { return encoded; }
  }
  return value.match(/filename="?([^";]+)"?/i)?.[1]?.trim() ?? null;
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}

export async function downloadFileInBackground(
  url: string,
  options: { filename?: string; label?: string; init?: RequestInit } = {},
) {
  const fallbackFilename = options.filename || "rashpod-download";
  const label = options.label || options.filename || "Download";
  const id = beginDashboardTransfer("download", label);
  try {
    const response = await fetch(url, options.init);
    if (!response.ok) throw new Error(`Download failed (${response.status})`);

    const total = Number(response.headers.get("content-length")) || undefined;
    let blob: Blob;
    if (response.body) {
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let loaded = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          loaded += value.byteLength;
          updateDashboardTransfer(id, "download", label, loaded, total);
        }
      }
      blob = new Blob(chunks, { type: response.headers.get("content-type") || "application/octet-stream" });
    } else {
      blob = await response.blob();
    }

    const filename = filenameFromDisposition(response.headers.get("content-disposition")) || fallbackFilename;
    triggerBrowserDownload(blob, filename);
    completeDashboardTransfer(id, "download", label);
  } catch (error) {
    failDashboardTransfer(id, "download", label, error);
    throw error;
  }
}

export function saveBlobInBackground(blob: Blob, filename: string, label = filename) {
  const id = beginDashboardTransfer("download", label);
  try {
    updateDashboardTransfer(id, "download", label, blob.size, blob.size);
    triggerBrowserDownload(blob, filename);
    completeDashboardTransfer(id, "download", label);
  } catch (error) {
    failDashboardTransfer(id, "download", label, error);
    throw error;
  }
}
