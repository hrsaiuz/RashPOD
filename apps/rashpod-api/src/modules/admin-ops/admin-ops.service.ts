import { Injectable, NotFoundException, OnModuleInit, Optional } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { LaunchCheck, PlatformConfigService } from "../../common/config/platform-config.service";
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
    @Optional() private readonly platformConfig?: PlatformConfigService,
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

  async launchReadiness() {
    const envChecks = this.platformConfig?.redactedConfig("api").checks ?? [];
    const [productTypes, baseProducts, mockupTemplates, printAreas, royaltyRules, admins, paymentSettings, filmSettings, latestMigration, auditCount] = await Promise.all([
      this.prisma.productType.count(),
      this.prisma.baseProduct.count().catch(() => 0),
      this.prisma.mockupTemplate.count(),
      this.prisma.printArea.count(),
      this.prisma.royaltyRule.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] as any } } }),
      this.prisma.platformSetting.findUnique({ where: { key: "click.payment.settings" } }),
      this.prisma.filmSaleSettings.findFirst(),
      this.prisma.$queryRawUnsafe<Array<{ migration_name: string; finished_at: Date | null }>>('SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY finished_at DESC NULLS LAST LIMIT 1').catch(() => []),
      this.prisma.auditLog.count().catch(() => 0),
    ]);
    const payment = this.asObject(paymentSettings?.value);
    const operational: LaunchCheck[] = [
      this.countCheck("PRODUCT_TYPES", "Product types", productTypes, "At least one product type must exist.", "/dashboard/admin/product-types"),
      this.countCheck("BASE_PRODUCTS", "Base products", baseProducts, "At least one local base product should exist.", "/dashboard/admin/base-products"),
      this.countCheck("MOCKUP_TEMPLATES", "Mockup templates", mockupTemplates, "Mockup templates are required for rendering.", "/dashboard/admin/mockup-templates"),
      this.countCheck("PRINT_AREAS", "Print areas", printAreas, "Print areas are required for canonical placement.", "/dashboard/admin/print-areas"),
      this.countCheck("ROYALTY_RULES", "Royalty rules", royaltyRules, "At least one active royalty rule is required.", "/dashboard/admin/royalty-rules"),
      this.countCheck("ADMIN_USERS", "Admin users", admins, "At least one admin or super admin must exist.", "/dashboard/admin/users"),
      { key: "PAYMENT_SETTINGS", label: "Payment settings", status: payment.enabled ? "PASS" : "WARN", explanation: payment.enabled ? `Click payments configured in ${payment.mode ?? "unknown"} mode.` : "Click payment settings are not enabled.", docsPath: "docs/env-vars.md" },
      { key: "FILM_SETTINGS", label: "Film settings", status: filmSettings ? "PASS" : "WARN", explanation: filmSettings ? "Film sale settings exist." : "Film sale settings are missing.", docsPath: "docs/admin-config-spec.md" },
    ];
    const dataChecks: LaunchCheck[] = [
      { key: "LATEST_MIGRATION", label: "Latest migration", status: latestMigration[0]?.finished_at ? "PASS" : "WARN", explanation: latestMigration[0]?.migration_name ? `Latest applied migration: ${latestMigration[0].migration_name}.` : "Migration status could not be confirmed from this database.", docsPath: "docs/launch-readiness-runbook.md" },
      { key: "AUDIT_LOGS", label: "Audit logs", status: auditCount > 0 ? "PASS" : "WARN", explanation: auditCount > 0 ? "Audit log table contains entries." : "No audit entries found yet; verify audit logging in staging.", docsPath: "docs/security-rbac.md" },
      { key: "PRODUCTION_SEED", label: "Production seed mode", status: process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED === "true" ? "FAIL" : "PASS", explanation: "Production fake-data seeding is not enabled.", docsPath: "docs/launch-readiness-runbook.md" },
    ];
    const all = [...envChecks, ...operational, ...dataChecks];
    return {
      generatedAt: new Date().toISOString(),
      environment: process.env.APP_ENV || process.env.NODE_ENV || "development",
      summary: {
        pass: all.filter((check) => check.status === "PASS").length,
        warn: all.filter((check) => check.status === "WARN").length,
        fail: all.filter((check) => check.status === "FAIL").length,
      },
      sections: [
        { key: "environment", label: "Environment", checks: envChecks },
        { key: "operational", label: "Operational", checks: operational },
        { key: "data", label: "Data", checks: dataChecks },
      ],
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

  private countCheck(key: string, label: string, count: number, emptyExplanation: string, docsPath: string): LaunchCheck {
    return { key, label, status: count > 0 ? "PASS" : "WARN", explanation: count > 0 ? `${count} configured.` : emptyExplanation, docsPath };
  }

  private asObject(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }
}
