import { PrismaClient, UserRole } from "@prisma/client";
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
    { email: "moderator@rashpod.local", displayName: "Moderator", role: UserRole.MODERATOR, password: "ChangeMe123!" },
    { email: "designer@rashpod.local", displayName: "Designer", role: UserRole.DESIGNER, password: "ChangeMe123!" },
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

async function main() {
  await seedUsers();
  await seedProductTypes();
  await seedRoyaltyDefault();
  await seedFilmSettings();
  await seedDeliverySettings();
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
