import { MediaCategory } from "@prisma/client";
import { MediaService } from "../src/modules/media/media.service";

describe("MediaService storefront media", () => {
  it("returns a media-library SVG footer logo without rewriting or rasterizing its URL", async () => {
    const svgUrl = "https://storage.googleapis.com/rashpod-assets/media/branding_logo_footer/rashpod-footer.svg";
    const prisma: any = {
      mediaAsset: {
        findMany: jest.fn().mockResolvedValueOnce([{ id: "svg-1", category: MediaCategory.BRANDING_LOGO_FOOTER, publicUrl: svgUrl, mimeType: "image/svg+xml", isActive: true }]).mockResolvedValueOnce([]),
      },
      platformSetting: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const service = new MediaService(prisma, { log: jest.fn() } as any, {} as any);
    const branding = await service.branding();
    expect(branding.footerLogoUrl).toBe(svgUrl);
  });

  it("resolves Custom Order cards from durable active media IDs and keeps a controlled null fallback", async () => {
    const prisma: any = {
      platformSetting: { findUnique: jest.fn().mockResolvedValue({ value: [{ key: "mug", mediaAssetId: "asset-1", altText: "Blue mug" }] }) },
      mediaAsset: { findMany: jest.fn().mockResolvedValue([{ id: "asset-1", publicUrl: "/mug.svg", mimeType: "image/svg+xml", width: 600, height: 600, isActive: true }]) },
    };
    const service = new MediaService(prisma, { log: jest.fn() } as any, {} as any);
    const products = await service.customOrderProducts();
    expect(products.find((product) => product.key === "mug")).toEqual(expect.objectContaining({ mediaAssetId: "asset-1", imageUrl: "/mug.svg", altText: "Blue mug" }));
    expect(products.find((product) => product.key === "hoodie")?.imageUrl).toBeNull();
  });
});
