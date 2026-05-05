import { DesignStatus, ModerationDecision, UserRole } from "@prisma/client";

type User = {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
};

type Design = {
  id: string;
  designerId: string;
  title: string;
  description?: string | null;
  status: DesignStatus;
  createdAt: Date;
  updatedAt: Date;
};

type FileAsset = {
  id: string;
  ownerId: string;
  bucket: string;
  objectKey: string;
  mimeType: string;
  sizeBytes: number;
  isPublic: boolean;
  uploadStatus: string;
  checksum?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type DesignVersion = {
  id: string;
  designAssetId: string;
  fileKey: string;
  widthPx?: number | null;
  heightPx?: number | null;
  dpi?: number | null;
  hasTransparency?: boolean | null;
  createdAt: Date;
};

type ModerationCase = {
  id: string;
  designAssetId: string;
  designVersionId?: string | null;
  reviewerId?: string | null;
  decision: ModerationDecision;
  reason?: string | null;
  createdAt: Date;
};
type ProductType = { id: string; name: string; slug: string; category: string; productionMethod: string; createdAt: Date; updatedAt: Date };
type BaseProduct = { id: string; productTypeId: string; name: string; skuPrefix: string; isActive: boolean; createdAt: Date; updatedAt: Date };
type MockupTemplate = { id: string; baseProductId: string; name: string; baseImageKey: string; createdAt: Date; updatedAt: Date };
type PrintArea = { id: string; mockupTemplateId: string; name: string; x: number; y: number; width: number; height: number; safeX: number; safeY: number; safeWidth: number; safeHeight: number; createdAt: Date; updatedAt: Date };
type MockupPlacement = { id: string; designAssetId: string; designVersionId: string; mockupTemplateId: string; printAreaId: string; x: number; y: number; width: number; height: number; scale: number; rotation: number; approvedByDesigner: boolean; approvedAt?: Date | null; createdAt: Date; updatedAt: Date };
type GeneratedAsset = { id: string; sourcePlacementId: string; type: string; status: string; createdAt: Date; updatedAt: Date };
type WorkerJob = { id: string; type: string; status: string; payloadJson: Record<string, unknown>; attempts: number; maxAttempts: number; errorMessage?: string | null; nextRunAt: Date; lastErrorAt?: Date | null; claimedAt?: Date | null; completedAt?: Date | null; createdAt: Date; updatedAt: Date };
type DeliverySetting = { id: string; providerType: string; displayName: string; isActive: boolean; zone: string; price?: number | null; freeDeliveryThreshold?: number | null; etaText?: string | null; updatedAt: Date };
type Order = { id: string; customerId: string; status: string; subtotal: number; deliveryFee: number; total: number; currency: string; deliveryType?: string | null; deliveryZone?: string | null; notes?: string | null; createdAt: Date; updatedAt: Date };
type CommerceListing = {
  id: string;
  type: string;
  status: string;
  designerId: string;
  designAssetId: string;
  title: string;
  description?: string | null;
  slug: string;
  price: number;
  currency: string;
  imagesJson?: unknown;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
type ProductionJob = {
  id: string;
  orderId: string;
  orderItemId?: string | null;
  status: string;
  queueType: string;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}_${++idCounter}`;

export function createFakePrisma() {
  const users: User[] = [];
  const designs: Design[] = [];
  const rights: Array<{ id: string; designAssetId: string; allowFilmSales: boolean; allowProductSales: boolean; allowMarketplacePublishing: boolean; allowCorporateBidding: boolean; filmConsentGrantedAt?: Date | null; filmConsentRevokedAt?: Date | null; filmConsentVersionId?: string | null; filmRoyaltyRate?: number | null; updatedAt: Date; }> = [];
  const files: FileAsset[] = [];
  const versions: DesignVersion[] = [];
  const moderationCases: ModerationCase[] = [];
  const productTypes: ProductType[] = [];
  const baseProducts: BaseProduct[] = [];
  const mockupTemplates: MockupTemplate[] = [];
  const printAreas: PrintArea[] = [];
  const mockupPlacements: MockupPlacement[] = [];
  const generatedAssets: GeneratedAsset[] = [];
  const workerJobs: WorkerJob[] = [];
  const deliverySettings: DeliverySetting[] = [];
  const orders: Order[] = [];
  const commerceListings: CommerceListing[] = [];
  const productionJobs: ProductionJob[] = [];
  const audits: any[] = [];

  return {
    user: {
      create: async ({ data }: any) => {
        const record: User = { id: nextId("usr"), createdAt: new Date(), ...data };
        users.push(record);
        return record;
      },
      findUnique: async ({ where }: any) => users.find((u) => u.id === where.id || u.email === where.email) ?? null,
      upsert: async ({ where, create, update }: any) => {
        const existing = users.find((u) => u.email === where.email);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const record: User = { id: nextId("usr"), createdAt: new Date(), ...create };
        users.push(record);
        return record;
      },
      update: async ({ where, data }: any) => {
        const row = users.find((u) => u.id === where.id)!;
        Object.assign(row, data);
        return row;
      },
    },
    designAsset: {
      create: async ({ data }: any) => {
        const now = new Date();
        const record: Design = { id: nextId("dsg"), createdAt: now, updatedAt: now, status: DesignStatus.DRAFT, ...data };
        designs.push(record);
        return record;
      },
      findMany: async ({ where }: any) => designs.filter((d) => !where?.designerId || d.designerId === where.designerId),
      findUnique: async ({ where }: any) => designs.find((d) => d.id === where.id) ?? null,
      update: async ({ where, data }: any) => {
        const row = designs.find((d) => d.id === where.id)!;
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
    },
    commercialRights: {
      create: async ({ data }: any) => {
        const row = { id: nextId("rgt"), updatedAt: new Date(), allowMarketplacePublishing: false, allowCorporateBidding: false, ...data };
        rights.push(row);
        return row;
      },
      findUnique: async ({ where }: any) => rights.find((r) => r.designAssetId === where.designAssetId) ?? null,
      update: async ({ where, data }: any) => {
        const row = rights.find((r) => r.designAssetId === where.designAssetId)!;
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
    },
    fileAsset: {
      create: async ({ data }: any) => {
        const now = new Date();
        const row: FileAsset = { id: nextId("fil"), createdAt: now, updatedAt: now, isPublic: false, ...data };
        files.push(row);
        return row;
      },
      findUnique: async ({ where }: any) => files.find((f) => f.id === where.id) ?? null,
      update: async ({ where, data }: any) => {
        const row = files.find((f) => f.id === where.id)!;
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
    },
    designVersion: {
      create: async ({ data }: any) => {
        const row: DesignVersion = { id: nextId("ver"), createdAt: new Date(), ...data };
        versions.push(row);
        return row;
      },
      findFirst: async ({ where }: any) =>
        versions
          .filter((v) => (!where?.designAssetId ? true : v.designAssetId === where.designAssetId))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null,
    },
    designModerationCase: {
      create: async ({ data }: any) => {
        const row: ModerationCase = { id: nextId("mod"), createdAt: new Date(), ...data };
        moderationCases.push(row);
        return row;
      },
      findMany: async ({ where }: any) =>
        moderationCases
          .filter((m) => (!where?.designAssetId ? true : m.designAssetId === where.designAssetId))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    },
    productType: {
      create: async ({ data }: any) => {
        const now = new Date();
        const row: ProductType = { id: nextId("pty"), createdAt: now, updatedAt: now, ...data };
        productTypes.push(row);
        return row;
      },
    },
    baseProduct: {
      create: async ({ data }: any) => {
        const now = new Date();
        const row: BaseProduct = { id: nextId("bpd"), createdAt: now, updatedAt: now, isActive: true, ...data };
        baseProducts.push(row);
        return row;
      },
    },
    mockupTemplate: {
      create: async ({ data }: any) => {
        const now = new Date();
        const row: MockupTemplate = { id: nextId("mtp"), createdAt: now, updatedAt: now, ...data };
        mockupTemplates.push(row);
        return row;
      },
    },
    printArea: {
      create: async ({ data }: any) => {
        const now = new Date();
        const row: PrintArea = { id: nextId("par"), createdAt: now, updatedAt: now, ...data };
        printAreas.push(row);
        return row;
      },
    },
    mockupPlacement: {
      create: async ({ data }: any) => {
        const now = new Date();
        const row: MockupPlacement = {
          id: nextId("plc"),
          createdAt: now,
          updatedAt: now,
          approvedByDesigner: false,
          ...data,
        };
        mockupPlacements.push(row);
        return row;
      },
      findUnique: async ({ where }: any) => mockupPlacements.find((p) => p.id === where.id) ?? null,
      update: async ({ where, data }: any) => {
        const row = mockupPlacements.find((p) => p.id === where.id)!;
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
    },
    generatedAsset: {
      create: async ({ data }: any) => {
        const now = new Date();
        const row: GeneratedAsset = { id: nextId("gas"), createdAt: now, updatedAt: now, ...data };
        generatedAssets.push(row);
        return row;
      },
    },
    workerJob: {
      create: async ({ data }: any) => {
        const now = new Date();
        const row: WorkerJob = {
          id: nextId("wrj"),
          status: "PENDING",
          attempts: 0,
          maxAttempts: 3,
          nextRunAt: now,
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        workerJobs.push(row);
        return row;
      },
      findFirst: async ({ where }: any) => {
        const list = workerJobs.filter((j) => (!where?.status ? true : j.status === where.status));
        return list[0] ?? null;
      },
      updateMany: async ({ where, data }: any) => {
        const row = workerJobs.find((j) => j.id === where.id && j.status === where.status);
        if (!row) return { count: 0 };
        Object.assign(row, data, { updatedAt: new Date(), attempts: row.attempts + (data?.attempts?.increment ?? 0) });
        return { count: 1 };
      },
      findUnique: async ({ where }: any) => workerJobs.find((j) => j.id === where.id) ?? null,
      findMany: async ({ where, orderBy, take }: any = {}) => {
        let rows = [...workerJobs];
        if (where?.status) rows = rows.filter((j) => j.status === where.status);
        if (where?.type) rows = rows.filter((j) => j.type === where.type);
        if (orderBy?.createdAt === "desc") {
          rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        return typeof take === "number" ? rows.slice(0, take) : rows;
      },
      update: async ({ where, data }: any) => {
        const row = workerJobs.find((j) => j.id === where.id)!;
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
    },
    deliverySetting: {
      findMany: async ({ where, orderBy }: any = {}) => {
        let rows = [...deliverySettings];
        if (where) {
          rows = rows.filter((d) => {
            if (where.isActive != null && d.isActive !== where.isActive) return false;
            if (where.providerType != null && d.providerType !== where.providerType) return false;
            if (where.zone != null && d.zone !== where.zone) return false;
            return true;
          });
        }
        if (orderBy?.updatedAt === "desc") {
          rows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        }
        return rows;
      },
      create: async ({ data }: any) => {
        const row: DeliverySetting = {
          id: nextId("dls"),
          providerType: data.providerType,
          displayName: data.displayName,
          isActive: data.isActive ?? true,
          zone: data.zone,
          price: data.price == null ? null : Number(data.price),
          freeDeliveryThreshold: data.freeDeliveryThreshold == null ? null : Number(data.freeDeliveryThreshold),
          etaText: data.etaText ?? null,
          updatedAt: new Date(),
        };
        deliverySettings.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const row = deliverySettings.find((d) => d.id === where.id)!;
        if (data.providerType !== undefined) row.providerType = data.providerType;
        if (data.displayName !== undefined) row.displayName = data.displayName;
        if (data.isActive !== undefined) row.isActive = data.isActive;
        if (data.zone !== undefined) row.zone = data.zone;
        if (data.price !== undefined) row.price = data.price == null ? null : Number(data.price);
        if (data.freeDeliveryThreshold !== undefined) {
          row.freeDeliveryThreshold = data.freeDeliveryThreshold == null ? null : Number(data.freeDeliveryThreshold);
        }
        if (data.etaText !== undefined) row.etaText = data.etaText;
        row.updatedAt = new Date();
        return row;
      },
    },
    order: {
      create: async ({ data }: any) => {
        const now = new Date();
        const row: Order = {
          id: nextId("ord"),
          customerId: data.customerId,
          status: data.status ?? "PENDING_PAYMENT",
          subtotal: Number(data.subtotal ?? 0),
          deliveryFee: Number(data.deliveryFee ?? 0),
          total: Number(data.total ?? 0),
          currency: data.currency ?? "UZS",
          deliveryType: data.deliveryType ?? null,
          deliveryZone: data.deliveryZone ?? null,
          notes: data.notes ?? null,
          createdAt: now,
          updatedAt: now,
        };
        orders.push(row);
        return row;
      },
      findUnique: async ({ where }: any) => orders.find((o) => o.id === where.id) ?? null,
      update: async ({ where, data }: any) => {
        const row = orders.find((o) => o.id === where.id)!;
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
    },
    commerceListing: {
      create: async ({ data }: any) => {
        const now = new Date();
        const row: CommerceListing = {
          id: nextId("lst"),
          type: data.type,
          status: data.status ?? "DRAFT",
          designerId: data.designerId,
          designAssetId: data.designAssetId,
          title: data.title,
          description: data.description ?? null,
          slug: data.slug,
          price: Number(data.price ?? 0),
          currency: data.currency ?? "UZS",
          imagesJson: data.imagesJson ?? null,
          publishedAt: data.publishedAt ?? null,
          createdAt: now,
          updatedAt: now,
        };
        commerceListings.push(row);
        return row;
      },
      findUnique: async ({ where }: any) =>
        commerceListings.find((l) => l.id === where.id || l.slug === where.slug) ?? null,
      findMany: async ({ where, orderBy, take }: any = {}) => {
        let rows = [...commerceListings];
        if (where?.status) rows = rows.filter((l) => l.status === where.status);
        if (where?.designerId) rows = rows.filter((l) => l.designerId === where.designerId);
        if (where?.type) rows = rows.filter((l) => l.type === where.type);
        if (where?.title?.contains) {
          const q = String(where.title.contains).toLowerCase();
          rows = rows.filter((l) => l.title.toLowerCase().includes(q));
        }
        if (orderBy?.publishedAt === "desc") {
          rows.sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
        } else if (orderBy?.createdAt === "desc") {
          rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        return typeof take === "number" ? rows.slice(0, take) : rows;
      },
      update: async ({ where, data }: any) => {
        const row = commerceListings.find((l) => l.id === where.id)!;
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
    },
    productionJob: {
      create: async ({ data }: any) => {
        const now = new Date();
        const row: ProductionJob = {
          id: nextId("prj"),
          orderId: data.orderId,
          orderItemId: data.orderItemId ?? null,
          status: data.status ?? "ORDERED",
          queueType: data.queueType ?? "POD",
          notes: data.notes ?? null,
          createdAt: now,
          updatedAt: now,
        };
        productionJobs.push(row);
        return row;
      },
      findUnique: async ({ where }: any) => productionJobs.find((p) => p.id === where.id) ?? null,
      findMany: async ({ where, orderBy, take }: any = {}) => {
        let rows = [...productionJobs];
        if (where?.queueType) rows = rows.filter((p) => p.queueType === where.queueType);
        if (where?.orderId) rows = rows.filter((p) => p.orderId === where.orderId);
        if (where?.status) rows = rows.filter((p) => p.status === where.status);
        if (orderBy?.createdAt === "asc") rows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        if (orderBy?.createdAt === "desc") rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return typeof take === "number" ? rows.slice(0, take) : rows;
      },
      update: async ({ where, data }: any) => {
        const row = productionJobs.find((p) => p.id === where.id)!;
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
      updateMany: async ({ where, data }: any) => {
        const rows = productionJobs.filter((p) => {
          if (where?.orderId && p.orderId !== where.orderId) return false;
          if (where?.status && p.status !== where.status) return false;
          return true;
        });
        for (const row of rows) {
          Object.assign(row, data, { updatedAt: new Date() });
        }
        return { count: rows.length };
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        const row = { id: nextId("adt"), createdAt: new Date(), ...data };
        audits.push(row);
        return row;
      },
      findMany: async ({ orderBy, take }: any = {}) => {
        const rows = [...audits];
        if (orderBy?.createdAt === "desc") {
          rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        return typeof take === "number" ? rows.slice(0, take) : rows;
      },
      findUnique: async ({ where }: any) => audits.find((a) => a.id === where.id) ?? null,
    },
    __state: { users, designs, files, versions, moderationCases, audits, productTypes, baseProducts, mockupTemplates, printAreas, mockupPlacements, generatedAssets, workerJobs, deliverySettings, orders, commerceListings, productionJobs },
  };
}
