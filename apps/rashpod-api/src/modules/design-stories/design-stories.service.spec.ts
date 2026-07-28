import { BadRequestException } from "@nestjs/common";
import { DesignStoryStatus } from "@prisma/client";
import { DesignStoriesService } from "./design-stories.service";
import { storySourceFingerprint } from "./design-story-translation-state";

describe("DesignStoriesService publication validation", () => {
  function pendingStory() {
    const fingerprint = storySourceFingerprint("uz", "Yangi sarlavha", "Yangi hikoya");
    return {
      id: "story-1",
      designAssetId: "design-1",
      title: "Yangi sarlavha",
      slug: "yangi-hikoya",
      sourceLocale: "uz",
      status: DesignStoryStatus.PENDING_REVIEW,
      titleTranslationsJson: {
        uz: "Yangi sarlavha",
        ru: "Новый заголовок",
        en: "New title",
      },
      bodyTranslationsJson: {
        uz: "Yangi hikoya",
        ru: "Новая история",
        en: "New story",
      },
      translationMetaJson: {
        translationsSourceFingerprint: fingerprint,
      },
    };
  }

  it("publishes a pending story inside the design approval transaction", async () => {
    const story = pendingStory();
    const tx = {
      designStory: {
        findUnique: jest.fn().mockResolvedValue(story),
        update: jest.fn().mockResolvedValue({ ...story, status: DesignStoryStatus.PUBLISHED }),
      },
    };
    const service = new DesignStoriesService({} as never, {} as never, {} as never);

    await expect(
      service.syncWithDesignDecision(tx as never, "moderator-1", "design-1", "APPROVE"),
    ).resolves.toEqual({
      storyId: "story-1",
      action: "approved",
      slug: "yangi-hikoya",
    });
    expect(tx.designStory.update).toHaveBeenCalledWith({
      where: { id: "story-1" },
      data: expect.objectContaining({
        status: DesignStoryStatus.PUBLISHED,
        reviewedById: "moderator-1",
        reviewNotes: null,
      }),
    });
  });

  it("returns a pending story for changes inside the design rejection transaction", async () => {
    const story = pendingStory();
    const tx = {
      designStory: {
        findUnique: jest.fn().mockResolvedValue(story),
        update: jest.fn().mockResolvedValue({ ...story, status: DesignStoryStatus.NEEDS_CHANGES }),
      },
    };
    const service = new DesignStoriesService({} as never, {} as never, {} as never);

    await expect(
      service.syncWithDesignDecision(tx as never, "moderator-1", "design-1", "REJECT", "Artwork needs revision."),
    ).resolves.toEqual({
      storyId: "story-1",
      action: "rejected",
      slug: "yangi-hikoya",
      notes: "Artwork needs revision.",
    });
    expect(tx.designStory.update).toHaveBeenCalledWith({
      where: { id: "story-1" },
      data: expect.objectContaining({
        status: DesignStoryStatus.NEEDS_CHANGES,
        reviewedById: "moderator-1",
        reviewNotes: "Artwork needs revision.",
      }),
    });
  });

  it("unpublishes a public story when its design is rejected or suspended", async () => {
    const story = { ...pendingStory(), status: DesignStoryStatus.PUBLISHED };
    const tx = {
      designStory: {
        findUnique: jest.fn().mockResolvedValue(story),
        update: jest.fn().mockResolvedValue({ ...story, status: DesignStoryStatus.UNPUBLISHED }),
      },
    };
    const service = new DesignStoriesService({} as never, {} as never, {} as never);

    await expect(
      service.syncWithDesignDecision(tx as never, "moderator-1", "design-1", "REJECT", "Policy suspension."),
    ).resolves.toEqual({
      storyId: "story-1",
      action: "unpublished",
      slug: "yangi-hikoya",
      notes: "Policy suspension.",
    });
    expect(tx.designStory.update).toHaveBeenCalledWith({
      where: { id: "story-1" },
      data: expect.objectContaining({
        status: DesignStoryStatus.UNPUBLISHED,
        unpublishedAt: expect.any(Date),
        reviewNotes: "Policy suspension.",
      }),
    });
  });

  it.each([
    ["approve", "DRAFT"],
    ["reject", "NEEDS_CHANGES"],
    ["unpublish", "PENDING_REVIEW"],
  ] as const)("blocks %s outside its allowed lifecycle state", async (action, status) => {
    const prisma = {
      designStory: {
        findUnique: jest.fn().mockResolvedValue({
          id: "story-1",
          designAssetId: "design-1",
          status,
        }),
        update: jest.fn(),
      },
    };
    const service = new DesignStoriesService(
      prisma as never,
      { log: jest.fn() } as never,
      {} as never,
    );

    const operation = action === "approve"
      ? service.approvePublish("moderator-1", "design-1")
      : action === "reject"
        ? service.rejectPublish("moderator-1", "design-1", "Needs work")
        : service.unpublish("moderator-1", "design-1");

    await expect(operation).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.designStory.update).not.toHaveBeenCalled();
  });

  it("blocks story publication until the design is approved", async () => {
    const prisma = {
      designStory: {
        findUnique: jest.fn().mockResolvedValue({
          id: "story-1",
          designAssetId: "design-1",
          status: "PENDING_REVIEW",
          designAsset: { status: "PENDING_MODERATION" },
        }),
        update: jest.fn(),
      },
    };
    const service = new DesignStoriesService(
      prisma as never,
      { log: jest.fn() } as never,
      {} as never,
    );

    await expect(service.approvePublish("moderator-1", "design-1"))
      .rejects
      .toThrow("Approve the design before publishing its story.");
    expect(prisma.designStory.update).not.toHaveBeenCalled();
  });

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

  it("withdraws a pending story review when the designer edits the story", async () => {
    const existing = {
      ...pendingStory(),
      coverImageFileId: null,
      qrCodeFileId: null,
      qrCodeImageUrl: null,
      audioFileIdsJson: null,
      videoFileIdsJson: null,
      reviewNotes: null,
    };
    const prisma = {
      designStory: {
        findUnique: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockImplementation(({ data }) => ({ ...existing, ...data })),
        findUniqueOrThrow: jest.fn().mockResolvedValue(existing),
      },
    };
    const service = new DesignStoriesService(
      prisma as never,
      { log: jest.fn().mockResolvedValue(undefined) } as never,
      {} as never,
    );
    jest.spyOn(service as any, "requireOwnedDesign").mockResolvedValue({
      designerId: "designer-1",
      tenantId: null,
    });
    jest.spyOn(service as any, "ensureSlugIsAvailable").mockResolvedValue(existing.slug);
    jest.spyOn(service as any, "assertMediaOwnership").mockResolvedValue(undefined);
    jest.spyOn(service as any, "assertLocalizedMediaOwnership").mockResolvedValue(undefined);
    jest.spyOn(service as any, "toDesignerStoryDto").mockResolvedValue({ status: DesignStoryStatus.DRAFT });

    await service.upsertDraft("designer-1", "design-1", {
      title: existing.title,
      slug: existing.slug,
      sourceLocale: "uz",
      source: { title: existing.title, body: "Yangi hikoya" },
      translations: {
        ru: { title: "Новый заголовок", body: "Новая история" },
        en: { title: "New title", body: "New story" },
      },
    });

    expect(prisma.designStory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: DesignStoryStatus.DRAFT,
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
      .mockResolvedValue({
        status: "DRAFT",
        versions: [{ id: "version-1" }],
      } as never);

    await expect(
      service.requestPublish("designer-1", "design-1"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.designStory.update).not.toHaveBeenCalled();
  });

  it("submits the design and story together for moderation", async () => {
    const fingerprint = storySourceFingerprint(
      "uz",
      "Yangi sarlavha",
      "Yangi hikoya",
    );
    const story = {
      id: "story-1",
      designAssetId: "design-1",
      title: "Yangi sarlavha",
      slug: "yangi-hikoya",
      sourceLocale: "uz",
      titleTranslationsJson: {
        uz: "Yangi sarlavha",
        ru: "Новый заголовок",
        en: "New title",
      },
      bodyTranslationsJson: {
        uz: "Yangi hikoya",
        ru: "Новая история",
        en: "New story",
      },
      translationMetaJson: {
        translationsSourceFingerprint: fingerprint,
      },
    };
    const prisma: any = {
      designStory: {
        findUnique: jest.fn().mockResolvedValue(story),
        update: jest.fn().mockImplementation(({ data }) => ({
          ...story,
          ...data,
        })),
      },
      designAsset: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    prisma.$transaction = jest.fn(async (operation: (tx: typeof prisma) => unknown) =>
      operation(prisma),
    );
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new DesignStoriesService(
      prisma as never,
      audit as never,
      {} as never,
    );
    jest
      .spyOn(service as any, "requireOwnedDesign")
      .mockResolvedValue({
        status: "DRAFT",
        versions: [{ id: "version-1" }],
      } as never);
    jest
      .spyOn(service as any, "toDesignerStoryDto")
      .mockResolvedValue({ status: "PENDING_REVIEW" } as never);

    await service.requestPublish("designer-1", "design-1");

    expect(prisma.designAsset.updateMany).toHaveBeenCalledWith({
      where: {
        id: "design-1",
        designerId: "designer-1",
        status: { in: ["DRAFT", "NEEDS_FIX", "REJECTED"] },
      },
      data: {
        status: "PENDING_MODERATION",
        moderationStatus: "PENDING",
      },
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "design.submit",
        entityId: "design-1",
        metadata: expect.objectContaining({
          source: "design-story.publish.requested",
          to: "PENDING_MODERATION",
        }),
      }),
    );
  });

  it("allows a revised rejected design and story to re-enter moderation", async () => {
    const story = pendingStory();
    const prisma: any = {
      designStory: {
        findUnique: jest.fn().mockResolvedValue(story),
        update: jest.fn().mockImplementation(({ data }) => ({ ...story, ...data })),
      },
      designAsset: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    prisma.$transaction = jest.fn(async (operation: (tx: typeof prisma) => unknown) => operation(prisma));
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new DesignStoriesService(prisma as never, audit as never, {} as never);
    jest.spyOn(service as any, "requireOwnedDesign").mockResolvedValue({
      id: "design-1",
      designerId: "designer-1",
      status: "REJECTED",
      versions: [{ id: "version-2" }],
    });
    jest.spyOn(service as any, "toDesignerStoryDto").mockResolvedValue({ status: "PENDING_REVIEW" });

    await service.requestPublish("designer-1", "design-1");

    expect(prisma.designAsset.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ["DRAFT", "NEEDS_FIX", "REJECTED"] },
        }),
        data: {
          status: "PENDING_MODERATION",
          moderationStatus: "PENDING",
        },
      }),
    );
  });
});
