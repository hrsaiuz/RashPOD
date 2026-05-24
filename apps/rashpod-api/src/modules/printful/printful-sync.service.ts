import { Injectable } from "@nestjs/common";
import { buildPrintfulSyncProductPayload } from "@rashpod/printful";
import { PrintfulClient } from "./printful.client";

@Injectable()
export class PrintfulSyncService {
  constructor(private readonly client: PrintfulClient) {}

  buildSyncProductPayload(input: {
    title: string;
    thumbnailUrl?: string | null;
    variantIds: string[];
    retailPrice: string;
    fileId: string;
    placement: string;
  }) {
    return buildPrintfulSyncProductPayload(input);
  }

  async createSyncProduct(input: {
    title: string;
    thumbnailUrl?: string | null;
    variantIds: string[];
    retailPrice: string;
    fileId: string;
    placement: string;
  }) {
    const payload = this.buildSyncProductPayload(input);
    return this.client.createSyncProduct(payload);
  }
}
