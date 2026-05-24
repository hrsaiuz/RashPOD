import * as path from "path";
import { resolveTemplateImageKey } from "@rashpod/mockup";
import { ArtifactStore, createArtifactStore } from "./artifact-store";
import { compositeMockupImage, resolvePipelinePlacement } from "./mockup-compositor";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require("sharp") as typeof import("sharp");

export interface RenderedFile {
  fileKey: string;
  objectKey: string;
  contentType: string;
  format: string;
  widthPx: number;
  heightPx: number;
}

export interface PipelineRenderContext {
  id: string;
  pipeline: "LOCAL" | "GLOBAL_PRINTFUL" | "GLOBAL_POD";
  placement?: string;
  design?: { title?: string };
  latestDesignVersion?: { fileKey: string; widthPx?: number | null; heightPx?: number | null; dpi?: number | null; hasTransparency?: boolean | null } | null;
  width?: number | null;
  height?: number | null;
  x?: number | null;
  y?: number | null;
  left?: number | null;
  top?: number | null;
  scale?: number | null;
  rotation?: number | null;
  units?: "CM" | "INCH" | "PX";
  placementConfigJson?: unknown;
  localBaseProduct?: { name?: string } | null;
  printfulProductTemplate?: { displayName?: string } | null;
}

export class SharpRenderer {
  private readonly store: ArtifactStore;

  constructor(
    baseDir = path.resolve(process.cwd(), "worker-artifacts"),
    store: ArtifactStore = createArtifactStore(baseDir),
  ) {
    this.store = store;
  }

  async renderPreview(placementId: string): Promise<RenderedFile> {
    return this.renderImage(`generated-mockups/${placementId}`, `preview`, 2000, 2000, {
      r: 232,
      g: 237,
      b: 255,
      alpha: 1,
    });
  }

  async renderListingVariant(placementId: string, variant: "main" | "lifestyle" | "closeup"): Promise<RenderedFile> {
    const palette: Record<typeof variant, { r: number; g: number; b: number; alpha: number }> = {
      main: { r: 232, g: 237, b: 255, alpha: 1 },
      lifestyle: { r: 255, g: 237, b: 230, alpha: 1 },
      closeup: { r: 238, g: 253, b: 243, alpha: 1 },
    };
    return this.renderImage(`listing-images/${placementId}`, variant, 2000, 2000, palette[variant]);
  }

  async renderPipelineMockup(context: PipelineRenderContext, variant: "main" | "lifestyle" | "closeup" | "preview"): Promise<RenderedFile> {
    const outputWidth = variant === "closeup" ? 1600 : 2000;
    const outputHeight = variant === "closeup" ? 1600 : 2000;
    const templateKey = resolveTemplateImageKey(context.placementConfigJson as any, variant === "preview" ? "main" : variant);
    const designKey = context.latestDesignVersion?.fileKey;

    if (!templateKey) throw new Error("MOCKUP_TEMPLATE_IMAGE_MISSING");
    if (!designKey) throw new Error("DESIGN_SOURCE_FILE_MISSING");

    const placement = resolvePipelinePlacement(context.placementConfigJson, context);
    const buffer = await compositeMockupImage(this.store, {
      templateKey,
      designKey,
      placement,
      variant: variant === "preview" ? "main" : variant,
      outputWidth,
      outputHeight,
    });

    const relKey = `pipeline-mockups/${context.id}/${variant}.png`;
    const fileKey = await this.store.putBuffer(relKey, buffer, "image/png");
    return { fileKey, objectKey: fileKey, contentType: "image/png", format: "png", widthPx: outputWidth, heightPx: outputHeight };
  }

  async renderFilmPreview(placementId: string): Promise<RenderedFile> {
    return this.renderImage(`film-previews/${placementId}`, "film-preview", 2000, 2000, {
      r: 245,
      g: 248,
      b: 255,
      alpha: 1,
    });
  }

  async renderProductionFile(placementId: string): Promise<RenderedFile> {
    return this.renderImage(`production-files/${placementId}`, "print-ready", 3000, 3000, {
      r: 255,
      g: 255,
      b: 255,
      alpha: 0,
    });
  }

