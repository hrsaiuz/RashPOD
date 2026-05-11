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
  return prisma.user.upsert({
    where: { email: input.email },
    create: {
      email: input.email,
      displayName: input.displayName,
      role: input.role,
      passwordHash: hash,
    },
    update: {
      displayName: input.displayName,
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
    { title: "Tashkent Skyline Tee", slug: "tashkent-skyline-tee", price: 159000 },
    { title: "Chorsu Bazaar Hoodie", slug: "chorsu-bazaar-hoodie", price: 329000 },
    { title: "Samarkand Poster", slug: "samarkand-poster", price: 89000 },
    { title: "Uzbek Folk Mug", slug: "uzbek-folk-mug", price: 79000 },
    { title: "Registan Print Tee", slug: "registan-print-tee", price: 159000 },
    { title: "Navruz Celebration Poster", slug: "navruz-poster", price: 99000 },
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
        publishedAt: new Date(),
      },
    });
  }
}


async function main() {
  await seedUsers();
  await seedProductTypes();
  await seedRoyaltyDefault();
  await seedFilmSettings();
  await seedDeliverySettings();
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
