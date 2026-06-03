import {
  BaseProduct,
  LocalProductionMethod,
  LocalProductType,
  PipelineType,
  PlacementAlignment,
  PlacementKind,
  PlacementUnits,
  PrismaClient,
  ProductType,
  ProviderType,
} from "@prisma/client";

export type PlacementPresetRecipe = {
  name: string;
  placement: PlacementKind;
  widthCm?: number;
  heightCm?: number;
  widthIn?: number;
  heightIn?: number;
  defaultX?: number;
  defaultY?: number;
  defaultScale?: number;
  alignment: PlacementAlignment;
};

/** DTF apparel — sized for typical A3 gang-sheet transfers (moderator can refine in Konva). */
export const LOCAL_DTF_APPAREL_PRESETS: PlacementPresetRecipe[] = [
  { name: "Center chest", placement: PlacementKind.FRONT, widthCm: 26, heightCm: 26, alignment: PlacementAlignment.CENTER },
  { name: "Standard front", placement: PlacementKind.FRONT, widthCm: 28, heightCm: 32, alignment: PlacementAlignment.TOP_CENTER },
  { name: "Small left chest", placement: PlacementKind.LEFT_CHEST, widthCm: 10, heightCm: 10, alignment: PlacementAlignment.LEFT_CHEST },
  { name: "Back center", placement: PlacementKind.BACK, widthCm: 28, heightCm: 36, alignment: PlacementAlignment.CENTER },
];

export const LOCAL_DTF_HOODIE_PRESETS: PlacementPresetRecipe[] = [
  { name: "Center chest", placement: PlacementKind.FRONT, widthCm: 24, heightCm: 24, alignment: PlacementAlignment.CENTER },
  { name: "Standard front", placement: PlacementKind.FRONT, widthCm: 26, heightCm: 30, alignment: PlacementAlignment.TOP_CENTER },
  { name: "Back center", placement: PlacementKind.BACK, widthCm: 28, heightCm: 34, alignment: PlacementAlignment.CENTER },
];

/** UV-DTF on rigid / wrap surfaces (mugs, posters, stickers). */
export const LOCAL_UV_DTF_MUG_PRESETS: PlacementPresetRecipe[] = [
  { name: "Mug center", placement: PlacementKind.FULL_WRAP, widthCm: 9, heightCm: 7, alignment: PlacementAlignment.CENTER },
];

export const LOCAL_UV_DTF_POSTER_PRESETS: PlacementPresetRecipe[] = [
  { name: "Full print", placement: PlacementKind.FRONT, widthCm: 40, heightCm: 56, alignment: PlacementAlignment.CENTER },
  { name: "Center art", placement: PlacementKind.FRONT, widthCm: 30, heightCm: 40, alignment: PlacementAlignment.CENTER },
];

export const LOCAL_UV_DTF_FLAT_PRESETS: PlacementPresetRecipe[] = [
  { name: "Center print", placement: PlacementKind.FRONT, widthCm: 20, heightCm: 20, alignment: PlacementAlignment.CENTER },
];

/** Printful global — inches match common DTG/embroidery print areas on Bella/Gildan blanks. */
export const GLOBAL_PRINTFUL_PRESETS: Record<string, PlacementPresetRecipe[]> = {
  classic_crew_neck_tshirt: [
    { name: "Center chest", placement: PlacementKind.FRONT, widthIn: 10, heightIn: 10, alignment: PlacementAlignment.CENTER },
    { name: "Full front", placement: PlacementKind.FRONT, widthIn: 11, heightIn: 13.5, alignment: PlacementAlignment.TOP_CENTER },
    { name: "Back center", placement: PlacementKind.BACK, widthIn: 11, heightIn: 13.5, alignment: PlacementAlignment.CENTER },
  ],
  long_sleeve_crew_neck_tshirt: [
    { name: "Center chest", placement: PlacementKind.FRONT, widthIn: 10, heightIn: 10, alignment: PlacementAlignment.CENTER },
    { name: "Full front", placement: PlacementKind.FRONT, widthIn: 11, heightIn: 13.5, alignment: PlacementAlignment.TOP_CENTER },
    { name: "Back center", placement: PlacementKind.BACK, widthIn: 11, heightIn: 13.5, alignment: PlacementAlignment.CENTER },
  ],
  hoodie: [
    { name: "Center chest", placement: PlacementKind.FRONT, widthIn: 10, heightIn: 10, alignment: PlacementAlignment.CENTER },
    { name: "Full front", placement: PlacementKind.FRONT, widthIn: 10.5, heightIn: 12.5, alignment: PlacementAlignment.TOP_CENTER },
    { name: "Back center", placement: PlacementKind.BACK, widthIn: 11, heightIn: 13, alignment: PlacementAlignment.CENTER },
  ],
  mug: [
    { name: "Mug center", placement: PlacementKind.FRONT, widthIn: 3.5, heightIn: 3.5, alignment: PlacementAlignment.CENTER },
  ],
  poster: [
    { name: "Full print", placement: PlacementKind.FRONT, widthIn: 16, heightIn: 20, alignment: PlacementAlignment.CENTER },
  ],
};

export const GLOBAL_PRINTFUL_DEFAULT_PRESETS: PlacementPresetRecipe[] = [
  { name: "Center front", placement: PlacementKind.FRONT, widthIn: 10, heightIn: 10, alignment: PlacementAlignment.CENTER },
];

