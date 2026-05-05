import { BadRequestException } from "@nestjs/common";

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
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
  if (input.expectedMimeType !== input.uploadedMimeType) {
    throw new BadRequestException("Uploaded MIME type does not match requested MIME type");
  }
  if (input.expectedChecksum && input.uploadedChecksum && input.expectedChecksum !== input.uploadedChecksum) {
    throw new BadRequestException("Uploaded checksum does not match requested checksum");
  }
}
