import { BadRequestException } from "@nestjs/common";
import { PlacementUnits } from "@prisma/client";
import { PodPlacementTransformService } from "../src/modules/pod/placement-transform.service";

describe("PodPlacementTransformService", () => {
  const service = new PodPlacementTransformService();
  const localPrintArea = {
    id: "area-1",
    width: 1000,
    height: 500,
    widthCm: 25,
    heightCm: 12.5,
    safeX: 50,
    safeY: 50,
    safeWidth: 900,
    safeHeight: 400,
  };
  const mapping = {
    id: "mapping-1",
    providerUnits: PlacementUnits.INCH,
    providerWidth: 10,
    providerHeight: 5,
    providerDpi: 300,
    offsetX: 0,
    offsetY: 0,
    supportsRotation: false,
    minScale: 0.5,
    maxScale: 2,
    providerPlacement: "front",
    technique: "dtg",
  };

  it("creates deterministic provider placement from pixel-relative coordinates", () => {
    const result = service.transform({
      localPrintArea,
      mapping,
      position: { width: 250, height: 125, x: 100, y: 50, scale: 1, rotation: 0, units: PlacementUnits.PX },
    });

    expect(result.payload.position).toEqual({ width: 2.5, height: 1.25, x: 1, y: 0.5, left: 1, top: 0.5, scale: 1, rotation: 0 });
    expect(result.payload.providerPlacement).toBe("front");
    expect(result.placementHash).toHaveLength(32);
    expect(service.transform({ localPrintArea, mapping, position: { width: 250, height: 125, x: 100, y: 50, scale: 1, rotation: 0, units: PlacementUnits.PX } }).placementHash).toBe(result.placementHash);
  });

  it("converts centimeter-relative coordinates without guessing DPI", () => {
    const result = service.transform({
      localPrintArea,
      mapping,
      position: { width: 5, height: 2.5, x: 2.5, y: 1.25, scale: 1, rotation: 0, units: PlacementUnits.CM },
    });

    expect(result.payload.position).toEqual({ width: 2, height: 1, x: 1, y: 0.5, left: 1, top: 0.5, scale: 1, rotation: 0 });
  });

  it("blocks unsupported rotation", () => {
    expect(() => service.transform({ localPrintArea, mapping, position: { width: 250, height: 125, x: 0, y: 0, scale: 1, rotation: 15, units: PlacementUnits.PX } })).toThrow(BadRequestException);
  });

  it("blocks out-of-bounds provider placement", () => {
    expect(() => service.transform({ localPrintArea, mapping, position: { width: 500, height: 500, x: 900, y: 0, scale: 1, rotation: 0, units: PlacementUnits.PX } })).toThrow(BadRequestException);
  });
});
