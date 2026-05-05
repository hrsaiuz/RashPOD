import { ForbiddenException } from "@nestjs/common";
import { AiService } from "../src/modules/ai/ai.service";

describe("AiService", () => {
  it("returns listing copy draft with governance flags", async () => {
    const adminOps: any = {
      getAiSettings: jest.fn().mockReturnValue({ enabled: true, moderationAssistEnabled: true }),
      canSpendAi: jest.fn().mockReturnValue(true),
      registerAiUsage: jest.fn().mockResolvedValue(undefined),
    };
    const audit: any = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new AiService(adminOps, audit);

    const result = await service.listingCopy("u1", { titleHint: "Summer Tee" });
    expect(result.requiresApproval).toBe(true);
    expect(result.governance.autoPublish).toBe(false);
    expect(result.title).toContain("Summer Tee");
  });

  it("blocks AI actions when disabled", async () => {
    const adminOps: any = {
      getAiSettings: jest.fn().mockReturnValue({ enabled: false, moderationAssistEnabled: true }),
      canSpendAi: jest.fn().mockReturnValue(true),
      registerAiUsage: jest.fn().mockResolvedValue(undefined),
    };
    const audit: any = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new AiService(adminOps, audit);

    await expect(service.translate("u1", { text: "hello", targetLanguage: "uz" })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("blocks AI actions when budget guard denies spending", async () => {
    const adminOps: any = {
      getAiSettings: jest.fn().mockReturnValue({ enabled: true, moderationAssistEnabled: true }),
      canSpendAi: jest.fn().mockReturnValue(false),
      registerAiUsage: jest.fn().mockResolvedValue(undefined),
    };
    const audit: any = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new AiService(adminOps, audit);

    await expect(service.translate("u1", { text: "hello", targetLanguage: "uz" })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
