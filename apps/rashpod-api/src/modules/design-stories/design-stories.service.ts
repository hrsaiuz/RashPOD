import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AIEntityType, AssetAccessPolicy, AssetLifecycleStatus, AssetPurpose, AssetStorageProvider, DesignStoryStatus, ListingStatus, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import * as QRCode from "qrcode";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { StorageService } from "../files/storage.service";
import { buildAssetObjectKey } from "../files/asset-upload-policy";
import { AiService } from "../ai/ai.service";
import { AttachDesignStoryMediaDto, UpsertDesignStoryDraftDto } from "./dto/design-story.dto";

type SupportedLocale = "uz" | "ru" | "en";
type LocalizedStringMap = Partial<Record<SupportedLocale, string>>;
type LocalizedFileMap = Partial<Record<SupportedLocale, string>>;

const SUPPORTED_LOCALES: SupportedLocale[] = ["uz", "ru", "en"];

@Injectable()
export class DesignStoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
    private readonly ai: AiService,
  ) {}

  async getDesignerStory(userId: string, designId: string) {
    const design = await this.requireOwnedDesign(userId, designId);
    const story = await this.prisma.designStory.findUnique({ where: { designAssetId: designId } });
    return {
      designId: design.id,
      designTitle: design.title,
      designStatus: design.status,
      story: story ? await this.toDesignerStoryDto(story) : null,
      listings: (design.listings ?? []).map((listing) => ({
        id: listing.id,
        title: listing.title,
        slug: listing.slug,
        status: listing.status,
        publicUrl: listing.status === ListingStatus.PUBLISHED ? `/product/${listing.slug}` : null,
      })),
    };
  }

  async upsertDraft(userId: string, designId: string, dto: UpsertDesignStoryDraftDto) {
    const design = await this.requireOwnedDesign(userId, designId);
    const slug = await this.ensureSlugIsAvailable(dto.slug, designId);
    const sourceLocale = this.normalizeLocale(dto.sourceLocale ?? "uz");
    const existing = await this.prisma.designStory.findUnique({ where: { designAssetId: designId } });
    if (existing?.status === DesignStoryStatus.PUBLISHED) {
      throw new BadRequestException("Published stories must be unpublished before editing.");
    }

    await this.assertMediaOwnership(design.designerId, dto.coverImageFileId, AssetPurpose.STORY_COVER_IMAGE);
    await this.assertLocalizedMediaOwnership(design.designerId, dto.audioFileIds, AssetPurpose.STORY_AUDIO);
    await this.assertLocalizedMediaOwnership(design.designerId, dto.videoFileIds, AssetPurpose.STORY_VIDEO);

    const titleTranslations = this.jsonToLocalizedStringMap(existing?.titleTranslationsJson ?? null);
    const bodyTranslations = this.jsonToLocalizedStringMap(existing?.bodyTranslationsJson ?? null);
    titleTranslations[sourceLocale] = dto.source?.title?.trim() || dto.title.trim();
    bodyTranslations[sourceLocale] = dto.source?.body?.trim() || "";

    const audioFileIds = { ...this.jsonToLocalizedFileMap(existing?.audioFileIdsJson ?? null), ...this.compactLocalizedFiles(dto.audioFileIds) };
    const videoFileIds = { ...this.jsonToLocalizedFileMap(existing?.videoFileIdsJson ?? null), ...this.compactLocalizedFiles(dto.videoFileIds) };
    const publicUrl = this.buildCanonicalStoryUrl(slug);

    const story = existing
      ? await this.prisma.designStory.update({
          where: { id: existing.id },
          data: {
            title: dto.title.trim(),
            slug,
            sourceLocale,
            publicUrl,
            coverImageFileId: dto.coverImageFileId ?? existing.coverImageFileId,
            titleTranslationsJson: titleTranslations as Prisma.InputJsonValue,
            bodyTranslationsJson: bodyTranslations as Prisma.InputJsonValue,
            audioFileIdsJson: audioFileIds as Prisma.InputJsonValue,
            videoFileIdsJson: videoFileIds as Prisma.InputJsonValue,
            reviewNotes: existing.status === DesignStoryStatus.NEEDS_CHANGES ? existing.reviewNotes : null,
            status: existing.status === DesignStoryStatus.NEEDS_CHANGES ? DesignStoryStatus.DRAFT : existing.status,
          },
        })
      : await this.prisma.designStory.create({
          data: {
            designAssetId: designId,
            title: dto.title.trim(),
            slug,
            sourceLocale,
            publicUrl,
            coverImageFileId: dto.coverImageFileId,
            titleTranslationsJson: titleTranslations as Prisma.InputJsonValue,
            bodyTranslationsJson: bodyTranslations as Prisma.InputJsonValue,
            audioFileIdsJson: audioFileIds as Prisma.InputJsonValue,
            videoFileIdsJson: videoFileIds as Prisma.InputJsonValue,
          },
        });

    if (!story.qrCodeImageUrl || existing?.slug !== slug) {
      await this.generateQrAsset(story, design.designerId, design.tenantId ?? undefined);
    }

    await this.audit.log({
      actorId: userId,
      action: existing ? "design-story.draft.updated" : "design-story.draft.created",
      entityType: "DesignStory",
      entityId: story.id,
      metadata: { designAssetId: designId, slug, sourceLocale },
    });
    if (existing && existing.slug !== slug) {
      await this.audit.log({
        actorId: userId,
        action: "design-story.slug.changed",
        entityType: "DesignStory",
        entityId: story.id,
        metadata: { before: existing.slug, after: slug },
      });
    }
    return this.toDesignerStoryDto(await this.prisma.designStory.findUniqueOrThrow({ where: { id: story.id } }));
  }

  async attachMedia(userId: string, designId: string, dto: AttachDesignStoryMediaDto) {
    const design = await this.requireOwnedDesign(userId, designId);
    const story = await this.prisma.designStory.findUnique({ where: { designAssetId: designId } });
    if (!story) throw new NotFoundException("Story draft not found");

    await this.assertMediaOwnership(design.designerId, dto.coverImageFileId, AssetPurpose.STORY_COVER_IMAGE);
    await this.assertLocalizedMediaOwnership(design.designerId, dto.audioFileIds, AssetPurpose.STORY_AUDIO);
    await this.assertLocalizedMediaOwnership(design.designerId, dto.videoFileIds, AssetPurpose.STORY_VIDEO);

    const updated = await this.prisma.designStory.update({
      where: { id: story.id },
      data: {
        coverImageFileId: dto.coverImageFileId ?? story.coverImageFileId,
        audioFileIdsJson: { ...this.jsonToLocalizedFileMap(story.audioFileIdsJson), ...this.compactLocalizedFiles(dto.audioFileIds) } as Prisma.InputJsonValue,
        videoFileIdsJson: { ...this.jsonToLocalizedFileMap(story.videoFileIdsJson), ...this.compactLocalizedFiles(dto.videoFileIds) } as Prisma.InputJsonValue,
      },
    });
    await this.audit.log({
      actorId: userId,
      action: "design-story.media.replaced",
      entityType: "DesignStory",
      entityId: story.id,
      metadata: { designAssetId: designId },
    });
    return this.toDesignerStoryDto(updated);
  }

  async requestPublish(userId: string, designId: string) {
    const design = await this.requireOwnedDesign(userId, designId);
    const story = await this.prisma.designStory.findUnique({ where: { designAssetId: designId } });
    if (!story) throw new NotFoundException("Story draft not found");
    if (!story.slug || !story.title) throw new BadRequestException("Story title and slug are required.");

    const sourceLocale = this.normalizeLocale(story.sourceLocale);
    const titleTranslations = this.jsonToLocalizedStringMap(story.titleTranslationsJson);
    const bodyTranslations = this.jsonToLocalizedStringMap(story.bodyTranslationsJson);
    const sourceTitle = titleTranslations[sourceLocale] || story.title;
    const sourceBody = bodyTranslations[sourceLocale] || "";
    if (!sourceBody.trim()) throw new BadRequestException("Story text is required before requesting publish.");

    const translationMeta = this.objectJson(story.translationMetaJson);
    for (const locale of SUPPORTED_LOCALES) {
      if (locale === sourceLocale) continue;
      if (!titleTranslations[locale]) {
        try {
          const translated = await this.ai.translate(userId, {
            text: sourceTitle,
            targetLanguage: locale,
            entityType: AIEntityType.DESIGN,
            entityId: designId,
          });
          titleTranslations[locale] = translated.translatedText;
          translationMeta[`title:${locale}`] = { generatedAt: new Date().toISOString(), aiGenerated: true };
        } catch (error) {
          translationMeta[`title:${locale}`] = { generatedAt: new Date().toISOString(), aiGenerated: false, error: error instanceof Error ? error.message : "Translation failed" };
        }
      }
      if (!bodyTranslations[locale]) {
        try {
          const translated = await this.ai.translate(userId, {
            text: sourceBody,
            targetLanguage: locale,
            entityType: AIEntityType.DESIGN,
            entityId: designId,
          });
          bodyTranslations[locale] = translated.translatedText;
          translationMeta[`body:${locale}`] = { generatedAt: new Date().toISOString(), aiGenerated: true };
        } catch (error) {
          translationMeta[`body:${locale}`] = { generatedAt: new Date().toISOString(), aiGenerated: false, error: error instanceof Error ? error.message : "Translation failed" };
        }
      }
    }

    const updated = await this.prisma.designStory.update({
      where: { id: story.id },
      data: {
        status: DesignStoryStatus.PENDING_REVIEW,
        requestedPublishAt: new Date(),
        reviewNotes: null,
        titleTranslationsJson: titleTranslations as Prisma.InputJsonValue,
        bodyTranslationsJson: bodyTranslations as Prisma.InputJsonValue,
        translationMetaJson: translationMeta as Prisma.InputJsonValue,
      },
    });
    await this.audit.log({
      actorId: userId,
      action: "design-story.publish.requested",
      entityType: "DesignStory",
      entityId: story.id,
      metadata: { designAssetId: designId, sourceLocale },
    });
    await this.audit.log({
      actorId: userId,
      action: "design-story.ai-translation.generated",
      entityType: "DesignStory",
      entityId: story.id,
      metadata: { locales: SUPPORTED_LOCALES.filter((locale) => locale !== sourceLocale) },
    });
    return this.toDesignerStoryDto(updated);
  }

  async regenerateQr(userId: string, designId: string) {
    const design = await this.requireOwnedDesign(userId, designId);
    const story = await this.prisma.designStory.findUnique({ where: { designAssetId: designId } });
    if (!story) throw new NotFoundException("Story draft not found");
    const updated = await this.generateQrAsset(story, design.designerId, design.tenantId ?? undefined);
    await this.audit.log({
      actorId: userId,
      action: "design-story.qr.regenerated",
      entityType: "DesignStory",
      entityId: story.id,
      metadata: { designAssetId: designId, slug: story.slug },
    });
    return this.toDesignerStoryDto(updated);
  }

  async getReviewStory(designId: string) {
    const design = await this.prisma.designAsset.findUnique({
      where: { id: designId },
      include: {
        designer: { select: { id: true, displayName: true, email: true } },
        story: true,
        listings: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!design) throw new NotFoundException("Design not found");
    return {
      designId: design.id,
      designTitle: design.title,
      designer: design.designer,
      story: design.story ? await this.toDesignerStoryDto(design.story) : null,
      listings: design.listings.map((listing) => ({
        id: listing.id,
        title: listing.title,
        slug: listing.slug,
        status: listing.status,
      })),
    };
  }

  async approvePublish(actorId: string, designId: string) {
    const story = await this.prisma.designStory.findUnique({ where: { designAssetId: designId } });
    if (!story) throw new NotFoundException("Story not found");
    const updated = await this.prisma.designStory.update({
      where: { id: story.id },
      data: {
        status: DesignStoryStatus.PUBLISHED,
        reviewNotes: null,
        reviewedAt: new Date(),
        reviewedById: actorId,
        publishedAt: new Date(),
        unpublishedAt: null,
      },
    });
    await this.audit.log({
      actorId,
      action: "design-story.publish.approved",
      entityType: "DesignStory",
      entityId: story.id,
      metadata: { designAssetId: designId, slug: story.slug },
    });
    return this.toDesignerStoryDto(updated);
  }

  async rejectPublish(actorId: string, designId: string, notes: string) {
    const story = await this.prisma.designStory.findUnique({ where: { designAssetId: designId } });
    if (!story) throw new NotFoundException("Story not found");
    const updated = await this.prisma.designStory.update({
      where: { id: story.id },
      data: {
        status: DesignStoryStatus.NEEDS_CHANGES,
        reviewNotes: notes.trim(),
        reviewedAt: new Date(),
        reviewedById: actorId,
      },
    });
    await this.audit.log({
      actorId,
      action: "design-story.publish.rejected",
      entityType: "DesignStory",
      entityId: story.id,
      metadata: { designAssetId: designId, notes: notes.trim() },
    });
    return this.toDesignerStoryDto(updated);
  }

  async unpublish(actorId: string, designId: string) {
    const story = await this.prisma.designStory.findUnique({ where: { designAssetId: designId } });
    if (!story) throw new NotFoundException("Story not found");
    const updated = await this.prisma.designStory.update({
      where: { id: story.id },
      data: {
        status: DesignStoryStatus.UNPUBLISHED,
        unpublishedAt: new Date(),
        reviewedAt: new Date(),
        reviewedById: actorId,
      },
    });
    await this.audit.log({
      actorId,
      action: "design-story.unpublished",
      entityType: "DesignStory",
      entityId: story.id,
      metadata: { designAssetId: designId, slug: story.slug },
    });
    return this.toDesignerStoryDto(updated);
  }

  async getPublishedStoryBySlug(slug: string, localeInput?: string) {
    const story = await this.prisma.designStory.findUnique({
      where: { slug },
      include: {
        designAsset: {
          include: {
            designer: { select: { id: true, displayName: true, handle: true } },
            listings: { where: { status: ListingStatus.PUBLISHED }, orderBy: { publishedAt: "desc" } },
          },
        },
      },
    });
    if (!story || story.status !== DesignStoryStatus.PUBLISHED) throw new NotFoundException("Story not found");

    const locale = this.normalizeLocale(localeInput ?? story.sourceLocale);
    const sourceLocale = this.normalizeLocale(story.sourceLocale);
    const titleTranslations = this.jsonToLocalizedStringMap(story.titleTranslationsJson);
    const bodyTranslations = this.jsonToLocalizedStringMap(story.bodyTranslationsJson);
    const audioMap = this.jsonToLocalizedFileMap(story.audioFileIdsJson);
    const videoMap = this.jsonToLocalizedFileMap(story.videoFileIdsJson);
    const coverImageUrl = story.coverImageFileId ? await this.publicUrlForFile(story.coverImageFileId) : null;
    const audioUrl = audioMap[locale] ? await this.publicUrlForFile(audioMap[locale]!) : audioMap[sourceLocale] ? await this.publicUrlForFile(audioMap[sourceLocale]!) : null;
    const videoUrl = videoMap[locale] ? await this.publicUrlForFile(videoMap[locale]!) : videoMap[sourceLocale] ? await this.publicUrlForFile(videoMap[sourceLocale]!) : null;
    const resolvedLocale = titleTranslations[locale] || bodyTranslations[locale] ? locale : sourceLocale;

    return {
      id: story.id,
      slug: story.slug,
      title: titleTranslations[resolvedLocale] || story.title,
      body: bodyTranslations[resolvedLocale] || bodyTranslations[sourceLocale] || "",
      locale: resolvedLocale,
      sourceLocale,
      fallbackUsed: resolvedLocale !== locale,
      publicUrl: story.publicUrl || this.buildCanonicalStoryUrl(story.slug),
      qrCodeImageUrl: story.qrCodeImageUrl,
      coverImageUrl,
      audioUrl,
      videoUrl,
      publishedAt: story.publishedAt,
      designer: story.designAsset.designer,
      design: { id: story.designAsset.id, title: story.designAsset.title, description: story.designAsset.description },
      listings: story.designAsset.listings.map((listing) => ({
        id: listing.id,
        slug: listing.slug,
        title: listing.title,
        price: Number(listing.price),
        currency: listing.currency,
        imageUrl: this.firstListingImage(listing.imagesJson),
        designer: { displayName: story.designAsset.designer.displayName, handle: story.designAsset.designer.handle ?? null },
      })),
    };
  }

  async designerStorySummary(designId: string) {
    const story = await this.prisma.designStory.findUnique({ where: { designAssetId: designId } });
    if (!story) return null;
    return {
      id: story.id,
      title: story.title,
      slug: story.slug,
      status: story.status,
      publicUrl: story.publicUrl || this.buildCanonicalStoryUrl(story.slug),
      qrCodeImageUrl: story.qrCodeImageUrl,
      requestedPublishAt: story.requestedPublishAt,
      publishedAt: story.publishedAt,
      reviewNotes: story.reviewNotes,
    };
  }

  private async toDesignerStoryDto(story: {
    id: string;
    designAssetId: string;
    title: string;
    slug: string;
    status: DesignStoryStatus;
    sourceLocale: string;
    publicUrl: string | null;
    qrCodeFileId: string | null;
    qrCodeImageUrl: string | null;
    coverImageFileId: string | null;
    titleTranslationsJson: Prisma.JsonValue | null;
    bodyTranslationsJson: Prisma.JsonValue | null;
    audioFileIdsJson: Prisma.JsonValue | null;
    videoFileIdsJson: Prisma.JsonValue | null;
    translationMetaJson: Prisma.JsonValue | null;
    reviewNotes: string | null;
    requestedPublishAt: Date | null;
    publishedAt: Date | null;
    unpublishedAt: Date | null;
    reviewedAt: Date | null;
    reviewedById: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: story.id,
      designAssetId: story.designAssetId,
      title: story.title,
      slug: story.slug,
      status: story.status,
      sourceLocale: this.normalizeLocale(story.sourceLocale),
      publicUrl: story.publicUrl || this.buildCanonicalStoryUrl(story.slug),
      qrCodeFileId: story.qrCodeFileId,
      qrCodeImageUrl: story.qrCodeImageUrl,
      coverImageFileId: story.coverImageFileId,
      coverImageUrl: story.coverImageFileId ? await this.publicUrlForFile(story.coverImageFileId) : null,
      titleTranslations: this.jsonToLocalizedStringMap(story.titleTranslationsJson),
      bodyTranslations: this.jsonToLocalizedStringMap(story.bodyTranslationsJson),
      audioFileIds: this.jsonToLocalizedFileMap(story.audioFileIdsJson),
      audioUrls: await this.localizedUrlsForFiles(this.jsonToLocalizedFileMap(story.audioFileIdsJson)),
      videoFileIds: this.jsonToLocalizedFileMap(story.videoFileIdsJson),
      videoUrls: await this.localizedUrlsForFiles(this.jsonToLocalizedFileMap(story.videoFileIdsJson)),
      translationMeta: this.objectJson(story.translationMetaJson),
      reviewNotes: story.reviewNotes,
      requestedPublishAt: story.requestedPublishAt,
      publishedAt: story.publishedAt,
      unpublishedAt: story.unpublishedAt,
      reviewedAt: story.reviewedAt,
      reviewedById: story.reviewedById,
      createdAt: story.createdAt,
      updatedAt: story.updatedAt,
    };
  }

  private async requireOwnedDesign(userId: string, designId: string) {
    const design = await this.prisma.designAsset.findFirst({
      where: { id: designId, designerId: userId },
      include: { listings: { orderBy: { createdAt: "desc" } } },
    });
    if (!design) throw new ForbiddenException("Design not found or not owned by you.");
    return design;
  }

  private normalizeSlug(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 160);
  }

  private async ensureSlugIsAvailable(value: string, designId: string) {
    const slug = this.normalizeSlug(value);
    if (!slug) throw new BadRequestException("A valid slug is required.");
    const existing = await this.prisma.designStory.findUnique({ where: { slug } });
    if (existing && existing.designAssetId !== designId) {
      throw new BadRequestException("That story slug is already in use.");
    }
    return slug;
  }

  private buildCanonicalStoryUrl(slug: string) {
    const baseUrl = (process.env.WEB_URL || "https://rashpod.uz").replace(/\/$/, "");
    return `${baseUrl}/story/${slug}`;
  }

  private normalizeLocale(value: string): SupportedLocale {
    if (value === "ru" || value === "en") return value;
    return "uz";
  }

  private jsonToLocalizedStringMap(value: Prisma.JsonValue | null): LocalizedStringMap {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const output: LocalizedStringMap = {};
    for (const locale of SUPPORTED_LOCALES) {
      const item = (value as Record<string, unknown>)[locale];
      if (typeof item === "string" && item.trim()) output[locale] = item;
    }
    return output;
  }

  private jsonToLocalizedFileMap(value: Prisma.JsonValue | null): LocalizedFileMap {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const output: LocalizedFileMap = {};
    for (const locale of SUPPORTED_LOCALES) {
      const item = (value as Record<string, unknown>)[locale];
      if (typeof item === "string" && item.trim()) output[locale] = item;
    }
    return output;
  }

  private compactLocalizedFiles(value?: { en?: string; uz?: string; ru?: string }) {
    const output: LocalizedFileMap = {};
    for (const locale of SUPPORTED_LOCALES) {
      const fileId = value?.[locale];
      if (typeof fileId === "string" && fileId.trim()) output[locale] = fileId.trim();
    }
    return output;
  }

  private objectJson(value: Prisma.JsonValue | null) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, unknown>;
    return value as Record<string, unknown>;
  }

  private async publicUrlForFile(fileId: string) {
    const file = await this.prisma.fileAsset.findUnique({ where: { id: fileId } });
    if (!file) return null;
    if (file.publicUrl) return file.publicUrl;
    if (file.isPublic) return this.storage.buildPublicUrl(file.objectKey);
    return this.storage.createSignedReadUrl({ objectKey: file.objectKey, expiresSeconds: 900 });
  }

  private async assertMediaOwnership(ownerId: string, fileId: string | undefined, purpose: AssetPurpose) {
    if (!fileId) return;
    const file = await this.prisma.fileAsset.findUnique({ where: { id: fileId } });
    if (!file || file.ownerId !== ownerId || file.purpose !== purpose) {
      throw new BadRequestException("Attached media file is invalid.");
    }
  }

  private async assertLocalizedMediaOwnership(ownerId: string, files: { en?: string; uz?: string; ru?: string } | undefined, purpose: AssetPurpose) {
    if (!files) return;
    for (const locale of SUPPORTED_LOCALES) {
      const fileId = files[locale];
      if (!fileId) continue;
      await this.assertMediaOwnership(ownerId, fileId, purpose);
    }
  }

  private async generateQrAsset(
    story: { id: string; designAssetId: string; slug: string; title: string; qrCodeFileId: string | null },
    ownerId: string,
    tenantId?: string,
  ) {
    const fileId = randomUUID();
    const objectKey = buildAssetObjectKey({
      ownerId,
      tenantId,
      assetId: fileId,
      purpose: AssetPurpose.STORY_QR,
      extension: "png",
      designId: story.designAssetId,
    });
    const buffer = await QRCode.toBuffer(this.buildCanonicalStoryUrl(story.slug), {
      type: "png",
      errorCorrectionLevel: "H",
      margin: 1,
      width: 720,
    });
    const uploaded = await this.storage.writePublicObject({
      objectKey,
      buffer,
      mimeType: "image/png",
    });
    await this.prisma.fileAsset.create({
      data: {
        id: fileId,
        ownerId,
        tenantId,
        purpose: AssetPurpose.STORY_QR,
        storageProvider: uploaded.storageProvider === "GCS" ? AssetStorageProvider.GCS : AssetStorageProvider.LOCAL_DEV,
        accessPolicy: AssetAccessPolicy.PUBLIC_READ,
        bucket: uploaded.bucket,
        objectKey,
        publicUrl: uploaded.publicUrl,
        mimeType: "image/png",
        fileExtension: "png",
        sizeBytes: buffer.byteLength,
        isPublic: true,
        uploadStatus: "READY",
        status: AssetLifecycleStatus.READY,
        designId: story.designAssetId,
        uploadedAt: new Date(),
        verifiedAt: new Date(),
      },
    });
    return this.prisma.designStory.update({
      where: { id: story.id },
      data: {
        qrCodeFileId: fileId,
        qrCodeImageUrl: uploaded.publicUrl,
      },
    });
  }

  private firstListingImage(value: unknown) {
    if (Array.isArray(value)) {
      const first = value.find((item) => typeof item === "string");
      return typeof first === "string" ? first : null;
    }
    if (!value || typeof value !== "object") return null;
    const json = value as Record<string, unknown>;
    if (Array.isArray(json.images)) {
      const first = json.images.find((item) => typeof item === "string" || (item && typeof item === "object" && typeof (item as Record<string, unknown>).url === "string"));
      if (typeof first === "string") return first;
      if (first && typeof first === "object" && typeof (first as Record<string, unknown>).url === "string") return String((first as Record<string, unknown>).url);
    }
    return typeof json.imageUrl === "string" ? json.imageUrl : null;
  }

  private async localizedUrlsForFiles(files: LocalizedFileMap) {
    const output: Partial<Record<SupportedLocale, string | null>> = {};
    for (const locale of SUPPORTED_LOCALES) {
      output[locale] = files[locale] ? await this.publicUrlForFile(files[locale]!) : null;
    }
    return output;
  }
}
