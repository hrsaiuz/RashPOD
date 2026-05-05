import { promises as fs } from "fs";
import * as path from "path";

export interface ArtifactStore {
  putBuffer(relKey: string, buffer: Buffer, contentType: string): Promise<string>;
}

class LocalArtifactStore implements ArtifactStore {
  constructor(private readonly baseDir: string) {}

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

  constructor(
    projectId: string,
    private readonly bucketName: string,
  ) {
    // Lazy-load SDK only when GCS mode is active to avoid test-time open handles.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Storage } = require("@google-cloud/storage");
    this.storage = new Storage({ projectId });
  }

  async putBuffer(relKey: string, buffer: Buffer, contentType: string): Promise<string> {
    const normalized = relKey.replace(/\\/g, "/");
    const file = this.storage.bucket(this.bucketName).file(normalized);
    await file.save(buffer, {
      resumable: false,
      metadata: { contentType },
    });
    return normalized;
  }
}

export function createArtifactStore(baseDir = path.resolve(process.cwd(), "worker-artifacts")): ArtifactStore {
  const projectId = process.env.GCP_PROJECT_ID;
  const bucket = process.env.GCS_BUCKET_ASSETS;
  if (projectId && bucket) return new GcsArtifactStore(projectId, bucket);
  return new LocalArtifactStore(baseDir);
}
