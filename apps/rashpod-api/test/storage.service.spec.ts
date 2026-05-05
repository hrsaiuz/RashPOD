import { StorageService } from "../src/modules/files/storage.service";

describe("StorageService", () => {
  afterEach(() => {
    delete process.env.GCP_PROJECT_ID;
    delete process.env.GCS_BUCKET_PRIVATE;
  });

  it("returns local fallback upload URL when GCS client is not configured", async () => {
    const service = new StorageService();
    const result = await service.createPresignedUploadUrl({
      objectKey: "design-originals/u1/a.png",
      mimeType: "image/png",
      sizeBytes: 100,
    });
    expect(result.method).toBe("PUT");
    expect(result.uploadUrl).toContain("storage.local/upload/");
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
