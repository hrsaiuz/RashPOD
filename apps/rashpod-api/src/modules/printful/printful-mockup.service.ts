import { BadRequestException, Injectable } from "@nestjs/common";
import { PrintfulProductTemplate } from "@prisma/client";
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
    const placement = input.placement || input.template.defaultPlacement;
    const technique = input.technique || input.template.defaultTechnique;
    const allowedPlacements = this.stringArray(input.template.allowedPlacements);
    const allowedTechniques = this.stringArray(input.template.allowedTechniques);
    const variantIds = this.stringArray(input.template.printfulVariantIds);

    if (!allowedPlacements.includes(placement)) throw new BadRequestException("INVALID_PLACEMENT");
    if (!allowedTechniques.includes(technique)) throw new BadRequestException("INVALID_PRINTFUL_TECHNIQUE");
    if (variantIds.length === 0) throw new BadRequestException("INVALID_PRINTFUL_VARIANT");
    if (!input.fileId && !input.fileUrl) throw new BadRequestException("PRINTFUL_FILE_UPLOAD_FAILED");

    return {
      catalog_product_id: input.template.printfulCatalogProductId,
      variant_ids: variantIds,
      files: [
        {
          placement,
          technique,
          file_id: input.fileId ?? undefined,
          image_url: input.fileUrl ?? undefined,
          position: {
            width: input.position.width,
            height: input.position.height,
            left: input.position.left,
            top: input.position.top,
            scale: input.position.scale ?? 1,
          },
        },
      ],
    };
  }

  async createMockupTask(input: PrintfulMockupSelectionInput) {
    const payload = this.buildMockupPayload(input);
    return this.client.request<{ task_key?: string; result?: unknown }>({
      method: "POST",
      path: "/mockup-generator/create-task",
      body: payload,
    });
  }

  private stringArray(value: unknown) {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  }
}
