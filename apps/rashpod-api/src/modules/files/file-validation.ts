import { BadRequestException } from "@nestjs/common";

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export function normalizeMimeType(mimeType: string): string {
  const normalized = mimeType.trim().toLowerCase();
  if (normalized === "image/jpg" || normalized === "image/pjpeg" || normalized === "image/x-citrix-jpeg") {
    return "image/jpeg";
  }
  if (normalized === "image/x-png") return "image/png";
  if (normalized === "image/svg" || normalized === "text/xml") return "image/svg+xml";
  return normalized;
}

export function mimeTypeFromFilename(filename: string): string | undefined {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "svg") return "image/svg+xml";
  if (ext === "webp") return "image/webp";
  return undefined;
}

export function assertUploadMetadataMatches(input: {
  expectedSizeBytes: number;
  expectedMimeType: string;
  expectedChecksum?: string | null;
  uploadedSizeBytes: number;
  uploadedMimeType: string;
  uploadedChecksum?: string | null;
}) {
  if (input.expectedSizeBytes !== input.uploadedSizeBytes) {
    throw new BadRequestException("Uploaded size does not match requested size");
  }
  if (normalizeMimeType(input.expectedMimeType) !== normalizeMimeType(input.uploadedMimeType)) {
    throw new BadRequestException("Uploaded MIME type does not match requested MIME type");
  }
  if (input.expectedChecksum && input.uploadedChecksum && input.expectedChecksum !== input.uploadedChecksum) {
    throw new BadRequestException("Uploaded checksum does not match requested checksum");
  }
}
