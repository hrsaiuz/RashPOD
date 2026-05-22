import {
  LocalProductionMethod,
  LocalProductType,
  NecklineType,
  PipelineType,
  PlacementAlignment,
  PlacementKind,
  PlacementUnits,
  PrismaClient,
  ProviderType,
  SleeveType,
  UserRole,
  DesignStatus,
  ListingStatus,
  ListingType,
  BillingAccountStatus,
  BillingInterval,
  PlanStatus,
  SubscriptionStatus,
  TenantMemberStatus,
  TenantStatus,
  TenantType,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DEFAULT_TENANT_ID = "00000000-0000-4000-8000-000000000100";
const DEFAULT_PLAN_ID = "00000000-0000-4000-8000-000000000101";
const DEFAULT_BILLING_ACCOUNT_ID = "00000000-0000-4000-8000-000000000102";
const DEFAULT_BRANDING_ID = "00000000-0000-4000-8000-000000000103";
const DEFAULT_SUBSCRIPTION_ID = "00000000-0000-4000-8000-000000000104";

async function upsertUser(input: {
  email: string;
  displayName: string;
  role: UserRole;
  password: string;
}) {
  const hash = await bcrypt.hash(input.password, 10);
  const handle = input.displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || input.email.split("@")[0];
  return prisma.user.upsert({
    where: { email: input.email },
    create: {
      email: input.email,
      displayName: input.displayName,
      handle,
      role: input.role,
      passwordHash: hash,
    },
    update: {
      displayName: input.displayName,
      handle,
      role: input.role,
      passwordHash: hash,
    },
  });
}

async function seedUsers() {
  const users = [
    { email: "superadmin@rashpod.local", displayName: "Super Admin", role: UserRole.SUPER_ADMIN, password: "ChangeMe123!" },
    { email: "admin@rashpod.local", displayName: "Admin", role: UserRole.ADMIN, password: "ChangeMe123!" },
    { email: "ops@rashpod.local", displayName: "Operations Manager", role: UserRole.OPERATIONS_MANAGER, password: "ChangeMe123!" },
    { email: "moderator@rashpod.local", displayName: "Moderator", role: UserRole.MODERATOR, password: "ChangeMe123!" },
    { email: "production@rashpod.local", displayName: "Production Staff", role: UserRole.PRODUCTION_STAFF, password: "ChangeMe123!" },
    { email: "finance@rashpod.local", displayName: "Finance Staff", role: UserRole.FINANCE_STAFF, password: "ChangeMe123!" },
    { email: "support@rashpod.local", displayName: "Support Staff", role: UserRole.SUPPORT_STAFF, password: "ChangeMe123!" },
    { email: "designer@rashpod.local", displayName: "Designer", role: UserRole.DESIGNER, password: "ChangeMe123!" },
    { email: "designer2@rashpod.local", displayName: "Nilufar A.", role: UserRole.DESIGNER, password: "ChangeMe123!" },
    { email: "designer3@rashpod.local", displayName: "Bekzod M.", role: UserRole.DESIGNER, password: "ChangeMe123!" },
    { email: "customer@rashpod.local", displayName: "Customer", role: UserRole.CUSTOMER, password: "ChangeMe123!" },
    { email: "corporate@rashpod.local", displayName: "Corporate Client", role: UserRole.CORPORATE_CLIENT, password: "ChangeMe123!" },
  ] as const;

  for (const user of users) {
    await upsertUser(user);
  }
}

async function seedDefaultTenant() {
  const owner = await prisma.user.findFirst({ where: { role: UserRole.SUPER_ADMIN }, orderBy: { createdAt: "asc" } });

  const plan = await prisma.saaSPlan.upsert({
    where: { code: "rashpod-default" },
    create: {
      id: DEFAULT_PLAN_ID,
      name: "RashPOD Default",
      code: "rashpod-default",
      status: PlanStatus.ACTIVE,
      currency: "UZS",
      billingInterval: BillingInterval.MANUAL,
      price: "0",
      trialDays: 0,
      includedLimits: { designs: null, orders: null, users: null, storageGb: null },
      featureFlags: { defaultTenant: true, whiteLabel: true, workshopMobile: true },
    },
    update: {
      name: "RashPOD Default",
      status: PlanStatus.ACTIVE,
      includedLimits: { designs: null, orders: null, users: null, storageGb: null },
      featureFlags: { defaultTenant: true, whiteLabel: true, workshopMobile: true },
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug: "rashpod" },
    create: {
      id: DEFAULT_TENANT_ID,
      name: "RashPOD",
      slug: "rashpod",
      status: TenantStatus.ACTIVE,
      tenantType: TenantType.RASHPOD_DEFAULT,
      ownerUserId: owner?.id,
      planId: plan.id,
      settingsJson: { defaultTenant: true },
    },
    update: {
      name: "RashPOD",
      status: TenantStatus.ACTIVE,
      tenantType: TenantType.RASHPOD_DEFAULT,
      ownerUserId: owner?.id,
      planId: plan.id,
    },
  });

  const billingAccount = await prisma.billingAccount.upsert({
    where: { id: DEFAULT_BILLING_ACCOUNT_ID },
    create: {
      id: DEFAULT_BILLING_ACCOUNT_ID,
      tenantId: tenant.id,
      billingEmail: "billing@rashpod.local",
      companyName: "RashPOD",
      status: BillingAccountStatus.ACTIVE,
    },
    update: { tenantId: tenant.id, companyName: "RashPOD", status: BillingAccountStatus.ACTIVE },
  });

  const branding = await prisma.tenantBranding.upsert({
    where: { id: DEFAULT_BRANDING_ID },
    create: { id: DEFAULT_BRANDING_ID, tenantId: tenant.id, displayName: "RashPOD", accentColor: "#788AE0" },
    update: { tenantId: tenant.id, displayName: "RashPOD", accentColor: "#788AE0" },
  });

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { billingAccountId: billingAccount.id, brandingId: branding.id },
  });

  await prisma.subscription.upsert({
    where: { id: DEFAULT_SUBSCRIPTION_ID },
    create: {
      id: DEFAULT_SUBSCRIPTION_ID,
      tenantId: tenant.id,
      planId: plan.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      manualBilling: true,
      notes: "Default RashPOD tenant bootstrap subscription.",
    },
    update: { tenantId: tenant.id, planId: plan.id, status: SubscriptionStatus.ACTIVE, manualBilling: true },
  });

  const users = await prisma.user.findMany();
  for (const user of users) {
    await prisma.tenantMember.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
      create: {
        tenantId: tenant.id,
        userId: user.id,
        roleKey: user.role,
        status: TenantMemberStatus.ACTIVE,
        joinedAt: new Date(),
      },
      update: { roleKey: user.role, status: TenantMemberStatus.ACTIVE },
    });
  }

  return tenant;
}

