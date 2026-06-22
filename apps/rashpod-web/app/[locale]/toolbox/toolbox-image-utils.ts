"use client";

import {
  BACKGROUND_MAX_FILE_SIZE,
  BACKGROUND_MAX_FILES,
  BATCH_CROP_MAX_FILE_SIZE,
  BATCH_CROP_MAX_FILES,
} from "./toolbox-types";

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function makeToolboxId(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

export function fileExtension(filename: string) {
  const value = filename.split(".").pop()?.toLowerCase() ?? "";
  return value;
}

export function stripExtension(filename: string) {
  return filename.replace(/\.[^.]+$/, "");
}

export function validateImageFiles(
  files: File[],
  options: { maxFiles: number; maxFileSize: number },
) {
  if (!files.length) return { ok: false, error: "empty" };
  if (files.length > options.maxFiles) return { ok: false, error: "too-many" };

  for (const file of files) {
    const extension = fileExtension(file.name);
    if (!ALLOWED_EXTENSIONS.has(extension) || (file.type && !ALLOWED_TYPES.has(file.type))) {
      return { ok: false, error: "invalid-type" };
    }
    if (file.size > options.maxFileSize) return { ok: false, error: "too-large" };
  }

  return { ok: true as const };
}

export function validateBatchCropFiles(files: File[]) {
  return validateImageFiles(files, {
    maxFiles: BATCH_CROP_MAX_FILES,
    maxFileSize: BATCH_CROP_MAX_FILE_SIZE,
  });
}

export function validateBackgroundFiles(files: File[]) {
  return validateImageFiles(files, {
    maxFiles: BACKGROUND_MAX_FILES,
    maxFileSize: BACKGROUND_MAX_FILE_SIZE,
  });
}

export function revokeObjectUrls(urls: Array<string | undefined>) {
  for (const url of urls) {
    if (url) URL.revokeObjectURL(url);
  }
}

export function loadImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      reject(new Error(`Could not load ${file.name}`));
      URL.revokeObjectURL(url);
    };
    image.src = url;
  });
}
