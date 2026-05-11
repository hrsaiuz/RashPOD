export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(method: string, path: string, body?: unknown, init?: RequestInit): Promise<T> {
  const fullPath = path.startsWith("/api/proxy") ? path : `/api/proxy${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(fullPath, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  });
  let parsed: unknown = null;
  const text = await res.text();
  if (text) {
    try { parsed = JSON.parse(text); } catch { parsed = text; }
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    if (parsed && typeof parsed === "object") {
      if ("message" in parsed) msg = String((parsed as { message: unknown }).message);
      else if ("error" in parsed) msg = String((parsed as { error: unknown }).error);
    } else if (typeof parsed === "string" && parsed) msg = parsed;
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

export type SessionUser = { id: string; email: string; role: string; displayName?: string };
export type Order = {
  id: string;
  status: string;
  subtotal: number | string;
  deliveryFee: number | string;
  total: number | string;
  currency: string;
  createdAt: string;
  items?: Array<{ id: string; quantity: number; unitPrice: number | string; totalPrice: number | string; listing?: { title: string; slug: string; imagesJson?: unknown } }>;
};
export type CorporateRequest = {
  id: string;
  title: string;
  details?: string;
  quantity: number;
  budget?: number | string | null;
  deadline?: string | null;
  status: string;
  createdAt: string;
  bids?: Array<{ id: string; designerId: string; proposal: string; designFee: number | string; timelineDays: number; status: string }>;
};
