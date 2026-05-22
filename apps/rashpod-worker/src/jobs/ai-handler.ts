import { WorkerRepository } from "../repository";

export interface AiProviderPort {
  run(input: { workflow: string; promptVersion?: string; inputSummary?: unknown }): Promise<{ outputSummary?: unknown; suggestions?: Array<{ suggestionType: string; confidence?: number; severity?: string; payload: unknown }>; tokenUsage?: unknown; costEstimateUsd?: number }>;
}

export class MockAiProvider implements AiProviderPort {
  async run(input: { workflow: string; promptVersion?: string; inputSummary?: unknown }) {
    return {
      outputSummary: { workflow: input.workflow, mocked: true },
      suggestions: [
        {
          suggestionType: "QA_WARNING",
          confidence: 0.5,
          severity: "INFO",
          payload: { aiGenerated: true, mocked: true, workflow: input.workflow, message: "Mock AI provider completed; human review required." },
        },
      ],
      tokenUsage: { totalTokens: 0 },
      costEstimateUsd: 0,
    };
  }
}

export class AiJobHandler {
  constructor(
    private readonly repo: WorkerRepository,
    private readonly provider: AiProviderPort = new MockAiProvider(),
  ) {}

  async handle(input: { aiJobId: string }) {
    if (!this.repo.getAiJob || !this.repo.updateAiJob || !this.repo.createAiSuggestion) {
      throw new Error("AI job persistence is not configured");
    }
    const job = await this.repo.getAiJob(input.aiJobId);
    if (!job) throw new Error(`AI job ${input.aiJobId} not found`);
    if (job.status === "SUCCEEDED" || job.status === "CANCELED") return job;
    await this.repo.updateAiJob(job.id, { status: "RUNNING", failureReason: null });
    try {
      const result = await this.provider.run({ workflow: job.workflow, promptVersion: job.promptVersion ?? undefined, inputSummary: job.inputSummary });
      for (const suggestion of result.suggestions ?? []) {
        await this.repo.createAiSuggestion({
          aiJobId: job.id,
          suggestionType: suggestion.suggestionType,
          confidence: suggestion.confidence,
          severity: suggestion.severity,
          payload: suggestion.payload,
        });
      }
      return this.repo.updateAiJob(job.id, {
        status: "SUCCEEDED",
        outputSummary: result.outputSummary,
        tokenUsageJson: result.tokenUsage,
        costEstimateUsd: result.costEstimateUsd,
        completedAt: new Date(),
        failureReason: null,
      });
    } catch (error) {
      return this.repo.updateAiJob(job.id, {
        status: "FAILED",
        failureReason: error instanceof Error ? error.message : "Unknown AI worker failure",
        completedAt: new Date(),
      });
    }
  }
}
