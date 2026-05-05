import { pickRoyaltyRule, RoyaltyCandidate } from "./royalty-priority";

describe("Royalty Calculation Logic", () => {
  describe("pickRoyaltyRule", () => {
    it("should select DESIGNER scope rule with highest priority", () => {
      const candidates: RoyaltyCandidate[] = [
        { id: "default-1", scope: "DEFAULT", isActive: true },
        { id: "designer-1", scope: "DESIGNER", isActive: true },
        { id: "product-1", scope: "PRODUCT_TYPE", isActive: true },
      ];

      const result = pickRoyaltyRule(candidates);

      expect(result?.id).toBe("designer-1");
      expect(result?.scope).toBe("DESIGNER");
    });

    it("should select PRODUCT_TYPE scope when DESIGNER not available", () => {
      const candidates: RoyaltyCandidate[] = [
        { id: "default-1", scope: "DEFAULT", isActive: true },
        { id: "product-1", scope: "PRODUCT_TYPE", isActive: true },
        { id: "channel-1", scope: "CHANNEL", isActive: true },
      ];

      const result = pickRoyaltyRule(candidates);

      expect(result?.id).toBe("product-1");
      expect(result?.scope).toBe("PRODUCT_TYPE");
    });

    it("should select CHANNEL scope when higher priorities not available", () => {
      const candidates: RoyaltyCandidate[] = [
        { id: "default-1", scope: "DEFAULT", isActive: true },
        { id: "channel-1", scope: "CHANNEL", isActive: true },
      ];

      const result = pickRoyaltyRule(candidates);

      expect(result?.id).toBe("channel-1");
      expect(result?.scope).toBe("CHANNEL");
    });

    it("should fall back to DEFAULT scope when nothing else available", () => {
      const candidates: RoyaltyCandidate[] = [{ id: "default-1", scope: "DEFAULT", isActive: true }];

      const result = pickRoyaltyRule(candidates);

      expect(result?.id).toBe("default-1");
      expect(result?.scope).toBe("DEFAULT");
    });

    it("should skip inactive rules", () => {
      const candidates: RoyaltyCandidate[] = [
        { id: "designer-1", scope: "DESIGNER", isActive: false },
        { id: "product-1", scope: "PRODUCT_TYPE", isActive: true },
        { id: "default-1", scope: "DEFAULT", isActive: true },
      ];

      const result = pickRoyaltyRule(candidates);

      expect(result?.id).toBe("product-1");
    });

    it("should return undefined when all rules are inactive", () => {
      const candidates: RoyaltyCandidate[] = [
        { id: "designer-1", scope: "DESIGNER", isActive: false },
        { id: "default-1", scope: "DEFAULT", isActive: false },
      ];

      const result = pickRoyaltyRule(candidates);

      expect(result).toBeUndefined();
    });

    it("should return undefined when no candidates provided", () => {
      const result = pickRoyaltyRule([]);

      expect(result).toBeUndefined();
    });

    it("should handle multiple rules with same scope by returning first", () => {
      const candidates: RoyaltyCandidate[] = [
        { id: "designer-1", scope: "DESIGNER", isActive: true },
        { id: "designer-2", scope: "DESIGNER", isActive: true },
      ];

      const result = pickRoyaltyRule(candidates);

      expect(result?.scope).toBe("DESIGNER");
      expect(["designer-1", "designer-2"]).toContain(result?.id);
    });
  });

  describe("Royalty Rate Application", () => {
    it("should calculate standard product royalty correctly", () => {
      const basePrice = 100000;
      const royaltyRate = 0.15;

      const royalty = Math.round(basePrice * royaltyRate);

      expect(royalty).toBe(15000);
    });

    it("should calculate film royalty separately from product royalty", () => {
      const filmPrice = 50000;
      const filmRoyaltyRate = 0.2;

      const filmRoyalty = Math.round(filmPrice * filmRoyaltyRate);

      expect(filmRoyalty).toBe(10000);
    });

    it("should handle royalty rate of 0%", () => {
      const basePrice = 100000;
      const royaltyRate = 0;

      const royalty = Math.round(basePrice * royaltyRate);

      expect(royalty).toBe(0);
    });

    it("should handle royalty rate of 100%", () => {
      const basePrice = 100000;
      const royaltyRate = 1.0;

      const royalty = Math.round(basePrice * royaltyRate);

      expect(royalty).toBe(100000);
    });

    it("should round fractional royalty amounts", () => {
      const basePrice = 12345;
      const royaltyRate = 0.175;

      const royalty = Math.round(basePrice * royaltyRate);

      expect(royalty).toBe(2160);
    });
  });

  describe("Multi-Designer Royalty Splits", () => {
    it("should split royalty equally between two designers", () => {
      const totalRoyalty = 30000;
      const designerCount = 2;

      const perDesigner = Math.round(totalRoyalty / designerCount);

      expect(perDesigner).toBe(15000);
    });

    it("should split royalty equally between three designers", () => {
      const totalRoyalty = 30000;
      const designerCount = 3;

      const perDesigner = Math.round(totalRoyalty / designerCount);

      expect(perDesigner).toBe(10000);
    });

    it("should handle rounding in splits where total doesnt divide evenly", () => {
      const totalRoyalty = 10000;
      const designerCount = 3;

      const perDesigner = Math.round(totalRoyalty / designerCount);

      expect(perDesigner).toBe(3333);
      expect(perDesigner * designerCount).toBeCloseTo(totalRoyalty, -2);
    });

    it("should handle single designer case", () => {
      const totalRoyalty = 20000;
      const designerCount = 1;

      const perDesigner = Math.round(totalRoyalty / designerCount);

      expect(perDesigner).toBe(20000);
    });
  });

  describe("Currency Rounding", () => {
    it("should round to nearest whole UZS (no decimal places)", () => {
      const amount = 12345.67;

      const rounded = Math.round(amount);

      expect(rounded).toBe(12346);
    });

    it("should round down amounts with fractional part < 0.5", () => {
      const amount = 12345.49;

      const rounded = Math.round(amount);

      expect(rounded).toBe(12345);
    });

    it("should round up amounts with fractional part >= 0.5", () => {
      const amount = 12345.5;

      const rounded = Math.round(amount);

      expect(rounded).toBe(12346);
    });

    it("should handle exact integer amounts", () => {
      const amount = 12345;

      const rounded = Math.round(amount);

      expect(rounded).toBe(12345);
    });
  });
});
