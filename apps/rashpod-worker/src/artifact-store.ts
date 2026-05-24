import { promises as fs } from "fs";
import * as path from "path";

export type ArtifactBucket = "private" | "public" | "assets";

export interface ArtifactStore {
  getBuffer(objectKey: string, bucket: "private" | "public"): Promise<Buffer>;
  putBuffer(relKey: string, buffer: Buffer, contentType: string): Promise<string>;
}

function firstPresent(...values: Array<string | undefined>) {
  return values.find((value) => value && value.trim().length > 0)?.trim();
}

export function resolveBucketNames() {
  const shared = firstPresent(process.env.GCS_BUCKET_ASSETS, process.env.GCS_BUCKET_NAME);
  return {
    private: firstPresent(process.env.GCS_BUCKET_PRIVATE, shared, "rashpod-assets-private")!,
    public: firstPresent(process.env.GCS_BUCKET_PUBLIC, shared, "rashpod-assets-public")!,
    assets: firstPresent(shared, process.env.GCS_BUCKET_PUBLIC, "rashpod-assets-public")!,
  };
}

class LocalArtifactStore implements ArtifactStore {
  constructor(private readonly baseDir: string) {}

  private resolvePath(objectKey: string) {
    const normalized = objectKey.replace(/\\/g, "/");
    return path.join(this.baseDir, normalized);
  }

  async getBuffer(objectKey: string, bucket: "private" | "public"): Promise<Buffer> {
    const candidates = [
      this.resolvePath(objectKey),
      this.resolvePath(path.join(bucket, objectKey)),
      this.resolvePath(path.join("fixtures", objectKey)),
    ];
    for (const candidate of candidates) {
      try {
        return await fs.readFile(candidate);
      } catch {
        // try next candidate
      }
    }
    throw new Error(`Local artifact not found for ${bucket}:${objectKey}`);
  }

  async putBuffer(relKey: string, buffer: Buffer): Promise<string> {
    const normalized = relKey.replace(/\\/g, "/");
    const absPath = path.join(this.baseDir, normalized);
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, buffer);
    return normalized;
  }
}

class GcsArtifactStore implements ArtifactStore {
  private readonly storage: any;
  private readonly buckets: ReturnType<typeof resolveBucketNames>;

  constructor(projectId: string, buckets: ReturnType<typeof resolveBucketNames>) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Storage } = require("@google-cloud/storage");
    this.storage = new Storage({ projectId });
    this.buckets = buckets;
  }

  private bucketName(bucket: ArtifactBucket) {
    if (bucket === "private") return this.buckets.private;
    if (bucket === "public") return this.buckets.public;
    return this.buckets.assets;
  }

  async getBuffer(objectKey: string, bucket: "private" | "public"): Promise<Buffer> {
    const normalized = objectKey.replace(/\\/g, "/");
    const file = this.storage.bucket(this.bucketName(bucket)).file(normalized);
    const [buffer] = await file.download();
    return buffer;
  }

  async putBuffer(relKey: string, buffer: Buffer, contentType: string): Promise<string> {
    const normalized = relKey.replace(/\\/g, "/");
    const file = this.storage.bucket(this.bucketName("assets")).file(normalized);
    await file.save(buffer, {
      resumable: false,
      metadata: { contentType },
    });
    return normalized;
  }
}

export function createArtifactStore(baseDir = path.resolve(process.cwd(), "worker-artifacts")): ArtifactStore {
  const projectId = firstPresent(
    process.env.GCP_PROJECT_ID,
    process.env.GCS_PROJECT_ID,
    process.env.GOOGLE_CLOUD_PROJECT,
    process.env.GCLOUD_PROJECT,
  );
  const buckets = resolveBucketNames();
  if (projectId && (process.env.GCS_BUCKET_ASSETS || process.env.GCS_BUCKET_NAME || process.env.GCS_BUCKET_PRIVATE || process.env.GCS_BUCKET_PUBLIC)) {
    return new GcsArtifactStore(projectId, buckets);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Google Cloud Storage is not configured for worker artifacts");
  }
  return new LocalArtifactStore(baseDir);
}
