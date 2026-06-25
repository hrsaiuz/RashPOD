import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { promises as fs } from "fs";
import * as path from "path";
import type { Storage as StorageClient } from "@google-cloud/storage";
import { DESIGN_ORIGINAL_MAX_BYTES } from "./asset-upload-policy";

function firstPresent(...values: Array<string | undefined>) {
  return values.find((value) => value && value.trim().length > 0)?.trim();
}

type PresignedUploadInput = {
  objectKey: string;
  mimeType: string;
  sizeBytes: number;
  fileId?: string;
};

@Injectable()
export class StorageService {
  private storage?: StorageClient;
  private readonly projectId?: string;
  private readonly bucketName: string;
  private readonly publicBucketName: string;
  private readonly localAssetsDir: string;

  constructor() {
    this.projectId = firstPresent(process.env.GCP_PROJECT_ID, process.env.GCS_PROJECT_ID, process.env.GOOGLE_CLOUD_PROJECT, process.env.GCLOUD_PROJECT);
    const sharedBucket = firstPresent(process.env.GCS_BUCKET_ASSETS, process.env.GCS_BUCKET_NAME);
    this.bucketName = firstPresent(process.env.GCS_BUCKET_PRIVATE, sharedBucket, "rashpod-assets-private")!;
    this.publicBucketName = firstPresent(process.env.GCS_BUCKET_PUBLIC, sharedBucket, "rashpod-assets-public")!;
    this.localAssetsDir = firstPresent(process.env.LOCAL_ASSETS_DIR) ?? path.resolve(process.cwd(), "local-assets");
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

  private localObjectPath(objectKey: string) {
    return path.join(this.localAssetsDir, objectKey.replace(/\\/g, "/"));
  }

  private localUploadUrl(fileId: string) {
    const dashboardUrl = firstPresent(process.env.DASHBOARD_URL, "http://localhost:3001") ?? "http://localhost:3001";
    return `${dashboardUrl.replace(/\/$/, "")}/api/upload/${fileId}`;
  }

  private localPublicUrl(objectKey: string) {
    return `https://storage.local/public/${encodeURIComponent(objectKey)}`;
  }

  getPublicBucketName() {
    return this.publicBucketName;
  }

  isCloudStorageConfigured() {
    return Boolean(this.projectId);
  }

  getPrivateBucketName() {
    return this.bucketName;
  }

  buildPublicUrl(objectKey: string) {
    return `https://storage.googleapis.com/${this.publicBucketName}/${objectKey}`;
  }

  async createPublicPresignedUploadUrl(input: PresignedUploadInput) {
    const storage = this.getStorage();
    if (storage) {
      const [uploadUrl] = await storage.bucket(this.publicBucketName).file(input.objectKey).getSignedUrl({
        version: "v4",
        action: "write",
        expires: Date.now() + 15 * 60 * 1000,
      });
      return {
        method: "PUT" as const,
        uploadUrl,
        headers: { "Content-Type": input.mimeType },
        publicUrl: this.buildPublicUrl(input.objectKey),
      };
    }
    if (!input.fileId) {
      throw new ServiceUnavailableException("Local upload requires a file id");
    }
      return {
        method: "PUT" as const,
        uploadUrl: this.localUploadUrl(input.fileId),
        headers: { "Content-Type": input.mimeType },
        publicUrl: this.localPublicUrl(input.objectKey),
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
    if (!storage) return this.getLocalObjectMetadata(objectKey);
    const [exists] = await storage.bucket(this.publicBucketName).file(objectKey).exists();
    if (!exists) return this.getLocalObjectMetadata(objectKey);
    const [metadata] = await storage.bucket(this.publicBucketName).file(objectKey).getMetadata();
    return {
      sizeBytes: Number(metadata.size),
      mimeType: metadata.contentType || "",
      checksumMd5Base64: metadata.md5Hash || undefined,
    };
  }

  async createPresignedUploadUrl(input: PresignedUploadInput) {
    const storage = this.getStorage();
    if (storage) {
      const [uploadUrl] = await storage.bucket(this.bucketName).file(input.objectKey).getSignedUrl({
        version: "v4",
        action: "write",
        expires: Date.now() + 15 * 60 * 1000,
      });
      return {
        method: "PUT" as const,
        uploadUrl,
        headers: {
          "Content-Type": input.mimeType,
        },
      };
    }

    if (!input.fileId) {
      throw new ServiceUnavailableException("Local upload requires a file id");
    }

    return {
      method: "PUT" as const,
      uploadUrl: this.localUploadUrl(input.fileId),
      headers: {
        "Content-Type": input.mimeType,
      },
    };
  }

  async writeLocalObject(input: { objectKey: string; buffer: Buffer; mimeType: string }) {
    const absPath = this.localObjectPath(input.objectKey);
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, input.buffer);
    const sidecarPath = `${absPath}.meta.json`;
    await fs.writeFile(sidecarPath, JSON.stringify({ mimeType: input.mimeType, sizeBytes: input.buffer.byteLength }), "utf8");
    return {
      sizeBytes: input.buffer.byteLength,
      mimeType: input.mimeType,
    };
  }

  async getLocalObjectMetadata(objectKey: string) {
    const absPath = this.localObjectPath(objectKey);
    try {
      const [stat, sidecarRaw] = await Promise.all([
        fs.stat(absPath),
        fs.readFile(`${absPath}.meta.json`, "utf8").catch(() => ""),
      ]);
      let mimeType = "";
      if (sidecarRaw) {
        try {
          mimeType = String(JSON.parse(sidecarRaw).mimeType ?? "");
        } catch {
          mimeType = "";
        }
      }
      return {
        sizeBytes: stat.size,
        mimeType,
        checksumMd5Base64: undefined,
      };
    } catch {
      return null;
    }
  }

  async getObjectMetadata(input: { objectKey: string }) {
    const storage = this.getStorage();
    if (!storage) return this.getLocalObjectMetadata(input.objectKey);
    const [exists] = await storage.bucket(this.bucketName).file(input.objectKey).exists();
    if (!exists) return this.getLocalObjectMetadata(input.objectKey);
    const [metadata] = await storage.bucket(this.bucketName).file(input.objectKey).getMetadata();
    return {
      sizeBytes: Number(metadata.size),
      mimeType: metadata.contentType || "",
      checksumMd5Base64: metadata.md5Hash || undefined,
    };
  }

  async getAssetObjectMetadata(input: { objectKey: string; bucketKind: "private" | "public" }) {
    if (input.bucketKind === "public") return this.getPublicObjectMetadata(input.objectKey);
    return this.getObjectMetadata({ objectKey: input.objectKey });
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

  async createPublicSignedReadUrl(input: { objectKey: string; expiresSeconds: number }) {
    const storage = this.getStorage();
    if (storage) {
      const [url] = await storage
        .bucket(this.publicBucketName)
        .file(input.objectKey)
        .getSignedUrl({
          version: "v4",
          action: "read",
          expires: Date.now() + input.expiresSeconds * 1000,
        });
      return url;
    }
    return `https://storage.local/public-read/${encodeURIComponent(input.objectKey)}?exp=${input.expiresSeconds}`;
  }

  async writePublicObject(input: { objectKey: string; buffer: Buffer; mimeType: string }) {
    const storage = this.getStorage();
    if (!storage) {
      const stored = await this.writeLocalObject(input);
      return {
        bucket: this.publicBucketName,
        sizeBytes: stored.sizeBytes,
        storageProvider: "LOCAL_DEV" as const,
        publicUrl: this.localPublicUrl(input.objectKey),
      };
    }
    await storage.bucket(this.publicBucketName).file(input.objectKey).save(input.buffer, {
      contentType: input.mimeType,
      resumable: input.buffer.byteLength > 5_000_000,
    });
    return {
      bucket: this.publicBucketName,
      sizeBytes: input.buffer.byteLength,
      storageProvider: "GCS" as const,
      publicUrl: this.buildPublicUrl(input.objectKey),
    };
  }

  async writePrivateObject(input: { objectKey: string; buffer: Buffer; mimeType: string }) {
    const storage = this.getStorage();
    if (!storage) {
      const stored = await this.writeLocalObject(input);
      return {
        bucket: this.bucketName,
        sizeBytes: stored.sizeBytes,
        storageProvider: "LOCAL_DEV" as const,
      };
    }
    await storage.bucket(this.bucketName).file(input.objectKey).save(input.buffer, {
      contentType: input.mimeType,
      resumable: input.buffer.byteLength > 5_000_000,
    });
    return {
      bucket: this.bucketName,
      sizeBytes: input.buffer.byteLength,
      storageProvider: "GCS" as const,
    };
  }

  getLocalUploadMaxBytes() {
    return DESIGN_ORIGINAL_MAX_BYTES;
  }
}
