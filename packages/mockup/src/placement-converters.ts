import { convertCmToIn, round2 } from "./placement-math";
import type { NormalizedPosition, PositionInput } from "./types";

export function calculateLocalPosition(position: PositionInput): NormalizedPosition {
  const width = position.widthCm ?? position.width;
  const height = position.heightCm ?? position.height;
  const x = position.xCm ?? position.x;
  const y = position.yCm ?? position.y;
  return {
    width,
    height,
    x,
    y,
    scale: position.scale ?? 1,
    rotation: position.rotation ?? 0,
  };
}

export function calculatePrintfulPosition(position: PositionInput): NormalizedPosition {
  const width = position.widthIn ?? (position.widthCm == null ? position.width : convertCmToIn(position.widthCm));
  const height = position.heightIn ?? (position.heightCm == null ? position.height : convertCmToIn(position.heightCm));
  const left = position.leftIn ?? (position.left == null ? undefined : position.left);
  const top = position.topIn ?? (position.top == null ? undefined : position.top);
  return {
    width,
    height,
    left: left ?? (position.xCm == null ? position.x : convertCmToIn(position.xCm)),
    top: top ?? (position.yCm == null ? position.y : convertCmToIn(position.yCm)),
    scale: position.scale ?? 1,
    rotation: position.rotation ?? 0,
  };
}

export function parsePlacementConfig(value: unknown): import("./types").PlacementConfigV1 | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.version !== 1) return null;
  return value as import("./types").PlacementConfigV1;
}
