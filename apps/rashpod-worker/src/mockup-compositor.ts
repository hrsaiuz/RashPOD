import {
  computeCompositeBox,
  editorStateFromLocalPosition,
  mapPlacementToVariantRegion,
  parsePlacementConfig,
  parseVariantRenderRegion,
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
  expectedTemplateCanvas?: { width: number; height: number };
}

const OUTPUT_BACKGROUND = { r: 240, g: 242, b: 250, alpha: 1 } as const;
const PNG_OPTIONS = { compressionLevel: 9, adaptiveFiltering: true, palette: false } as const;
const MAX_ARTWORK_LAYER_PIXELS = 64_000_000;

interface CanvasTransform {
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export async function compositeMockupImage(store: ArtifactStore, input: CompositeInput): Promise<Buffer> {
  const [templateBuffer, designBuffer] = await Promise.all([
    store.getBuffer(input.templateKey, "public"),
    store.getBuffer(input.designKey, "private"),
  ]);

  const baseMeta = await sharp(templateBuffer).metadata();
  const orientationSwapsAxes = [5, 6, 7, 8].includes(baseMeta.orientation ?? 1);
  const baseWidth = (orientationSwapsAxes ? baseMeta.height : baseMeta.width) ?? input.outputWidth;
  const baseHeight = (orientationSwapsAxes ? baseMeta.width : baseMeta.height) ?? input.outputHeight;
  if (
    input.expectedTemplateCanvas
    && (baseWidth !== input.expectedTemplateCanvas.width || baseHeight !== input.expectedTemplateCanvas.height)
  ) {
    throw new Error(
      `MOCKUP_TEMPLATE_DIMENSIONS_MISMATCH: expected ${input.expectedTemplateCanvas.width}x${input.expectedTemplateCanvas.height}, received ${baseWidth}x${baseHeight}`,
    );
  }
  const transform = resolveCanvasTransform(input, baseWidth, baseHeight);

  const templateLayer = sharp(templateBuffer)
    .autoOrient()
    .extract({
      left: transform.sourceX,
      top: transform.sourceY,
      width: transform.sourceWidth,
      height: transform.sourceHeight,
    })
    .resize(input.outputWidth, input.outputHeight, {
      fit: input.variant === "closeup" ? "cover" : "contain",
      position: "centre",
      background: OUTPUT_BACKGROUND,
      kernel: sharp.kernel.lanczos3,
      fastShrinkOnLoad: false,
    })
    .toColourspace("srgb")
    .ensureAlpha();
  const templatePrepared = await templateLayer.png(PNG_OPTIONS).toBuffer();

  const scale = input.placement.scale ?? 1;
  if (![input.placement.x, input.placement.y, input.placement.width, input.placement.height, scale, input.placement.rotation ?? 0].every(Number.isFinite)) {
    throw new Error("MOCKUP_PLACEMENT_INVALID: placement values must be finite numbers");
  }
  if (input.placement.width <= 0 || input.placement.height <= 0 || scale <= 0) {
    throw new Error("MOCKUP_PLACEMENT_INVALID: artwork dimensions and scale must be positive");
  }
  const targetWidth = Math.max(1, Math.round(input.placement.width * scale * transform.scale));
  const targetHeight = Math.max(1, Math.round(input.placement.height * scale * transform.scale));
  if (targetWidth * targetHeight > MAX_ARTWORK_LAYER_PIXELS) {
    throw new Error(`MOCKUP_ARTWORK_LAYER_TOO_LARGE: ${targetWidth}x${targetHeight} exceeds the renderer safety limit`);
  }
  const rotation = input.placement.rotation ?? 0;

  let designLayer = sharp(designBuffer)
    .autoOrient()
    .resize(targetWidth, targetHeight, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
      fastShrinkOnLoad: false,
    })
    .toColourspace("srgb");
  if (rotation !== 0) {
    designLayer = designLayer.rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
  }
  const designPrepared = await designLayer.png(PNG_OPTIONS).toBuffer();
  const designMeta = await sharp(designPrepared).metadata();
  const designWidth = designMeta.width ?? targetWidth;
  const designHeight = designMeta.height ?? targetHeight;

  const left = Math.round(
    (input.placement.x - transform.sourceX) * transform.scale
      + transform.offsetX
      - (designWidth - targetWidth) / 2,
  );
  const top = Math.round(
    (input.placement.y - transform.sourceY) * transform.scale
      + transform.offsetY
      - (designHeight - targetHeight) / 2,
  );
  const overlay = await clipOverlayToCanvas(designPrepared, designWidth, designHeight, left, top, input.outputWidth, input.outputHeight);

