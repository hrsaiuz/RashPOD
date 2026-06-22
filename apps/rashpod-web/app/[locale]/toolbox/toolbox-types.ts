"use client";

export type ToolboxToolId = "batch-crop" | "background-remover";
export type OutputFormat = "png" | "jpeg";
export type CropPresetId =
  | "square"
  | "product-portrait"
  | "portrait"
  | "banner"
  | "story"
  | "a4-portrait"
  | "a4-landscape"
  | "custom";

export type FitMode = "fit" | "fill";
export type NoticeTone = "success" | "error" | "info";

export type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CropItem = {
  id: string;
  file: File;
  objectUrl: string;
  imageWidth: number;
  imageHeight: number;
  crop: { x: number; y: number };
  zoom: number;
  rotation: number;
  fitMode: FitMode;
  areaPixels?: CropArea;
};

export type BackgroundItemStatus = "ready" | "processing" | "done" | "error";

export type BackgroundItem = {
  id: string;
  file: File;
  originalUrl: string;
  resultUrl?: string;
  resultBlob?: Blob;
  status: BackgroundItemStatus;
  errorMessage?: string;
};

export type ToolboxToast = {
  id: string;
  tone: NoticeTone;
  message: string;
};

export type CropPreset = {
  id: CropPresetId;
  translationKey: string;
  aspect: number;
  width: number;
  height: number;
};

export const CROP_PRESETS: CropPreset[] = [
  { id: "square", translationKey: "presets.square", aspect: 1, width: 2000, height: 2000 },
  { id: "product-portrait", translationKey: "presets.productPortrait", aspect: 4 / 5, width: 2000, height: 2500 },
  { id: "portrait", translationKey: "presets.portrait", aspect: 3 / 4, width: 1800, height: 2400 },
  { id: "banner", translationKey: "presets.banner", aspect: 16 / 9, width: 2400, height: 1350 },
  { id: "story", translationKey: "presets.story", aspect: 9 / 16, width: 1080, height: 1920 },
  { id: "a4-portrait", translationKey: "presets.a4Portrait", aspect: 2480 / 3508, width: 2480, height: 3508 },
  { id: "a4-landscape", translationKey: "presets.a4Landscape", aspect: 3508 / 2480, width: 3508, height: 2480 },
];

export const BATCH_CROP_MAX_FILES = 50;
export const BATCH_CROP_MAX_FILE_SIZE = 20 * 1024 * 1024;
export const BACKGROUND_MAX_FILES = 20;
export const BACKGROUND_MAX_FILE_SIZE = 15 * 1024 * 1024;
