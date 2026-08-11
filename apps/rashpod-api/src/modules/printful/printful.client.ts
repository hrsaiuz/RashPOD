import { Injectable } from "@nestjs/common";
import { PrintfulApiClient, parsePrintfulSettings } from "@rashpod/printful";
import { PrismaService } from "../../prisma/prisma.service";
import type { PrintfulRequestOptions } from "./printful.client.types";

@Injectable()
export class PrintfulClient {
  private readonly client: PrintfulApiClient;

  constructor(private readonly prisma: PrismaService) {
    // The persisted platform setting is the integration switch. Keep the
    // transport itself enabled so the legacy PRINTFUL_ENABLED environment
    // variable cannot override an administrator's choice in either direction.
    this.client = new PrintfulApiClient({ enabled: true });
  }

  async isEnabled() {
    const setting = await this.prisma.platformSetting.findUnique({
      where: { key: "integrations.printful" },
      select: { value: true },
    });
    return parsePrintfulSettings(setting?.value).enabled;
  }

  hasToken() {
    return this.client.hasToken();
  }

  private async assertReady() {
    if (!(await this.isEnabled())) throw new Error("PRINTFUL_NOT_CONFIGURED");
    if (!this.hasToken()) throw new Error("PRINTFUL_API_TOKEN_MISSING");
  }

  private async withReady<T>(operation: () => Promise<T>): Promise<T> {
    await this.assertReady();
    return operation();
  }

  async request<T>(options: PrintfulRequestOptions): Promise<T> {
    return this.withReady(() =>
      this.client.request<T>({
        method: options.method,
        path: options.path,
        body: options.body,
        query: options.query,
        storeId: options.storeId,
      }),
    );
  }

  getCatalogProduct(catalogProductId: number | string) {
    return this.withReady(() => this.client.getCatalogProduct(catalogProductId));
  }

  listStores(options?: { offset?: number; limit?: number }) {
    return this.withReady(() => this.client.listStores(options));
  }

  listCategories() {
    return this.withReady(() => this.client.listCategories());
  }

  listCatalogProducts(options?: { categoryId?: number; offset?: number; limit?: number }) {
    return this.withReady(() => this.client.listCatalogProducts(options));
  }

  getPrintfiles(catalogProductId: number | string, technique?: string) {
    return this.withReady(() => this.client.getPrintfiles(catalogProductId, technique));
  }

  uploadFileFromUrl(url: string) {
    return this.withReady(() => this.client.uploadFileFromUrl(url));
  }

  createMockupTask(catalogProductId: number | string, body: Record<string, unknown>) {
    return this.withReady(() => this.client.createMockupTask(catalogProductId, body));
  }

  getMockupTask(taskKey: string) {
    return this.withReady(() => this.client.getMockupTask(taskKey));
  }

  createSyncProduct(body: Record<string, unknown>, storeId?: string | null) {
    return this.withReady(() => this.client.createSyncProduct(body, storeId));
  }

  getSyncProduct(syncProductIdOrExternalId: number | string, storeId?: string | null) {
    return this.withReady(() => this.client.getSyncProduct(syncProductIdOrExternalId, storeId));
  }

  updateSyncProduct(syncProductId: number | string, body: Record<string, unknown>, storeId?: string | null) {
    return this.withReady(() => this.client.updateSyncProduct(syncProductId, body, storeId));
  }

  calculateShippingRates(body: Record<string, unknown>, storeId?: string | null) {
    return this.withReady(() => this.client.calculateShippingRates(body, storeId));
  }

  createOrder(body: Record<string, unknown>, storeId?: string | null, confirm = true) {
    return this.withReady(() => this.client.createOrder(body, storeId, confirm));
  }

  getOrder(orderId: number | string, storeId?: string | null) {
    return this.withReady(() => this.client.getOrder(orderId, storeId));
  }

  cancelOrder(orderId: number | string, storeId?: string | null) {
    return this.withReady(() => this.client.cancelOrder(orderId, storeId));
  }

  updateSyncVariant(variantId: number | string, body: Record<string, unknown>) {
    return this.withReady(() => this.client.updateSyncVariant(variantId, body));
  }
}