async function seedProductTypes() {
  const items = [
    { name: "T-shirt", slug: "t-shirt", category: "Clothes", productionMethod: "DTF", supportsFilmSale: false },
    { name: "Long sleeve crew neck T-shirt", slug: "long-sleeve-crew-neck-t-shirt", category: "Clothes", productionMethod: "DTF", supportsFilmSale: false },
    { name: "Hoodie", slug: "hoodie", category: "Clothes", productionMethod: "DTF", supportsFilmSale: false },
    { name: "Mug", slug: "mug", category: "Ceramics", productionMethod: "Sublimation", supportsFilmSale: false },
    { name: "Poster", slug: "poster", category: "Prints", productionMethod: "UV", supportsFilmSale: false },
    { name: "DTF Film", slug: "dtf-film", category: "Films", productionMethod: "DTF", supportsFilmSale: true },
    { name: "UV-DTF Film", slug: "uv-dtf-film", category: "Films", productionMethod: "UV_DTF", supportsFilmSale: true },
  ] as const;

  for (const item of items) {
    await prisma.productType.upsert({
      where: { slug: item.slug },
      create: item,
      update: {
        name: item.name,
        category: item.category,
        productionMethod: item.productionMethod,
        supportsFilmSale: item.supportsFilmSale,
      },
    });
  }
}

