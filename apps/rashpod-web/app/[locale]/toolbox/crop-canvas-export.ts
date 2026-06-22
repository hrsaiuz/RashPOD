"use client";

import type { CropArea, OutputFormat } from "./toolbox-types";

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image decoding failed"));
    image.src = url;
  });
}

function rotatedBounds(width: number, height: number, rotation: number) {
  const radians = toRadians(rotation);
  return {
    width: Math.abs(Math.cos(radians) * width) + Math.abs(Math.sin(radians) * height),
    height: Math.abs(Math.sin(radians) * width) + Math.abs(Math.cos(radians) * height),
  };
}

export async function exportCroppedImageBlob(input: {
  sourceUrl: string;
  cropAreaPixels: CropArea;
  rotation: number;
  width: number;
  height: number;
  format: OutputFormat;
  jpegQuality: number;
  backgroundColor?: string;
  transparentBackground: boolean;
}) {
  const image = await createImage(input.sourceUrl);
  const radians = toRadians(input.rotation);
  const bounds = rotatedBounds(image.width, image.height, input.rotation);
  const safeCanvas = document.createElement("canvas");
  const safeContext = safeCanvas.getContext("2d");

  if (!safeContext) throw new Error("Canvas context unavailable");

  safeCanvas.width = Math.ceil(bounds.width);
  safeCanvas.height = Math.ceil(bounds.height);

  safeContext.translate(bounds.width / 2, bounds.height / 2);
  safeContext.rotate(radians);
  safeContext.drawImage(image, -image.width / 2, -image.height / 2);

  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = input.width;
  cropCanvas.height = input.height;
  const cropContext = cropCanvas.getContext("2d");
  if (!cropContext) throw new Error("Crop canvas context unavailable");

  if (!input.transparentBackground || input.format === "jpeg") {
    cropContext.fillStyle = input.backgroundColor || "#FFFFFF";
    cropContext.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
  } else {
    cropContext.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
  }

  cropContext.imageSmoothingEnabled = true;
  cropContext.imageSmoothingQuality = "high";
  cropContext.drawImage(
    safeCanvas,
    input.cropAreaPixels.x,
    input.cropAreaPixels.y,
    input.cropAreaPixels.width,
    input.cropAreaPixels.height,
    0,
    0,
    input.width,
    input.height,
  );

  const mimeType = input.format === "png" ? "image/png" : "image/jpeg";
  const quality = input.format === "jpeg" ? Math.max(0.1, Math.min(input.jpegQuality, 1)) : undefined;

  return new Promise<Blob>((resolve, reject) => {
    cropCanvas.toBlob((blob) => {
      if (!blob) reject(new Error("Canvas export failed"));
      else resolve(blob);
    }, mimeType, quality);
  });
}
