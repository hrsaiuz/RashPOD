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
      storeId: options.storeId,
    });
  }

  getCatalogProduct(catalogProductId: number | string) {
    return this.client.getCatalogProduct(catalogProductId);
  }

  listStores(options?: { offset?: number; limit?: number }) {
    return this.client.listStores(options);
  }

  listCategories() {
    return this.client.listCategories();
  }

  listCatalogProducts(options?: { categoryId?: number; offset?: number; limit?: number }) {
    return this.client.listCatalogProducts(options);
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

  createSyncProduct(body: Record<string, unknown>, storeId?: string | null) {
    return this.client.createSyncProduct(body, storeId);
  }

  getSyncProduct(syncProductIdOrExternalId: number | string, storeId?: string | null) {
    return this.client.getSyncProduct(syncProductIdOrExternalId, storeId);
  }

  updateSyncProduct(syncProductId: number | string, body: Record<string, unknown>, storeId?: string | null) {
    return this.client.updateSyncProduct(syncProductId, body, storeId);
  }

  calculateShippingRates(body: Record<string, unknown>, storeId?: string | null) {
    return this.client.calculateShippingRates(body, storeId);
  }

  createOrder(body: Record<string, unknown>, storeId?: string | null, confirm = true) {
    return this.client.createOrder(body, storeId, confirm);
  }

  getOrder(orderId: number | string, storeId?: string | null) {
    return this.client.getOrder(orderId, storeId);
  }

  cancelOrder(orderId: number | string, storeId?: string | null) {
    return this.client.cancelOrder(orderId, storeId);
  }

  updateSyncVariant(variantId: number | string, body: Record<string, unknown>) {
    return this.client.updateSyncVariant(variantId, body);
  }
}
