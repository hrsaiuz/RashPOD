import { StorageService } from "../src/modules/files/storage.service";

describe("StorageService", () => {
  afterEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.GCP_PROJECT_ID;
    delete process.env.GCS_BUCKET_ASSETS;
    delete process.env.GCS_BUCKET_PRIVATE;
    delete process.env.GCS_BUCKET_PUBLIC;
  });

  it("returns dashboard upload proxy URL when GCS client is not configured", async () => {
    const service = new StorageService();
    const result = await service.createPresignedUploadUrl({
      objectKey: "design-originals/u1/a.png",
      mimeType: "image/png",
      sizeBytes: 100,
      fileId: "file-1",
    });
    expect(result.method).toBe("PUT");
    expect(result.uploadUrl).toContain("/api/upload/file-1");
  });

  it("throws in production when GCS is not configured", async () => {
    process.env.NODE_ENV = "production";
    const service = new StorageService();

    await expect(
      service.createPresignedUploadUrl({
        objectKey: "design-originals/u1/a.png",
        mimeType: "image/png",
        sizeBytes: 100,
      }),
    ).rejects.toThrow("Google Cloud Storage is not configured");
  });

  it("uses shared asset bucket env vars for public and private buckets", () => {
    process.env.GCP_PROJECT_ID = "p1";
    process.env.GCS_BUCKET_ASSETS = "rashpod-assets";

    const service = new StorageService();

    expect(service.getPrivateBucketName()).toBe("rashpod-assets");
    expect(service.getPublicBucketName()).toBe("rashpod-assets");
    expect(service.buildPublicUrl("media/logo.png")).toBe("https://storage.googleapis.com/rashpod-assets/media/logo.png");
  });

  it("uses configured storage client for metadata and read URL", async () => {
    process.env.GCP_PROJECT_ID = "p1";
    process.env.GCS_BUCKET_PRIVATE = "b1";
    const service = new StorageService() as any;
    service.storage = {
      bucket: () => ({
        file: () => ({
          exists: async () => [true],
          getMetadata: async () => [{ size: "321", contentType: "image/png", md5Hash: "abc==" }],
          getSignedUrl: async () => ["https://gcs.example/signed"],
        }),
      }),
    };

    const metadata = await service.getObjectMetadata({ objectKey: "k1" });
    expect(metadata).toEqual({ sizeBytes: 321, mimeType: "image/png", checksumMd5Base64: "abc==" });

    const readUrl = await service.createSignedReadUrl({ objectKey: "k1", expiresSeconds: 120 });
    expect(readUrl).toBe("https://gcs.example/signed");
  });
});
