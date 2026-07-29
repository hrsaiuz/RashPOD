import type { EditorPlacementState } from "./types";

export type RenderedPlacementBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

export function renderedPlacementBounds(
  placement: Pick<EditorPlacementState, "x" | "y" | "width" | "height" | "scale" | "rotation">,
): RenderedPlacementBounds {
  const scale = Number.isFinite(placement.scale) && placement.scale > 0 ? placement.scale : 1;
  const renderedWidth = placement.width * scale;
  const renderedHeight = placement.height * scale;
  const radians = ((placement.rotation % 360) * Math.PI) / 180;
  const width = Math.abs(renderedWidth * Math.cos(radians)) + Math.abs(renderedHeight * Math.sin(radians));
  const height = Math.abs(renderedWidth * Math.sin(radians)) + Math.abs(renderedHeight * Math.cos(radians));
  const centerX = placement.x + renderedWidth / 2;
  const centerY = placement.y + renderedHeight / 2;

  return {
    left: centerX - width / 2,
    top: centerY - height / 2,
    width,
    height,
    centerX,
    centerY,
  };
}