function isDtfApparel(product: BaseProduct, productType: ProductType): boolean {
  if (product.localProductionMethod === LocalProductionMethod.DTF) return true;
  if (productType.productionMethod === "DTF" && productType.category === "Clothes") return true;
  if (
    product.localProductType &&
    [
      LocalProductType.T_SHIRT,
      LocalProductType.LONG_SLEEVE_T_SHIRT,
      LocalProductType.SWEATSHIRT,
      LocalProductType.CAP,
    ].includes(product.localProductType)
  ) {
    return true;
  }
  return false;
}

function isUvDtfNonGarment(product: BaseProduct, productType: ProductType): boolean {
  if (product.localProductionMethod === LocalProductionMethod.UV_DTF) return true;
  if (productType.productionMethod === "UV_DTF" || productType.productionMethod === "UV") return true;
  if (
    product.localProductType &&
    [LocalProductType.MUG, LocalProductType.POSTER, LocalProductType.STICKER, LocalProductType.TOTE_BAG].includes(
      product.localProductType,
    )
  ) {
    return true;
  }
  return productType.category === "Ceramics" || productType.category === "Prints";
}

function localPresetsFor(product: BaseProduct, productType: ProductType): PlacementPresetRecipe[] {
  if (product.localProductType === LocalProductType.HOODIE) return LOCAL_DTF_HOODIE_PRESETS;
  if (product.localProductType === LocalProductType.MUG) return LOCAL_UV_DTF_MUG_PRESETS;
  if (product.localProductType === LocalProductType.POSTER) return LOCAL_UV_DTF_POSTER_PRESETS;
  if (isDtfApparel(product, productType)) return LOCAL_DTF_APPAREL_PRESETS;
  if (isUvDtfNonGarment(product, productType)) {
    if (productType.slug === "mug") return LOCAL_UV_DTF_MUG_PRESETS;
    if (productType.slug === "poster") return LOCAL_UV_DTF_POSTER_PRESETS;
    return LOCAL_UV_DTF_FLAT_PRESETS;
  }
  return [];
}

function globalPresetsFor(rashpodProductType: string): PlacementPresetRecipe[] {
  return GLOBAL_PRINTFUL_PRESETS[rashpodProductType] ?? GLOBAL_PRINTFUL_DEFAULT_PRESETS;
}

async function upsertLocalPreset(
  prisma: PrismaClient,
  baseProductId: string,
  recipe: PlacementPresetRecipe,
): Promise<void> {
  const existing = await prisma.placementPreset.findFirst({
    where: {
      pipeline: PipelineType.LOCAL,
      localBaseProductId: baseProductId,
      name: recipe.name,
      placement: recipe.placement,
    },
  });
  const data = {
    name: recipe.name,
    pipeline: PipelineType.LOCAL,
    localBaseProductId: baseProductId,
    placement: recipe.placement,
    defaultWidthCm: recipe.widthCm,
    defaultHeightCm: recipe.heightCm,
    defaultWidthIn: null as number | null,
    defaultHeightIn: null as number | null,
    defaultX: recipe.defaultX ?? 0,
    defaultY: recipe.defaultY ?? 0,
    defaultScale: recipe.defaultScale ?? 1,
    alignment: recipe.alignment,
    units: PlacementUnits.CM,
    active: true,
  };
  if (existing) await prisma.placementPreset.update({ where: { id: existing.id }, data });
  else await prisma.placementPreset.create({ data });
}

async function upsertGlobalPreset(
  prisma: PrismaClient,
  productTemplateId: string,
  recipe: PlacementPresetRecipe,
): Promise<void> {
  const existing = await prisma.placementPreset.findFirst({
    where: {
      pipeline: PipelineType.GLOBAL_PRINTFUL,
      productTemplateId,
      name: recipe.name,
      placement: recipe.placement,
    },
  });
  const data = {
    name: recipe.name,
    pipeline: PipelineType.GLOBAL_PRINTFUL,
    productTemplateId,
    placement: recipe.placement,
    defaultWidthCm: null as number | null,
    defaultHeightCm: null as number | null,
    defaultWidthIn: recipe.widthIn,
    defaultHeightIn: recipe.heightIn,
    defaultX: recipe.defaultX ?? 0,
    defaultY: recipe.defaultY ?? 0,
    defaultScale: recipe.defaultScale ?? 1,
    alignment: recipe.alignment,
    units: PlacementUnits.INCH,
    active: true,
  };
  if (existing) await prisma.placementPreset.update({ where: { id: existing.id }, data });
  else await prisma.placementPreset.create({ data });
}

export async function seedPlacementPresets(prisma: PrismaClient): Promise<{ local: number; global: number }> {
  let localCount = 0;
  let globalCount = 0;

  const baseProducts = await prisma.baseProduct.findMany({
    where: { isActive: true },
    include: { productType: true },
  });

  for (const product of baseProducts) {
    const recipes = localPresetsFor(product, product.productType);
    for (const recipe of recipes) {
      await upsertLocalPreset(prisma, product.id, recipe);
      localCount += 1;
    }
  }

  const templates = await prisma.printfulProductTemplate.findMany({
    where: { provider: ProviderType.PRINTFUL, active: true },
  });

  for (const template of templates) {
    const recipes = globalPresetsFor(template.rashpodProductType);
    for (const recipe of recipes) {
      await upsertGlobalPreset(prisma, template.id, recipe);
      globalCount += 1;
    }
  }

  return { local: localCount, global: globalCount };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await seedPlacementPresets(prisma);
    console.log(`Placement presets seeded: ${result.local} local, ${result.global} global (upserts).`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
