import { pickRoyaltyRule } from "../src/modules/admin-config/royalty-priority";

describe("pickRoyaltyRule", () => {
  it("selects higher priority active rule", () => {
    const result = pickRoyaltyRule([
      { id: "default", scope: "DEFAULT", isActive: true },
      { id: "channel", scope: "CHANNEL", isActive: true },
      { id: "designer", scope: "DESIGNER", isActive: true },
    ]);
    expect(result?.id).toBe("designer");
  });

  it("ignores inactive rule", () => {
    const result = pickRoyaltyRule([
      { id: "designer", scope: "DESIGNER", isActive: false },
      { id: "product-type", scope: "PRODUCT_TYPE", isActive: true },
    ]);
    expect(result?.id).toBe("product-type");
  });
});
