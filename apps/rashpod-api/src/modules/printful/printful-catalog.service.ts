import { Injectable } from "@nestjs/common";
import { mapCatalogProductToTemplate } from "@rashpod/printful";
import type { PrintfulCatalogAllowlistItem } from "@rashpod/printful";
import { PrintfulClient } from "./printful.client";

@Injectable()
export class PrintfulCatalogService {
  constructor(private readonly client: PrintfulClient) {}

  async fetchTemplateData(allowlistItem: PrintfulCatalogAllowlistItem, storeId?: string | null) {
    const productResponse = await this.client.getCatalogProduct(allowlistItem.catalogProductId);
    const product = (productResponse.result ?? {}) as Record<string, unknown>;
    const technique = allowlistItem.defaultTechnique ?? "dtg";
    const printfilesResponse = await this.client.getPrintfiles(allowlistItem.catalogProductId, technique);
    const printfiles = (printfilesResponse.result ?? {}) as Record<string, unknown>;
    return mapCatalogProductToTemplate({ allowlistItem, product, printfiles, storeId });
  }
}
