/**
 * Typed API client for the dashboard.
 *
 * Wraps fetch("/api/proxy/...") with:
 *  - consistent JSON handling
 *  - error normalisation (throws ApiError with a friendly message + status)
 *  - GET/POST/PATCH/DELETE helpers
 *
 * The proxy route already attaches the JWT cookie, so callers never deal with auth headers.
 */

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown = undefined) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT",
  path: string,
  body?: unknown,
  init?: RequestInit,
): Promise<T> {
  const url = path.startsWith("/api/proxy") ? path : `/api/proxy${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: body == null ? null : JSON.stringify(body),
    ...init,
  });

  let parsed: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    if (parsed && typeof parsed === "object") {
      if ("message" in parsed) msg = String((parsed as { message: unknown }).message);
      else if ("error" in parsed) msg = String((parsed as { error: unknown }).error);
    } else if (typeof parsed === "string" && parsed) {
      msg = parsed;
    }
    throw new ApiError(msg, res.status, parsed);
  }

  return parsed as T;
}

export const api = {
  get: <T>(path: string, init?: RequestInit) => request<T>("GET", path, undefined, init),
  post: <T>(path: string, body?: unknown, init?: RequestInit) => request<T>("POST", path, body, init),
  patch: <T>(path: string, body?: unknown, init?: RequestInit) => request<T>("PATCH", path, body, init),
  put: <T>(path: string, body?: unknown, init?: RequestInit) => request<T>("PUT", path, body, init),
  delete: <T>(path: string, init?: RequestInit) => request<T>("DELETE", path, undefined, init),
};

/** Resolve a stable MIME type for signed upload + verification. */
export function resolveUploadMimeType(file: File): string {
  const normalize = (value: string) => {
    const lower = value.trim().toLowerCase();
    if (lower === "image/jpg" || lower === "image/pjpeg" || lower === "image/x-citrix-jpeg") return "image/jpeg";
    if (lower === "image/x-png") return "image/png";
    if (lower === "image/svg" || lower === "text/xml") return "image/svg+xml";
    return lower;
  };

  if (file.type) {
    const normalized = normalize(file.type);
    if (normalized.startsWith("image/")) return normalized;
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "svg") return "image/svg+xml";
  if (ext === "webp") return "image/webp";
  return file.type ? normalize(file.type) : "application/octet-stream";
}

function resolveSignedUploadContentType(mimeType: string, headers?: Record<string, string>) {
  return headers?.["Content-Type"] ?? headers?.["content-type"] ?? mimeType;
}

function formatDirectUploadError(status: number) {
  if (status === 0) {
    return "Direct upload failed (network/CORS). If this persists in production, ask ops to apply gcs-cors.json to the private assets bucket.";
  }
  if (status === 403) {
    return "Direct upload failed (403 forbidden). Storage rejected the upload request.";
  }
  return `Direct upload failed (${status})`;
}

/** Upload a file directly to GCS using a signed PUT URL returned by /files/upload-url. */
export async function uploadToSignedUrl(url: string, file: File, mimeType: string, headers?: Record<string, string>) {
  const contentType = resolveSignedUploadContentType(mimeType, headers);
  const res = await fetch(url, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": contentType,
    },
  });
  if (!res.ok) {
    throw new ApiError(formatDirectUploadError(res.status), res.status);
  }
}

/** Upload a file directly to GCS with progress callbacks. */
export async function uploadToSignedUrlWithProgress(
  url: string,
  file: File,
  mimeType: string,
  headers?: Record<string, string>,
  onProgress?: (percent: number) => void,
) {
  const contentType = resolveSignedUploadContentType(mimeType, headers);
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new ApiError(formatDirectUploadError(xhr.status), xhr.status));
    };
    xhr.onerror = () => reject(new ApiError(formatDirectUploadError(0), xhr.status || 0));
    xhr.send(file);
  });
}

// ---------- DTO types (matching API contracts) ----------

export type DesignStatus =
  | "DRAFT"
  | "PENDING_MODERATION"
  | "SUBMITTED"
  | "NEEDS_FIX"
  | "APPROVED_LOCAL"
  | "APPROVED_GLOBAL"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "READY_FOR_MOCKUP"
  | "READY_TO_PUBLISH"
  | "PUBLISHED";

export type ListingStatus = "DRAFT" | "READY_FOR_REVIEW" | "PUBLISHED" | "ARCHIVED" | "REJECTED" | "SUSPENDED";
export type ListingType = "PRODUCT" | "FILM";

export interface Design {
  id: string;
  designerId: string;
  title: string;
  description?: string | null;
  status: DesignStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationQueueDesign extends Design {
  designer?: {
    id: string;
    email: string;
    displayName?: string | null;
  };
  versions?: Array<{
    id: string;
    fileKey: string;
    widthPx?: number | null;
    heightPx?: number | null;
    dpi?: number | null;
    hasTransparency?: boolean | null;
    createdAt: string;
  }>;
}

export interface ModerationAudit {
  id: string;
  designId: string;
  moderatorId: string;
  decision: "REJECT" | "APPROVE_LOCAL" | "APPROVE_GLOBAL";
  predefinedReasons?: string[] | null;
  customReason?: string | null;
  notes?: string | null;
  beforeStatus: DesignStatus;
  afterStatus: DesignStatus;
  createdAt: string;
}

export interface DesignProductSelection {
  id: string;
  designId: string;
  pipeline: "LOCAL" | "GLOBAL_PRINTFUL";
  placement: string;
  status: string;
  errorMessage?: string | null;
  localBaseProduct?: unknown;
  printfulProductTemplate?: unknown;
  placementPreset?: unknown;
  mockupAssets?: Array<{ id: string; mockupType: string; status: string; imageUrl?: string | null; thumbnailUrl?: string | null; metadataJson?: unknown }>;
}

export interface DesignWorkflowDetail extends Design {
  previewImageUrl?: string | null;
  designer?: {
    id: string;
    email: string;
    displayName?: string | null;
    handle?: string | null;
  };
  versions?: ModerationQueueDesign["versions"];
  moderationAudits?: ModerationAudit[];
  productSelections?: DesignProductSelection[];
  listings?: Listing[];
  story?: DesignStorySummary | null;
}

export type StoryLocale = "uz" | "ru" | "en";
export type DesignStoryStatus = "DRAFT" | "PENDING_REVIEW" | "NEEDS_CHANGES" | "PUBLISHED" | "UNPUBLISHED";

export interface DesignStorySummary {
  id: string;
  title: string;
  slug: string;
  status: DesignStoryStatus;
  publicUrl?: string | null;
  qrCodeImageUrl?: string | null;
  requestedPublishAt?: string | null;
  publishedAt?: string | null;
  reviewNotes?: string | null;
}

export interface DesignStoryDetail extends DesignStorySummary {
  designAssetId: string;
  sourceLocale: StoryLocale;
  qrCodeFileId?: string | null;
  coverImageFileId?: string | null;
  coverImageUrl?: string | null;
  titleTranslations: Partial<Record<StoryLocale, string>>;
  bodyTranslations: Partial<Record<StoryLocale, string>>;
  audioFileIds: Partial<Record<StoryLocale, string>>;
  audioUrls?: Partial<Record<StoryLocale, string | null>>;
  videoFileIds: Partial<Record<StoryLocale, string>>;
  videoUrls?: Partial<Record<StoryLocale, string | null>>;
  translationMeta?: Record<string, unknown>;
  unpublishedAt?: string | null;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DesignerStoryResponse {
  designId: string;
  designTitle: string;
  designStatus: DesignStatus;
  story: DesignStoryDetail | null;
  listings: Array<{ id: string; title: string; slug: string; status: ListingStatus; publicUrl?: string | null }>;
}

export interface StoryReviewResponse {
  designId: string;
  designTitle: string;
  designer?: { id: string; displayName?: string | null; email?: string | null } | null;
  story: DesignStoryDetail | null;
  listings: Array<{ id: string; title: string; slug: string; status: ListingStatus }>;
}

export interface MarketplacePublicationSummary {
  id: string;
  marketplace: string;
  status: string;
  errorMessage?: string | null;
}

export interface Listing {
  id: string;
  type: ListingType;
  status: ListingStatus;
  designerId: string;
  designAssetId: string;
  designProductSelectionId?: string | null;
  title: string;
  description?: string | null;
  slug: string;
  price: string | number;
  currency: string;
  imagesJson?: unknown;
  metadataJson?: unknown;
  marketplacePublications?: MarketplacePublicationSummary[];
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommercialRights {
  id: string;
  designAssetId: string;
  allowProductSales: boolean;
  allowMarketplacePublishing: boolean;
  allowFilmSales: boolean;
  allowCorporateBidding: boolean;
  filmConsentGrantedAt?: string | null;
  filmConsentRevokedAt?: string | null;
  filmRoyaltyRate?: number | null;
}

export interface UploadUrlResponse {
  fileId: string;
  url: string;
  headers?: Record<string, string>;
}

export interface DesignerOverview {
  designs: number;
  listings: number;
  soldItems: number;
  lifetimeEarnings?: number;
  monthEarnings?: number;
  nextPayoutEstimate?: number;
  royaltyPct?: number;
  designStatus?: Record<string, number>;
  pendingModeration?: number;
  needsFix?: number;
}

export interface RoyaltyEntry {
  id: string;
  orderId: string;
  orderStatus: string;
  listingId: string;
  listingTitle: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  royalty: number;
  royaltyPct: number;
  createdAt: string;
}

export interface CorporateRequest {
  id: string;
  corporateUserId: string;
  title: string;
  details?: string | null;
  quantity?: number | null;
  budget?: string | number | null;
  deadline?: string | null;
  status: string;
  createdAt: string;
}

export interface DesignerBid {
  id: string;
  corporateRequestId: string;
  designerId: string;
  proposal: string;
  designFee: string | number;
  timelineDays: number;
  status: string;
  createdAt: string;
}
