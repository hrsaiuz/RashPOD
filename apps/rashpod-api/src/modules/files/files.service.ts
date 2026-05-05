import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { StorageService } from "./storage.service";
import { CreateUploadUrlDto } from "./dto/create-upload-url.dto";
import { canReadFile } from "./file-policy";
import { CompleteUploadDto } from "./dto/complete-upload.dto";
import { assertUploadMetadataMatches, sanitizeFilename } from "./file-validation";

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async createUploadUrl(ownerId: string, dto: CreateUploadUrlDto) {
    const objectKey = `design-originals/${ownerId}/${Date.now()}-${sanitizeFilename(dto.filename)}`;
    const file = await this.prisma.fileAsset.create({
      data: {
        ownerId,
        bucket: process.env.GCS_BUCKET_PRIVATE || "rashpod-assets-private",
        objectKey,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        uploadStatus: "PENDING",
        checksum: dto.checksum,
      },
    });
    const signed = await this.storage.createPresignedUploadUrl({
      objectKey,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
    });
    return { fileId: file.id, ...signed };
  }

  async completeUpload(ownerId: string, dto: CompleteUploadDto) {
    const file = await this.prisma.fileAsset.findUnique({ where: { id: dto.fileId } });
    if (!file) throw new NotFoundException("File not found");
    if (file.ownerId !== ownerId) throw new ForbiddenException("Not your file");
    if (file.uploadStatus === "READY") {
      return file;
    }
    if (file.uploadStatus !== "PENDING") {
      throw new ForbiddenException("File is not in a completable state");
    }

    const objectMetadata = await this.storage.getObjectMetadata({ objectKey: file.objectKey });
    const uploadedSizeBytes = objectMetadata?.sizeBytes ?? dto.uploadedSizeBytes;
    const uploadedMimeType = objectMetadata?.mimeType ?? dto.uploadedMimeType;
    const uploadedChecksum = objectMetadata?.checksumMd5Base64 ?? dto.uploadedChecksum;

    if (!uploadedSizeBytes || !uploadedMimeType) {
      throw new ForbiddenException("Uploaded file metadata is unavailable");
    }

    try {
      assertUploadMetadataMatches({
        expectedSizeBytes: file.sizeBytes,
        expectedMimeType: file.mimeType,
        expectedChecksum: file.checksum,
        uploadedSizeBytes,
        uploadedMimeType,
        uploadedChecksum,
      });
    } catch (error) {
      await this.prisma.fileAsset.update({
        where: { id: dto.fileId },
        data: { uploadStatus: "FAILED" },
      });
      throw error;
    }
    return this.prisma.fileAsset.update({
      where: { id: dto.fileId },
      data: { uploadStatus: "READY", sizeBytes: uploadedSizeBytes, mimeType: uploadedMimeType },
    });
  }

  async getSignedReadUrl(ownerId: string, fileId: string) {
    const file = await this.prisma.fileAsset.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException("File not found");
    if (!canReadFile({ isPublic: file.isPublic, ownerId: file.ownerId, actorId: ownerId })) {
      throw new ForbiddenException("Not allowed");
    }
    const expiresSeconds = Number(process.env.GCS_SIGNED_URL_EXPIRES_SECONDS || 900);
    const safeExpires = Number.isFinite(expiresSeconds) ? Math.max(60, Math.min(86400, expiresSeconds)) : 900;
    const url = await this.storage.createSignedReadUrl({ objectKey: file.objectKey, expiresSeconds: safeExpires });
    return {
      fileId,
      url,
    };
  }
}
