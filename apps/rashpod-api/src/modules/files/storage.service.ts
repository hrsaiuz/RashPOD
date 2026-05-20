import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { Storage as StorageClient } from "@google-cloud/storage";

function firstPresent(...values: Array<string | undefined>) {
  return values.find((value) => value && value.trim().length > 0)?.trim();
}

@Injectable()
export class StorageService {
  private storage?: StorageClient;
  private readonly projectId?: string;
  private readonly bucketName: string;
  private readonly publicBucketName: string;

  constructor() {
    this.projectId = firstPresent(process.env.GCP_PROJECT_ID, process.env.GOOGLE_CLOUD_PROJECT, process.env.GCLOUD_PROJECT);
    const sharedBucket = firstPresent(process.env.GCS_BUCKET_ASSETS, process.env.GCS_BUCKET_NAME);
    this.bucketName = firstPresent(process.env.GCS_BUCKET_PRIVATE, sharedBucket, "rashpod-assets-private")!;
    this.publicBucketName = firstPresent(process.env.GCS_BUCKET_PUBLIC, sharedBucket, "rashpod-assets-public")!;
  }

  private getStorage() {
    if (this.storage) return this.storage;
    if (this.projectId) {
      // Lazy-load the SDK so tests/local startup do not create GCS handles until storage is actually used.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Storage } = require("@google-cloud/storage") as typeof import("@google-cloud/storage");
      this.storage = new Storage({ projectId: this.projectId });
      return this.storage;
    }
    if (process.env.NODE_ENV === "production") {
      throw new ServiceUnavailableException(
        "Google Cloud Storage is not configured. Set GCP_PROJECT_ID and GCS bucket environment variables.",
      );
    }
    return undefined;
  }

  getPublicBucketName() {
    return this.publicBucketName;
  }

  getPrivateBucketName() {
    return this.bucketName;
  }

  buildPublicUrl(objectKey: string) {
    return `https://storage.googleapis.com/${this.publicBucketName}/${objectKey}`;
  }

  async createPublicPresignedUploadUrl(input: { objectKey: string; mimeType: string; sizeBytes: number }) {
    const storage = this.getStorage();
    if (storage) {
      const [uploadUrl] = await storage
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
    const storage = this.getStorage();
    if (!storage) return;
    try {
      await storage.bucket(this.publicBucketName).file(objectKey).delete({ ignoreNotFound: true });
    } catch {
      // best-effort
    }
  }

  async getPublicObjectMetadata(objectKey: string) {
    const storage = this.getStorage();
    if (!storage) return null;
    const [exists] = await storage.bucket(this.publicBucketName).file(objectKey).exists();
    if (!exists) return null;
    const [metadata] = await storage.bucket(this.publicBucketName).file(objectKey).getMetadata();
    return {
      sizeBytes: Number(metadata.size),
      mimeType: metadata.contentType || "",
    };
  }

  async createPresignedUploadUrl(input: { objectKey: string; mimeType: string; sizeBytes: number }) {
    const storage = this.getStorage();
    if (storage) {
      const [uploadUrl] = await storage
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
    const storage = this.getStorage();
    if (!storage) return null;
    const [exists] = await storage.bucket(this.bucketName).file(input.objectKey).exists();
    if (!exists) return null;
    const [metadata] = await storage.bucket(this.bucketName).file(input.objectKey).getMetadata();
    return {
      sizeBytes: Number(metadata.size),
      mimeType: metadata.contentType || "",
      checksumMd5Base64: metadata.md5Hash || undefined,
    };
  }

  async createSignedReadUrl(input: { objectKey: string; expiresSeconds: number }) {
    const storage = this.getStorage();
    if (storage) {
      const [url] = await storage
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
