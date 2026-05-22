import { Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { MailerService } from "../mailer/mailer.service";
import { CreateEmailTemplateDto } from "./dto/create-email-template.dto";
import { TestEmailTemplateDto } from "./dto/test-email-template.dto";
import { UpdateAdminSettingsDto } from "./dto/update-admin-settings.dto";
import { UpdateAiSettingsDto } from "./dto/update-ai-settings.dto";
import { UpdateEmailTemplateDto } from "./dto/update-email-template.dto";

const SETTINGS_KEY = "admin-settings";
const AI_KEY = "ai-settings";

type AdminSettings = {
  companyName: string;
  supportEmail: string;
  metadata: Record<string, unknown>;
};

export type AiWorkflowKey =
  | "DESIGN_QA"
  | "MODERATION_ASSIST"
  | "PRODUCT_RECOMMENDATION"
  | "LISTING_COPY"
  | "MARKETPLACE_COPY"
  | "TRANSLATION"
  | "TAG_GENERATION"
  | "RISK_CHECK";

type AiWorkflowSettings = {
  enabled: boolean;
  model: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
  retryInvalidOutput: boolean;
  style?: string;
};

export type AiSettingsState = {
  provider: "OPENAI" | "DISABLED";
  enabled: boolean;
  monthlyBudgetUsd: number;
  dailyBudgetUsd: number;
  moderationAssistEnabled: boolean;
  workflows: Record<AiWorkflowKey, AiWorkflowSettings>;
  allowedLanguages: string[];
  safetyMode: "ASSIST_ONLY" | "SUGGEST_WITH_CONFIDENCE" | "REQUIRE_HUMAN_APPROVAL";
  dataSharing: {
    mode: "METADATA_ONLY" | "PUBLIC_PREVIEW_URL" | "SIGNED_TEMPORARY_URL" | "PRIVATE_ORIGINAL_ALLOWED";
    signedUrlExpiresSeconds: number;
    allowPrivateOriginal: boolean;
  };
  logging: {
    mode: "PROMPT_METADATA_ONLY" | "FULL_PROMPT_RESPONSE";
    redactSensitiveFields: boolean;
  };
  usageUsdMonth: number;
  usageUsdDay: number;
  usageMonthKey: string;
  usageDayKey: string;
};

const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  companyName: "RashPOD",
  supportEmail: "support@rashpod.local",
  metadata: {},
};

const AI_WORKFLOWS: AiWorkflowKey[] = ["DESIGN_QA", "MODERATION_ASSIST", "PRODUCT_RECOMMENDATION", "LISTING_COPY", "MARKETPLACE_COPY", "TRANSLATION", "TAG_GENERATION", "RISK_CHECK"];

const DEFAULT_WORKFLOW = (model = "gpt-4o-mini", temperature = 0.2): AiWorkflowSettings => ({
  enabled: true,
  model,
  maxTokens: 1200,
  temperature,
  timeoutMs: 30000,
  retryInvalidOutput: true,
});

function currentDayKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

const DEFAULT_AI_SETTINGS = (monthKey: string, dayKey = currentDayKey()): AiSettingsState => ({
  provider: "OPENAI",
  enabled: true,
  monthlyBudgetUsd: 200,
  dailyBudgetUsd: 25,
  moderationAssistEnabled: true,
  workflows: {
    DESIGN_QA: DEFAULT_WORKFLOW("gpt-4o-mini", 0.1),
    MODERATION_ASSIST: DEFAULT_WORKFLOW("gpt-4o-mini", 0.2),
    PRODUCT_RECOMMENDATION: DEFAULT_WORKFLOW("gpt-4o-mini", 0.2),
    LISTING_COPY: DEFAULT_WORKFLOW("gpt-4o-mini", 0.4),
    MARKETPLACE_COPY: DEFAULT_WORKFLOW("gpt-4o-mini", 0.3),
    TRANSLATION: DEFAULT_WORKFLOW("gpt-4o-mini", 0.1),
    TAG_GENERATION: DEFAULT_WORKFLOW("gpt-4o-mini", 0.3),
    RISK_CHECK: DEFAULT_WORKFLOW("gpt-4o-mini", 0.1),
  },
  allowedLanguages: ["uz-Latn", "uz-Cyrl", "ru", "en"],
  safetyMode: "REQUIRE_HUMAN_APPROVAL",
  dataSharing: { mode: "METADATA_ONLY", signedUrlExpiresSeconds: 300, allowPrivateOriginal: false },
  logging: { mode: "PROMPT_METADATA_ONLY", redactSensitiveFields: true },
  usageUsdMonth: 0,
  usageUsdDay: 0,
  usageMonthKey: monthKey,
  usageDayKey: dayKey,
});

