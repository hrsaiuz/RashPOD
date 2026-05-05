import { ForbiddenException, Injectable } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { AdminOpsService } from "../admin-ops/admin-ops.service";

@Injectable()
export class AiService {
  constructor(
    private readonly adminOps: AdminOpsService,
    private readonly audit: AuditService,
  ) {}

  private assertEnabled() {
    const settings = this.adminOps.getAiSettings() as Record<string, unknown>;
    if (settings.enabled === false) {
      throw new ForbiddenException("AI assist is disabled by admin settings");
    }
  }

  private async runOpenAiText(input: {
    operation: string;
    actorId: string;
    modelEnv: string | undefined;
    system: string;
    user: string;
    temperature?: number;
  }) {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = input.modelEnv || "gpt-4o-mini";
    const estimatedUsd = 0.002;
    if (!this.adminOps.canSpendAi(estimatedUsd)) {
      throw new ForbiddenException("AI monthly budget exceeded");
    }

    if (!apiKey) {
      await this.adminOps.registerAiUsage(input.actorId, 0, `${input.operation}.no-api-key-fallback`);
      return null;
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: input.temperature ?? 0.2,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
      }),
    });
    if (!res.ok) {
      await this.audit.log({
        actorId: input.actorId,
        action: "ai.provider.error",
        entityType: "AiAssist",
        entityId: input.operation,
        details: { status: res.status },
      });
      return null;
    }
    const json = (await res.json()) as any;
    const text = json?.choices?.[0]?.message?.content;
    const usage = json?.usage;
    const usageUsd = usage ? ((Number(usage.total_tokens ?? 0) / 1000) * 0.0005) : estimatedUsd;
    await this.adminOps.registerAiUsage(input.actorId, usageUsd, input.operation);
    return typeof text === "string" ? text.trim() : null;
  }

  async listingCopy(actorId: string, input: { titleHint?: string; descriptionHint?: string; tagsHint?: string[] }) {
    this.assertEnabled();
    const providerText = await this.runOpenAiText({
      operation: "listing-copy",
      actorId,
      modelEnv: process.env.OPENAI_LISTING_MODEL,
      system:
        "You generate concise ecommerce listing copy drafts. Never imply automatic publishing. Output plain text title, description, and comma-separated tags.",
      user: `Title hint: ${input.titleHint || ""}\nDescription hint: ${input.descriptionHint || ""}\nTags hint: ${(input.tagsHint || []).join(", ")}`,
      temperature: 0.4,
    });
    await this.audit.log({
      actorId,
      action: "ai.listing-copy.generate",
      entityType: "AiAssist",
      entityId: "listing-copy",
    });
    return {
      requiresApproval: true,
      title: input.titleHint ? `${input.titleHint} | RashPOD Edition` : "RashPOD Product Listing",
      description: providerText || input.descriptionHint || "Generated draft description. Review before publishing.",
      tags: input.tagsHint?.length ? input.tagsHint : ["rashpod", "pod", "design"],
      governance: { autoPublish: false, autoModerate: false },
    };
  }

  async translate(actorId: string, input: { text: string; targetLanguage: "uz" | "ru" | "en" }) {
    this.assertEnabled();
    const providerText = await this.runOpenAiText({
      operation: "translate",
      actorId,
      modelEnv: process.env.OPENAI_TRANSLATION_MODEL,
      system: "Translate accurately and concisely. Return only translated text.",
      user: `Translate to ${input.targetLanguage}: ${input.text}`,
      temperature: 0.1,
    });
    await this.audit.log({ actorId, action: "ai.translate.generate", entityType: "AiAssist", entityId: "translate" });
    return {
      requiresApproval: true,
      targetLanguage: input.targetLanguage,
      translatedText: providerText || `[${input.targetLanguage}] ${input.text}`,
      governance: { autoPublish: false },
    };
  }

  async moderationAssist(actorId: string, input: { title?: string; description?: string }) {
    this.assertEnabled();
    const settings = this.adminOps.getAiSettings() as Record<string, unknown>;
    if (settings.moderationAssistEnabled === false) {
      throw new ForbiddenException("Moderation assist is disabled");
    }
    const providerText = await this.runOpenAiText({
      operation: "moderation-assist",
      actorId,
      modelEnv: process.env.OPENAI_MODERATION_ASSIST_MODEL,
      system: "Provide moderation risk hints only. Do not make final decisions.",
      user: `Title: ${input.title || ""}\nDescription: ${input.description || ""}`,
      temperature: 0.2,
    });
    await this.audit.log({
      actorId,
      action: "ai.moderation-assist.generate",
      entityType: "AiAssist",
      entityId: "moderation-assist",
    });
    return {
      requiresApproval: true,
      hints: [
        "Check design ownership evidence and upload provenance.",
        "Review text/brand elements for potential IP risks.",
        providerText || (input.description?.length ? "Description quality is sufficient for manual review." : "Description is sparse; request clarification."),
      ],
      governance: { finalDecisionByHuman: true },
    };
  }

  async filmReadiness(actorId: string, input: { widthPx: number; heightPx: number; hasTransparency: boolean }) {
    this.assertEnabled();
    await this.audit.log({
      actorId,
      action: "ai.film-readiness.generate",
      entityType: "AiAssist",
      entityId: "film-readiness",
    });
    const minDim = Math.min(input.widthPx, input.heightPx);
    const ready = minDim >= 1200 && input.hasTransparency;
    return {
      requiresApproval: true,
      ready,
      hints: [
        ready ? "Resolution and transparency look suitable for film workflow." : "Increase resolution and ensure transparent background.",
      ],
      governance: { doesNotEnableFilmSales: true },
    };
  }

  async corporateOfferDraft(actorId: string, input: { brief: string; quantity?: number; budget?: number }) {
    this.assertEnabled();
    const providerText = await this.runOpenAiText({
      operation: "corporate-offer-draft",
      actorId,
      modelEnv: process.env.OPENAI_CORPORATE_MODEL,
      system: "Draft concise corporate merchandising offer text. Human approval required.",
      user: `Brief: ${input.brief}\nQuantity: ${input.quantity ?? "TBD"}\nBudget: ${input.budget ?? "TBD"}`,
      temperature: 0.3,
    });
    await this.audit.log({
      actorId,
      action: "ai.corporate-offer-draft.generate",
      entityType: "AiAssist",
      entityId: "corporate-offer-draft",
    });
    return {
      requiresApproval: true,
      draft:
        providerText ||
        `Offer draft:\n- Scope: ${input.brief}\n- Quantity: ${input.quantity ?? "TBD"}\n- Budget context: ${input.budget ?? "TBD"}\n- Terms: Final pricing and delivery terms subject to admin approval.`,
      governance: { sendRequiresAdminApproval: true },
    };
  }
}