  return sharp(templatePrepared)
    .composite(overlay ? [{ input: overlay.buffer, left: overlay.left, top: overlay.top, blend: "over" }] : [])
    .toColourspace("srgb")
    .png(PNG_OPTIONS)
    .toBuffer();
}

function resolveCanvasTransform(input: CompositeInput, baseWidth: number, baseHeight: number): CanvasTransform {
  if (input.variant !== "closeup") {
    const scale = Math.min(input.outputWidth / baseWidth, input.outputHeight / baseHeight);
    return {
      sourceX: 0,
      sourceY: 0,
      sourceWidth: baseWidth,
      sourceHeight: baseHeight,
      scale,
      offsetX: (input.outputWidth - baseWidth * scale) / 2,
      offsetY: (input.outputHeight - baseHeight * scale) / 2,
    };
  }

  const crop = computeCompositeBox({ position: input.placement }, "closeup");
  const sourceX = Math.max(0, Math.min(Math.floor(crop.x), baseWidth - 1));
  const sourceY = Math.max(0, Math.min(Math.floor(crop.y), baseHeight - 1));
  const sourceWidth = Math.max(1, Math.min(Math.ceil(crop.width), baseWidth - sourceX));
  const sourceHeight = Math.max(1, Math.min(Math.ceil(crop.height), baseHeight - sourceY));
  const scale = Math.max(input.outputWidth / sourceWidth, input.outputHeight / sourceHeight);
  return {
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    scale,
    offsetX: (input.outputWidth - sourceWidth * scale) / 2,
    offsetY: (input.outputHeight - sourceHeight * scale) / 2,
  };
}

async function clipOverlayToCanvas(
  buffer: Buffer,
  width: number,
  height: number,
  left: number,
  top: number,
  canvasWidth: number,
  canvasHeight: number,
) {
  const sourceLeft = Math.max(0, -left);
  const sourceTop = Math.max(0, -top);
  const outputLeft = Math.max(0, left);
  const outputTop = Math.max(0, top);
  const visibleWidth = Math.min(width - sourceLeft, canvasWidth - outputLeft);
  const visibleHeight = Math.min(height - sourceTop, canvasHeight - outputTop);
  if (visibleWidth <= 0 || visibleHeight <= 0) return null;
  if (sourceLeft === 0 && sourceTop === 0 && visibleWidth === width && visibleHeight === height) {
    return { buffer, left: outputLeft, top: outputTop };
  }
  const clipped = await sharp(buffer)
    .extract({ left: sourceLeft, top: sourceTop, width: visibleWidth, height: visibleHeight })
    .png(PNG_OPTIONS)
    .toBuffer();
  return { buffer: clipped, left: outputLeft, top: outputTop };
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
  variant: MockupVariant = "main",
): EditorPlacementState {
  const config = parsePlacementConfig(placementConfigJson);
  const printArea = config?.printArea as PrintAreaRect | undefined;
  let placement: EditorPlacementState;
  if (config?.position && printArea) {
    placement = editorStateFromLocalPosition(config.position, printArea, config.unit === "CM" ? "CM" : "PX");
  } else if (printArea) {
    placement = editorStateFromLocalPosition(
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
  } else {
    placement = {
      x: context.x ?? 0,
      y: context.y ?? 0,
      width: context.width ?? 400,
      height: context.height ?? 400,
      scale: context.scale ?? 1,
      rotation: context.rotation ?? 0,
    };
  }

  if (!config || !printArea || variant === "main" || variant === "preview") return placement;
  const role = variant === "lifestyle" ? "LIFESTYLE" : "DETAIL";
  const galleryAsset = config.galleryAssets?.find((asset) => asset.role === role);
  const distinctLegacyImage = variant === "lifestyle"
    ? config.mockupTemplate.lifestyleImageKey
    : config.mockupTemplate.closeupImageKey;
  if (!galleryAsset && !distinctLegacyImage) return placement;

  const renderRegion = parseVariantRenderRegion(galleryAsset?.metadataJson);
  if (!renderRegion) {
    throw new Error(`${role}_RENDER_REGION_MISSING`);
  }
  return mapPlacementToVariantRegion(placement, printArea, renderRegion);
}

export { parsePlacementConfig, resolveTemplateImageKey };