@Injectable()
export class AdminOpsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mailer: MailerService,
  ) {}

  async onModuleInit() {
    await this.ensureDefaults();
  }

  private async ensureDefaults() {
    const settings = await this.prisma.platformSetting.findUnique({ where: { key: SETTINGS_KEY } });
    if (!settings) {
      await this.prisma.platformSetting.create({
        data: { key: SETTINGS_KEY, value: DEFAULT_ADMIN_SETTINGS as unknown as object },
      });
    }
    const ai = await this.prisma.aiSetting.findUnique({ where: { key: AI_KEY } });
    if (!ai) {
      await this.prisma.aiSetting.create({
        data: { key: AI_KEY, value: DEFAULT_AI_SETTINGS(this.currentMonthKey()) as unknown as object },
      });
    }
  }

  async getSettings(): Promise<AdminSettings> {
    const row = await this.prisma.platformSetting.findUnique({ where: { key: SETTINGS_KEY } });
    return ((row?.value as unknown) as AdminSettings) ?? DEFAULT_ADMIN_SETTINGS;
  }

  async getQueueAlertThresholds() {
    const settings = await this.getSettings();
    const metadata = (settings.metadata ?? {}) as Record<string, unknown>;
    const queueAlerts = (metadata.queueAlerts ?? {}) as Record<string, unknown>;
    const supportEmail = typeof settings.supportEmail === "string" ? settings.supportEmail : "support@rashpod.local";
    const alertRecipients = Array.isArray(queueAlerts.alertRecipients)
      ? (queueAlerts.alertRecipients as unknown[]).filter((v): v is string => typeof v === "string" && v.length > 3)
      : [supportEmail];
    return {
      oldestPendingAgeSeconds:
        typeof queueAlerts.oldestPendingAgeSeconds === "number" ? queueAlerts.oldestPendingAgeSeconds : 900,
      failedRatePercent: typeof queueAlerts.failedRatePercent === "number" ? queueAlerts.failedRatePercent : 20,
      alertCooldownSeconds: typeof queueAlerts.alertCooldownSeconds === "number" ? queueAlerts.alertCooldownSeconds : 600,
      alertRecipients,
    };
  }

  async updateSettings(actorId: string, dto: UpdateAdminSettingsDto): Promise<AdminSettings> {
    const current = await this.getSettings();
    const next: AdminSettings = { ...current, ...dto } as AdminSettings;
    await this.prisma.platformSetting.upsert({
      where: { key: SETTINGS_KEY },
      create: { key: SETTINGS_KEY, value: next as unknown as object },
      update: { value: next as unknown as object },
    });
    await this.audit.log({ actorId, action: "admin-settings.update", entityType: "AdminSettings", entityId: "global" });
    return next;
  }

  async listEmailTemplates() {
    return this.prisma.emailTemplate.findMany({ orderBy: { updatedAt: "desc" } });
  }

  async createEmailTemplate(actorId: string, dto: CreateEmailTemplateDto) {
    const created = await this.prisma.emailTemplate.create({
      data: {
        key: dto.key,
        subject: dto.subject,
        body: dto.body,
        variables: (dto.variables ?? {}) as unknown as object,
      },
    });
    await this.audit.log({
      actorId,
      action: "email-template.create",
      entityType: "EmailTemplate",
      entityId: created.id,
    });
    return created;
  }

  async updateEmailTemplate(actorId: string, id: string, dto: UpdateEmailTemplateDto) {
    const existing = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Email template not found");
    const updated = await this.prisma.emailTemplate.update({
      where: { id },
      data: {
        subject: dto.subject ?? existing.subject,
        body: dto.body ?? existing.body,
        variables: dto.variables ? ((dto.variables as unknown) as object) : (existing.variables ?? undefined),
      },
    });
    await this.audit.log({ actorId, action: "email-template.update", entityType: "EmailTemplate", entityId: id });
    return updated;
  }

  async testEmailTemplate(actorId: string, id: string, dto: TestEmailTemplateDto) {
    const existing = (await this.prisma.emailTemplate.findFirst({
      where: { OR: [{ id }, { key: dto.key ?? "__none__" }] },
    })) ?? null;
    if (!existing) throw new NotFoundException("Email template not found");
    const subject = this.applyVars(existing.subject, dto.variables ?? {});
    const body = this.applyVars(existing.body, dto.variables ?? {});
    let sent = false;
    if (this.mailer.isConfigured()) {
      try {
        await this.mailer.send({ to: dto.to, subject, html: body });
        sent = true;
      } catch {
        sent = false;
      }
    }
    await this.audit.log({
      actorId,
      action: "email-template.test",
      entityType: "EmailTemplate",
      entityId: existing.id,
      metadata: { to: dto.to, sent },
    });
    return { ok: true, sent, to: dto.to, subject, preview: body.slice(0, 160) };
  }

  async getAiSettings(): Promise<AiSettingsState> {
    const row = await this.prisma.aiSetting.findUnique({ where: { key: AI_KEY } });
    let state = this.normalizeAiSettings(row?.value);
    state = await this.rolloverAiUsageIfNeeded(state);
    return state;
  }

  async updateAiSettings(actorId: string, dto: UpdateAiSettingsDto): Promise<AiSettingsState> {
    const current = await this.getAiSettings();
    const next = this.normalizeAiSettings({ ...current, ...dto });
    await this.prisma.aiSetting.upsert({
      where: { key: AI_KEY },
      create: { key: AI_KEY, value: next as unknown as object },
      update: { value: next as unknown as object },
    });
    await this.audit.log({
      actorId,
      action: "ai.settings.updated",
      entityType: "AiSettings",
      entityId: "global",
      metadata: { changed: Object.keys(dto), provider: next.provider, enabled: next.enabled },
    });
    return next;
  }

  async canSpendAi(estimatedUsd: number) {
    const state = await this.getAiSettings();
    const estimated = Math.max(0, estimatedUsd);
    return state.usageUsdMonth + estimated <= state.monthlyBudgetUsd && state.usageUsdDay + estimated <= state.dailyBudgetUsd;
  }

  async registerAiUsage(actorId: string, usageUsd: number, operation: string) {
    const state = await this.getAiSettings();
    const next: AiSettingsState = {
      ...state,
      usageUsdMonth: Number((state.usageUsdMonth + Math.max(0, usageUsd)).toFixed(6)),
      usageUsdDay: Number((state.usageUsdDay + Math.max(0, usageUsd)).toFixed(6)),
    };
    await this.prisma.aiSetting.upsert({
      where: { key: AI_KEY },
      create: { key: AI_KEY, value: next as unknown as object },
      update: { value: next as unknown as object },
    });
    await this.audit.log({
      actorId,
      action: "ai.usage.register",
      entityType: "AiSettings",
      entityId: "global",
      metadata: {
        operation,
        usageUsd,
        usageUsdMonth: next.usageUsdMonth,
        usageUsdDay: next.usageUsdDay,
        monthlyBudgetUsd: next.monthlyBudgetUsd,
        dailyBudgetUsd: next.dailyBudgetUsd,
      },
    });
    return next;
  }

  isWorkflowEnabled(settings: AiSettingsState, workflow: AiWorkflowKey) {
    return settings.provider !== "DISABLED" && settings.enabled !== false && settings.workflows[workflow]?.enabled !== false;
  }

  workflowSettings(settings: AiSettingsState, workflow: AiWorkflowKey) {
    return settings.workflows[workflow] ?? DEFAULT_WORKFLOW();
  }

  private async rolloverAiUsageIfNeeded(state: AiSettingsState): Promise<AiSettingsState> {
    const key = this.currentMonthKey();
    const dayKey = currentDayKey();
    if (state.usageMonthKey === key && state.usageDayKey === dayKey) return state;
    const next: AiSettingsState = {
      ...state,
      usageMonthKey: key,
      usageUsdMonth: state.usageMonthKey === key ? state.usageUsdMonth : 0,
      usageDayKey: dayKey,
      usageUsdDay: state.usageDayKey === dayKey ? state.usageUsdDay : 0,
    };
    await this.prisma.aiSetting.upsert({
      where: { key: AI_KEY },
      create: { key: AI_KEY, value: next as unknown as object },
      update: { value: next as unknown as object },
    });
    return next;
  }

  private currentMonthKey() {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  private normalizeAiSettings(value: unknown): AiSettingsState {
    const base = DEFAULT_AI_SETTINGS(this.currentMonthKey());
    const input = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
    const workflowsInput = input.workflows && typeof input.workflows === "object" && !Array.isArray(input.workflows) ? input.workflows as Record<string, unknown> : {};
    const workflows = AI_WORKFLOWS.reduce((acc, workflow) => {
      const current = base.workflows[workflow];
      const raw = workflowsInput[workflow] && typeof workflowsInput[workflow] === "object" ? workflowsInput[workflow] as Record<string, unknown> : {};
      acc[workflow] = {
        enabled: typeof raw.enabled === "boolean" ? raw.enabled : current.enabled,
        model: typeof raw.model === "string" && raw.model.length > 0 ? raw.model : current.model,
        maxTokens: this.safeNumber(raw.maxTokens, current.maxTokens, 100, 8000),
        temperature: this.safeNumber(raw.temperature, current.temperature, 0, 2),
        timeoutMs: this.safeNumber(raw.timeoutMs, current.timeoutMs, 1000, 120000),
        retryInvalidOutput: typeof raw.retryInvalidOutput === "boolean" ? raw.retryInvalidOutput : current.retryInvalidOutput,
        style: typeof raw.style === "string" ? raw.style : current.style,
      };
      return acc;
    }, {} as Record<AiWorkflowKey, AiWorkflowSettings>);
    const dataSharingInput = input.dataSharing && typeof input.dataSharing === "object" && !Array.isArray(input.dataSharing) ? input.dataSharing as Record<string, unknown> : {};
    const loggingInput = input.logging && typeof input.logging === "object" && !Array.isArray(input.logging) ? input.logging as Record<string, unknown> : {};
    const allowedLanguages = Array.isArray(input.allowedLanguages) ? input.allowedLanguages : Array.isArray(input.languages) ? input.languages : base.allowedLanguages;
    return {
      ...base,
      provider: input.provider === "DISABLED" ? "DISABLED" : "OPENAI",
      enabled: typeof input.enabled === "boolean" ? input.enabled : base.enabled,
      monthlyBudgetUsd: this.safeNumber(input.monthlyBudgetUsd, base.monthlyBudgetUsd, 0, 1_000_000),
      dailyBudgetUsd: this.safeNumber(input.dailyBudgetUsd ?? (input.budget as Record<string, unknown> | undefined)?.["dailyBudgetUsd"], base.dailyBudgetUsd, 0, 1_000_000),
      moderationAssistEnabled: typeof input.moderationAssistEnabled === "boolean" ? input.moderationAssistEnabled : base.moderationAssistEnabled,
      workflows,
      allowedLanguages: allowedLanguages.map(String).filter((lang) => ["uz-Latn", "uz-Cyrl", "ru", "en"].includes(lang)),
      safetyMode: ["ASSIST_ONLY", "SUGGEST_WITH_CONFIDENCE", "REQUIRE_HUMAN_APPROVAL"].includes(String(input.safetyMode ?? (input.safety as Record<string, unknown> | undefined)?.["mode"])) ? String(input.safetyMode ?? (input.safety as Record<string, unknown> | undefined)?.["mode"]) as AiSettingsState["safetyMode"] : base.safetyMode,
      dataSharing: {
        mode: ["METADATA_ONLY", "PUBLIC_PREVIEW_URL", "SIGNED_TEMPORARY_URL", "PRIVATE_ORIGINAL_ALLOWED"].includes(String(dataSharingInput.mode)) ? dataSharingInput.mode as AiSettingsState["dataSharing"]["mode"] : base.dataSharing.mode,
        signedUrlExpiresSeconds: this.safeNumber(dataSharingInput.signedUrlExpiresSeconds, base.dataSharing.signedUrlExpiresSeconds, 60, 900),
        allowPrivateOriginal: typeof dataSharingInput.allowPrivateOriginal === "boolean" ? dataSharingInput.allowPrivateOriginal : base.dataSharing.allowPrivateOriginal,
      },
      logging: {
        mode: loggingInput.mode === "FULL_PROMPT_RESPONSE" ? "FULL_PROMPT_RESPONSE" : "PROMPT_METADATA_ONLY",
        redactSensitiveFields: typeof loggingInput.redactSensitiveFields === "boolean" ? loggingInput.redactSensitiveFields : base.logging.redactSensitiveFields,
      },
      usageUsdMonth: this.safeNumber(input.usageUsdMonth, base.usageUsdMonth, 0, 1_000_000),
      usageUsdDay: this.safeNumber(input.usageUsdDay, base.usageUsdDay, 0, 1_000_000),
      usageMonthKey: typeof input.usageMonthKey === "string" ? input.usageMonthKey : base.usageMonthKey,
      usageDayKey: typeof input.usageDayKey === "string" ? input.usageDayKey : base.usageDayKey,
    };
  }

  private safeNumber(value: unknown, fallback: number, min: number, max: number) {
    const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
  }

  private applyVars(template: string, vars: Record<string, unknown>): string {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, name) => {
      const value = vars[name as string];
      return value === undefined || value === null ? "" : String(value);
    });
  }

  listAuditLogs(filters: {
    actorId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    page?: number;
    limit?: number;
  }) {
    return this.audit.query(filters);
  }

  async getAuditLog(id: string) {
    const log = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException("Audit log not found");
    return log;
  }
}
