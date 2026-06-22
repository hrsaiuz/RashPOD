"use client";

import JSZip from "jszip";
import { triggerBlobDownload } from "../../../lib/toolbox";

export async function exportZipWithProgress(
  files: Array<{ filename: string; blob: Blob }>,
  archiveName: string,
  onProgress?: (value: number) => void,
) {
  const zip = new JSZip();
  for (const file of files) zip.file(file.filename, file.blob);
  const blob = await zip.generateAsync(
    { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
    (metadata) => onProgress?.(metadata.percent),
  );
  triggerBlobDownload(blob, archiveName);
}
