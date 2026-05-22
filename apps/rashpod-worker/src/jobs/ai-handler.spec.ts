import { AiJobHandler } from "./ai-handler";

describe("AiJobHandler", () => {
  it("stores provider suggestions and marks the AI job succeeded", async () => {
    const aiJob = { id: "ai-1", workflow: "DESIGN_QA", entityType: "DESIGN", entityId: "d1", status: "QUEUED", promptVersion: "design-qa-v1", inputSummary: { title: "Design" } };
    const suggestions: any[] = [];
    const repo: any = {
      async getAiJob(id: string) {
        return id === aiJob.id ? aiJob : null;
      },
      async updateAiJob(_id: string, data: Record<string, unknown>) {
        Object.assign(aiJob, data);
        return aiJob;
      },
      async createAiSuggestion(data: Record<string, unknown>) {
        const row = { id: `s-${suggestions.length + 1}`, ...data };
        suggestions.push(row);
        return row;
      },
    };
    const provider = {
      async run() {
        return {
          outputSummary: { ok: true },
          suggestions: [{ suggestionType: "QA_WARNING", confidence: 0.8, severity: "WARNING", payload: { warning: "Review resolution" } }],
          tokenUsage: { totalTokens: 42 },
          costEstimateUsd: 0.001,
        };
      },
    };
    const handler = new AiJobHandler(repo, provider);

    const result = await handler.handle({ aiJobId: "ai-1" });

    expect(result.status).toBe("SUCCEEDED");
    expect(result.outputSummary).toEqual({ ok: true });
    expect(result.costEstimateUsd).toBe(0.001);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({ aiJobId: "ai-1", suggestionType: "QA_WARNING", severity: "WARNING" });
  });

  it("stores failure reason when provider fails", async () => {
    const aiJob = { id: "ai-2", workflow: "LISTING_COPY", entityType: "LISTING", entityId: "l1", status: "QUEUED", promptVersion: "listing-copy-v1" };
    const repo: any = {
      async getAiJob(id: string) {
        return id === aiJob.id ? aiJob : null;
      },
      async updateAiJob(_id: string, data: Record<string, unknown>) {
        Object.assign(aiJob, data);
        return aiJob;
      },
      async createAiSuggestion() {
        throw new Error("should not create suggestions");
      },
    };
    const provider = { async run() { throw new Error("provider unavailable"); } };
    const handler = new AiJobHandler(repo, provider);

    const result = await handler.handle({ aiJobId: "ai-2" });

    expect(result.status).toBe("FAILED");
    expect(result.failureReason).toBe("provider unavailable");
  });
});
