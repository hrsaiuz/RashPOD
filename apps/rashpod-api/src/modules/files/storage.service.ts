import { Injectable } from "@nestjs/common";
import { Storage } from "@google-cloud/storage";

@Injectable()
export class StorageService {
  private readonly storage?: Storage;
  private readonly bucketName: string;
  private readonly publicBucketName: string;

  constructor() {
    this.bucketName = process.env.GCS_BUCKET_PRIVATE || "rashpod-assets-private";
    this.publicBucketName = process.env.GCS_BUCKET_PUBLIC || "rashpod-assets-public";
    if (process.env.GCP_PROJECT_ID && (process.env.GCS_BUCKET_PRIVATE || process.env.GCS_BUCKET_PUBLIC)) {
      this.storage = new Storage({ projectId: process.env.GCP_PROJECT_ID });
    }
  }

  getPublicBucketName() {
    return this.publicBucketName;
  }

  buildPublicUrl(objectKey: string) {
    return `https://storage.googleapis.com/${this.publicBucketName}/${objectKey}`;
  }

  async createPublicPresignedUploadUrl(input: { objectKey: string; mimeType: string; sizeBytes: number }) {
    if (this.storage) {
      const [uploadUrl] = await this.storage
        .bucket(this.publicBucketName)
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
        headers: { "content-type": input.mimeType },
        publicUrl: this.buildPublicUrl(input.objectKey),
      };
    }
    return {
      method: "PUT",
      uploadUrl: `https://storage.local/public-upload/${encodeURIComponent(input.objectKey)}`,
      headers: { "content-type": input.mimeType },
      publicUrl: `https://storage.local/public/${encodeURIComponent(input.objectKey)}`,
    };
  }

  async deletePublicObject(objectKey: string) {
    if (!this.storage) return;
    try {
      await this.storage.bucket(this.publicBucketName).file(objectKey).delete({ ignoreNotFound: true });
    } catch {
      // best-effort
    }
  }

  async getPublicObjectMetadata(objectKey: string) {
    if (!this.storage) return null;
    const [exists] = await this.storage.bucket(this.publicBucketName).file(objectKey).exists();
    if (!exists) return null;
    const [metadata] = await this.storage.bucket(this.publicBucketName).file(objectKey).getMetadata();
    return {
      sizeBytes: Number(metadata.size),
      mimeType: metadata.contentType || "",
    };
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
