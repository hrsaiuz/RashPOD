import { PlacementKind } from "@prisma/client";
import { canonicalPlacementKind } from "./printful-placement";

describe("canonicalPlacementKind", () => {
  it.each([
    ["sleeve_left", PlacementKind.LEFT_SLEEVE],
    ["embroidery-sleeve-right", PlacementKind.RIGHT_SLEEVE],
    ["embroidery_chest_left", PlacementKind.LEFT_CHEST],
    ["chest_right", PlacementKind.RIGHT_CHEST],
    ["embroidery_chest_center", PlacementKind.FRONT],
  ])("maps provider placement %s to %s", (providerPlacement, expected) => {
    expect(canonicalPlacementKind(providerPlacement)).toBe(expected);
  });
});
