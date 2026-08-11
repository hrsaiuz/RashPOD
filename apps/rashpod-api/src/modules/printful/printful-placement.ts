import { PlacementKind } from "@prisma/client";

/**
 * Converts Printful placement codes and RashPOD placement codes to the
 * canonical placement stored on DesignVersion. Printful puts the direction
 * after the area for some placements (for example, `sleeve_left`).
 */
export function canonicalPlacementKind(value?: string | null): PlacementKind | undefined {
  const normalized = value?.trim().toUpperCase().replace(/[-\s]+/g, "_");
  if (!normalized) return undefined;
  if (Object.values(PlacementKind).includes(normalized as PlacementKind)) return normalized as PlacementKind;

  const tokens = new Set(normalized.split("_").filter(Boolean));
  if (tokens.has("SLEEVE") && tokens.has("LEFT")) return PlacementKind.LEFT_SLEEVE;
  if (tokens.has("SLEEVE") && tokens.has("RIGHT")) return PlacementKind.RIGHT_SLEEVE;
  if (tokens.has("CHEST") && tokens.has("LEFT")) return PlacementKind.LEFT_CHEST;
  if (tokens.has("CHEST") && tokens.has("RIGHT")) return PlacementKind.RIGHT_CHEST;
  // Printful's centered/large chest variants are front-facing placements.
  if (tokens.has("CHEST")) return PlacementKind.FRONT;
  if (tokens.has("WRAP") || (tokens.has("ALL") && tokens.has("OVER"))) return PlacementKind.FULL_WRAP;
  if (tokens.has("BACK")) return PlacementKind.BACK;
  if (tokens.has("FRONT")) return PlacementKind.FRONT;
  return PlacementKind.OTHER;
}
