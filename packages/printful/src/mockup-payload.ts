export type PrintfulPlacementInput = {
  width?: number | null;
  height?: number | null;
  left?: number | null;
  top?: number | null;
  scale?: number | null;
};

export type PrintfulTemplateLike = {
  printfulCatalogProductId: string;
  printfulVariantIds: unknown;
  allowedPlacements: unknown;
  allowedTechniques: unknown;
  defaultPlacement: string;
  defaultTechnique: string;
};

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function buildPrintfulMockupTaskBody(input: {
  template: PrintfulTemplateLike;
  fileId?: string | null;
  fileUrl?: string | null;
  placement?: string | null;
  technique?: string | null;
  position: PrintfulPlacementInput;
}) {
  const placement = input.placement || input.template.defaultPlacement;
  const technique = input.technique || input.template.defaultTechnique;
  const allowedPlacements = stringArray(input.template.allowedPlacements);
  const allowedTechniques = stringArray(input.template.allowedTechniques);
  const variantIds = stringArray(input.template.printfulVariantIds);

  if (!allowedPlacements.includes(placement)) throw new Error("INVALID_PLACEMENT");
  if (!allowedTechniques.includes(technique)) throw new Error("INVALID_PRINTFUL_TECHNIQUE");
  if (variantIds.length === 0) throw new Error("INVALID_PRINTFUL_VARIANT");
  if (!input.fileId && !input.fileUrl) throw new Error("PRINTFUL_FILE_UPLOAD_FAILED");

  return {
    catalog_product_id: input.template.printfulCatalogProductId,
    variant_ids: variantIds,
    format: "jpg",
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

export function buildPrintfulSyncProductPayload(input: {
  title: string;
  thumbnailUrl?: string | null;
  variantIds: string[];
  retailPrice: string;
  fileId: string;
  placement: string;
}) {
  return {
    sync_product: {
      name: input.title,
      thumbnail: input.thumbnailUrl ?? undefined,
    },
    sync_variants: input.variantIds.map((variantId) => ({
      variant_id: Number(variantId),
      retail_price: input.retailPrice,
      files: [{ type: input.placement, id: input.fileId }],
    })),
  };
}
