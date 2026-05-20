import { BadRequestException } from "@nestjs/common";
import { PlacementCalculationService } from "../src/modules/design-workflow/placement-calculation.service";

describe("PlacementCalculationService", () => {
  const service = new PlacementCalculationService();

  it("converts centimeters and inches with two-decimal precision", () => {
    expect(service.convertCmToIn(5)).toBe(1.97);
    expect(service.convertInToCm(1.97)).toBe(5);
  });

  it("normalizes Printful positions from centimeters to inches", () => {
    const position = service.calculatePrintfulPosition({ widthCm: 5, heightCm: 5, xCm: 2.5, yCm: 7.5, scale: 1 });

    expect(position).toEqual({ width: 1.97, height: 1.97, left: 0.98, top: 2.95, scale: 1, rotation: 0 });
  });

  it("rejects positions outside the printable area", () => {
    expect(() =>
      service.validatePositionWithinArea({ width: 6, height: 6, x: 5, y: 0, scale: 1, rotation: 0 }, { widthCm: 10, heightCm: 10 }, "CM"),
    ).toThrow(BadRequestException);
  });
});
