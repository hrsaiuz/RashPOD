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

/** Upload a file directly to GCS using a signed PUT URL returned by /files/upload-url. */
export async function uploadToSignedUrl(url: string, file: File, headers?: Record<string, string>) {
  const res = await fetch(url, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      ...(headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new ApiError(`Direct upload failed (${res.status})`, res.status);
  }
}

// ---------- DTO types (matching API contracts) ----------

export type DesignStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "NEEDS_FIX"
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

export interface Listing {
  id: string;
  type: ListingType;
  status: ListingStatus;
  designerId: string;
  designAssetId: string;
  title: string;
  description?: string | null;
  slug: string;
  price: string | number;
  currency: string;
  imagesJson?: unknown;
  metadataJson?: unknown;
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
