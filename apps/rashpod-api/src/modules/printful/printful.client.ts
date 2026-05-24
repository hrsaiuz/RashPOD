import { Injectable } from "@nestjs/common";
import { PrintfulApiClient } from "@rashpod/printful";
import type { PrintfulRequestOptions } from "./printful.client.types";

@Injectable()
export class PrintfulClient {
  private readonly client = new PrintfulApiClient();

  isEnabled() {
    return this.client.isEnabled();
  }

  hasToken() {
    return this.client.hasToken();
  }

  async request<T>(options: PrintfulRequestOptions): Promise<T> {
    return this.client.request<T>({
      method: options.method,
      path: options.path,
      body: options.body,
      query: options.query,
    });
  }

  getCatalogProduct(catalogProductId: number | string) {
    return this.client.getCatalogProduct(catalogProductId);
  }

  getPrintfiles(catalogProductId: number | string, technique?: string) {
    return this.client.getPrintfiles(catalogProductId, technique);
  }

  uploadFileFromUrl(url: string) {
    return this.client.uploadFileFromUrl(url);
  }

  createMockupTask(catalogProductId: number | string, body: Record<string, unknown>) {
    return this.client.createMockupTask(catalogProductId, body);
  }

  getMockupTask(taskKey: string) {
    return this.client.getMockupTask(taskKey);
  }

  createSyncProduct(body: Record<string, unknown>) {
    return this.client.createSyncProduct(body);
  }

  updateSyncVariant(variantId: number | string, body: Record<string, unknown>) {
    return this.client.updateSyncVariant(variantId, body);
  }
}
