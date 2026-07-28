import { DesignStatus } from "@prisma/client";
import { ModerationService } from "../src/modules/moderation/moderation.service";

function createService(storyResult: unknown) {
  const tx = {
    designAsset: {
      update: jest.fn().mockImplementation(({ data }) => ({ id: "design-1", ...data })),
    },
    designVersion: {
      findFirst: jest.fn().mockResolvedValue({ id: "version-1" }),
    },
    designModerationCase: {
      create: jest.fn().mockResolvedValue({ id: "case-1" }),
    },
  };
  const prisma = {
    designAsset: {
      findUnique: jest.fn().mockResolvedValue({ id: "design-1", status: DesignStatus.PENDING_MODERATION }),
    },
    $transaction: jest.fn(async (operation: (client: typeof tx) => unknown) => operation(tx)),
  };
  const audit = { log: jest.fn().mockResolvedValue({ id: "audit-1" }) };
  const designStories = {
    syncWithDesignDecision: jest.fn().mockResolvedValue(storyResult),
  };
  return {
    service: new ModerationService(prisma as never, audit as never, designStories as never),
    tx,
    audit,
    designStories,
  };
}

describe("legacy moderation story synchronization", () => {
  it("publishes a pending story when the legacy approve action is used", async () => {
    const { service, tx, audit, designStories } = createService({
      storyId: "story-1",
      action: "approved",
      slug: "story",
    });

    await service.decision("moderator-1", "design-1", DesignStatus.APPROVED);

    expect(designStories.syncWithDesignDecision).toHaveBeenCalledWith(
      tx,
      "moderator-1",
      "design-1",
      "APPROVE",
      undefined,
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "design-story.publish.approved",
        entityId: "story-1",
      }),
    );
  });

  it("unpublishes a public story when the legacy suspend action is used", async () => {
    const { service, tx, audit, designStories } = createService({
      storyId: "story-1",
      action: "unpublished",
      slug: "story",
      notes: "Policy review",
    });

    await service.decision("moderator-1", "design-1", DesignStatus.SUSPENDED, "Policy review");

    expect(designStories.syncWithDesignDecision).toHaveBeenCalledWith(
      tx,
      "moderator-1",
      "design-1",
      "REJECT",
      "Policy review",
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "design-story.unpublished",
        entityId: "story-1",
      }),
    );
  });
});
