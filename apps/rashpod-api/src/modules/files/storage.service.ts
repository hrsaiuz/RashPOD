import { Injectable } from "@nestjs/common";
import { Storage } from "@google-cloud/storage";

@Injectable()
export class StorageService {
  private readonly storage?: Storage;
  private readonly bucketName: string;

  constructor() {
    this.bucketName = process.env.GCS_BUCKET_PRIVATE || "rashpod-assets-private";
    if (process.env.GCP_PROJECT_ID && process.env.GCS_BUCKET_PRIVATE) {
      this.storage = new Storage({ projectId: process.env.GCP_PROJECT_ID });
    }
  }

  async createPresignedUploadUrl(input: { objectKey: string; mimeType: string; sizeBytes: number }) {
    if (this.storage) {
      const [uploadUrl] = await this.storage
        .bucket(this.bucketName)
        .file(input.objectKey)
        .getSignedUrl({
          version: "v4",
          action: "write",
          expires: Date.now() + 15 * 60 * 1000,
          contentType: input.mimeType,
        });
      return {
        method: "PUT",
        uploadUrl,
        headers: {
          "content-type": input.mimeType,
        },
      };
    }

    return {
      method: "PUT",
      uploadUrl: `https://storage.local/upload/${encodeURIComponent(input.objectKey)}`,
      headers: {
        "content-type": input.mimeType,
      },
    };
  }

  async getObjectMetadata(input: { objectKey: string }) {
    if (!this.storage) return null;
    const [exists] = await this.storage.bucket(this.bucketName).file(input.objectKey).exists();
    if (!exists) return null;
    const [metadata] = await this.storage.bucket(this.bucketName).file(input.objectKey).getMetadata();
    return {
      sizeBytes: Number(metadata.size),
      mimeType: metadata.contentType || "",
      checksumMd5Base64: metadata.md5Hash || undefined,
    };
  }

  async createSignedReadUrl(input: { objectKey: string; expiresSeconds: number }) {
    if (this.storage) {
      const [url] = await this.storage
        .bucket(this.bucketName)
        .file(input.objectKey)
        .getSignedUrl({
          version: "v4",
          action: "read",
          expires: Date.now() + input.expiresSeconds * 1000,
        });
      return url;
    }
    return `https://storage.local/read/${encodeURIComponent(input.objectKey)}?exp=${input.expiresSeconds}`;
  }
}