async function seedRoyaltyDefault() {
  const existing = await prisma.royaltyRule.findFirst({
    where: { scope: "DEFAULT", basis: "NET_PROFIT_PERCENT", isActive: true },
  });
  if (!existing) {
    await prisma.royaltyRule.create({
      data: {
        scope: "DEFAULT",
        basis: "NET_PROFIT_PERCENT",
        value: 15,
        effectiveAt: new Date(),
        isActive: true,
      },
    });
  }
}

async function seedCurrencies() {
  await prisma.currencyConfig.upsert({
    where: { code: "UZS" },
    create: {
      code: "UZS",
      name: "Uzbekistani Som",
      symbol: "so'm",
      decimalPlaces: 2,
      isActive: true,
      isPrimary: true,
      exchangeRateToUzs: 1,
    },
    update: {
      name: "Uzbekistani Som",
      symbol: "so'm",
      decimalPlaces: 2,
      isActive: true,
      isPrimary: true,
      exchangeRateToUzs: 1,
    },
  });
}

async function seedFilmSettings() {
  const current = await prisma.filmSaleSettings.findFirst();
  if (!current) {
    await prisma.filmSaleSettings.create({
      data: {
        enableFilmSalesGlobally: false,
        enableDTF: true,
        enableUvDtf: true,
        defaultRoyaltyBasis: "NET_PROFIT_PERCENT",
        defaultRoyaltyValue: 15,
        revocationPolicy: "Existing paid orders may still be fulfilled; future orders are blocked.",
      },
    });
  }
}

async function seedDeliverySettings() {
  const defaults = [
    { providerType: "YANDEX_DELIVERY", displayName: "Yandex Delivery", zone: "Tashkent", isActive: true, etaText: "Same day" },
    { providerType: "UZPOST", displayName: "UzPost", zone: "Nationwide", isActive: true, etaText: "2-5 business days" },
    { providerType: "PICKUP", displayName: "Workshop Pickup", zone: "Workshop", isActive: true, etaText: "Pickup hours apply" },
    { providerType: "MANUAL", displayName: "Manual Delivery", zone: "Fallback", isActive: true, etaText: "Manual confirmation" },
  ] as const;

  for (const item of defaults) {
    const existing = await prisma.deliverySetting.findFirst({
      where: { providerType: item.providerType, zone: item.zone },
    });
    if (!existing) {
      await prisma.deliverySetting.create({
        data: {
          providerType: item.providerType,
          displayName: item.displayName,
          zone: item.zone,
          isActive: item.isActive,
          etaText: item.etaText,
        },
      });
    }
  }
}

async function seedSampleListings() {
  const designers = await prisma.user.findMany({
    where: { role: UserRole.DESIGNER },
    orderBy: { createdAt: "asc" },
    take: 3,
  });
  if (designers.length === 0) return;

  const samples = [
    { title: "Tashkent Skyline Tee", slug: "tashkent-skyline-tee", price: 159000, seed: "tashkent-tee" },
    { title: "Chorsu Bazaar Hoodie", slug: "chorsu-bazaar-hoodie", price: 329000, seed: "chorsu-hoodie" },
    { title: "Samarkand Poster", slug: "samarkand-poster", price: 89000, seed: "samarkand-poster" },
    { title: "Uzbek Folk Mug", slug: "uzbek-folk-mug", price: 79000, seed: "folk-mug" },
    { title: "Registan Print Tee", slug: "registan-print-tee", price: 159000, seed: "registan-tee" },
    { title: "Navruz Celebration Poster", slug: "navruz-poster", price: 99000, seed: "navruz-poster" },
  ];

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    const designer = designers[i % designers.length];
    const existingListing = await prisma.commerceListing.findUnique({ where: { slug: sample.slug } });
    if (existingListing) continue;

    const design = await prisma.designAsset.create({
      data: {
        designerId: designer.id,
        title: sample.title,
        description: `Sample design "${sample.title}" by ${designer.displayName}.`,
        status: DesignStatus.PUBLISHED,
      },
    });

    await prisma.commerceListing.create({
      data: {
        type: ListingType.PRODUCT,
        status: ListingStatus.PUBLISHED,
        designerId: designer.id,
        designAssetId: design.id,
        title: sample.title,
        description: `${sample.title} — printed on demand in Uzbekistan.`,
        slug: sample.slug,
        price: sample.price,
        currency: "UZS",
        imagesJson: [
          `https://picsum.photos/seed/${sample.seed}/640/640`,
          `https://picsum.photos/seed/${sample.seed}-2/640/640`,
          `https://picsum.photos/seed/${sample.seed}-3/640/640`,
        ],
        publishedAt: new Date(),
      },
    });
  }
}

