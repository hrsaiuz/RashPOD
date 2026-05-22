import { ForbiddenException } from "@nestjs/common";
import { AiService } from "../src/modules/ai/ai.service";

function settings(overrides: Record<string, unknown> = {}) {
  return {
    provider: "OPENAI",
    enabled: true,
    moderationAssistEnabled: true,
    allowedLanguages: ["uz-Latn", "uz-Cyrl", "ru", "en"],
    workflows: {
      LISTING_COPY: { enabled: true, model: "mock", maxTokens: 500, temperature: 0.2, timeoutMs: 1000, retryInvalidOutput: true },
      TRANSLATION: { enabled: true, model: "mock", maxTokens: 500, temperature: 0.2, timeoutMs: 1000, retryInvalidOutput: true },
    },
    ...overrides,
  };
}

function prismaMock() {
  const suggestions: any[] = [];
  return {
    aiJob: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: "job-1", ...data, suggestions: [] })),
      update: jest.fn().mockImplementation(async ({ data }: any) => ({ id: "job-1", workflow: "LISTING_COPY", entityType: "LISTING", entityId: "draft", ...data, suggestions })),
    },
    aiSuggestion: {
      create: jest.fn().mockImplementation(async ({ data }: any) => {
        const row = { id: `s-${suggestions.length + 1}`, ...data };
        suggestions.push(row);
        return row;
      }),
    },
  };
}

describe("AiService", () => {
  it("returns listing copy draft with governance flags", async () => {
    const adminOps: any = {
      getAiSettings: jest.fn().mockReturnValue(settings()),
      canSpendAi: jest.fn().mockReturnValue(true),
      registerAiUsage: jest.fn().mockResolvedValue(undefined),
      isWorkflowEnabled: jest.fn().mockReturnValue(true),
      workflowSettings: jest.fn().mockReturnValue({ enabled: true, model: "mock", maxTokens: 500, temperature: 0.2, timeoutMs: 1000, retryInvalidOutput: true }),
    };
    const audit: any = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new AiService(prismaMock() as any, adminOps, audit);

    const result = await service.listingCopy("u1", { titleHint: "Summer Tee" });
    expect(result.requiresApproval).toBe(true);
    expect(result.governance.autoPublish).toBe(false);
    expect(result.title).toContain("Summer Tee");
  });

  it("blocks AI actions when disabled", async () => {
    const adminOps: any = {
      getAiSettings: jest.fn().mockReturnValue(settings({ enabled: false })),
      canSpendAi: jest.fn().mockReturnValue(true),
      registerAiUsage: jest.fn().mockResolvedValue(undefined),
      isWorkflowEnabled: jest.fn().mockReturnValue(false),
      workflowSettings: jest.fn().mockReturnValue({ enabled: true, model: "mock", maxTokens: 500, temperature: 0.2, timeoutMs: 1000, retryInvalidOutput: true }),
    };
    const audit: any = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new AiService(prismaMock() as any, adminOps, audit);

    await expect(service.translate("u1", { text: "hello", targetLanguage: "uz" })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("blocks AI actions when budget guard denies spending", async () => {
    const adminOps: any = {
      getAiSettings: jest.fn().mockReturnValue(settings()),
      canSpendAi: jest.fn().mockReturnValue(false),
      registerAiUsage: jest.fn().mockResolvedValue(undefined),
      isWorkflowEnabled: jest.fn().mockReturnValue(true),
      workflowSettings: jest.fn().mockReturnValue({ enabled: true, model: "mock", maxTokens: 500, temperature: 0.2, timeoutMs: 1000, retryInvalidOutput: true }),
    };
    const audit: any = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new AiService(prismaMock() as any, adminOps, audit);

    await expect(service.translate("u1", { text: "hello", targetLanguage: "uz" })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
