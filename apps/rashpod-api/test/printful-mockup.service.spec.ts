import { BadRequestException } from "@nestjs/common";
import { PrintfulClient } from "../src/modules/printful/printful.client";
import { PrintfulMockupService } from "../src/modules/printful/printful-mockup.service";

describe("PrintfulMockupService", () => {
  const service = new PrintfulMockupService({} as PrintfulClient);
  const template: any = {
    printfulCatalogProductId: "catalog_123",
    printfulVariantIds: ["variant_black_m", "variant_white_l"],
    allowedPlacements: ["front"],
    allowedTechniques: ["dtg"],
    defaultPlacement: "front",
    defaultTechnique: "dtg",
    metadataJson: null,
  };

  it("builds exact Printful payload from template, file, placement, technique, and inch position", () => {
    const payload = service.buildMockupPayload({
      template,
      fileId: "file_123",
      position: { width: 1.97, height: 1.97, left: 0.98, top: 2.95, scale: 1 },
    });

    expect(payload).toEqual({
      catalog_product_id: "catalog_123",
      variant_ids: ["variant_black_m", "variant_white_l"],
      files: [
        {
          placement: "front",
          technique: "dtg",
          file_id: "file_123",
          image_url: undefined,
          position: { width: 1.97, height: 1.97, left: 0.98, top: 2.95, scale: 1 },
        },
      ],
    });
  });

  it("rejects invalid placements instead of relying on product labels", () => {
    expect(() =>
      service.buildMockupPayload({
        template,
        fileId: "file_123",
        placement: "sleeve",
        position: { width: 1, height: 1, left: 0, top: 0 },
      }),
    ).toThrow(BadRequestException);
  });
});