async function backfillDefaultTenantData(tenantId: string) {
  await prisma.$transaction([
    prisma.userPreferences.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.designAsset.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.fileAsset.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.productType.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.royaltyRule.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.baseProduct.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.mockupTemplate.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.filmSaleSettings.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.filmSheetPreset.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.gangSheet.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.deliverySetting.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.generatedAsset.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.commerceListing.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.marketplaceConfig.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.cart.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.order.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.supportRequest.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.paymentTransaction.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.orderFinanceSnapshot.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.ledgerEntry.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.royaltyLedgerEntry.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.payout.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.paymentReconciliation.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.productionJob.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.workshopQcEvidence.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.workshopIssue.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.workshopMobileAction.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.corporateRequest.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.workerJob.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.analyticsEvent.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.notification.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.crmTag.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.crmNote.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.crmContactLog.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.dailyMetric.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.reportExport.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.auditLog.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.emailTemplate.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.mediaAsset.updateMany({ where: { tenantId: null }, data: { tenantId } }),
    prisma.designerApplication.updateMany({ where: { tenantId: null }, data: { tenantId } }),
  ]);
}


async function seedBaseProductsAndMockups() {
  const slugs = ["t-shirt", "hoodie", "mug", "poster"];
  for (const slug of slugs) {
    const type = await prisma.productType.findUnique({ where: { slug } });
    if (!type) continue;

    const skuPrefix = slug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "SKU";
    let baseProduct = await prisma.baseProduct.findFirst({
      where: { productTypeId: type.id, skuPrefix },
    });
    if (!baseProduct) {
      baseProduct = await prisma.baseProduct.create({
        data: {
          productTypeId: type.id,
          name: `${type.name} (Standard)`,
          skuPrefix,
          baseCost: "5.00",
          defaultPrice: "19.99",
          availableColors: ["white", "black", "gray"],
          availableSizes: slug === "mug" || slug === "poster" ? ["one-size"] : ["S", "M", "L", "XL"],
        },
      });
    }

    let template = await prisma.mockupTemplate.findFirst({
      where: { baseProductId: baseProduct.id, name: "Front" },
    });
    if (!template) {
      template = await prisma.mockupTemplate.create({
        data: {
          baseProductId: baseProduct.id,
          name: "Front",
          baseImageKey: `mockup-templates/${slug}/front-base.png`,
          lifestyleImageKey: `mockup-templates/${slug}/front-lifestyle.png`,
          closeupImageKey: `mockup-templates/${slug}/front-closeup.png`,
          sortOrder: 0,
        },
      });
    }

    const existingArea = await prisma.printArea.findFirst({
      where: { mockupTemplateId: template.id, name: "Front Print" },
    });
    if (!existingArea) {
      const isFlat = slug === "mug" || slug === "poster";
      await prisma.printArea.create({
        data: {
          mockupTemplateId: template.id,
          name: "Front Print",
          x: 300,
          y: 350,
          width: 600,
          height: 800,
          safeX: 320,
          safeY: 370,
          safeWidth: 560,
          safeHeight: 760,
          allowMove: true,
          allowResize: true,
          allowRotate: !isFlat,
          minScale: 0.2,
          maxScale: 1.5,
        },
      });
    }
  }
}

