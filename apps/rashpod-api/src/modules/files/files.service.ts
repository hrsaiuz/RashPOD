import { ForbiddenException, Injectable, NotFoundException, Optional, ServiceUnavailableException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { AssetLifecycleStatus, AssetPurpose, AssetStorageProvider } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { StorageService } from "./storage.service";
import { CreateUploadUrlDto } from "./dto/create-upload-url.dto";
import { canReadFile } from "./file-policy";
import { CompleteUploadDto } from "./dto/complete-upload.dto";
import { assertUploadMetadataMatches } from "./file-validation";
import { AuditService } from "../audit/audit.service";
import { assertAssetUploadAllowed, buildAssetObjectKey, extensionForAsset } from "./asset-upload-policy";

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @Optional() private readonly audit?: AuditService,
  ) {}

  async createUploadUrl(ownerId: string, dto: CreateUploadUrlDto, tenantId?: string) {
    if (process.env.NODE_ENV === "production" && !this.storage.isCloudStorageConfigured()) {
      throw new ServiceUnavailableException("Google Cloud Storage must be configured before accepting production uploads");
    }

    const purpose = dto.purpose ?? AssetPurpose.DESIGN_ORIGINAL;
    const { policy, resolvedMimeType } = assertAssetUploadAllowed({
      purpose,
      filename: dto.filename,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
    });
    const fileId = randomUUID();
    const fileExtension = extensionForAsset(dto.filename, resolvedMimeType);
    const objectKey = buildAssetObjectKey({
      ownerId,
      tenantId,
      assetId: fileId,
      purpose,
      extension: fileExtension,
      designId: dto.designId,
      designVersionId: dto.designVersionId,
      listingId: dto.listingId,
      baseProductId: dto.baseProductId,
      mockupTemplateId: dto.mockupTemplateId,
      printAreaId: dto.printAreaId,
    });
    const storageProvider = this.storage.isCloudStorageConfigured() ? AssetStorageProvider.GCS : AssetStorageProvider.LOCAL_DEV;
    const uploadExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const file = await this.prisma.fileAsset.create({
      data: {
        id: fileId,
        ownerId,
        tenantId,
        purpose,
        storageProvider,
        accessPolicy: policy.accessPolicy,
        bucket: policy.bucketKind === "public" ? this.storage.getPublicBucketName() : this.storage.getPrivateBucketName(),
        objectKey,
        publicUrl: policy.bucketKind === "public" ? this.storage.buildPublicUrl(objectKey) : undefined,
        mimeType: resolvedMimeType,
        fileExtension,
        sizeBytes: dto.sizeBytes,
        isPublic: policy.bucketKind === "public",
        uploadStatus: "PENDING",
        status: AssetLifecycleStatus.PENDING_UPLOAD,
        checksum: dto.checksum,
        designId: dto.designId,
        designVersionId: dto.designVersionId,
        listingId: dto.listingId,
        baseProductId: dto.baseProductId,
        mockupTemplateId: dto.mockupTemplateId,
        printAreaId: dto.printAreaId,
        uploadExpiresAt,
      },
    });
    const signed =
      policy.bucketKind === "public"
        ? await this.storage.createPublicPresignedUploadUrl({ objectKey, mimeType: resolvedMimeType, sizeBytes: dto.sizeBytes, fileId })
        : await this.storage.createPresignedUploadUrl({ objectKey, mimeType: resolvedMimeType, sizeBytes: dto.sizeBytes, fileId });
    await this.audit?.log({
      actorId: ownerId,
      action: "asset.upload-url.created",
      entityType: "FileAsset",
      entityId: file.id,
      metadata: {
        purpose,
        bucket: file.bucket,
        objectKey,
        storageProvider,
        accessPolicy: policy.accessPolicy,
        sizeBytes: dto.sizeBytes,
        mimeType: resolvedMimeType,
        uploadExpiresAt: uploadExpiresAt.toISOString(),
      },
    });
    return {
      fileId: file.id,
      url: signed.uploadUrl,
      uploadExpiresAt: uploadExpiresAt.toISOString(),
      method: signed.method,
      headers: signed.headers,
    };
  }

  async completeUpload(ownerId: string, dto: CompleteUploadDto) {
    const file = await this.prisma.fileAsset.findUnique({ where: { id: dto.fileId } });
    if (!file) throw new NotFoundException("File not found");
    if (file.ownerId !== ownerId) throw new ForbiddenException("Not your file");
    if (file.uploadStatus === "READY" || file.status === AssetLifecycleStatus.READY) {
      return file;
    }
    if (file.uploadStatus !== "PENDING" && file.status !== AssetLifecycleStatus.PENDING_UPLOAD) {
      throw new ForbiddenException("File is not in a completable state");
    }
    if (file.uploadExpiresAt && file.uploadExpiresAt.getTime() < Date.now()) {
      await this.markUploadFailed(ownerId, file.id, "Signed upload URL expired before completion");
      throw new ForbiddenException("Signed upload URL has expired");
    }

    await this.prisma.fileAsset.update({
      where: { id: dto.fileId },
      data: { status: AssetLifecycleStatus.VERIFYING },
    });

    const bucketKind = file.isPublic ? "public" : "private";
    const objectMetadata = await this.storage.getAssetObjectMetadata({ objectKey: file.objectKey, bucketKind });
    if (!objectMetadata && (this.storage.isCloudStorageConfigured() || process.env.NODE_ENV === "production")) {
      await this.markUploadFailed(ownerId, file.id, "Uploaded object metadata is unavailable in storage");
      throw new ForbiddenException("Uploaded file metadata is unavailable");
    }
    const uploadedSizeBytes = objectMetadata?.sizeBytes ?? dto.uploadedSizeBytes;
    const metadataMime = objectMetadata?.mimeType?.trim();
    const uploadedMimeType =
      metadataMime && metadataMime !== "application/octet-stream"
        ? metadataMime
        : dto.uploadedMimeType || file.mimeType;
    const uploadedChecksum = objectMetadata?.checksumMd5Base64 ?? dto.uploadedChecksum;

    if (!uploadedSizeBytes || !uploadedMimeType) {
      await this.markUploadFailed(ownerId, file.id, "Uploaded object metadata is incomplete");
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
      await this.markUploadFailed(ownerId, file.id, error instanceof Error ? error.message : "Upload metadata verification failed");
      throw error;
    }
    const updated = await this.prisma.fileAsset.update({
      where: { id: dto.fileId },
      data: {
        uploadStatus: "READY",
        status: AssetLifecycleStatus.READY,
        sizeBytes: uploadedSizeBytes,
        mimeType: uploadedMimeType,
        checksum: uploadedChecksum ?? file.checksum,
        uploadedAt: new Date(),
        verifiedAt: new Date(),
        failureReason: null,
      },
    });
    await this.audit?.log({
      actorId: ownerId,
      action: "asset.upload.verified",
      entityType: "FileAsset",
      entityId: file.id,
      metadata: {
        purpose: file.purpose,
        objectKey: file.objectKey,
        sizeBytes: uploadedSizeBytes,
        mimeType: uploadedMimeType,
        storageMetadataUsed: Boolean(objectMetadata),
      },
    });
    return updated;
  }

  async uploadLocalContent(ownerId: string, fileId: string, buffer: Buffer, mimeType?: string) {
    const file = await this.prisma.fileAsset.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException("File not found");
    if (file.ownerId !== ownerId) throw new ForbiddenException("Not your file");
    if (file.uploadStatus !== "PENDING" && file.status !== AssetLifecycleStatus.PENDING_UPLOAD) {
      throw new ForbiddenException("File is not in a uploadable state");
    }
    if (file.uploadExpiresAt && file.uploadExpiresAt.getTime() < Date.now()) {
      throw new ForbiddenException("Signed upload URL has expired");
    }
    if (buffer.byteLength !== file.sizeBytes) {
      throw new ForbiddenException("Uploaded size does not match requested size");
    }
    const contentType = mimeType?.trim() || file.mimeType;
    await this.storage.writeLocalObject({ objectKey: file.objectKey, buffer, mimeType: contentType });
    return { fileId, sizeBytes: buffer.byteLength };
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

  private async markUploadFailed(ownerId: string, fileId: string, failureReason: string) {
    await this.prisma.fileAsset.update({
      where: { id: fileId },
      data: { uploadStatus: "FAILED", status: AssetLifecycleStatus.FAILED, failureReason },
    });
    await this.audit?.log({
      actorId: ownerId,
      action: "asset.upload.failed",
      entityType: "FileAsset",
      entityId: fileId,
      metadata: { failureReason },
    });
  }
}
