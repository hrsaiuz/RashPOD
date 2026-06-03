import type { PrintfulCatalogAllowlistItem, PrintfulTemplateUpsertInput } from "./types";
import { parsePrintfulPrintAreas } from "./print-area-parser";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value.map((item) => String(item)).filter(Boolean);
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function variantIdsFromProduct(product: Record<string, unknown>, allowlistItem: PrintfulCatalogAllowlistItem) {
  if (allowlistItem.defaultVariantIds?.length) return allowlistItem.defaultVariantIds.map(String);
  const variants = Array.isArray(product.variants) ? product.variants : [];
  return variants
    .map((variant) => asRecord(variant).id)
    .filter((id) => id != null)
    .map(String);
}

function placementsFromPrintfiles(printfiles: Record<string, unknown>, fallbackPlacement: string) {
  const variantPrintfiles = Array.isArray(printfiles.variant_printfiles) ? printfiles.variant_printfiles : [];
  const placements = variantPrintfiles.flatMap((entry) => {
    const record = asRecord(entry);
    const printfilesList = Array.isArray(record.printfiles) ? record.printfiles : [];
    return printfilesList.map((item) => asRecord(item).placement).filter(Boolean).map(String);
  });
  return uniqueStrings([...placements, fallbackPlacement]);
}

function techniquesFromPrintfiles(printfiles: Record<string, unknown>, fallbackTechnique: string) {
  const available = asRecord(printfiles.available_techniques);
  const keys = Object.keys(available);
  return uniqueStrings([...keys, fallbackTechnique]);
}

export function mapCatalogProductToTemplate(input: {
  allowlistItem: PrintfulCatalogAllowlistItem;
  product: Record<string, unknown>;
  printfiles: Record<string, unknown>;
  storeId?: string | null;
}): PrintfulTemplateUpsertInput {
  const defaultPlacement = input.allowlistItem.defaultPlacement ?? "front";
  const defaultTechnique = input.allowlistItem.defaultTechnique ?? "dtg";
  const variantIds = variantIdsFromProduct(input.product, input.allowlistItem);
  const displayName = input.allowlistItem.displayName ?? String(input.product.title ?? input.product.name ?? `Printful product ${input.allowlistItem.catalogProductId}`);
  const image = String(input.product.image ?? input.product.thumbnail_url ?? "");
  const price = input.product.price ?? input.product.default_price;
  const printAreasJson = parsePrintfulPrintAreas(input.printfiles, defaultTechnique);

  return {
    rashpodProductType: input.allowlistItem.rashpodProductType,
    displayName,
    printfulCatalogProductId: String(input.allowlistItem.catalogProductId),
    printfulProductName: String(input.product.title ?? input.product.name ?? displayName),
    printfulVariantIds: variantIds,
    allowedColorVariantIds: variantIds,
    allowedSizeVariantIds: variantIds,
    allowedPlacements: placementsFromPrintfiles(input.printfiles, defaultPlacement),
    allowedTechniques: techniquesFromPrintfiles(input.printfiles, defaultTechnique),
    defaultTechnique,
    defaultPlacement,
    defaultRetailPrice: price == null ? null : String(price),
    estimatedBaseCost: null,
    currency: "USD",
    previewImageUrl: image || null,
    printfulStoreId: input.storeId ?? null,
    printAreasJson,
    metadataJson: {
      printfulRaw: { product: input.product, printfiles: input.printfiles },
      printAreasJson,
      syncedAt: new Date().toISOString(),
    },
  };
}

export { parsePrintfulPrintAreas, resolvePrintfulPrintArea } from "./print-area-parser";
export type { PrintfulPrintAreaEntry, PrintfulPrintAreasMap } from "./print-area-parser";

export function parsePrintfulSettings(value: unknown) {
  const record = asRecord(value);
  const allowlist = Array.isArray(record.catalogAllowlist)
    ? record.catalogAllowlist
        .map((item) => asRecord(item))
        .filter((item) => item.catalogProductId != null && item.rashpodProductType)
        .map((item) => ({
          catalogProductId: Number(item.catalogProductId),
          rashpodProductType: String(item.rashpodProductType),
          displayName: item.displayName == null ? undefined : String(item.displayName),
          defaultVariantIds: Array.isArray(item.defaultVariantIds) ? item.defaultVariantIds.map(Number).filter(Number.isFinite) : undefined,
          defaultTechnique: item.defaultTechnique == null ? undefined : String(item.defaultTechnique),
          defaultPlacement: item.defaultPlacement == null ? undefined : String(item.defaultPlacement),
        }))
    : [];
  return {
    enabled: Boolean(record.enabled),
    defaultStoreId: record.defaultStoreId == null ? null : String(record.defaultStoreId),
    connectedMarketplaces: stringArray(record.connectedMarketplaces),
    autoPublishTrusted: Boolean(record.autoPublishTrusted),
    allowGlobalWithoutLocal: Boolean(record.allowGlobalWithoutLocal),
    catalogAllowlist: allowlist,
  };
}

export function extractMockupUrls(taskResult: Record<string, unknown>) {
  const mockups = Array.isArray(taskResult.mockups) ? taskResult.mockups : [];
  const urls: string[] = [];
  for (const mockup of mockups) {
    const record = asRecord(mockup);
    const extra = Array.isArray(record.extra) ? record.extra : [];
    for (const item of extra) {
      const url = asRecord(item).url;
      if (typeof url === "string" && url) urls.push(url);
    }
    const mockupUrl = record.mockup_url;
    if (typeof mockupUrl === "string" && mockupUrl) urls.push(mockupUrl);
  }
  return uniqueStrings(urls);
}
