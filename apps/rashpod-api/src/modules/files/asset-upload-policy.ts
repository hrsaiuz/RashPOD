import { BadRequestException } from "@nestjs/common";
import { AssetAccessPolicy, AssetPurpose } from "@prisma/client";
import { sanitizeFilename } from "./file-validation";

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

export const ASSET_UPLOAD_POLICIES: Record<AssetPurpose, AssetUploadPolicy> = {
  DESIGN_ORIGINAL: {
    purpose: AssetPurpose.DESIGN_ORIGINAL,
    maxSizeBytes: 40_000_000,
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
};

export function resolveAssetUploadPolicy(purpose: AssetPurpose) {
  const policy = ASSET_UPLOAD_POLICIES[purpose];
  if (!policy) throw new BadRequestException("Unsupported asset purpose");
  return policy;
}

export function assertAssetUploadAllowed(input: { purpose: AssetPurpose; filename: string; mimeType: string; sizeBytes: number }) {
  const policy = resolveAssetUploadPolicy(input.purpose);
  if (!policy.allowedMimeTypes.includes(input.mimeType as never)) {
    throw new BadRequestException(`Unsupported MIME type for ${input.purpose}`);
  }
  if (input.sizeBytes > policy.maxSizeBytes) {
    throw new BadRequestException(`File exceeds ${input.purpose} size limit`);
  }
  return policy;
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
  return "bin";
}

export function buildAssetObjectKey(input: {
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
  switch (input.purpose) {
    case AssetPurpose.DESIGN_ORIGINAL:
      return `designers/${input.ownerId}/designs/${input.designId ?? "unassigned"}/original/${input.assetId}.${ext}`;
    case AssetPurpose.DESIGN_NORMALIZED:
      return `designs/${input.designId ?? "unassigned"}/versions/${input.designVersionId ?? "unassigned"}/normalized/${input.assetId}.${ext}`;
    case AssetPurpose.FILM_SOURCE:
      return `film-sources/${input.ownerId}/${input.listingId ?? input.designId ?? "custom"}/${input.assetId}.${ext}`;
    case AssetPurpose.MOCKUP_IMAGE:
      return `mockups/${input.designId ?? "unassigned"}/${input.baseProductId ?? "base"}/${input.mockupTemplateId ?? "template"}/${input.assetId}.${ext}`;
    case AssetPurpose.LISTING_IMAGE:
      return `listings/${input.listingId ?? "unassigned"}/images/${input.assetId}.${ext}`;
    case AssetPurpose.PRODUCTION_FILE:
      return `production/${input.listingId ?? input.designId ?? "unassigned"}/${input.assetId}.${ext}`;
    case AssetPurpose.MARKETPLACE_EXPORT:
      return `marketplace-exports/${input.ownerId}/${input.assetId}.${ext}`;
    case AssetPurpose.TEMPLATE_IMAGE:
      return `templates/${input.baseProductId ?? "base"}/${input.mockupTemplateId ?? "template"}/${input.assetId}.${ext}`;
    case AssetPurpose.PRINT_AREA_PREVIEW:
      return `print-area-previews/${input.printAreaId ?? "print-area"}/${input.assetId}.${ext}`;
    default:
      return `${policy.pathSegment}/${input.assetId}.${ext}`;
  }
}
