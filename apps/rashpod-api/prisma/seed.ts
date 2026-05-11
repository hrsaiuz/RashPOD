import { PrismaClient, UserRole, DesignStatus, ListingStatus, ListingType } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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

async function seedProductTypes() {
  const items = [
    { name: "T-shirt", slug: "t-shirt", category: "Clothes", productionMethod: "DTF", supportsFilmSale: false },
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

async function main() {
  await seedUsers();
  await seedProductTypes();
  await seedRoyaltyDefault();
  await seedFilmSettings();
  await seedDeliverySettings();
  await seedBaseProductsAndMockups();
  await seedSampleListings();
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
