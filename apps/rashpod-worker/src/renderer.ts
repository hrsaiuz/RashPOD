import * as path from "path";
import sharp from "sharp";
import { ArtifactStore, createArtifactStore } from "./artifact-store";

export interface RenderedFile {
  fileKey: string;
  widthPx: number;
  heightPx: number;
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
