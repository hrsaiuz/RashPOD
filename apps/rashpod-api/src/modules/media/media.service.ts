import { Injectable, NotFoundException } from "@nestjs/common";
import { MediaCategory, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { StorageService } from "../files/storage.service";
import { CreateMediaUploadUrlDto } from "./dto/create-media-upload-url.dto";
import { CompleteMediaUploadDto } from "./dto/complete-media-upload.dto";
import { UpdateMediaAssetDto } from "./dto/update-media-asset.dto";

const BRANDING_SINGLETON_CATEGORIES = new Set<MediaCategory>([
  MediaCategory.BRANDING_LOGO_WEB,
  MediaCategory.BRANDING_LOGO_DASHBOARD,
  MediaCategory.BRANDING_LOGO_LOGIN,
  MediaCategory.BRANDING_FAVICON,
]);

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 200);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  async createUploadUrl(_actorId: string, dto: CreateMediaUploadUrlDto) {
    const safeName = sanitizeFilename(dto.filename);
    const folder = dto.category.toLowerCase();
    const objectKey = `media/${folder}/${Date.now()}-${safeName}`;
    const signed = await this.storage.createPublicPresignedUploadUrl({
      objectKey,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
    });
    return { objectKey, ...signed };
  }

  async completeUpload(actorId: string, dto: CompleteMediaUploadDto) {
    const publicUrl = this.storage.buildPublicUrl(dto.objectKey);
    const bucket = this.storage.getPublicBucketName();
    const baseKey = dto.key ? slugify(dto.key) : slugify(dto.title) || `${dto.category.toLowerCase()}-${Date.now()}`;
    const key = await this.uniqueKey(baseKey);

    if (BRANDING_SINGLETON_CATEGORIES.has(dto.category)) {
      const previous = await this.prisma.mediaAsset.findMany({ where: { category: dto.category, isActive: true } });
      if (previous.length) {
        await this.prisma.mediaAsset.updateMany({
          where: { id: { in: previous.map((p) => p.id) } },
          data: { isActive: false },
        });
        for (const p of previous) {
          await this.storage.deletePublicObject(p.objectKey);
        }
      }
    }

    const asset = await this.prisma.mediaAsset.create({
      data: {
        key,
        category: dto.category,
        title: dto.title,
        description: dto.description,
        bucket,
        objectKey: dto.objectKey,
        publicUrl,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        width: dto.width,
        height: dto.height,
        uploaderId: actorId,
        isActive: true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.audit.log({
      actorId,
      action: "media.create",
      entityType: "MediaAsset",
      entityId: asset.id,
      metadata: { category: asset.category, key: asset.key },
    });
    return asset;
  }

  async uniqueKey(baseKey: string): Promise<string> {
    let candidate = baseKey || `asset-${Date.now()}`;
    let n = 1;
    while (true) {
      const exists = await this.prisma.mediaAsset.findUnique({ where: { key: candidate } });
      if (!exists) return candidate;
      n += 1;
      candidate = `${baseKey}-${n}`;
    }
  }

  list(filter: { category?: MediaCategory; activeOnly?: boolean }) {
    const where: Prisma.MediaAssetWhereInput = {};
    if (filter.category) where.category = filter.category;
    if (filter.activeOnly) where.isActive = true;
    return this.prisma.mediaAsset.findMany({
      where,
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    });
  }

  async update(actorId: string, id: string, dto: UpdateMediaAssetDto) {
    const existing = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Media asset not found");
    const asset = await this.prisma.mediaAsset.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        isActive: dto.isActive,
        sortOrder: dto.sortOrder,
      },
    });
    await this.audit.log({
      actorId,
      action: "media.update",
      entityType: "MediaAsset",
      entityId: asset.id,
    });
    return asset;
  }

  async remove(actorId: string, id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException("Media asset not found");
    await this.storage.deletePublicObject(asset.objectKey);
    await this.prisma.mediaAsset.delete({ where: { id } });
    await this.audit.log({
      actorId,
      action: "media.delete",
      entityType: "MediaAsset",
      entityId: asset.id,
    });
    return { ok: true };
  }

  async branding() {
    const assets = await this.prisma.mediaAsset.findMany({
      where: {
        isActive: true,
        category: {
          in: [
            MediaCategory.BRANDING_LOGO_WEB,
            MediaCategory.BRANDING_LOGO_DASHBOARD,
            MediaCategory.BRANDING_LOGO_LOGIN,
            MediaCategory.BRANDING_FAVICON,
          ],
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const pick = (cat: MediaCategory) => assets.find((a) => a.category === cat)?.publicUrl ?? null;
    const settings = await this.prisma.platformSetting.findUnique({ where: { key: "branding" } });
    const themeRaw = (settings?.value ?? {}) as Record<string, unknown>;
    return {
      storefrontLogoUrl: pick(MediaCategory.BRANDING_LOGO_WEB),
      dashboardLogoUrl: pick(MediaCategory.BRANDING_LOGO_DASHBOARD),
      loginLogoUrl: pick(MediaCategory.BRANDING_LOGO_LOGIN),
      faviconUrl: pick(MediaCategory.BRANDING_FAVICON),
      theme: themeRaw,
    };
  }

  async updateBrandingTheme(actorId: string, theme: Record<string, unknown>) {
    await this.prisma.platformSetting.upsert({
      where: { key: "branding" },
      create: { key: "branding", value: theme as unknown as Prisma.InputJsonValue },
      update: { value: theme as unknown as Prisma.InputJsonValue },
    });
    await this.audit.log({
      actorId,
      action: "branding.update",
      entityType: "PlatformSetting",
      entityId: "branding",
    });
    return this.branding();
  }
}