  async renderFilmProductionFile(input: { productionJobId: string; queueType: string; widthCm?: number | null; heightCm?: number | null; quantity?: number | null }): Promise<RenderedFile> {
    const widthPx = Math.max(600, Math.min(6000, Math.round((input.widthCm ?? 30) * 40)));
    const heightPx = Math.max(600, Math.min(10000, Math.round((input.heightCm ?? 30) * 40)));
    const label = `${input.queueType} ${input.widthCm ?? "?"}x${input.heightCm ?? "?"}cm x${input.quantity ?? 1}`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}">
      <rect width="${widthPx}" height="${heightPx}" fill="rgba(255,255,255,0)"/>
      <rect x="24" y="24" width="${widthPx - 48}" height="${heightPx - 48}" fill="rgba(120,138,224,0.08)" stroke="#788AE0" stroke-width="8" stroke-dasharray="28 18"/>
      <text x="${widthPx / 2}" y="${heightPx / 2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.max(28, Math.min(96, widthPx / 18))}" font-weight="700" fill="#0B1020">${escapeXml(label)}</text>
    </svg>`;
    const relKey = `film-production-files/${input.productionJobId}/print-ready.png`;
    const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
    const fileKey = await this.store.putBuffer(relKey, buffer, "image/png");
    return { fileKey, objectKey: fileKey, contentType: "image/png", format: "png", widthPx, heightPx };
  }

  async renderGangSheetProductionFile(input: { productionJobId: string; queueType: string; snapshot: Record<string, unknown>; quantity?: number | null }): Promise<RenderedFile> {
    const widthCm = numberFrom(input.snapshot.widthCm) ?? 58;
    const heightCm = numberFrom(input.snapshot.heightCm) ?? 100;
    const widthPx = Math.max(600, Math.min(8000, Math.round(widthCm * 40)));
    const heightPx = Math.max(600, Math.min(16000, Math.round(heightCm * 40)));
    const items = Array.isArray(input.snapshot.items) ? input.snapshot.items : [];
    const itemSvg = items.map((item, index) => {
      const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
      const x = Math.max(0, (numberFrom(record.xCm) ?? 0) / widthCm * widthPx);
      const y = Math.max(0, (numberFrom(record.yCm) ?? 0) / heightCm * heightPx);
      const itemWidth = Math.max(12, (numberFrom(record.widthCm) ?? 5) / widthCm * widthPx);
      const itemHeight = Math.max(12, (numberFrom(record.heightCm) ?? 5) / heightCm * heightPx);
      const rotation = numberFrom(record.rotationDeg) ?? 0;
      const label = escapeXml(String(record.label ?? record.sourceType ?? `Item ${index + 1}`));
      const fill = index % 2 === 0 ? "#F39E7C" : "#788AE0";
      const fontSize = Math.max(10, Math.min(36, itemWidth / 8));
      return `<g transform="rotate(${rotation} ${x + itemWidth / 2} ${y + itemHeight / 2})">
        <rect x="${x}" y="${y}" width="${itemWidth}" height="${itemHeight}" rx="6" fill="${fill}" fill-opacity="0.22" stroke="${fill}" stroke-width="4"/>
        <text x="${x + itemWidth / 2}" y="${y + itemHeight / 2}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#0B1020">${label}</text>
      </g>`;
    }).join("\n");
    const label = `${input.queueType} gang sheet ${widthCm}x${heightCm}cm x${input.quantity ?? 1}`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}">
      <rect width="${widthPx}" height="${heightPx}" fill="rgba(255,255,255,0)"/>
      <rect x="24" y="24" width="${widthPx - 48}" height="${heightPx - 48}" fill="rgba(120,138,224,0.035)" stroke="#788AE0" stroke-width="8" stroke-dasharray="28 18"/>
      ${itemSvg}
      <text x="48" y="${heightPx - 48}" font-family="Arial, sans-serif" font-size="${Math.max(22, Math.min(56, widthPx / 32))}" font-weight="700" fill="#0B1020">${escapeXml(label)}</text>
    </svg>`;
    const relKey = `gang-sheet-production-files/${input.productionJobId}/print-ready.png`;
    const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
    const fileKey = await this.store.putBuffer(relKey, buffer, "image/png");
    return { fileKey, objectKey: fileKey, contentType: "image/png", format: "png", widthPx, heightPx };
  }

  private async renderImage(
    folder: string,
    prefix: string,
    widthPx: number,
    heightPx: number,
    background: { r: number; g: number; b: number; alpha: number },
  ) {
    const relKey = `${folder}/${prefix}.png`;
    const buffer = await sharp({
      create: {
        width: widthPx,
        height: heightPx,
        channels: 4,
        background,
      },
    })
      .png()
      .toBuffer();
    const fileKey = await this.store.putBuffer(relKey, buffer, "image/png");
    return { fileKey, objectKey: fileKey, contentType: "image/png", format: "png", widthPx, heightPx };
  }
}

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char] ?? char);
}

function numberFrom(value: unknown) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : null;
  return number != null && Number.isFinite(number) ? number : undefined;
}
