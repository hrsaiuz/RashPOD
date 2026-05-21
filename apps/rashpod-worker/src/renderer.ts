import * as path from "path";
import sharp from "sharp";
import { ArtifactStore, createArtifactStore } from "./artifact-store";

export interface RenderedFile {
  fileKey: string;
  widthPx: number;
  heightPx: number;
}

export interface PipelineRenderContext {
  id: string;
  pipeline: "LOCAL" | "GLOBAL_PRINTFUL";
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
    const widthPx = variant === "closeup" ? 1600 : 2000;
    const heightPx = variant === "closeup" ? 1600 : 2000;
    const productName = escapeXml(context.localBaseProduct?.name ?? context.printfulProductTemplate?.displayName ?? "Product");
    const designTitle = escapeXml(context.design?.title ?? "Design");
    const placement = escapeXml((context.placement ?? "FRONT").replace(/_/g, " "));
    const placementConfig = parsePlacementConfig(context.placementConfigJson);
    const printArea = placementConfig?.printArea;
    const position = placementConfig?.position;
    const templateKey = variant === "lifestyle" ? placementConfig?.mockupTemplate?.lifestyleImageKey : variant === "closeup" ? placementConfig?.mockupTemplate?.closeupImageKey : placementConfig?.mockupTemplate?.baseImageKey;
    const printBox = calculatePrintBox(printArea, position, context, variant);
    const designInfo = escapeXml(context.latestDesignVersion?.fileKey ?? "source artwork");
    const templateInfo = escapeXml(templateKey ?? placementConfig?.mockupTemplate?.baseImageKey ?? "template fallback");
    const rotation = Number(position?.rotation ?? context.rotation ?? 0);
    const centerX = printBox.x + printBox.width / 2;
    const centerY = printBox.y + printBox.height / 2;
    const svg = `
      <svg width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${widthPx}" height="${heightPx}" fill="#F0F2FA"/>
        <rect x="80" y="80" width="${widthPx - 160}" height="${heightPx - 160}" rx="48" fill="#FFFFFF"/>
        ${variant === "lifestyle" ? `<circle cx="340" cy="340" r="180" fill="#FFD6C6"/><circle cx="1660" cy="1560" r="220" fill="#CFD6FA"/>` : ""}
        <path d="M760 420 L910 300 H1090 L1240 420 L1410 560 L1310 760 L1220 700 V1530 H780 V700 L690 760 L590 560 Z" fill="#F8FAFF" stroke="#A3AFE5" stroke-width="10"/>
        <rect x="${printBox.x}" y="${printBox.y}" width="${printBox.width}" height="${printBox.height}" rx="34" fill="#788AE0" opacity="0.12" stroke="#788AE0" stroke-width="8" stroke-dasharray="28 22"/>
        <g transform="rotate(${rotation} ${centerX} ${centerY})">
          <rect x="${printBox.x + 42}" y="${printBox.y + 52}" width="${Math.max(80, printBox.width - 84)}" height="${Math.max(80, printBox.height - 104)}" rx="28" fill="#F39E7C" opacity="0.92"/>
          <text x="${centerX}" y="${centerY - 18}" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#FFFFFF">${designTitle}</text>
          <text x="${centerX}" y="${centerY + 52}" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="#FFFFFF">${placement}</text>
        </g>
        <text x="140" y="${heightPx - 210}" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#1F2747">${productName}</text>
        <text x="140" y="${heightPx - 150}" font-family="Arial, sans-serif" font-size="30" fill="#667085">${context.pipeline.replace(/_/g, " ")}</text>
        <text x="140" y="${heightPx - 100}" font-family="Arial, sans-serif" font-size="24" fill="#667085">${templateInfo}</text>
        <text x="140" y="${heightPx - 62}" font-family="Arial, sans-serif" font-size="22" fill="#98A2B3">${designInfo}</text>
      </svg>`;
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const relKey = `pipeline-mockups/${context.id}/${variant}-${ts}.png`;
    const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
    const fileKey = await this.store.putBuffer(relKey, buffer, "image/png");
    return { fileKey, widthPx, heightPx };
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

  private async renderImage(
    folder: string,
    prefix: string,
    widthPx: number,
    heightPx: number,
    background: { r: number; g: number; b: number; alpha: number },
  ) {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const relKey = `${folder}/${prefix}-${ts}.png`;
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
    return { fileKey, widthPx, heightPx };
  }
}

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char] ?? char);
}

type RenderPlacementConfig = {
  mockupTemplate?: { baseImageKey?: string; lifestyleImageKey?: string | null; closeupImageKey?: string | null };
  printArea?: { x?: number; y?: number; width?: number; height?: number; safeX?: number; safeY?: number; safeWidth?: number; safeHeight?: number };
  position?: { width?: number; height?: number; x?: number; y?: number; scale?: number; rotation?: number };
  unit?: "CM" | "PX";
};

function parsePlacementConfig(value: unknown): RenderPlacementConfig | null {
  if (!value || typeof value !== "object") return null;
  return value as RenderPlacementConfig;
}

function calculatePrintBox(
  printArea: { x?: number; y?: number; width?: number; height?: number; safeX?: number; safeY?: number; safeWidth?: number; safeHeight?: number } | undefined,
  position: { width?: number; height?: number; x?: number; y?: number; scale?: number } | undefined,
  context: PipelineRenderContext,
  variant: "main" | "lifestyle" | "closeup" | "preview",
) {
  if (!printArea) return variant === "closeup" ? { x: 420, y: 380, width: 760, height: 760 } : { x: 760, y: 600, width: 480, height: 520 };
  const sourceX = position?.x ?? context.x ?? 0;
  const sourceY = position?.y ?? context.y ?? 0;
  const sourceWidth = position?.width ?? context.width ?? printArea.safeWidth ?? printArea.width ?? 480;
  const sourceHeight = position?.height ?? context.height ?? printArea.safeHeight ?? printArea.height ?? 520;
  const scaleX = variant === "closeup" ? 1.4 : 1;
  const offsetX = variant === "closeup" ? 320 : 0;
  const offsetY = variant === "closeup" ? 240 : 0;
  return {
    x: Math.round((printArea.x ?? 760) + sourceX * scaleX - offsetX),
    y: Math.round((printArea.y ?? 600) + sourceY * scaleX - offsetY),
    width: Math.max(80, Math.round(sourceWidth * scaleX)),
    height: Math.max(80, Math.round(sourceHeight * scaleX)),
  };
}
