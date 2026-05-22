import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AIEntityType, AIJobStatus, AIProvider, AISuggestionSeverity, AISuggestionStatus, AISuggestionType, AIWorkflow, Prisma } from "@prisma/client";
import { createHash } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { AdminOpsService, AiWorkflowKey } from "../admin-ops/admin-ops.service";
import { AuditService } from "../audit/audit.service";
import { AI_PROMPTS } from "./ai-prompts";
import { normalizeConfidence, normalizeSeverity, validateListingCopyPayload, validateQaPayload, validateTranslationPayload } from "./ai-output-validation";

type SuggestionInput = {
  suggestionType: AISuggestionType;
  payload: Record<string, unknown>;
  confidence?: number;
  severity?: AISuggestionSeverity;
};

type RunJobInput = {
  workflow: AIWorkflow;
  entityType: AIEntityType;
  entityId: string;
  inputSummary: Record<string, unknown>;
  inputSnapshot?: Record<string, unknown>;
  forceRerun?: boolean;
};

const WORKFLOW_PERMISSION_LABELS: Record<AIWorkflow, AiWorkflowKey> = {
  DESIGN_QA: "DESIGN_QA",
  MODERATION_ASSIST: "MODERATION_ASSIST",
  PRODUCT_RECOMMENDATION: "PRODUCT_RECOMMENDATION",
  LISTING_COPY: "LISTING_COPY",
  MARKETPLACE_COPY: "MARKETPLACE_COPY",
  TRANSLATION: "TRANSLATION",
  TAG_GENERATION: "TAG_GENERATION",
  RISK_CHECK: "RISK_CHECK",
};

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminOps: AdminOpsService,
    private readonly audit: AuditService,
  ) {}

  async listJobs(filters: { workflow?: AIWorkflow; status?: AIJobStatus; entityType?: AIEntityType; entityId?: string } = {}) {
    return this.prisma.aiJob.findMany({
      where: {
        workflow: filters.workflow,
        status: filters.status,
        entityType: filters.entityType,
        entityId: filters.entityId,
      },
      include: { suggestions: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async getJob(id: string) {
    const job = await this.prisma.aiJob.findUnique({ where: { id }, include: { suggestions: true } });
    if (!job) throw new NotFoundException("AI job not found");
    return job;
  }

  async cancelJob(actorId: string, id: string) {
    const job = await this.prisma.aiJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException("AI job not found");
    if (job.status !== AIJobStatus.QUEUED && job.status !== AIJobStatus.RUNNING) throw new BadRequestException("Only queued or running AI jobs can be canceled");
    const updated = await this.prisma.aiJob.update({ where: { id }, data: { status: AIJobStatus.CANCELED, completedAt: new Date(), reviewedById: actorId, reviewedAt: new Date() }, include: { suggestions: true } });
    await this.audit.log({ actorId, action: "ai.job.canceled", entityType: "AiJob", entityId: id, metadata: { workflow: job.workflow, entityType: job.entityType, entityId: job.entityId } });
    return updated;
  }

  async retryJob(actorId: string, id: string) {
    const job = await this.prisma.aiJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException("AI job not found");
    if (job.status !== AIJobStatus.FAILED && job.status !== AIJobStatus.SKIPPED && job.status !== AIJobStatus.CANCELED) throw new BadRequestException("Only failed, skipped, or canceled AI jobs can be retried");
    return this.createJob(actorId, {
      workflow: job.workflow,
      entityType: job.entityType,
      entityId: job.entityId,
      inputSummary: this.objectJson(job.inputSummary),
      inputSnapshot: this.objectJson(job.inputSnapshot),
      forceRerun: true,
    });
  }

  async suggestionsForEntity(entityType: AIEntityType, entityId: string, customerSafe = false) {
    const jobs = await this.prisma.aiJob.findMany({
      where: { entityType, entityId },
      include: { suggestions: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const suggestions = jobs.flatMap((job) => job.suggestions.map((suggestion) => ({ ...suggestion, aiJob: { id: job.id, workflow: job.workflow, status: job.status, promptVersion: job.promptVersion, createdAt: job.createdAt } })));
    return customerSafe ? suggestions.filter((suggestion) => this.isCustomerSafeSuggestion(suggestion.suggestionType, suggestion.payload)) : suggestions;
  }

  async acceptSuggestion(actorId: string, suggestionId: string, reason?: string) {
    const suggestion = await this.requireSuggestion(suggestionId);
    const updated = await this.prisma.aiSuggestion.update({
      where: { id: suggestionId },
      data: { status: AISuggestionStatus.ACCEPTED, humanDecisionReason: reason, appliedById: actorId },
    });
    await this.audit.log({ actorId, action: "ai.suggestion.accepted", entityType: "AiSuggestion", entityId: suggestionId, metadata: { aiJobId: suggestion.aiJobId, suggestionType: suggestion.suggestionType, reason: reason ?? null } });
    return updated;
  }

  async rejectSuggestion(actorId: string, suggestionId: string, reason?: string) {
    const suggestion = await this.requireSuggestion(suggestionId);
    const updated = await this.prisma.aiSuggestion.update({
      where: { id: suggestionId },
      data: { status: AISuggestionStatus.REJECTED, humanDecisionReason: reason, appliedById: actorId },
    });
    await this.audit.log({ actorId, action: "ai.suggestion.rejected", entityType: "AiSuggestion", entityId: suggestionId, metadata: { aiJobId: suggestion.aiJobId, suggestionType: suggestion.suggestionType, reason: reason ?? null } });
    return updated;
  }

  async applyListingCopy(actorId: string, listingId: string, input: { suggestionId: string; fields?: string[] }) {
    const suggestion = await this.requireSuggestion(input.suggestionId);
    if (suggestion.aiJob.entityType !== AIEntityType.LISTING || suggestion.aiJob.entityId !== listingId) throw new ForbiddenException("Suggestion does not belong to this listing");
    const payload = validateListingCopyPayload(this.objectJson(suggestion.payload as Prisma.JsonValue));
    const fields = new Set(input.fields?.length ? input.fields : ["title", "description", "tags"]);
    const listing = await this.prisma.commerceListing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException("Listing not found");
    const metadata = this.objectJson(listing.metadataJson);
    const provenance = this.objectJson(metadata.aiGenerated);
    const data: Prisma.CommerceListingUpdateInput = { metadataJson: { ...metadata, aiGenerated: { ...provenance, listingCopySuggestionId: suggestion.id, appliedAt: new Date().toISOString(), fields: Array.from(fields) } } };
    if (fields.has("title") && payload.title) data.title = String(payload.title);
    if (fields.has("description") && payload.description) data.description = String(payload.description);
    if (fields.has("tags") && Array.isArray(payload.tags)) data.tags = payload.tags as Prisma.InputJsonValue;
    const updated = await this.prisma.commerceListing.update({ where: { id: listingId }, data });
    await this.markApplied(actorId, suggestion.id, { fields: Array.from(fields), listingId });
    await this.audit.log({ actorId, action: "ai.copy.applied", entityType: "CommerceListing", entityId: listingId, metadata: { suggestionId: suggestion.id, fields: Array.from(fields) } });
    return updated;
  }

  async designQa(actorId: string, designId: string) {
    const design = await this.prisma.designAsset.findUnique({ where: { id: designId }, include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } } });
    if (!design) throw new NotFoundException("Design not found");
    const latest = design.versions[0];
    const widthPx = latest?.widthPx ?? design.widthPx;
    const heightPx = latest?.heightPx ?? design.heightPx;
    const dpi = latest?.dpi ?? design.dpi;
    const warnings: string[] = [];
    const blockers: string[] = [];
    const suggestedFixes: string[] = [];
    if (!widthPx || !heightPx) warnings.push("Design dimensions are missing from metadata");
    if (widthPx && heightPx && Math.min(widthPx, heightPx) < 1200) {
      warnings.push("Design resolution may be too low for larger print placements");
      suggestedFixes.push("Upload a higher resolution file or limit this design to smaller print areas");
    }
    if (dpi && dpi < 150) warnings.push("DPI is below common print guidance");
    if (latest?.hasTransparency === false) {
      warnings.push("Transparent background was not detected");
      suggestedFixes.push("Provide a transparent PNG or verify background removal before production");
    }
    const qaConfidence = warnings.length ? 0.74 : 0.86;
    const qaPayload = validateQaPayload({
      recommendation: blockers.length ? "BLOCK" : warnings.length ? "WARN" : "PASS",
      warnings,
      blockers,
      suggestedFixes,
      confidence: qaConfidence,
      metadata: { widthPx, heightPx, dpi, hasTransparency: latest?.hasTransparency ?? null, fileType: design.fileType ?? null },
      explanation: warnings.length ? "Deterministic metadata checks found review points. Moderator must make the final decision." : "Metadata checks did not find obvious production blockers. Moderator must still review the design.",
    });
    const job = await this.createJob(actorId, {
      workflow: AIWorkflow.DESIGN_QA,
      entityType: AIEntityType.DESIGN,
      entityId: designId,
      inputSummary: { designId, title: design.title, widthPx, heightPx, dpi, hasTransparency: latest?.hasTransparency ?? null },
      inputSnapshot: { designId, latestVersionId: latest?.id ?? null, status: design.status, metadataOnly: true },
    });
    return this.completeJob(actorId, job.id, { qa: qaPayload }, [
      { suggestionType: blockers.length ? AISuggestionType.RISK_FLAG : AISuggestionType.QA_WARNING, severity: blockers.length ? "BLOCKER" : warnings.length ? "WARNING" : "INFO", confidence: qaConfidence, payload: qaPayload },
    ], "ai.qa.completed");
  }

  async listingCopy(actorId: string, input: { titleHint?: string; descriptionHint?: string; tagsHint?: string[]; listingId?: string }) {
    const providerText = await this.runOpenAiText({ workflow: AIWorkflow.LISTING_COPY, actorId, user: `Title hint: ${input.titleHint || ""}\nDescription hint: ${input.descriptionHint || ""}\nTags hint: ${(input.tagsHint || []).join(", ")}` });
    const payload = validateListingCopyPayload({
      title: input.titleHint ? `${input.titleHint} | RashPOD Edition` : "RashPOD Product Listing",
      description: providerText || input.descriptionHint || "Generated draft description. Review before publishing.",
      tags: input.tagsHint?.length ? input.tagsHint : ["rashpod", "pod", "design"],
      source: "AI_LISTING_COPY",
    });
    const job = await this.createJob(actorId, {
      workflow: AIWorkflow.LISTING_COPY,
      entityType: AIEntityType.LISTING,
      entityId: input.listingId ?? "draft",
      inputSummary: { titleHint: input.titleHint, hasDescriptionHint: Boolean(input.descriptionHint), tagsCount: input.tagsHint?.length ?? 0 },
    });
    const completed = await this.completeJob(actorId, job.id, { title: payload.title, tags: payload.tags }, [
      { suggestionType: AISuggestionType.LISTING_TITLE, confidence: 0.78, payload },
      { suggestionType: AISuggestionType.LISTING_DESCRIPTION, confidence: 0.78, payload },
      { suggestionType: AISuggestionType.TAGS, confidence: 0.72, payload },
    ], "ai.copy.generated");
    return { requiresApproval: true, aiGenerated: true, aiJobId: completed.id, suggestions: completed.suggestions, title: payload.title, description: payload.description, tags: payload.tags, governance: { autoPublish: false, autoModerate: false } };
  }

  async translate(actorId: string, input: { text: string; targetLanguage: "uz" | "ru" | "en" | "uz-Latn" | "uz-Cyrl"; entityType?: AIEntityType; entityId?: string }) {
    const settings = await this.adminOps.getAiSettings();
    const targetLanguage = this.normalizeLanguage(input.targetLanguage);
    if (!settings.allowedLanguages.includes(targetLanguage)) throw new BadRequestException("AI translation language is not enabled");
    const providerText = await this.runOpenAiText({ workflow: AIWorkflow.TRANSLATION, actorId, user: `Translate to ${targetLanguage}: ${input.text}` });
    const payload = validateTranslationPayload({ sourceText: input.text, targetLanguage, translatedText: providerText || `[${targetLanguage}] ${input.text}` });
    const job = await this.createJob(actorId, {
      workflow: AIWorkflow.TRANSLATION,
      entityType: input.entityType ?? AIEntityType.LISTING,
      entityId: input.entityId ?? "ad-hoc",
      inputSummary: { targetLanguage, sourceLength: input.text.length },
    });
    const completed = await this.completeJob(actorId, job.id, { targetLanguage, translatedLength: String(payload.translatedText).length }, [
      { suggestionType: AISuggestionType.TRANSLATION, confidence: 0.82, payload },
    ], "ai.translation.generated");
    return { requiresApproval: true, aiGenerated: true, aiJobId: completed.id, suggestions: completed.suggestions, targetLanguage, translatedText: payload.translatedText, governance: { autoPublish: false } };
  }

  async moderationAssist(actorId: string, input: { title?: string; description?: string; designId?: string }) {
    const settings = await this.adminOps.getAiSettings();
    if (settings.moderationAssistEnabled === false) throw new ForbiddenException("Moderation assist is disabled");
    const providerText = await this.runOpenAiText({ workflow: AIWorkflow.MODERATION_ASSIST, actorId, user: `Title: ${input.title || ""}\nDescription: ${input.description || ""}` });
    const payload = {
      summary: providerText || "Review design ownership, text/brand elements, print quality, and policy risks.",
      suggestedDecision: "MANUAL_REVIEW_RECOMMENDED",
      reasons: ["Check design ownership evidence and upload provenance", "Review text/brand elements for potential IP risks"],
      confidence: 0.62,
      aiGenerated: true,
    };
    const job = await this.createJob(actorId, {
      workflow: AIWorkflow.MODERATION_ASSIST,
      entityType: AIEntityType.DESIGN,
      entityId: input.designId ?? "ad-hoc",
      inputSummary: { title: input.title, hasDescription: Boolean(input.description) },
    });
    const completed = await this.completeJob(actorId, job.id, { suggestedDecision: payload.suggestedDecision }, [
      { suggestionType: AISuggestionType.MODERATION_REASON, severity: "WARNING", confidence: payload.confidence, payload },
    ], "ai.moderation_assist.generated");
    return { requiresApproval: true, aiJobId: completed.id, suggestions: completed.suggestions, hints: payload.reasons.concat(String(payload.summary)), governance: { finalDecisionByHuman: true } };
  }

  async filmReadiness(actorId: string, input: { widthPx: number; heightPx: number; hasTransparency: boolean }) {
    const minDim = Math.min(input.widthPx, input.heightPx);
    const ready = minDim >= 1200 && input.hasTransparency;
    const payload = validateQaPayload({
      recommendation: ready ? "PASS" : "WARN",
      warnings: ready ? [] : ["Increase resolution and ensure transparent background"],
      blockers: [],
      suggestedFixes: ready ? [] : ["Use a transparent high-resolution source before enabling film sales"],
      confidence: 0.8,
      metadata: input,
    });
    const job = await this.createJob(actorId, { workflow: AIWorkflow.DESIGN_QA, entityType: AIEntityType.FILM_ORDER, entityId: "film-readiness", inputSummary: input });
    const completed = await this.completeJob(actorId, job.id, { ready }, [{ suggestionType: AISuggestionType.QA_WARNING, confidence: 0.8, severity: ready ? "INFO" : "WARNING", payload }], "ai.qa.completed");
    return { requiresApproval: true, aiJobId: completed.id, ready, hints: payload.warnings?.length ? payload.warnings : ["Resolution and transparency look suitable for film workflow."], governance: { doesNotEnableFilmSales: true } };
  }

  async corporateOfferDraft(actorId: string, input: { brief: string; quantity?: number; budget?: number }) {
    const providerText = await this.runOpenAiText({ workflow: AIWorkflow.LISTING_COPY, actorId, user: `Draft corporate offer. Brief: ${input.brief}\nQuantity: ${input.quantity ?? "TBD"}\nBudget: ${input.budget ?? "TBD"}` });
    await this.audit.log({ actorId, action: "ai.corporate-offer-draft.generate", entityType: "AiAssist", entityId: "corporate-offer-draft" });
    return {
      requiresApproval: true,
      draft: providerText || `Offer draft:\n- Scope: ${input.brief}\n- Quantity: ${input.quantity ?? "TBD"}\n- Budget context: ${input.budget ?? "TBD"}\n- Terms: Final pricing and delivery terms subject to admin approval.`,
      governance: { sendRequiresAdminApproval: true },
    };
  }

  private async createJob(actorId: string, input: RunJobInput) {
    const settings = await this.adminOps.getAiSettings();
    const workflowKey = WORKFLOW_PERMISSION_LABELS[input.workflow];
    if (!this.adminOps.isWorkflowEnabled(settings, workflowKey)) throw new ForbiddenException(`AI workflow ${input.workflow} is disabled`);
    const workflowSettings = this.adminOps.workflowSettings(settings, workflowKey);
    const prompt = AI_PROMPTS[input.workflow];
    const idempotencyKey = input.forceRerun ? undefined : this.idempotencyKey(input.workflow, input.entityType, input.entityId, input.inputSnapshot ?? input.inputSummary);
    if (idempotencyKey) {
      const existing = await this.prisma.aiJob.findUnique({ where: { idempotencyKey }, include: { suggestions: true } });
      if (existing) return existing;
    }
    const job = await this.prisma.aiJob.create({
      data: {
        workflow: input.workflow,
        entityType: input.entityType,
        entityId: input.entityId,
        provider: settings.provider as AIProvider,
        model: workflowSettings.model,
        status: AIJobStatus.RUNNING,
        inputSummary: this.cleanJson(this.redact(input.inputSummary)),
        inputSnapshot: input.inputSnapshot ? this.cleanJson(this.redact(input.inputSnapshot)) : undefined,
        promptVersion: prompt.version,
        idempotencyKey,
        createdById: actorId,
      },
      include: { suggestions: true },
    });
    await this.audit.log({ actorId, action: "ai.job.created", entityType: "AiJob", entityId: job.id, metadata: { workflow: input.workflow, entityType: input.entityType, entityId: input.entityId, provider: settings.provider, model: workflowSettings.model, promptVersion: prompt.version } });
    return job;
  }

  private async completeJob(actorId: string, jobId: string, outputSummary: Record<string, unknown>, suggestions: SuggestionInput[], auditAction: string) {
    const created = [];
    for (const suggestion of suggestions) {
      const payload = this.cleanJson(this.redact(suggestion.payload));
      created.push(await this.prisma.aiSuggestion.create({
        data: {
          aiJobId: jobId,
          suggestionType: suggestion.suggestionType,
          confidence: normalizeConfidence(suggestion.confidence),
          severity: normalizeSeverity(suggestion.severity),
          payload,
        },
      }));
      await this.audit.log({ actorId, action: "ai.suggestion.created", entityType: "AiSuggestion", entityId: created[created.length - 1].id, metadata: { aiJobId: jobId, suggestionType: suggestion.suggestionType, confidence: suggestion.confidence ?? null } });
    }
    const job = await this.prisma.aiJob.update({ where: { id: jobId }, data: { status: AIJobStatus.SUCCEEDED, outputSummary: this.cleanJson(this.redact(outputSummary)), completedAt: new Date() }, include: { suggestions: true } });
    await this.audit.log({ actorId, action: "ai.job.completed", entityType: "AiJob", entityId: jobId, metadata: { workflow: job.workflow, entityType: job.entityType, entityId: job.entityId, suggestions: created.length } });
    await this.audit.log({ actorId, action: auditAction, entityType: String(job.entityType), entityId: job.entityId, metadata: { aiJobId: job.id, suggestions: created.map((item) => item.id) } });
    return job;
  }

  private async runOpenAiText(input: { workflow: AIWorkflow; actorId: string; user: string }) {
    const settings = await this.adminOps.getAiSettings();
    const workflowSettings = this.adminOps.workflowSettings(settings, WORKFLOW_PERMISSION_LABELS[input.workflow]);
    const estimatedUsd = 0.002;
    if (!(await this.adminOps.canSpendAi(estimatedUsd))) throw new ForbiddenException("AI budget exceeded");
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || settings.provider === "DISABLED") {
      await this.adminOps.registerAiUsage(input.actorId, 0, `${input.workflow}.no-provider-fallback`);
      return null;
    }
    const prompt = AI_PROMPTS[input.workflow];
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), workflowSettings.timeoutMs);
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: workflowSettings.model, temperature: workflowSettings.temperature, max_tokens: workflowSettings.maxTokens, messages: [{ role: "system", content: prompt.system }, { role: "user", content: input.user }] }),
      });
      clearTimeout(timeout);
      if (!res.ok) {
        await this.audit.log({ actorId: input.actorId, action: "ai.provider.error", entityType: "AiAssist", entityId: input.workflow, metadata: { status: res.status, provider: settings.provider, model: workflowSettings.model } });
        return null;
      }
      const json = await res.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: { total_tokens?: number } };
      const usageUsd = json.usage ? ((Number(json.usage.total_tokens ?? 0) / 1000) * 0.0005) : estimatedUsd;
      await this.adminOps.registerAiUsage(input.actorId, usageUsd, input.workflow);
      const text = json.choices?.[0]?.message?.content;
      return typeof text === "string" ? text.trim() : null;
    } catch (error) {
      await this.audit.log({ actorId: input.actorId, action: "ai.provider.error", entityType: "AiAssist", entityId: input.workflow, metadata: { error: error instanceof Error ? error.message : "Unknown AI provider error" } });
      return null;
    }
  }

  private async requireSuggestion(suggestionId: string) {
    const suggestion = await this.prisma.aiSuggestion.findUnique({ where: { id: suggestionId }, include: { aiJob: true } });
    if (!suggestion) throw new NotFoundException("AI suggestion not found");
    return suggestion;
  }

  private async markApplied(actorId: string, suggestionId: string, metadata: Record<string, unknown>) {
    await this.prisma.aiSuggestion.update({ where: { id: suggestionId }, data: { status: AISuggestionStatus.APPLIED, appliedAt: new Date(), appliedById: actorId } });
    await this.audit.log({ actorId, action: "ai.suggestion.applied", entityType: "AiSuggestion", entityId: suggestionId, metadata });
  }

  private isCustomerSafeSuggestion(type: AISuggestionType, payload: Prisma.JsonValue) {
    if (type !== AISuggestionType.QA_WARNING && type !== AISuggestionType.TRANSLATION) return false;
    const record = this.objectJson(payload);
    return !record.internalOnly && !record.riskScore;
  }

  private idempotencyKey(workflow: AIWorkflow, entityType: AIEntityType, entityId: string, snapshot: Record<string, unknown>) {
    const hash = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex").slice(0, 16);
    return `AI:${workflow}:${entityType}:${entityId}:${hash}`;
  }

  private normalizeLanguage(language: string) {
    if (language === "uz") return "uz-Latn";
    return language;
  }

  private objectJson(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }

  private cleanJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
  }

  private redact<T>(value: T): T {
    const json = JSON.stringify(value ?? null).replace(/https?:\/\/[^\s"]*(X-Goog-|Signature=|token=|authorization=)[^\s"]*/gi, "[REDACTED_URL]").replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]").replace(/\+?\d[\d\s().-]{7,}\d/g, "[REDACTED_PHONE]");
    return JSON.parse(json) as T;
  }
}
