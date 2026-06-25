import { BadRequestException } from "@nestjs/common";
import { AssetAccessPolicy, AssetPurpose } from "@prisma/client";
import { mimeTypeFromFilename, normalizeMimeType, sanitizeFilename } from "./file-validation";

type BucketKind = "private" | "public";

export type AssetUploadPolicy = {
  purpose: AssetPurpose;
  maxSizeBytes: number;
  allowedMimeTypes: readonly string[];
  accessPolicy: AssetAccessPolicy;
  bucketKind: BucketKind;
  pathSegment: string;
};

const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"] as const;
const RASTER_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
const AUDIO_MIME_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/webm", "audio/mp4", "audio/aac", "audio/ogg"] as const;
const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v", "video/ogg"] as const;

/** Max size for designer original uploads (50 MiB). */
export const DESIGN_ORIGINAL_MAX_BYTES = 50 * 1024 * 1024;
export const DIRECT_UPLOAD_MAX_BYTES = 300 * 1024 * 1024;

export const ASSET_UPLOAD_POLICIES: Record<AssetPurpose, AssetUploadPolicy> = {
  DESIGN_ORIGINAL: {
    purpose: AssetPurpose.DESIGN_ORIGINAL,
    maxSizeBytes: DESIGN_ORIGINAL_MAX_BYTES,
    allowedMimeTypes: IMAGE_MIME_TYPES,
    accessPolicy: AssetAccessPolicy.PRIVATE_SIGNED_URL,
    bucketKind: "private",
    pathSegment: "original",
  },
  DESIGN_NORMALIZED: {
    purpose: AssetPurpose.DESIGN_NORMALIZED,
    maxSizeBytes: 40_000_000,
    allowedMimeTypes: RASTER_IMAGE_MIME_TYPES,
    accessPolicy: AssetAccessPolicy.PRIVATE_SIGNED_URL,
    bucketKind: "private",
    pathSegment: "normalized",
  },
  FILM_SOURCE: {
    purpose: AssetPurpose.FILM_SOURCE,
    maxSizeBytes: 120_000_000,
    allowedMimeTypes: ["image/png", "image/tiff", "application/pdf", "image/svg+xml"],
    accessPolicy: AssetAccessPolicy.PRIVATE_SIGNED_URL,
    bucketKind: "private",
    pathSegment: "film-sources",
  },
  GANG_SHEET_SOURCE: {
    purpose: AssetPurpose.GANG_SHEET_SOURCE,
    maxSizeBytes: 180_000_000,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/tiff", "application/pdf", "image/svg+xml"],
    accessPolicy: AssetAccessPolicy.PRIVATE_SIGNED_URL,
    bucketKind: "private",
    pathSegment: "gang-sheet-sources",
  },
  GANG_SHEET_PREVIEW: {
    purpose: AssetPurpose.GANG_SHEET_PREVIEW,
    maxSizeBytes: 30_000_000,
    allowedMimeTypes: RASTER_IMAGE_MIME_TYPES,
    accessPolicy: AssetAccessPolicy.PRIVATE_SIGNED_URL,
    bucketKind: "private",
    pathSegment: "gang-sheet-previews",
  },
  GANG_SHEET_PRODUCTION_FILE: {
    purpose: AssetPurpose.GANG_SHEET_PRODUCTION_FILE,
    maxSizeBytes: 300_000_000,
    allowedMimeTypes: ["image/png", "image/tiff", "application/pdf"],
    accessPolicy: AssetAccessPolicy.PRIVATE_SIGNED_URL,
    bucketKind: "private",
    pathSegment: "gang-sheet-production-files",
  },
  MOCKUP_IMAGE: {
    purpose: AssetPurpose.MOCKUP_IMAGE,
    maxSizeBytes: 20_000_000,
    allowedMimeTypes: RASTER_IMAGE_MIME_TYPES,
    accessPolicy: AssetAccessPolicy.PUBLIC_READ,
    bucketKind: "public",
    pathSegment: "mockups",
  },
  LISTING_IMAGE: {
    purpose: AssetPurpose.LISTING_IMAGE,
    maxSizeBytes: 20_000_000,
    allowedMimeTypes: RASTER_IMAGE_MIME_TYPES,
    accessPolicy: AssetAccessPolicy.PUBLIC_READ,
    bucketKind: "public",
    pathSegment: "listing-images",
  },
  PRODUCTION_FILE: {
    purpose: AssetPurpose.PRODUCTION_FILE,
    maxSizeBytes: 120_000_000,
    allowedMimeTypes: ["image/png", "image/tiff", "application/pdf"],
    accessPolicy: AssetAccessPolicy.PRIVATE_SIGNED_URL,
    bucketKind: "private",
    pathSegment: "production-files",
  },
  WORKSHOP_QC_EVIDENCE: {
    purpose: AssetPurpose.WORKSHOP_QC_EVIDENCE,
    maxSizeBytes: 20_000_000,
    allowedMimeTypes: RASTER_IMAGE_MIME_TYPES,
    accessPolicy: AssetAccessPolicy.INTERNAL_ONLY,
    bucketKind: "private",
    pathSegment: "workshop-qc-evidence",
  },
  MARKETPLACE_EXPORT: {
    purpose: AssetPurpose.MARKETPLACE_EXPORT,
    maxSizeBytes: 250_000_000,
    allowedMimeTypes: ["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/zip"],
    accessPolicy: AssetAccessPolicy.PRIVATE_SIGNED_URL,
    bucketKind: "private",
    pathSegment: "marketplace-exports",
  },
  EXTERNAL_ORDER_IMPORT: {
    purpose: AssetPurpose.EXTERNAL_ORDER_IMPORT,
    maxSizeBytes: 80_000_000,
    allowedMimeTypes: ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    accessPolicy: AssetAccessPolicy.PRIVATE_SIGNED_URL,
    bucketKind: "private",
    pathSegment: "external-order-imports",
  },
  POD_PROVIDER_FILE: {
    purpose: AssetPurpose.POD_PROVIDER_FILE,
    maxSizeBytes: 120_000_000,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/tiff", "application/pdf", "image/svg+xml"],
    accessPolicy: AssetAccessPolicy.PRIVATE_SIGNED_URL,
    bucketKind: "private",
    pathSegment: "pod-provider-files",
  },
  TEMPLATE_IMAGE: {
    purpose: AssetPurpose.TEMPLATE_IMAGE,
    maxSizeBytes: 30_000_000,
    allowedMimeTypes: RASTER_IMAGE_MIME_TYPES,
    accessPolicy: AssetAccessPolicy.PUBLIC_READ,
    bucketKind: "public",
    pathSegment: "template-images",
  },
  PRINT_AREA_PREVIEW: {
    purpose: AssetPurpose.PRINT_AREA_PREVIEW,
    maxSizeBytes: 10_000_000,
    allowedMimeTypes: RASTER_IMAGE_MIME_TYPES,
    accessPolicy: AssetAccessPolicy.PRIVATE_SIGNED_URL,
    bucketKind: "private",
    pathSegment: "print-area-previews",
  },
  STORY_COVER_IMAGE: {
    purpose: AssetPurpose.STORY_COVER_IMAGE,
    maxSizeBytes: 25_000_000,
    allowedMimeTypes: RASTER_IMAGE_MIME_TYPES,
    accessPolicy: AssetAccessPolicy.PUBLIC_READ,
    bucketKind: "public",
    pathSegment: "story-cover-images",
  },
  STORY_AUDIO: {
    purpose: AssetPurpose.STORY_AUDIO,
    maxSizeBytes: 60_000_000,
    allowedMimeTypes: AUDIO_MIME_TYPES,
    accessPolicy: AssetAccessPolicy.PUBLIC_READ,
    bucketKind: "public",
    pathSegment: "story-audio",
  },
  STORY_VIDEO: {
    purpose: AssetPurpose.STORY_VIDEO,
    maxSizeBytes: DIRECT_UPLOAD_MAX_BYTES,
    allowedMimeTypes: VIDEO_MIME_TYPES,
    accessPolicy: AssetAccessPolicy.PUBLIC_READ,
    bucketKind: "public",
    pathSegment: "story-video",
  },
  STORY_QR: {
    purpose: AssetPurpose.STORY_QR,
    maxSizeBytes: 5_000_000,
    allowedMimeTypes: ["image/png"],
    accessPolicy: AssetAccessPolicy.PUBLIC_READ,
    bucketKind: "public",
    pathSegment: "story-qr",
  },
};

