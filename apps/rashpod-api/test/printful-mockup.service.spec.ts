import { BadRequestException } from "@nestjs/common";
import { PrintfulClient } from "../src/modules/printful/printful.client";
import { PrintfulMockupService } from "../src/modules/printful/printful-mockup.service";

describe("PrintfulMockupService", () => {
  const service = new PrintfulMockupService({} as PrintfulClient);
  const template: any = {
    printfulCatalogProductId: "71",
    printfulVariantIds: ["401", "402"],
    allowedPlacements: ["front"],
    allowedTechniques: ["dtg"],
    defaultPlacement: "front",
    defaultTechnique: "dtg",
    metadataJson: null,
  };

  it("builds exact Printful payload from template, file, placement, technique, and inch position", () => {
    const payload = service.buildMockupPayload({
      template,
      fileUrl: "https://files.printful.test/design.png",
      position: { width: 1.97, height: 1.97, left: 0.98, top: 2.95, scale: 1 },
      printArea: { width: 12, height: 16, left: 0, top: 0 },
    });

    expect(payload).toEqual({
      catalog_product_id: "71",
      variant_ids: [401, 402],
      format: "jpg",
      files: [
        {
          placement: "front",
          image_url: "https://files.printful.test/design.png",
          position: { area_width: 1200, area_height: 1600, width: 197, height: 197, left: 98, top: 295 },
        },
      ],
    });
  });

  it("rejects invalid placements instead of relying on product labels", () => {
    expect(() =>
      service.buildMockupPayload({
        template,
        fileUrl: "https://files.printful.test/design.png",
        placement: "sleeve",
        position: { width: 1, height: 1, left: 0, top: 0 },
        printArea: { width: 12, height: 16, left: 0, top: 0 },
      }),
    ).toThrow(BadRequestException);
  });
});
