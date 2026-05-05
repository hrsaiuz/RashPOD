import { MockupService } from "../src/modules/mockup/mockup.service";
import { AuditService } from "../src/modules/audit/audit.service";
import { JobDispatcherService } from "../src/modules/worker-jobs/job-dispatcher.service";
import { createFakePrisma } from "./helpers/fake-prisma";

describe("Mockup listing pack", () => {
  it("creates generated assets and enqueues preview/listing/film/production jobs", async () => {
    const prisma = createFakePrisma();
    const audit = new AuditService(prisma as any);
    const jobs = new JobDispatcherService(prisma as any, audit);
    const service = new MockupService(prisma as any, audit, jobs);

    const user = await prisma.user.create({
      data: { email: "mock@test.local", passwordHash: "x", displayName: "Mock", role: "DESIGNER" },
    });
    const design = await prisma.designAsset.create({
      data: { designerId: user.id, title: "Mock", description: "x" },
    });
    const version = await prisma.designVersion.create({
      data: { designAssetId: design.id, fileKey: "designs/a.png" },
    });
    const productType = await prisma.productType.create({
      data: { name: "T-shirt", slug: "tee-x", category: "Clothes", productionMethod: "DTF" },
    });
    const baseProduct = await prisma.baseProduct.create({
      data: { productTypeId: productType.id, name: "Base Tee", skuPrefix: "TEE" },
    });
    const template = await prisma.mockupTemplate.create({
      data: { baseProductId: baseProduct.id, name: "Front", baseImageKey: "mockups/front.png" },
    });
    const area = await prisma.printArea.create({
      data: {
        mockupTemplateId: template.id,
        name: "Front Area",
        x: 10, y: 10, width: 100, height: 100,
        safeX: 12, safeY: 12, safeWidth: 96, safeHeight: 96,
      },
    });
    const placement = await service.createPlacement(user.id, {
      designAssetId: design.id,
      designVersionId: version.id,
      mockupTemplateId: template.id,
      printAreaId: area.id,
      x: 15,
      y: 16,
      width: 80,
      height: 80,
      scale: 1,
      rotation: 0,
    });

    const assets = await service.generateListingImages(user.id, placement.id);
    const preview = await service.generatePreview(user.id, placement.id);
    const filmPreview = await service.generateFilmPreview(user.id, placement.id);
    const productionFile = await service.generateProductionFile(user.id, placement.id);

    expect(assets).toHaveLength(3);
    expect(assets.map((a) => a.type)).toEqual(["LISTING_MAIN", "LISTING_LIFESTYLE", "LISTING_CLOSEUP"]);
    expect(preview.type).toBe("PREVIEW");
    expect(filmPreview.type).toBe("FILM_PREVIEW");
    expect(productionFile.type).toBe("PRODUCTION_FILE");
    expect(prisma.__state.workerJobs.map((j) => j.type)).toEqual(
      expect.arrayContaining([
        "GENERATE_LISTING_IMAGE_PACK",
        "GENERATE_PRODUCT_MOCKUPS",
        "GENERATE_FILM_PREVIEW",
        "GENERATE_PRODUCTION_FILE",
      ]),
    );
  });
});
