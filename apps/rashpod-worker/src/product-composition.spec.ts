import { compositionReadyForListing, selectCompositionGallery } from "./prisma-asset-repository";

describe("product composition listing", () => {
  it("waits until every placement mockup is ready", () => {
    expect(compositionReadyForListing([{ status: "MOCKUP_READY" }, { status: "MOCKUP_PENDING" }])).toBe(false);
    expect(compositionReadyForListing([{ status: "MOCKUP_READY" }, { status: "MOCKUP_READY" }])).toBe(true);
  });

  it("uses a complementary placement as the second public listing image", () => {
    const assets = [
      { id: "front-main", selection: { id: "front" }, mockupType: "MAIN" },
      { id: "front-life", selection: { id: "front" }, mockupType: "LIFESTYLE" },
      { id: "front-detail", selection: { id: "front" }, mockupType: "DETAIL" },
      { id: "sleeve-main", selection: { id: "sleeve" }, mockupType: "MAIN" },
    ];

    expect(selectCompositionGallery(assets, "front").map((asset) => asset.id)).toEqual([
      "front-main",
      "sleeve-main",
      "front-detail",
    ]);
  });
});
