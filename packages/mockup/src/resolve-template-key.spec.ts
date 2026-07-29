import assert from "node:assert/strict";
import test from "node:test";
import { resolveTemplateImageKey } from "./resolve-template-key";
import type { PlacementConfigV1 } from "./types";

const config: PlacementConfigV1 = {
  version: 1,
  mockupTemplate: {
    id: "template_1",
    name: "Classic tee",
    baseImageKey: "legacy/base.png",
    lifestyleImageKey: "legacy/lifestyle.png",
    closeupImageKey: "legacy/detail.png",
  },
  mockupView: {
    id: "view_back",
    viewKey: "back",
    placementCode: "back",
    name: "Back",
    blankImageKey: "views/back.png",
  },
  galleryAssets: [
    { id: "asset_lifestyle", mockupViewId: "view_back", role: "LIFESTYLE", imageKey: "gallery/back-lifestyle.png", sortOrder: 0 },
    { id: "asset_detail", mockupViewId: null, role: "DETAIL", imageKey: "gallery/detail.png", sortOrder: 0 },
  ],
  printArea: {
    x: 100,
    y: 100,
    width: 500,
    height: 600,
    safeX: 120,
    safeY: 120,
    safeWidth: 460,
    safeHeight: 560,
  },
  position: { x: 150, y: 150, width: 200, height: 240, scale: 1, rotation: 0 },
};

test("resolves normalized product-view and gallery keys before legacy columns", () => {
  assert.equal(resolveTemplateImageKey(config, "main"), "views/back.png");
  assert.equal(resolveTemplateImageKey(config, "preview"), "views/back.png");
  assert.equal(resolveTemplateImageKey(config, "lifestyle"), "gallery/back-lifestyle.png");
  assert.equal(resolveTemplateImageKey(config, "closeup"), "gallery/detail.png");
});

test("falls back to legacy template keys when normalized fields are absent", () => {
  const legacy: PlacementConfigV1 = {
    ...config,
    mockupView: undefined,
    galleryAssets: undefined,
  };

  assert.equal(resolveTemplateImageKey(legacy, "main"), "legacy/base.png");
  assert.equal(resolveTemplateImageKey(legacy, "lifestyle"), "legacy/lifestyle.png");
  assert.equal(resolveTemplateImageKey(legacy, "closeup"), "legacy/detail.png");
});