async function upsertLocalPipelineProduct(input: {
  productTypeSlug: string;
  name: string;
  slug: string;
  skuPrefix: string;
  localProductType: LocalProductType;
  neckline: NecklineType;
  sleeveType: SleeveType;
  productionMethod: LocalProductionMethod;
  baseCost: string;
  defaultPrice: string;
  colors: string[];
  sizes: string[];
  templateName: string;
  templateSlug: string;
  areas: Array<{ name: string; placement: PlacementKind; x: number; y: number; width: number; height: number; widthCm: number; heightCm: number }>;
}) {
  const productType = await prisma.productType.findUnique({ where: { slug: input.productTypeSlug } });
  if (!productType) return null;

  let baseProduct = await prisma.baseProduct.findFirst({ where: { slug: input.slug } });
  if (!baseProduct) {
    baseProduct = await prisma.baseProduct.create({
      data: {
        productTypeId: productType.id,
        name: input.name,
        slug: input.slug,
        skuPrefix: input.skuPrefix,
        localProductType: input.localProductType,
        neckline: input.neckline,
        sleeveType: input.sleeveType,
        localProductionMethod: input.productionMethod,
        baseCost: input.baseCost,
        defaultPrice: input.defaultPrice,
        currency: "UZS",
        imageUrl: `https://picsum.photos/seed/${input.templateSlug}/900/900`,
        baseImageUrls: [`mockup-templates/local/${input.templateSlug}/front-base.png`],
        mockupSceneImages: [
          `mockup-templates/local/${input.templateSlug}/main.png`,
          `mockup-templates/local/${input.templateSlug}/lifestyle.png`,
        ],
        availableColors: input.colors,
        availableSizes: input.sizes,
        description: `${input.name} for RashPOD local production in Uzbekistan.`,
      },
    });
  } else {
    baseProduct = await prisma.baseProduct.update({
      where: { id: baseProduct.id },
      data: {
        productTypeId: productType.id,
        name: input.name,
        skuPrefix: input.skuPrefix,
        localProductType: input.localProductType,
        neckline: input.neckline,
        sleeveType: input.sleeveType,
        localProductionMethod: input.productionMethod,
        baseCost: input.baseCost,
        defaultPrice: input.defaultPrice,
        currency: "UZS",
        availableColors: input.colors,
        availableSizes: input.sizes,
      },
    });
  }

  let template = await prisma.mockupTemplate.findFirst({ where: { baseProductId: baseProduct.id, name: input.templateName } });
  if (!template) {
    template = await prisma.mockupTemplate.create({
      data: {
        baseProductId: baseProduct.id,
        name: input.templateName,
        baseImageKey: `mockup-templates/local/${input.templateSlug}/front-base.png`,
        lifestyleImageKey: `mockup-templates/local/${input.templateSlug}/lifestyle.png`,
        closeupImageKey: `mockup-templates/local/${input.templateSlug}/detail.png`,
        sortOrder: 0,
      },
    });
  }

  for (const area of input.areas) {
    const existing = await prisma.printArea.findFirst({ where: { mockupTemplateId: template.id, name: area.name } });
    const data = {
      mockupTemplateId: template.id,
      name: area.name,
      placement: area.placement,
      widthCm: area.widthCm,
      heightCm: area.heightCm,
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height,
      safeX: area.x + 20,
      safeY: area.y + 20,
      safeWidth: area.width - 40,
      safeHeight: area.height - 40,
      safeZonePx: 20,
      allowMove: true,
      allowResize: true,
      allowRotate: area.placement !== PlacementKind.FULL_WRAP,
      isActive: true,
    };
    if (existing) await prisma.printArea.update({ where: { id: existing.id }, data });
    else await prisma.printArea.create({ data });
  }

  return baseProduct;
}

