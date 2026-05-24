import type { ArtifactStore } from "./artifact-store";
import { compositeMockupImage } from "./mockup-compositor";
import { SharpRenderer } from "./renderer";

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
    expect(result.fileKey).toContain("pipeline-mockups/sel_test/main.png");
    const output = (store as any).get?.("pipeline-mockups/sel_test/main.png");
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

  it("throws when template key is missing", async () => {
    const { client: store } = createMemoryStore({});
    const renderer = new SharpRenderer(undefined, store);
    await expect(
      renderer.renderPipelineMockup({ id: "sel_x", pipeline: "LOCAL", placementConfigJson: { version: 1, mockupTemplate: {}, position: {} } }, "main"),
    ).rejects.toThrow("MOCKUP_TEMPLATE_IMAGE_MISSING");
  });
});
