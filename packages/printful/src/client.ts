export type PrintfulFetchPort = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown>; text(): Promise<string> }>;

export type PrintfulClientConfig = {
  apiBaseUrl?: string;
  apiToken?: string;
  storeId?: string;
  enabled?: boolean;
  fetcher?: PrintfulFetchPort;
};

export class PrintfulApiClient {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly storeId?: string;
  private readonly enabled: boolean;
  private readonly fetcher: PrintfulFetchPort;

  constructor(config: PrintfulClientConfig = {}) {
    this.baseUrl = (config.apiBaseUrl || process.env.PRINTFUL_API_BASE_URL || "https://api.printful.com").replace(/\/$/, "");
    this.token = config.apiToken ?? process.env.PRINTFUL_API_TOKEN;
    this.storeId = config.storeId ?? process.env.PRINTFUL_STORE_ID;
    this.enabled = config.enabled ?? process.env.PRINTFUL_ENABLED === "true";
    this.fetcher = config.fetcher ?? fetch;
  }

  isEnabled() {
    return this.enabled;
  }

  hasToken() {
    return Boolean(this.token);
  }

  assertReady() {
    if (!this.enabled) throw new Error("PRINTFUL_NOT_CONFIGURED");
    if (!this.token) throw new Error("PRINTFUL_API_TOKEN_MISSING");
  }

  async request<T>(options: {
    method?: string;
    path: string;
    body?: unknown;
    query?: Record<string, string | number | undefined>;
    storeId?: string | null;
  }): Promise<T> {
    this.assertReady();
    const queryString = options.query
      ? Object.entries(options.query)
          .filter(([, value]) => value !== undefined && value !== null && value !== "")
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
          .join("&")
      : "";
    const query = queryString ? `?${queryString}` : "";
    const url = `${this.baseUrl}${options.path}${query}`;
    const response = await this.fetcher(url, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...((options.storeId ?? this.storeId) ? { "X-PF-Store-Id": String(options.storeId ?? this.storeId) } : {}),
      },
      body: options.body == null ? undefined : JSON.stringify(options.body),
    });
    const text = await response.text();
    const parsed = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const error = new Error(`PRINTFUL_REQUEST_FAILED:${response.status}`);
      (error as Error & { responseBody?: unknown }).responseBody = parsed;
      throw error;
    }
    return parsed as T;
  }

  getCatalogProduct(catalogProductId: number | string) {
    return this.request<{ result?: Record<string, unknown> }>({ path: `/products/${catalogProductId}` });
  }

  listStores(options: { offset?: number; limit?: number } = {}) {
    return this.request<{
      result?: Array<{ id?: number; name?: string; type?: string; website?: string }>;
      paging?: { total?: number; offset?: number; limit?: number };
    }>({
      path: "/stores",
      query: {
        offset: options.offset,
        limit: options.limit,
      },
    });
  }

  listCategories() {
    return this.request<{
      result?:
        | Array<{ id?: number; parent_id?: number; title?: string; image_url?: string; size?: string }>
        | { categories?: Array<{ id?: number; parent_id?: number; title?: string; image_url?: string; size?: string }> };
    }>({ path: "/categories" });
  }

  listCatalogProducts(options: { categoryId?: number; offset?: number; limit?: number } = {}) {
    return this.request<{
      result?: Array<Record<string, unknown>>;
      paging?: { total?: number; offset?: number; limit?: number };
    }>({
      path: "/products",
      query: {
        category_id: options.categoryId,
        offset: options.offset,
        limit: options.limit,
      },
    });
  }

  getPrintfiles(catalogProductId: number | string, technique?: string) {
    return this.request<{ result?: Record<string, unknown> }>({
      path: `/mockup-generator/printfiles/${catalogProductId}`,
      query: technique ? { technique } : undefined,
    });
  }

  uploadFileFromUrl(url: string) {
    return this.request<{ result?: { id?: number; url?: string } }>({
      method: "POST",
      path: "/files",
      body: { url },
    });
  }

  createMockupTask(catalogProductId: number | string, body: Record<string, unknown>) {
    return this.request<{ result?: { task_key?: string; status?: string } }>({
      method: "POST",
      path: `/mockup-generator/create-task/${catalogProductId}`,
      body,
    });
  }

  getMockupTask(taskKey: string) {
    return this.request<{ result?: Record<string, unknown> }>({
      path: "/mockup-generator/task",
      query: { task_key: taskKey },
    });
  }

  createSyncProduct(body: Record<string, unknown>, storeId?: string | null) {
    return this.request<{ result?: { id?: number; sync_product?: Record<string, unknown>; sync_variants?: Array<Record<string, unknown>> } }>({
      method: "POST",
      path: "/store/products",
      body,
      storeId,
    });
  }

  getSyncProduct(syncProductIdOrExternalId: number | string, storeId?: string | null) {
    return this.request<{ result?: { id?: number; sync_product?: Record<string, unknown>; sync_variants?: Array<Record<string, unknown>> } }>({
      path: `/store/products/${encodeURIComponent(String(syncProductIdOrExternalId))}`,
      storeId,
    });
  }

  updateSyncProduct(syncProductId: number | string, body: Record<string, unknown>, storeId?: string | null) {
    return this.request<{ result?: { id?: number; sync_product?: Record<string, unknown>; sync_variants?: Array<Record<string, unknown>> } }>({
      method: "PUT",
      path: `/store/products/${encodeURIComponent(String(syncProductId))}`,
      body,
      storeId,
    });
  }

  calculateShippingRates(body: Record<string, unknown>, storeId?: string | null) {
    return this.request<{ result?: Array<Record<string, unknown>> }>({
      method: "POST",
      path: "/shipping/rates",
      body,
      storeId,
    });
  }

  createOrder(body: Record<string, unknown>, storeId?: string | null, confirm = true) {
    return this.request<{ result?: Record<string, unknown> }>({
      method: "POST",
      path: "/orders",
      query: { confirm: confirm ? 1 : 0, update_existing: 1 },
      body,
      storeId,
    });
  }

  getOrder(orderId: number | string, storeId?: string | null) {
    return this.request<{ result?: Record<string, unknown> }>({
      path: `/orders/${orderId}`,
      storeId,
    });
  }

  confirmOrder(orderId: number | string, storeId?: string | null) {
    return this.request<{ result?: Record<string, unknown> }>({
      method: "POST",
      path: `/orders/${orderId}/confirm`,
      storeId,
    });
  }

  cancelOrder(orderId: number | string, storeId?: string | null) {
    return this.request<{ result?: Record<string, unknown> }>({
      method: "DELETE",
      path: `/orders/${orderId}`,
      storeId,
    });
  }

  updateSyncVariant(variantId: number | string, body: Record<string, unknown>) {
    return this.request<{ result?: Record<string, unknown> }>({
      method: "PUT",
      path: `/store/variants/${variantId}`,
      body,
    });
  }
}
