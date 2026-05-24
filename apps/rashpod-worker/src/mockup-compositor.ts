import {
  computeCompositeBox,
  editorStateFromLocalPosition,
  parsePlacementConfig,
  resolveTemplateImageKey,
  type EditorPlacementState,
  type MockupVariant,
  type PrintAreaRect,
} from "@rashpod/mockup";
import type { ArtifactStore } from "./artifact-store";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require("sharp") as typeof import("sharp");

export interface CompositeInput {
  templateKey: string;
  designKey: string;
  placement: EditorPlacementState;
  variant: MockupVariant;
  outputWidth: number;
  outputHeight: number;
}

export async function compositeMockupImage(store: ArtifactStore, input: CompositeInput): Promise<Buffer> {
  const [templateBuffer, designBuffer] = await Promise.all([
    store.getBuffer(input.templateKey, "public"),
    store.getBuffer(input.designKey, "private"),
  ]);

  const baseMeta = await sharp(templateBuffer).metadata();
  const baseWidth = baseMeta.width ?? input.outputWidth;
  const baseHeight = baseMeta.height ?? input.outputHeight;

  const scale = input.placement.scale ?? 1;
  const targetWidth = Math.max(1, Math.round(input.placement.width * scale));
  const targetHeight = Math.max(1, Math.round(input.placement.height * scale));
  const rotation = input.placement.rotation ?? 0;

  let designLayer = sharp(designBuffer).resize(targetWidth, targetHeight, { fit: "fill" });
  if (rotation !== 0) {
    designLayer = designLayer.rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
  }
  const designPrepared = await designLayer.png().toBuffer();
  const designMeta = await sharp(designPrepared).metadata();
  const designWidth = designMeta.width ?? targetWidth;
  const designHeight = designMeta.height ?? targetHeight;

  const left = Math.round(input.placement.x - (designWidth - targetWidth) / 2);
  const top = Math.round(input.placement.y - (designHeight - targetHeight) / 2);

  let composed = await sharp(templateBuffer)
    .ensureAlpha()
    .composite([{ input: designPrepared, left, top }])
    .png()
    .toBuffer();

  if (input.variant === "closeup") {
    const crop = computeCompositeBox({ position: input.placement }, "closeup");
    const extractLeft = Math.max(0, Math.min(crop.x, baseWidth - 1));
    const extractTop = Math.max(0, Math.min(crop.y, baseHeight - 1));
    const extractWidth = Math.min(crop.width, baseWidth - extractLeft);
    const extractHeight = Math.min(crop.height, baseHeight - extractTop);
    composed = await sharp(composed)
      .extract({ left: extractLeft, top: extractTop, width: extractWidth, height: extractHeight })
      .resize(input.outputWidth, input.outputHeight, { fit: "cover" })
      .png()
      .toBuffer();
  } else if (baseWidth !== input.outputWidth || baseHeight !== input.outputHeight) {
    composed = await sharp(composed)
      .resize(input.outputWidth, input.outputHeight, { fit: "inside", background: { r: 240, g: 242, b: 250, alpha: 1 } })
      .png()
      .toBuffer();
  }

  return composed;
}

export function resolvePipelinePlacement(
  placementConfigJson: unknown,
  context: {
    x?: number | null;
    y?: number | null;
    width?: number | null;
    height?: number | null;
    scale?: number | null;
    rotation?: number | null;
    units?: "CM" | "INCH" | "PX" | null;
  },
): EditorPlacementState {
  const config = parsePlacementConfig(placementConfigJson);
  const printArea = config?.printArea as PrintAreaRect | undefined;
  if (config?.position && printArea) {
    return editorStateFromLocalPosition(config.position, printArea, config.unit === "CM" ? "CM" : "PX");
  }
  if (printArea) {
    return editorStateFromLocalPosition(
      {
        x: context.x ?? undefined,
        y: context.y ?? undefined,
        width: context.width ?? undefined,
        height: context.height ?? undefined,
        scale: context.scale ?? undefined,
        rotation: context.rotation ?? undefined,
      },
      printArea,
      context.units === "CM" ? "CM" : "PX",
    );
  }
  return {
    x: context.x ?? 0,
    y: context.y ?? 0,
    width: context.width ?? 400,
    height: context.height ?? 400,
    scale: context.scale ?? 1,
    rotation: context.rotation ?? 0,
  };
}

export { parsePlacementConfig, resolveTemplateImageKey };
