import { api, uploadToSignedUrl } from "./api";

type UploadUrlResponse = {
  fileId: string;
  url?: string;
  uploadUrl?: string;
  headers?: Record<string, string>;
  uploadHeaders?: Record<string, string>;
};

export type UploadedIntakeFile = {
  fileId: string;
  name: string;
  size: number;
  type: string;
};

export async function uploadIntakeFiles(files: FileList | File[] | null): Promise<UploadedIntakeFile[]> {
  if (!files || (Array.isArray(files) ? files.length === 0 : files.length === 0)) return [];

  const list = Array.from(files);
  const uploaded: UploadedIntakeFile[] = [];

  for (const file of list) {
    const signed = await api.post<UploadUrlResponse>("/intake/files/upload-url", {
      purpose: "DESIGN_ORIGINAL",
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    });

    const url = signed.uploadUrl || signed.url;
    if (!url || !signed.fileId) {
      throw new Error(`Upload URL unavailable for ${file.name}`);
    }

    await uploadToSignedUrl(url, file, signed.uploadHeaders || signed.headers);
    await api.post("/intake/files/complete-upload", {
      fileId: signed.fileId,
      uploadedSizeBytes: file.size,
      uploadedMimeType: file.type || "application/octet-stream",
    });

    uploaded.push({
      fileId: signed.fileId,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  }

  return uploaded;
}
