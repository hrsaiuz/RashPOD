import { BadRequestException, Injectable } from "@nestjs/common";
import { PrintfulProductTemplate } from "@prisma/client";
import { buildPrintfulMockupTaskBody } from "@rashpod/printful";
import { PrintfulClient } from "./printful.client";

export interface PrintfulMockupSelectionInput {
  template: Pick<
    PrintfulProductTemplate,
    | "printfulCatalogProductId"
    | "printfulVariantIds"
    | "allowedPlacements"
    | "allowedTechniques"
    | "defaultPlacement"
    | "defaultTechnique"
    | "metadataJson"
  >;
  fileId?: string | null;
  fileUrl?: string | null;
  placement?: string | null;
  technique?: string | null;
  position: {
    width?: number | null;
    height?: number | null;
    left?: number | null;
    top?: number | null;
    scale?: number | null;
  };
}

@Injectable()
export class PrintfulMockupService {
  constructor(private readonly client: PrintfulClient) {}

  buildMockupPayload(input: PrintfulMockupSelectionInput) {
    try {
      return buildPrintfulMockupTaskBody(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : "INVALID_PRINTFUL_MOCKUP";
      if (message === "INVALID_PLACEMENT" || message === "INVALID_PRINTFUL_TECHNIQUE" || message === "INVALID_PRINTFUL_VARIANT" || message === "PRINTFUL_FILE_UPLOAD_FAILED") {
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  async createMockupTask(input: PrintfulMockupSelectionInput) {
    const payload = this.buildMockupPayload(input);
    const { catalog_product_id, ...body } = payload;
    return this.client.createMockupTask(catalog_product_id, body);
  }
}