export function resolveAssetUploadPolicy(purpose: AssetPurpose) {
  const policy = ASSET_UPLOAD_POLICIES[purpose];
  if (!policy) throw new BadRequestException("Unsupported asset purpose");
  return policy;
}

/** Normalize browser-reported MIME types and fall back to filename extension. */
export function resolveUploadMimeForAsset(input: { filename: string; mimeType: string; purpose: AssetPurpose }) {
  const policy = resolveAssetUploadPolicy(input.purpose);
  const normalized = normalizeMimeType(input.mimeType || "");
  if (normalized && policy.allowedMimeTypes.includes(normalized as never)) return normalized;

  const fromFilename = mimeTypeFromFilename(input.filename);
  if (fromFilename && policy.allowedMimeTypes.includes(fromFilename as never)) return fromFilename;

  if (normalized) return normalized;
  return fromFilename ?? input.mimeType;
}

export function assertAssetUploadAllowed(input: { purpose: AssetPurpose; filename: string; mimeType: string; sizeBytes: number }) {
  const policy = resolveAssetUploadPolicy(input.purpose);
  const resolvedMimeType = resolveUploadMimeForAsset({
    filename: input.filename,
    mimeType: input.mimeType,
    purpose: input.purpose,
  });
  if (!policy.allowedMimeTypes.includes(resolvedMimeType as never)) {
    throw new BadRequestException(`Unsupported MIME type for ${input.purpose}`);
  }
  if (input.sizeBytes > policy.maxSizeBytes) {
    throw new BadRequestException(`File exceeds ${input.purpose} size limit`);
  }
  return { policy, resolvedMimeType };
}

