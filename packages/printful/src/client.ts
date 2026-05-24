export type PrintfulFetchPort = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown>; text(): Promise<string> }>;

export type PrintfulClientConfig = {
  apiBaseUrl?: string;
  apiToken?: string;
  enabled?: boolean;
  fetcher?: PrintfulFetchPort;
};

export class PrintfulApiClient {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly enabled: boolean;
  private readonly fetcher: PrintfulFetchPort;

  constructor(config: PrintfulClientConfig = {}) {
    this.baseUrl = (config.apiBaseUrl || process.env.PRINTFUL_API_BASE_URL || "https://api.printful.com").replace(/\/$/, "");
    this.token = config.apiToken ?? process.env.PRINTFUL_API_TOKEN;
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

  async request<T>(options: { method?: string; path: string; body?: unknown; query?: Record<string, string | number | undefined> }): Promise<T> {
    this.assertReady();
    const query = options.query
      ? `?${Object.entries(options.query)
          .filter(([, value]) => value !== undefined && value !== null && value !== "")
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
          .join("&")}`
      : "";
    const url = `${this.baseUrl}${options.path}${query}`;
    const response = await this.fetcher(url, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
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

  createSyncProduct(body: Record<string, unknown>) {
    return this.request<{ result?: { id?: number; sync_product?: Record<string, unknown>; sync_variants?: Array<Record<string, unknown>> } }>({
      method: "POST",
      path: "/store/products",
      body,
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
