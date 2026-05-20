import { Injectable } from "@nestjs/common";

export interface PrintfulRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
  requestId?: string;
}

@Injectable()
export class PrintfulClient {
  private readonly baseUrl = process.env.PRINTFUL_API_BASE_URL || "https://api.printful.com";

  isEnabled() {
    return process.env.PRINTFUL_ENABLED === "true";
  }

  hasToken() {
    return Boolean(process.env.PRINTFUL_API_TOKEN);
  }

  async request<T>(options: PrintfulRequestOptions): Promise<T> {
    if (!this.isEnabled()) throw new Error("PRINTFUL_NOT_CONFIGURED");
    const token = process.env.PRINTFUL_API_TOKEN;
    if (!token) throw new Error("PRINTFUL_API_TOKEN_MISSING");

    const response = await fetch(`${this.baseUrl}${options.path}`, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.requestId ? { "X-RashPOD-Request-Id": options.requestId } : {}),
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
}