export function extensionForAsset(filename: string, mimeType: string) {
  const safe = sanitizeFilename(filename).toLowerCase();
  const ext = safe.includes(".") ? safe.split(".").pop() || "" : "";
  if (ext) return ext === "jpeg" ? "jpg" : ext;
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/svg+xml") return "svg";
  if (mimeType === "image/tiff") return "tiff";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "audio/mpeg" || mimeType === "audio/mp3") return "mp3";
  if (mimeType === "audio/wav" || mimeType === "audio/x-wav") return "wav";
  if (mimeType === "audio/webm") return "webm";
  if (mimeType === "audio/mp4" || mimeType === "audio/aac") return "m4a";
  if (mimeType === "audio/ogg") return "ogg";
  if (mimeType === "video/mp4") return "mp4";
  if (mimeType === "video/webm") return "webm";
  if (mimeType === "video/quicktime") return "mov";
  if (mimeType === "video/x-m4v") return "m4v";
  if (mimeType === "video/ogg") return "ogv";
  return "bin";
}

export function buildAssetObjectKey(input: {
  tenantId?: string;
  ownerId: string;
  assetId: string;
  purpose: AssetPurpose;
  extension: string;
  designId?: string;
  designVersionId?: string;
  listingId?: string;
  baseProductId?: string;
  mockupTemplateId?: string;
  printAreaId?: string;
}) {
  const policy = resolveAssetUploadPolicy(input.purpose);
  const ext = input.extension.replace(/^\./, "") || "bin";
  const prefix = input.tenantId ? `tenants/${input.tenantId}/` : "";
  switch (input.purpose) {
    case AssetPurpose.DESIGN_ORIGINAL:
      return `${prefix}designers/${input.ownerId}/designs/${input.designId ?? "unassigned"}/original/${input.assetId}.${ext}`;
    case AssetPurpose.DESIGN_NORMALIZED:
      return `${prefix}designs/${input.designId ?? "unassigned"}/versions/${input.designVersionId ?? "unassigned"}/normalized/${input.assetId}.${ext}`;
    case AssetPurpose.FILM_SOURCE:
      return `${prefix}film-sources/${input.ownerId}/${input.listingId ?? input.designId ?? "custom"}/${input.assetId}.${ext}`;
    case AssetPurpose.GANG_SHEET_SOURCE:
      return `${prefix}gang-sheet-sources/${input.ownerId}/${input.assetId}.${ext}`;
    case AssetPurpose.GANG_SHEET_PREVIEW:
      return `${prefix}gang-sheet-previews/${input.ownerId}/${input.assetId}.${ext}`;
    case AssetPurpose.GANG_SHEET_PRODUCTION_FILE:
      return `${prefix}gang-sheet-production/${input.ownerId}/${input.assetId}.${ext}`;
    case AssetPurpose.MOCKUP_IMAGE:
      return `${prefix}mockups/${input.designId ?? "unassigned"}/${input.baseProductId ?? "base"}/${input.mockupTemplateId ?? "template"}/${input.assetId}.${ext}`;
    case AssetPurpose.LISTING_IMAGE:
      return `${prefix}listings/${input.listingId ?? "unassigned"}/images/${input.assetId}.${ext}`;
    case AssetPurpose.PRODUCTION_FILE:
      return `${prefix}production/${input.listingId ?? input.designId ?? "unassigned"}/${input.assetId}.${ext}`;
    case AssetPurpose.WORKSHOP_QC_EVIDENCE:
      return `${prefix}workshop/qc-evidence/${input.ownerId}/${input.assetId}.${ext}`;
    case AssetPurpose.MARKETPLACE_EXPORT:
      return `${prefix}marketplace-exports/${input.ownerId}/${input.assetId}.${ext}`;
    case AssetPurpose.TEMPLATE_IMAGE:
      return `${prefix}templates/${input.baseProductId ?? "base"}/${input.mockupTemplateId ?? "template"}/${input.assetId}.${ext}`;
    case AssetPurpose.PRINT_AREA_PREVIEW:
      return `${prefix}print-area-previews/${input.printAreaId ?? "print-area"}/${input.assetId}.${ext}`;
    case AssetPurpose.STORY_COVER_IMAGE:
      return `${prefix}stories/${input.designId ?? "unassigned"}/cover/${input.assetId}.${ext}`;
    case AssetPurpose.STORY_AUDIO:
      return `${prefix}stories/${input.designId ?? "unassigned"}/audio/${input.assetId}.${ext}`;
    case AssetPurpose.STORY_VIDEO:
      return `${prefix}stories/${input.designId ?? "unassigned"}/video/${input.assetId}.${ext}`;
    case AssetPurpose.STORY_QR:
      return `${prefix}stories/${input.designId ?? "unassigned"}/qr/${input.assetId}.${ext}`;
    default:
      return `${prefix}${policy.pathSegment}/${input.assetId}.${ext}`;
  }
}
