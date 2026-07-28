import { describe, expect, it } from "vitest";
import { isDesignApprovedForStoryPublication } from "./design-story-publication";

describe("design story publication policy", () => {
  it.each(["APPROVED_LOCAL", "APPROVED_GLOBAL", "APPROVED", "READY_FOR_MOCKUP", "READY_TO_PUBLISH", "PUBLISHED"] as const)(
    "allows story publication for %s designs",
    (status) => {
      expect(isDesignApprovedForStoryPublication(status)).toBe(true);
    },
  );

  it.each(["DRAFT", "SUBMITTED", "PENDING_MODERATION", "NEEDS_FIX", "REJECTED", "SUSPENDED"] as const)(
    "blocks story publication for %s designs",
    (status) => {
      expect(isDesignApprovedForStoryPublication(status)).toBe(false);
    },
  );
});
