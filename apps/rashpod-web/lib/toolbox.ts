import JSZip from "jszip";
import { ApiError, postFormData } from "./api";

export type BackgroundRemoveResult = {
  inputName: string;
  status: "done" | "error";
  outputName?: string;
  mimeType?: string;
  base64Data?: string;
  errorCode?: string;
  errorMessage?: string;
};

export type BackgroundRemoveResponse = {
  results: BackgroundRemoveResult[];
};

export async function removeBackgroundFromImages(files: File[]): Promise<BackgroundRemoveResponse> {
  const formData = new FormData();
  for (const file of files) formData.append("files", file);
  return postFormData<BackgroundRemoveResponse>("/storefront/toolbox/background-remove", formData);
}

export async function downloadZipFromBlobs(
  entries: Array<{ filename: string; blob: Blob }>,
  archiveName: string,
): Promise<void> {
  const zip = new JSZip();
  for (const entry of entries) zip.file(entry.filename, entry.blob);
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  triggerBlobDownload(blob, archiveName);
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function extractApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    const body = error.body as { message?: unknown; error?: unknown; code?: unknown } | null;
    if (body && typeof body.message === "string") return body.message;
    if (body && typeof body.error === "string") return body.error;
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
