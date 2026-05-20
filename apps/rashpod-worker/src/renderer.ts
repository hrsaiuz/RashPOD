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
    const printBox = variant === "closeup"
      ? { x: 420, y: 380, width: 760, height: 760 }
      : { x: 760, y: 600, width: 480, height: 520 };
    const svg = `
      <svg width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${widthPx}" height="${heightPx}" fill="#F0F2FA"/>
        <rect x="80" y="80" width="${widthPx - 160}" height="${heightPx - 160}" rx="48" fill="#FFFFFF"/>
        ${variant === "lifestyle" ? `<circle cx="340" cy="340" r="180" fill="#FFD6C6"/><circle cx="1660" cy="1560" r="220" fill="#CFD6FA"/>` : ""}
        <path d="M760 420 L910 300 H1090 L1240 420 L1410 560 L1310 760 L1220 700 V1530 H780 V700 L690 760 L590 560 Z" fill="#F8FAFF" stroke="#A3AFE5" stroke-width="10"/>
        <rect x="${printBox.x}" y="${printBox.y}" width="${printBox.width}" height="${printBox.height}" rx="34" fill="#788AE0" opacity="0.12" stroke="#788AE0" stroke-width="8" stroke-dasharray="28 22"/>
        <rect x="${printBox.x + 42}" y="${printBox.y + 52}" width="${printBox.width - 84}" height="${printBox.height - 104}" rx="28" fill="#F39E7C" opacity="0.92"/>
        <text x="${printBox.x + printBox.width / 2}" y="${printBox.y + printBox.height / 2 - 18}" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#FFFFFF">${designTitle}</text>
        <text x="${printBox.x + printBox.width / 2}" y="${printBox.y + printBox.height / 2 + 52}" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="#FFFFFF">${placement}</text>
        <text x="140" y="${heightPx - 210}" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#1F2747">${productName}</text>
        <text x="140" y="${heightPx - 150}" font-family="Arial, sans-serif" font-size="30" fill="#667085">${context.pipeline.replace(/_/g, " ")}</text>
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
