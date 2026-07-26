import { BadRequestException } from "@nestjs/common";
import { DesignStoriesService } from "./design-stories.service";
import { storySourceFingerprint } from "./design-story-translation-state";

describe("DesignStoriesService publication validation", () => {
  it("invalidates Russian and English text when the Uzbek source changes", async () => {
    const existing = {
      id: "story-1",
      designAssetId: "design-1",
      title: "Eski sarlavha",
      slug: "hikoya",
      sourceLocale: "uz",
      status: "DRAFT",
      coverImageFileId: null,
      qrCodeFileId: "qr-1",
      qrCodeImageUrl: "https://cdn.test/qr.png",
      titleTranslationsJson: {
        uz: "Eski sarlavha",
        ru: "Старый заголовок",
        en: "Old title",
      },
      bodyTranslationsJson: {
        uz: "Eski hikoya",
        ru: "Старая история",
        en: "Old story",
      },
      audioFileIdsJson: null,
      videoFileIdsJson: null,
      translationMetaJson: {
        translationsSourceFingerprint: storySourceFingerprint(
          "uz",
          "Eski sarlavha",
          "Eski hikoya",
        ),
      },
      reviewNotes: null,
    };
    const prisma = {
      designStory: {
        findUnique: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockImplementation(({ data }) => ({
          ...existing,
          ...data,
        })),
        findUniqueOrThrow: jest.fn().mockResolvedValue(existing),
      },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new DesignStoriesService(
      prisma as never,
      audit as never,
      {} as never,
    );
    jest
      .spyOn(service as any, "requireOwnedDesign")
      .mockResolvedValue({
        designerId: "designer-1",
        tenantId: null,
      });
    jest
      .spyOn(service as any, "ensureSlugIsAvailable")
      .mockResolvedValue("hikoya");
    jest
      .spyOn(service as any, "assertMediaOwnership")
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, "assertLocalizedMediaOwnership")
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, "toDesignerStoryDto")
      .mockResolvedValue({} as never);

    await service.upsertDraft("designer-1", "design-1", {
      title: "Yangi sarlavha",
      slug: "hikoya",
      sourceLocale: "uz",
      source: { title: "Yangi sarlavha", body: "Yangi hikoya" },
      translations: {
        ru: { title: "Старый заголовок", body: "Старая история" },
        en: { title: "Old title", body: "Old story" },
      },
    });

    expect(prisma.designStory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          titleTranslationsJson: { uz: "Yangi sarlavha" },
          bodyTranslationsJson: { uz: "Yangi hikoya" },
          translationMetaJson: expect.not.objectContaining({
            translationsSourceFingerprint: expect.anything(),
          }),
        }),
      }),
    );
  });

  it("blocks complete translations that belong to an older Uzbek source", async () => {
    const currentFingerprint = storySourceFingerprint(
      "uz",
      "Yangi sarlavha",
      "Yangi hikoya",
    );
    const prisma = {
      designStory: {
        findUnique: jest.fn().mockResolvedValue({
          id: "story-1",
          designAssetId: "design-1",
          title: "Yangi sarlavha",
          slug: "yangi-hikoya",
          sourceLocale: "uz",
          titleTranslationsJson: {
            uz: "Yangi sarlavha",
            ru: "Старый заголовок",
            en: "Old title",
          },
          bodyTranslationsJson: {
            uz: "Yangi hikoya",
            ru: "Старая история",
            en: "Old story",
          },
          translationMetaJson: {
            sourceFingerprint: currentFingerprint,
            translationsSourceFingerprint: "older-source-fingerprint",
          },
        }),
        update: jest.fn(),
      },
    };
    const service = new DesignStoriesService(
      prisma as never,
      {} as never,
      {} as never,
    );
    jest
      .spyOn(service as any, "requireOwnedDesign")
      .mockResolvedValue({} as never);

    await expect(
      service.requestPublish("designer-1", "design-1"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.designStory.update).not.toHaveBeenCalled();
  });
});
