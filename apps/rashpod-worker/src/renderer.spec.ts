import type { ArtifactStore } from "./artifact-store";
import { compositeMockupImage, resolvePipelinePlacement } from "./mockup-compositor";
import { PipelineRenderContext, SharpRenderer } from "./renderer";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require("sharp") as typeof import("sharp");

async function createSolidPng(width: number, height: number, color: { r: number; g: number; b: number; alpha?: number }) {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { ...color, alpha: color.alpha ?? 1 },
    },
  })
    .png()
    .toBuffer();
}

async function createStripedPng(width: number, height: number) {
  const stripes = Array.from({ length: width }, (_, x) =>
    `<rect x="${x}" y="0" width="1" height="${height}" fill="${x % 2 === 0 ? "#000" : "#fff"}"/>`,
  ).join("");
  return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${stripes}</svg>`))
    .png()
    .toBuffer();
}

function createMemoryStore(initial: Record<string, Buffer>) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    client: {
      async getBuffer(objectKey: string, bucket: "private" | "public") {
        const key = `${bucket}:${objectKey}`;
        const buffer = store.get(key) ?? store.get(objectKey);
        if (!buffer) throw new Error(`missing ${key}`);
        return buffer;
      },
      async putBuffer(relKey: string, buffer: Buffer) {
        store.set(relKey, buffer);
        return relKey;
      },
    } satisfies ArtifactStore,
  };
}

describe("SharpRenderer pipeline compositing", () => {
  it("composites design onto template and returns expected dimensions", async () => {
    const template = await createSolidPng(500, 500, { r: 220, g: 225, b: 240 });
    const design = await createSolidPng(100, 100, { r: 243, g: 158, b: 124, alpha: 0.9 });
    const { client: store } = createMemoryStore({
      "public:templates/base.png": template,
      "private:designs/demo.png": design,
    });
    const renderer = new SharpRenderer(undefined, store);

    const result = await renderer.renderPipelineMockup(
      {
        id: "sel_test",
        pipeline: "LOCAL",
        latestDesignVersion: { fileKey: "designs/demo.png" },
        placementConfigJson: {
          version: 1,
          mockupTemplate: { id: "t1", name: "Front", baseImageKey: "templates/base.png" },
          printArea: { x: 100, y: 100, width: 300, height: 300, safeX: 120, safeY: 120, safeWidth: 260, safeHeight: 260 },
          position: { x: 150, y: 150, width: 120, height: 120, scale: 1, rotation: 0 },
        },
      },
      "main",
    );

    expect(result.widthPx).toBe(2000);
    expect(result.heightPx).toBe(2000);
    expect(result.fileKey).toMatch(/pipeline-mockups\/sel_test\/sharp-compositor-v2\/[a-f0-9]{20}\/main\.png/);
    expect(result.renderVersion).toBe("sharp-compositor-v2");
    expect(result.renderFingerprint).toMatch(/^[a-f0-9]{20}$/);
    const output = (store as any).get?.(result.fileKey);
    if (output) {
      const meta = await sharp(output).metadata();
      expect(meta.width).toBe(2000);
      expect(meta.height).toBe(2000);
    }
  });

  it("produces a different buffer for closeup variant", async () => {
    const template = await createSolidPng(600, 600, { r: 200, g: 210, b: 230 });
    const design = await createSolidPng(80, 80, { r: 120, g: 138, b: 224, alpha: 0.85 });
    const { client: store } = createMemoryStore({
      "public:templates/base.png": template,
      "private:designs/demo.png": design,
    });

    const main = await compositeMockupImage(store, {
      templateKey: "templates/base.png",
      designKey: "designs/demo.png",
      placement: { x: 200, y: 200, width: 100, height: 100, scale: 1, rotation: 0 },
      variant: "main",
      outputWidth: 2000,
      outputHeight: 2000,
    });
    const closeup = await compositeMockupImage(store, {
      templateKey: "templates/base.png",
      designKey: "designs/demo.png",
      placement: { x: 200, y: 200, width: 100, height: 100, scale: 1, rotation: 0 },
      variant: "closeup",
      outputWidth: 1600,
      outputHeight: 1600,
    });

    expect(main.equals(closeup)).toBe(false);
    const closeMeta = await sharp(closeup).metadata();
    expect(closeMeta.width).toBe(1600);
    expect(closeMeta.height).toBe(1600);
  });

  it("returns the declared canvas size for portrait templates without stretching them", async () => {
    const template = await createSolidPng(400, 800, { r: 12, g: 34, b: 56 });
    const design = await createSolidPng(100, 100, { r: 243, g: 158, b: 124 });
    const { client: store } = createMemoryStore({
      "public:templates/portrait.png": template,
      "private:designs/demo.png": design,
    });

    const output = await compositeMockupImage(store, {
      templateKey: "templates/portrait.png",
      designKey: "designs/demo.png",
      placement: { x: 100, y: 300, width: 200, height: 200, scale: 1, rotation: 0 },
      variant: "main",
      outputWidth: 2000,
      outputHeight: 2000,
    });
    const image = sharp(output);
    const metadata = await image.metadata();
    const corner = await image.clone().extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer();
    const templateCentre = await image.clone().extract({ left: 550, top: 100, width: 1, height: 1 }).raw().toBuffer();

    expect(metadata.width).toBe(2000);
    expect(metadata.height).toBe(2000);
    expect([...corner.subarray(0, 3)]).toEqual([240, 242, 250]);
    expect([...templateCentre.subarray(0, 3)]).toEqual([12, 34, 56]);
  });

  it("preserves source artwork detail by rasterizing directly at output resolution", async () => {
    const template = await createSolidPng(100, 100, { r: 128, g: 128, b: 128 });
    const design = await createStripedPng(100, 100);
    const { client: store } = createMemoryStore({
      "public:templates/base.png": template,
      "private:designs/stripes.png": design,
    });

    const output = await compositeMockupImage(store, {
      templateKey: "templates/base.png",
      designKey: "designs/stripes.png",
      placement: { x: 25, y: 25, width: 50, height: 50, scale: 1, rotation: 0 },
      variant: "main",
      outputWidth: 1000,
      outputHeight: 1000,
    });
    const row = await sharp(output)
      .extract({ left: 250, top: 500, width: 500, height: 1 })
      .removeAlpha()
      .raw()
      .toBuffer();
    const red = Array.from({ length: 500 }, (_, index) => row[index * 3]);

    expect(red.filter((value) => value < 80).length).toBeGreaterThan(100);
    expect(red.filter((value) => value > 175).length).toBeGreaterThan(100);
  });

  it("clips rotated close-up artwork safely at template boundaries", async () => {
    const template = await createSolidPng(400, 400, { r: 220, g: 225, b: 240 });
    const design = await createSolidPng(120, 80, { r: 243, g: 158, b: 124 });
    const { client: store } = createMemoryStore({
      "public:templates/base.png": template,
      "private:designs/edge.png": design,
    });

    const output = await compositeMockupImage(store, {
      templateKey: "templates/base.png",
      designKey: "designs/edge.png",
      placement: { x: 0, y: 0, width: 120, height: 80, scale: 1, rotation: 45 },
      variant: "closeup",
      outputWidth: 1600,
      outputHeight: 1600,
    });
    const metadata = await sharp(output).metadata();
    const stats = await sharp(output).stats();

    expect(metadata.width).toBe(1600);
    expect(metadata.height).toBe(1600);
    expect(stats.channels[0].max).toBeGreaterThanOrEqual(243);
  });

  it("throws when template key is missing", async () => {
    const { client: store } = createMemoryStore({});
    const renderer = new SharpRenderer(undefined, store);
    await expect(
      renderer.renderPipelineMockup({ id: "sel_x", pipeline: "LOCAL", placementConfigJson: { version: 1, mockupTemplate: {}, position: {} } }, "main"),
    ).rejects.toThrow("MOCKUP_TEMPLATE_IMAGE_MISSING");
  });

  it("maps moderator placement into the calibrated lifestyle region", () => {
    const placement = resolvePipelinePlacement({
      version: 1,
      mockupTemplate: { id: "t1", name: "Front", baseImageKey: "main.png", lifestyleImageKey: "lifestyle.png" },
      printArea: { x: 100, y: 100, width: 500, height: 800, safeX: 120, safeY: 120, safeWidth: 460, safeHeight: 760 },
      position: { x: 200, y: 300, width: 100, height: 150, scale: 1, rotation: 0 },
      galleryAssets: [{
        id: "life-1",
        role: "LIFESTYLE",
        imageKey: "lifestyle.png",
        metadataJson: { renderRegion: { canvasWidth: 1600, canvasHeight: 2000, x: 700, y: 400, width: 300, height: 600 } },
      }],
    }, {}, "lifestyle");

    expect(placement).toEqual({ x: 760, y: 550, width: 60, height: 113, scale: 1, rotation: 0 });
  });

  it("refuses a distinct lifestyle image without calibration", () => {
    expect(() => resolvePipelinePlacement({
      version: 1,
      mockupTemplate: { id: "t1", name: "Front", baseImageKey: "main.png", lifestyleImageKey: "lifestyle.png" },
      printArea: { x: 0, y: 0, width: 500, height: 800, safeX: 0, safeY: 0, safeWidth: 500, safeHeight: 800 },
      position: { x: 50, y: 50, width: 100, height: 100, scale: 1, rotation: 0 },
    }, {}, "lifestyle")).toThrow("LIFESTYLE_RENDER_REGION_MISSING");
  });

  it("rejects a gallery image whose pixels no longer match its calibrated canvas", async () => {
    const main = await createSolidPng(500, 500, { r: 220, g: 225, b: 240 });
    const lifestyle = await createSolidPng(800, 1000, { r: 230, g: 220, b: 210 });
    const design = await createSolidPng(100, 100, { r: 243, g: 158, b: 124 });
    const { client: store } = createMemoryStore({
      "public:templates/main.png": main,
      "public:templates/lifestyle.png": lifestyle,
      "private:designs/demo.png": design,
    });
    const renderer = new SharpRenderer(undefined, store);

    await expect(renderer.renderPipelineMockup({
      id: "selection-mismatch",
      pipeline: "LOCAL",
      latestDesignVersion: { fileKey: "designs/demo.png" },
      placementConfigJson: {
        version: 1,
        mockupTemplate: { id: "t1", name: "Front", baseImageKey: "templates/main.png", lifestyleImageKey: "templates/lifestyle.png" },
        printArea: { x: 0, y: 0, width: 500, height: 500, safeX: 0, safeY: 0, safeWidth: 500, safeHeight: 500 },
        position: { x: 100, y: 100, width: 200, height: 200, scale: 1, rotation: 0 },
        galleryAssets: [{
          id: "lifestyle-1",
          role: "LIFESTYLE",
          imageKey: "templates/lifestyle.png",
          metadataJson: { renderRegion: { canvasWidth: 1600, canvasHeight: 2000, x: 600, y: 500, width: 400, height: 700 } },
        }],
      },
    }, "lifestyle")).rejects.toThrow("MOCKUP_TEMPLATE_DIMENSIONS_MISMATCH");
  });

  it("rejects a primary view whose pixels no longer match its saved canvas", async () => {
    const template = await createSolidPng(800, 1000, { r: 220, g: 225, b: 240 });
    const design = await createSolidPng(100, 100, { r: 243, g: 158, b: 124 });
    const { client: store } = createMemoryStore({
      "public:templates/main.png": template,
      "private:designs/demo.png": design,
    });
    const renderer = new SharpRenderer(undefined, store);

    await expect(renderer.renderPipelineMockup({
      id: "primary-mismatch",
      pipeline: "LOCAL",
      latestDesignVersion: { fileKey: "designs/demo.png" },
      placementConfigJson: {
        version: 1,
        mockupTemplate: { id: "t1", name: "Front", baseImageKey: "templates/main.png" },
        mockupView: {
          id: "view-1",
          viewKey: "front",
          placementCode: "FRONT",
          name: "Front",
          blankImageKey: "templates/main.png",
          metadataJson: { canvasWidth: 1600, canvasHeight: 2000 },
        },
        printArea: { x: 0, y: 0, width: 500, height: 500, safeX: 0, safeY: 0, safeWidth: 500, safeHeight: 500 },
        position: { x: 100, y: 100, width: 200, height: 200, scale: 1, rotation: 0 },
      },
    }, "main")).rejects.toThrow("MOCKUP_TEMPLATE_DIMENSIONS_MISMATCH");
  });

  it("rejects non-finite or excessively large artwork layers before Sharp allocation", async () => {
    const template = await createSolidPng(100, 100, { r: 220, g: 225, b: 240 });
    const design = await createSolidPng(10, 10, { r: 243, g: 158, b: 124 });
    const { client: store } = createMemoryStore({
      "public:templates/base.png": template,
      "private:designs/demo.png": design,
    });
    const base = {
      templateKey: "templates/base.png",
      designKey: "designs/demo.png",
      variant: "main" as const,
      outputWidth: 2000,
      outputHeight: 2000,
    };

    await expect(compositeMockupImage(store, {
      ...base,
      placement: { x: 0, y: 0, width: Number.NaN, height: 10, scale: 1, rotation: 0 },
    })).rejects.toThrow("MOCKUP_PLACEMENT_INVALID");
    await expect(compositeMockupImage(store, {
      ...base,
      placement: { x: 0, y: 0, width: 1000, height: 1000, scale: 10, rotation: 0 },
    })).rejects.toThrow("MOCKUP_ARTWORK_LAYER_TOO_LARGE");
  });

  it("changes the cache fingerprint when artwork, template, or placement inputs change", async () => {
    const renderer = new SharpRenderer(undefined, createMemoryStore({}).client);
    const base: PipelineRenderContext = {
      id: "selection-1",
      pipeline: "LOCAL",
      latestDesignVersion: { fileKey: "designs/version-1.png" },
      placementConfigJson: {
        version: 1,
        mockupTemplate: { id: "template-1", name: "Front", baseImageKey: "templates/front-v1.png" },
        printArea: { x: 0, y: 0, width: 500, height: 500, safeX: 0, safeY: 0, safeWidth: 500, safeHeight: 500 },
        position: { x: 100, y: 100, width: 200, height: 200, scale: 1, rotation: 0 },
      },
    };
    const original = renderer.renderFingerprint(base, "main");
    const artworkChanged = renderer.renderFingerprint({ ...base, latestDesignVersion: { fileKey: "designs/version-2.png" } }, "main");
    const templateChanged = renderer.renderFingerprint({
      ...base,
      placementConfigJson: { ...(base.placementConfigJson as any), mockupTemplate: { id: "template-1", name: "Front", baseImageKey: "templates/front-v2.png" } },
    }, "main");
    const placementChanged = renderer.renderFingerprint({
      ...base,
      placementConfigJson: { ...(base.placementConfigJson as any), position: { x: 120, y: 100, width: 200, height: 200, scale: 1, rotation: 0 } },
    }, "main");

    expect(new Set([original, artworkChanged, templateChanged, placementChanged]).size).toBe(4);
  });
});
