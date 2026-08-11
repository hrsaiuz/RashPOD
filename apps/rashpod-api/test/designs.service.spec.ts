import { AssetPurpose, DesignStatus, PlacementKind } from "@prisma/client";
import { DesignsService } from "../src/modules/designs/designs.service";

function createService(prisma: Record<string, unknown>, audit = { log: jest.fn().mockResolvedValue(undefined) }) {
  const storage = {
    buildPublicUrl: jest.fn((objectKey: string) => `https://cdn.example/${objectKey}`),
    createSignedReadUrl: jest.fn().mockResolvedValue("https://signed.example/design.png"),
  };
  return {
    service: new DesignsService(prisma as never, audit as never, storage as never),
    audit,
    storage,
  };
}

describe("DesignsService", () => {
  it("scopes the designer table to visible workspaces and includes the requested product", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const { service } = createService({ designAsset: { findMany } });

    await service.listOwn("designer-1", "tenant-1");

    expect(findMany).toHaveBeenCalledWith({
      where: { designerId: "designer-1", OR: [{ tenantId: "tenant-1" }, { tenantId: null }] },
      include: {
        commercialRights: true,
        requestedBaseProduct: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            productType: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("stores a designer-visible base product with the new design", async () => {
    const findBaseProduct = jest.fn().mockResolvedValue({ id: "base-product-1", productTypeId: "product-type-1" });
    const createDesign = jest.fn().mockResolvedValue({ id: "design-1" });
    const createRights = jest.fn().mockResolvedValue({ id: "rights-1" });
    const { service, audit } = createService({
      baseProduct: { findFirst: findBaseProduct },
      printArea: {
        findMany: jest.fn().mockResolvedValue([
          { placement: PlacementKind.FRONT, mockupView: { placementCode: "FRONT", isActive: true } },
        ]),
      },
      designAsset: { create: createDesign },
      commercialRights: { create: createRights },
    });

    await service.create("designer-1", {
      title: "Tenant artwork",
      requestedBaseProductId: "base-product-1",
    }, "tenant-1");

    expect(findBaseProduct).toHaveBeenCalledWith({
      where: {
        id: "base-product-1",
        isActive: true,
        OR: [{ tenantId: "tenant-1" }, { tenantId: null }],
        productType: {
          isActive: true,
          availableForDesigners: true,
          OR: [{ tenantId: "tenant-1" }, { tenantId: null }],
        },
      },
      select: { id: true, productTypeId: true },
    });
    expect(createDesign).toHaveBeenCalledWith({
      data: {
        designerId: "designer-1",
        tenantId: "tenant-1",
        requestedBaseProductId: "base-product-1",
        title: "Tenant artwork",
        description: undefined,
      },
    });
    expect(createRights).toHaveBeenCalledWith({
      data: { designAssetId: "design-1", allowProductSales: false, allowFilmSales: false },
    });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: "tenant-1",
      metadata: {
        requestedBaseProductId: "base-product-1",
        requestedProductTypeId: "product-type-1",
      },
    }));
  });

  it("rejects an inactive, hidden, or cross-workspace base product", async () => {
    const createDesign = jest.fn();
    const { service } = createService({
      baseProduct: { findFirst: jest.fn().mockResolvedValue(null) },
      designAsset: { create: createDesign },
    });

    await expect(service.create("designer-1", {
      title: "Invalid product",
      requestedBaseProductId: "base-product-1",
    }, "tenant-1")).rejects.toThrow("Choose an active base product that is available to designers");
    expect(createDesign).not.toHaveBeenCalled();
  });

  it("rejects a base product that has no active designer placement", async () => {
    const createDesign = jest.fn();
    const { service } = createService({
      baseProduct: {
        findFirst: jest.fn().mockResolvedValue({ id: "base-product-1", productTypeId: "product-type-1" }),
      },
      printArea: { findMany: jest.fn().mockResolvedValue([]) },
      designAsset: { create: createDesign },
    });

    await expect(service.create("designer-1", {
      title: "Missing setup",
      requestedBaseProductId: "base-product-1",
    }, "tenant-1")).rejects.toThrow("This base product has no active designer placement configuration");
    expect(createDesign).not.toHaveBeenCalled();
  });

  it("returns deduplicated configured placements and the canonical product image", async () => {
    const productTypeFindMany = jest.fn().mockResolvedValue([
      {
        id: "product-type-1",
        name: "T-shirts",
        slug: "t-shirts",
        category: "APPAREL",
        baseProducts: [
          {
            id: "base-product-1",
            name: "Classic tee",
            description: "Cotton",
            imageUrl: null,
            mockupTemplates: [
              {
                id: "template-1",
                baseImageKey: "mockups/base.png",
                views: [
                  {
                    id: "view-front",
                    name: "Front",
                    placementCode: "FRONT",
                    blankImageKey: "mockups/front.png",
                    isPrimary: true,
                    isActive: true,
                  },
                ],
                printAreas: [
                  {
                    id: "area-front",
                    name: "Front print",
                    placement: PlacementKind.FRONT,
                    mockupViewId: "view-front",
                    mockupView: {
                      id: "view-front",
                      name: "Front",
                      placementCode: "FRONT",
                      blankImageKey: "mockups/front.png",
                      isActive: true,
                    },
                  },
                  {
                    id: "area-front-duplicate",
                    name: "Front duplicate",
                    placement: PlacementKind.FRONT,
                    mockupViewId: "view-front",
                    mockupView: {
                      id: "view-front",
                      name: "Front",
                      placementCode: "FRONT",
                      blankImageKey: "mockups/front.png",
                      isActive: true,
                    },
                  },
                  {
                    id: "area-sleeve",
                    name: "Sleeve print",
                    placement: null,
                    mockupViewId: "view-sleeve",
                    mockupView: {
                      id: "view-sleeve",
                      name: "Left sleeve",
                      placementCode: "left-sleeve",
                      blankImageKey: "mockups/sleeve.png",
                      isActive: true,
                    },
                  },
                  {
                    id: "area-inactive",
                    name: "Inactive back",
                    placement: PlacementKind.BACK,
                    mockupViewId: "view-back",
                    mockupView: {
                      id: "view-back",
                      name: "Back",
                      placementCode: "BACK",
                      blankImageKey: "mockups/back.png",
                      isActive: false,
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "product-type-incomplete",
        name: "Unconfigured products",
        slug: "unconfigured-products",
        category: "OTHER",
        baseProducts: [
          {
            id: "base-product-incomplete",
            name: "Missing placements",
            description: null,
            imageUrl: null,
            mockupTemplates: [],
          },
        ],
      },
    ]);
    const mediaFindMany = jest.fn().mockResolvedValue([
      { key: "front-image", objectKey: "mockups/front.png", publicUrl: null },
    ]);
    const { service, storage } = createService({
      productType: { findMany: productTypeFindMany },
      mediaAsset: { findMany: mediaFindMany },
    });

    const result = await service.uploadOptions("tenant-1");

    expect(result).toEqual([
      {
        id: "product-type-1",
        name: "T-shirts",
        slug: "t-shirts",
        category: "APPAREL",
        baseProducts: [
          {
            id: "base-product-1",
            name: "Classic tee",
            description: "Cotton",
            imageUrl: "https://cdn.example/mockups/front.png",
            placements: [
              {
                code: PlacementKind.FRONT,
                name: "Front",
                mockupTemplateId: "template-1",
                mockupViewId: "view-front",
                printAreaId: "area-front",
              },
              {
                code: PlacementKind.LEFT_SLEEVE,
                name: "Left sleeve",
                mockupTemplateId: "template-1",
                mockupViewId: "view-sleeve",
                printAreaId: "area-sleeve",
              },
            ],
          },
        ],
      },
    ]);
    expect(storage.buildPublicUrl).toHaveBeenCalledWith("mockups/front.png");
  });

  it("does not expose an owned design from another workspace", async () => {
    const { service } = createService({
      designAsset: {
        findUnique: jest.fn().mockResolvedValue({
          id: "design-1",
          designerId: "designer-1",
          tenantId: "tenant-2",
          versions: [],
          moderationAudits: [],
          productSelections: [],
          listings: [],
        }),
      },
    });

    await expect(service.getOwn("designer-1", "design-1", "tenant-1"))
      .rejects.toThrow("Design belongs to another workspace");
  });

  it("requires every ready file to be bound to the target design", async () => {
    const createVersion = jest.fn();
    const { service } = createService({
      designAsset: {
        findUnique: jest.fn().mockResolvedValue({
          id: "design-1",
          designerId: "designer-1",
          tenantId: "tenant-1",
          status: DesignStatus.DRAFT,
          requestedBaseProductId: "base-product-1",
        }),
      },
      fileAsset: {
        findUnique: jest.fn().mockResolvedValue({
          id: "file-1",
          ownerId: "designer-1",
          tenantId: "tenant-1",
          designId: "design-2",
          uploadStatus: "READY",
          purpose: AssetPurpose.DESIGN_ORIGINAL,
        }),
      },
      designVersion: { create: createVersion },
    });

    await expect(service.createVersion("designer-1", "design-1", {
      fileId: "file-1",
      placement: PlacementKind.FRONT,
    }, "tenant-1")).rejects.toThrow("File is not attached to this design");
    expect(createVersion).not.toHaveBeenCalled();
  });

  it("creates a version only for an active placement configured on the selected base product", async () => {
    const created = { id: "version-1", designAssetId: "design-1", placement: PlacementKind.FRONT };
    const createVersion = jest.fn().mockResolvedValue(created);
    const printAreaFindMany = jest.fn().mockResolvedValue([
      { placement: PlacementKind.FRONT, mockupView: { placementCode: "FRONT", isActive: true } },
    ]);
    const { service, audit } = createService({
      designAsset: {
        findUnique: jest.fn().mockResolvedValue({
          id: "design-1",
          designerId: "designer-1",
          tenantId: "tenant-1",
          status: DesignStatus.DRAFT,
          requestedBaseProductId: "base-product-1",
        }),
      },
      fileAsset: {
        findUnique: jest.fn().mockResolvedValue({
          id: "file-1",
          ownerId: "designer-1",
          tenantId: "tenant-1",
          designId: "design-1",
          uploadStatus: "READY",
          purpose: AssetPurpose.DESIGN_ORIGINAL,
          objectKey: "designs/design-1/front.png",
        }),
      },
      printArea: { findMany: printAreaFindMany },
      designVersion: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: createVersion,
      },
    });

    await expect(service.createVersion("designer-1", "design-1", {
      fileId: "file-1",
      placement: PlacementKind.BACK,
    }, "tenant-1")).rejects.toThrow("This placement is not configured for the selected base product");

    await expect(service.createVersion("designer-1", "design-1", {
      fileId: "file-1",
      placement: PlacementKind.FRONT,
      widthPx: 2400,
      heightPx: 3000,
      dpi: 300,
    }, "tenant-1")).resolves.toEqual(created);

    expect(createVersion).toHaveBeenCalledWith({
      data: {
        designAssetId: "design-1",
        fileKey: "designs/design-1/front.png",
        widthPx: 2400,
        heightPx: 3000,
        dpi: 300,
        hasTransparency: true,
        placement: PlacementKind.FRONT,
      },
    });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "tenant-1" }));
  });

  it("requires at least one uploaded version for a currently configured placement before submission", async () => {
    const update = jest.fn().mockResolvedValue({ id: "design-1", status: DesignStatus.PENDING_MODERATION });
    const designAsset = {
      findUnique: jest.fn().mockResolvedValue({
        id: "design-1",
        designerId: "designer-1",
        tenantId: "tenant-1",
        status: DesignStatus.DRAFT,
        requestedBaseProductId: "base-product-1",
        versions: [{ placement: PlacementKind.BACK }],
      }),
      update,
    };
    const printAreaFindMany = jest.fn().mockResolvedValue([
      { placement: PlacementKind.FRONT, mockupView: { placementCode: "FRONT", isActive: true } },
    ]);
    const { service, audit } = createService({
      designAsset,
      printArea: { findMany: printAreaFindMany },
    });

    await expect(service.submit("designer-1", "design-1", "tenant-1"))
      .rejects.toThrow("Upload artwork for at least one configured placement before submitting for moderation");
    expect(update).not.toHaveBeenCalled();

    designAsset.findUnique.mockResolvedValueOnce({
      id: "design-1",
      designerId: "designer-1",
      tenantId: "tenant-1",
      status: DesignStatus.DRAFT,
      requestedBaseProductId: "base-product-1",
      versions: [{ placement: PlacementKind.FRONT }],
    });

    await expect(service.submit("designer-1", "design-1", "tenant-1"))
      .resolves.toEqual({ id: "design-1", status: DesignStatus.PENDING_MODERATION });
    expect(update).toHaveBeenCalledWith({
      where: { id: "design-1" },
      data: { status: DesignStatus.PENDING_MODERATION, moderationStatus: "PENDING" },
    });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "tenant-1" }));
  });
});
