import { ForbiddenException } from "@nestjs/common";
import { FilesService } from "../src/modules/files/files.service";

describe("FilesService completeUpload", () => {
  it("uses storage metadata when available", async () => {
    const prisma: any = {
      fileAsset: {
        findUnique: jest.fn().mockResolvedValue({
          id: "f1",
          ownerId: "u1",
          objectKey: "design-originals/u1/file.png",
          sizeBytes: 100,
          mimeType: "image/png",
          checksum: undefined,
          uploadStatus: "PENDING",
        }),
        update: jest.fn().mockResolvedValue({ id: "f1", uploadStatus: "READY" }),
      },
    };
    const storage: any = {
      getObjectMetadata: jest.fn().mockResolvedValue({
        sizeBytes: 100,
        mimeType: "image/png",
      }),
    };
    const service = new FilesService(prisma, storage);

    await service.completeUpload("u1", {
      fileId: "f1",
      uploadedSizeBytes: 1,
      uploadedMimeType: "application/octet-stream",
    });

    expect(prisma.fileAsset.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ uploadStatus: "READY", sizeBytes: 100, mimeType: "image/png" }),
      }),
    );
  });

  it("falls back to client metadata when storage metadata unavailable", async () => {
    const prisma: any = {
      fileAsset: {
        findUnique: jest.fn().mockResolvedValue({
          id: "f2",
          ownerId: "u1",
          objectKey: "design-originals/u1/file2.png",
          sizeBytes: 200,
          mimeType: "image/png",
          checksum: undefined,
          uploadStatus: "PENDING",
        }),
        update: jest.fn().mockResolvedValue({ id: "f2", uploadStatus: "READY" }),
      },
    };
    const storage: any = {
      getObjectMetadata: jest.fn().mockResolvedValue(null),
    };
    const service = new FilesService(prisma, storage);

    await service.completeUpload("u1", {
      fileId: "f2",
      uploadedSizeBytes: 200,
      uploadedMimeType: "image/png",
    });

    expect(prisma.fileAsset.update).toHaveBeenCalled();
  });

  it("blocks non-owner completion", async () => {
    const prisma: any = {
      fileAsset: {
        findUnique: jest.fn().mockResolvedValue({
          id: "f3",
          ownerId: "u-owner",
          objectKey: "x",
          sizeBytes: 10,
          mimeType: "image/png",
          uploadStatus: "PENDING",
        }),
      },
    };
    const service = new FilesService(prisma, { getObjectMetadata: jest.fn() } as any);

    await expect(
      service.completeUpload("u-other", {
        fileId: "f3",
        uploadedSizeBytes: 10,
        uploadedMimeType: "image/png",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("is idempotent when file is already READY", async () => {
    const prisma: any = {
      fileAsset: {
        findUnique: jest.fn().mockResolvedValue({
          id: "f4",
          ownerId: "u1",
          objectKey: "design-originals/u1/file4.png",
          sizeBytes: 10,
          mimeType: "image/png",
          uploadStatus: "READY",
        }),
        update: jest.fn(),
      },
    };
    const storage: any = {
      getObjectMetadata: jest.fn(),
    };
    const service = new FilesService(prisma, storage);

    const result = await service.completeUpload("u1", {
      fileId: "f4",
      uploadedSizeBytes: 10,
      uploadedMimeType: "image/png",
    });

    expect(result.uploadStatus).toBe("READY");
    expect(prisma.fileAsset.update).not.toHaveBeenCalled();
    expect(storage.getObjectMetadata).not.toHaveBeenCalled();
  });

  it("marks file as FAILED when metadata verification fails", async () => {
    const prisma: any = {
      fileAsset: {
        findUnique: jest.fn().mockResolvedValue({
          id: "f5",
          ownerId: "u1",
          objectKey: "design-originals/u1/file5.png",
          sizeBytes: 100,
          mimeType: "image/png",
          checksum: undefined,
          uploadStatus: "PENDING",
        }),
        update: jest.fn().mockResolvedValue({ id: "f5", uploadStatus: "FAILED" }),
      },
    };
    const storage: any = {
      getObjectMetadata: jest.fn().mockResolvedValue({
        sizeBytes: 99,
        mimeType: "image/png",
      }),
    };
    const service = new FilesService(prisma, storage);

    await expect(
      service.completeUpload("u1", {
        fileId: "f5",
        uploadedSizeBytes: 100,
        uploadedMimeType: "image/png",
      }),
    ).rejects.toBeInstanceOf(Error);

    expect(prisma.fileAsset.update).toHaveBeenCalledWith({
      where: { id: "f5" },
      data: { uploadStatus: "FAILED" },
    });
  });

  it("uses configured signed-url expiry when generating read URL", async () => {
    const previous = process.env.GCS_SIGNED_URL_EXPIRES_SECONDS;
    process.env.GCS_SIGNED_URL_EXPIRES_SECONDS = "1200";
    const prisma: any = {
      fileAsset: {
        findUnique: jest.fn().mockResolvedValue({
          id: "f6",
          ownerId: "u1",
          objectKey: "design-originals/u1/file6.png",
          isPublic: false,
        }),
      },
    };
    const storage: any = {
      createSignedReadUrl: jest.fn().mockResolvedValue("https://signed"),
    };
    const service = new FilesService(prisma, storage);
    const result = await service.getSignedReadUrl("u1", "f6");
    expect(result.url).toBe("https://signed");
    expect(storage.createSignedReadUrl).toHaveBeenCalledWith({ objectKey: "design-originals/u1/file6.png", expiresSeconds: 1200 });
    process.env.GCS_SIGNED_URL_EXPIRES_SECONDS = previous;
  });
});
