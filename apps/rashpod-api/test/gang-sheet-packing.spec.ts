import { autoArrangeGangSheet, rectanglesOverlap } from "../src/modules/gang-sheets/gang-sheet-packing";

describe("gang sheet packing", () => {
  it("places items deterministically without overlap", () => {
    const result = autoArrangeGangSheet({
      widthCm: 30,
      heightCm: 20,
      gapCm: 1,
      marginCm: 1,
      items: [
        { id: "wide", widthCm: 12, heightCm: 5, quantity: 2 },
        { id: "small", widthCm: 4, heightCm: 4, quantity: 3 },
        { id: "tall", widthCm: 5, heightCm: 10, quantity: 1 },
      ],
    });

    expect(result.unplaced).toEqual([]);
    expect(result.placed.map((item) => `${item.id}:${item.copyIndex}`)).toEqual(["wide:0", "wide:1", "tall:0", "small:0", "small:1", "small:2"]);
    for (let i = 0; i < result.placed.length; i += 1) {
      for (let j = i + 1; j < result.placed.length; j += 1) {
        expect(rectanglesOverlap(result.placed[i], result.placed[j])).toBe(false);
      }
    }
    expect(result.utilizationPercent).toBeGreaterThan(0);
  });

  it("preserves locked items and reports items that do not fit", () => {
    const result = autoArrangeGangSheet({
      widthCm: 12,
      heightCm: 10,
      gapCm: 1,
      marginCm: 1,
      items: [
        { id: "locked", widthCm: 4, heightCm: 4, xCm: 1, yCm: 1, locked: true },
        { id: "too-large", widthCm: 20, heightCm: 4 },
        { id: "fit", widthCm: 4, heightCm: 4 },
      ],
    });

    expect(result.placed.find((item) => item.id === "locked")).toMatchObject({ xCm: 1, yCm: 1, locked: true });
    expect(result.placed.find((item) => item.id === "fit")).toBeDefined();
    expect(result.unplaced).toEqual([expect.objectContaining({ id: "too-large", placed: false })]);
    expect(result.warnings).toContain("1 item copies could not be placed");
  });
});