async function seedPipelineTemplates() {
  const classicTee = await upsertLocalPipelineProduct({
    productTypeSlug: "t-shirt",
    name: "Classic short sleeve crew neck T-shirt",
    slug: "classic-short-sleeve-crew-neck-t-shirt",
    skuPrefix: "LCST",
    localProductType: LocalProductType.T_SHIRT,
    neckline: NecklineType.CREW_NECK,
    sleeveType: SleeveType.SHORT,
    productionMethod: LocalProductionMethod.DTF,
    baseCost: "65000",
    defaultPrice: "159000",
    colors: ["white", "black", "gray"],
    sizes: ["S", "M", "L", "XL"],
    templateName: "Front and back",
    templateSlug: "classic-crew-tee",
    areas: [
      { name: "T-shirt front", placement: PlacementKind.FRONT, x: 300, y: 260, width: 520, height: 620, widthCm: 30, heightCm: 36 },
      { name: "T-shirt back", placement: PlacementKind.BACK, x: 300, y: 250, width: 540, height: 650, widthCm: 32, heightCm: 38 },
    ],
  });

  const longSleeve = await upsertLocalPipelineProduct({
    productTypeSlug: "long-sleeve-crew-neck-t-shirt",
    name: "Long sleeve crew neck T-shirt",
    slug: "long-sleeve-crew-neck-t-shirt",
    skuPrefix: "LCLT",
    localProductType: LocalProductType.LONG_SLEEVE_T_SHIRT,
    neckline: NecklineType.CREW_NECK,
    sleeveType: SleeveType.LONG,
    productionMethod: LocalProductionMethod.DTF,
    baseCost: "85000",
    defaultPrice: "199000",
    colors: ["white", "black", "navy"],
    sizes: ["S", "M", "L", "XL"],
    templateName: "Front and back",
    templateSlug: "long-sleeve-crew-tee",
    areas: [
      { name: "Long sleeve front", placement: PlacementKind.FRONT, x: 300, y: 270, width: 520, height: 620, widthCm: 30, heightCm: 36 },
      { name: "Long sleeve back", placement: PlacementKind.BACK, x: 300, y: 260, width: 540, height: 650, widthCm: 32, heightCm: 38 },
    ],
  });

  const mug = await upsertLocalPipelineProduct({
    productTypeSlug: "mug",
    name: "Ceramic mug",
    slug: "ceramic-mug",
    skuPrefix: "LCMG",
    localProductType: LocalProductType.MUG,
    neckline: NecklineType.NONE,
    sleeveType: SleeveType.NONE,
    productionMethod: LocalProductionMethod.SUBLIMATION,
    baseCost: "28000",
    defaultPrice: "79000",
    colors: ["white"],
    sizes: ["330ml"],
    templateName: "Mug wrap",
    templateSlug: "ceramic-mug",
    areas: [{ name: "Mug center", placement: PlacementKind.FULL_WRAP, x: 220, y: 290, width: 760, height: 330, widthCm: 20, heightCm: 8.5 }],
  });

  const presets = [
    { name: "Center chest", product: classicTee, placement: PlacementKind.FRONT, widthCm: 24, heightCm: 24, alignment: PlacementAlignment.CENTER },
    { name: "Large front", product: classicTee, placement: PlacementKind.FRONT, widthCm: 30, heightCm: 34, alignment: PlacementAlignment.TOP_CENTER },
    { name: "Back center", product: classicTee, placement: PlacementKind.BACK, widthCm: 30, heightCm: 34, alignment: PlacementAlignment.CENTER },
    { name: "Center chest", product: longSleeve, placement: PlacementKind.FRONT, widthCm: 24, heightCm: 24, alignment: PlacementAlignment.CENTER },
    { name: "Mug center", product: mug, placement: PlacementKind.FULL_WRAP, widthCm: 10, heightCm: 7, alignment: PlacementAlignment.CENTER },
  ];

  for (const preset of presets) {
    if (!preset.product) continue;
    const existing = await prisma.placementPreset.findFirst({
      where: { pipeline: PipelineType.LOCAL, localBaseProductId: preset.product.id, name: preset.name, placement: preset.placement },
    });
    const data = {
      name: preset.name,
      pipeline: PipelineType.LOCAL,
      localBaseProductId: preset.product.id,
      placement: preset.placement,
      defaultWidthCm: preset.widthCm,
      defaultHeightCm: preset.heightCm,
      defaultScale: 1,
      alignment: preset.alignment,
      units: PlacementUnits.CM,
      active: true,
    };
    if (existing) await prisma.placementPreset.update({ where: { id: existing.id }, data });
    else await prisma.placementPreset.create({ data });
  }

  const printfulTemplates = [
    {
      rashpodProductType: "classic_crew_neck_tshirt",
      displayName: "Printful classic T-shirt",
      printfulCatalogProductId: "dev-printful-classic-tee",
      printfulProductName: "Printful placeholder classic T-shirt",
      variants: ["dev-tee-black-s", "dev-tee-black-m", "dev-tee-white-m"],
      placement: "front",
      technique: "dtg",
      price: "24.00",
      cost: "12.00",
    },
    {
      rashpodProductType: "long_sleeve_crew_neck_tshirt",
      displayName: "Printful long sleeve crew neck T-shirt",
      printfulCatalogProductId: "dev-printful-long-sleeve-tee",
      printfulProductName: "Printful placeholder long sleeve T-shirt",
      variants: ["dev-ls-black-s", "dev-ls-black-m", "dev-ls-white-m"],
      placement: "front",
      technique: "dtg",
      price: "32.00",
      cost: "17.00",
    },
    {
      rashpodProductType: "hoodie",
      displayName: "Printful hoodie",
      printfulCatalogProductId: "dev-printful-hoodie",
      printfulProductName: "Printful placeholder hoodie",
      variants: ["dev-hoodie-black-m", "dev-hoodie-black-l"],
      placement: "front",
      technique: "dtg",
      price: "48.00",
      cost: "25.00",
    },
    {
      rashpodProductType: "mug",
      displayName: "Printful mug",
      printfulCatalogProductId: "dev-printful-mug",
      printfulProductName: "Printful placeholder mug",
      variants: ["dev-mug-white-11oz"],
      placement: "default",
      technique: "sublimation",
      price: "18.00",
      cost: "8.00",
    },
  ];

  for (const item of printfulTemplates) {
    const template = await prisma.printfulProductTemplate.upsert({
      where: {
        provider_printfulCatalogProductId_displayName: {
          provider: ProviderType.PRINTFUL,
          printfulCatalogProductId: item.printfulCatalogProductId,
          displayName: item.displayName,
        },
      },
      create: {
        rashpodProductType: item.rashpodProductType,
        displayName: item.displayName,
        provider: ProviderType.PRINTFUL,
        printfulCatalogProductId: item.printfulCatalogProductId,
        printfulProductName: item.printfulProductName,
        printfulVariantIds: item.variants,
        allowedColorVariantIds: item.variants,
        allowedSizeVariantIds: item.variants,
        allowedPlacements: [item.placement],
        allowedTechniques: [item.technique],
        defaultTechnique: item.technique,
        defaultPlacement: item.placement,
        defaultRetailPrice: item.price,
        estimatedBaseCost: item.cost,
        active: true,
        metadataJson: { devPlaceholder: true },
      },
      update: {
        rashpodProductType: item.rashpodProductType,
        printfulProductName: item.printfulProductName,
        printfulVariantIds: item.variants,
        allowedPlacements: [item.placement],
        allowedTechniques: [item.technique],
        defaultTechnique: item.technique,
        defaultPlacement: item.placement,
        defaultRetailPrice: item.price,
        estimatedBaseCost: item.cost,
        active: true,
        metadataJson: { devPlaceholder: true },
      },
    });

    const existingPreset = await prisma.placementPreset.findFirst({
      where: { pipeline: PipelineType.GLOBAL_PRINTFUL, productTemplateId: template.id, name: "Center front" },
    });
    const presetData = {
      name: "Center front",
      pipeline: PipelineType.GLOBAL_PRINTFUL,
      productTemplateId: template.id,
      placement: PlacementKind.FRONT,
      defaultWidthIn: item.rashpodProductType === "mug" ? 3.5 : 10,
      defaultHeightIn: item.rashpodProductType === "mug" ? 3 : 12,
      defaultScale: 1,
      alignment: PlacementAlignment.CENTER,
      units: PlacementUnits.INCH,
      active: true,
    };
    if (existingPreset) await prisma.placementPreset.update({ where: { id: existingPreset.id }, data: presetData });
    else await prisma.placementPreset.create({ data: presetData });
  }
}

async function main() {
  await seedUsers();
  const defaultTenant = await seedDefaultTenant();
  await seedProductTypes();
  await seedCurrencies();
  await seedRoyaltyDefault();
  await seedFilmSettings();
  await seedDeliverySettings();
  await seedBaseProductsAndMockups();
  await seedPipelineTemplates();
  await seedSampleListings();
  await backfillDefaultTenantData(defaultTenant.id);
  console.log("Seed completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
