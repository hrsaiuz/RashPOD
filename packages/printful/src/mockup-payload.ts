export type PrintfulPlacementInput = {
  width?: number | null;
  height?: number | null;
  left?: number | null;
  top?: number | null;
  scale?: number | null;
};

export type PrintfulPrintAreaInput = {
  width: number;
  height: number;
  left?: number | null;
  top?: number | null;
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
  fileUrl?: string | null;
  placement?: string | null;
  technique?: string | null;
  position: PrintfulPlacementInput;
  printArea: PrintfulPrintAreaInput;
  variantIds?: string[] | null;
}) {
  const placement = input.placement || input.template.defaultPlacement;
  const technique = input.technique || input.template.defaultTechnique;
  const allowedPlacements = stringArray(input.template.allowedPlacements);
  const allowedTechniques = stringArray(input.template.allowedTechniques);
  const variantIds = (input.variantIds?.length ? input.variantIds : stringArray(input.template.printfulVariantIds))
    .map((id) => Number(id))
    .filter((id) => Number.isSafeInteger(id) && id > 0);

  if (!allowedPlacements.includes(placement)) throw new Error("INVALID_PLACEMENT");
  if (!allowedTechniques.includes(technique)) throw new Error("INVALID_PRINTFUL_TECHNIQUE");
  if (variantIds.length === 0) throw new Error("INVALID_PRINTFUL_VARIANT");
  if (!input.fileUrl) throw new Error("PRINTFUL_FILE_UPLOAD_FAILED");

  const unitsPerInch = 100;
  const scale = input.position.scale ?? 1;
  const areaLeft = input.printArea.left ?? 0;
  const areaTop = input.printArea.top ?? 0;
  const areaWidth = positiveInt(input.printArea.width * unitsPerInch);
  const areaHeight = positiveInt(input.printArea.height * unitsPerInch);
  const width = positiveInt((input.position.width ?? input.printArea.width) * scale * unitsPerInch);
  const height = positiveInt((input.position.height ?? input.printArea.height) * scale * unitsPerInch);
  const left = Math.round(((input.position.left ?? areaLeft) - areaLeft) * unitsPerInch);
  const top = Math.round(((input.position.top ?? areaTop) - areaTop) * unitsPerInch);

  return {
    catalog_product_id: input.template.printfulCatalogProductId,
    variant_ids: variantIds,
    format: "jpg",
    files: [
      {
        placement,
        image_url: input.fileUrl,
        position: {
          area_width: areaWidth,
          area_height: areaHeight,
          width,
          height,
          left,
          top,
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
  files?: Array<{ fileId: string; placement: string }>;
  externalProductId?: string;
  externalVariantId?: (variantId: string) => string;
}) {
  return {
    sync_product: {
      name: input.title,
      thumbnail: input.thumbnailUrl ?? undefined,
      external_id: input.externalProductId,
    },
    sync_variants: input.variantIds.map((variantId) => ({
      variant_id: Number(variantId),
      external_id: input.externalVariantId?.(variantId),
      retail_price: input.retailPrice,
      files: (input.files?.length ? input.files : [{ fileId: input.fileId, placement: input.placement }])
        .map((file) => ({ type: file.placement, id: file.fileId })),
    })),
  };
}

function positiveInt(value: number) {
  if (!Number.isFinite(value) || value <= 0) throw new Error("INVALID_PLACEMENT");
  return Math.max(1, Math.round(value));
}
