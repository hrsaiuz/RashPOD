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

type AiSettingsState = {
  enabled: boolean;
  monthlyBudgetUsd: number;
  moderationAssistEnabled: boolean;
  usageUsdMonth: number;
  usageMonthKey: string;
};

const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  companyName: "RashPOD",
  supportEmail: "support@rashpod.local",
  metadata: {},
};

const DEFAULT_AI_SETTINGS = (monthKey: string): AiSettingsState => ({
  enabled: true,
  monthlyBudgetUsd: 200,
  moderationAssistEnabled: true,
  usageUsdMonth: 0,
  usageMonthKey: monthKey,
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
    let state = ((row?.value as unknown) as AiSettingsState) ?? DEFAULT_AI_SETTINGS(this.currentMonthKey());
    state = await this.rolloverAiUsageIfNeeded(state);
    return state;
  }

  async updateAiSettings(actorId: string, dto: UpdateAiSettingsDto): Promise<AiSettingsState> {
    const current = await this.getAiSettings();
    const next: AiSettingsState = { ...current, ...dto } as AiSettingsState;
    await this.prisma.aiSetting.upsert({
      where: { key: AI_KEY },
      create: { key: AI_KEY, value: next as unknown as object },
      update: { value: next as unknown as object },
    });
    await this.audit.log({ actorId, action: "ai-settings.update", entityType: "AiSettings", entityId: "global" });
    return next;
  }

  async canSpendAi(estimatedUsd: number) {
    const state = await this.getAiSettings();
    return state.usageUsdMonth + Math.max(0, estimatedUsd) <= state.monthlyBudgetUsd;
  }

  async registerAiUsage(actorId: string, usageUsd: number, operation: string) {
    const state = await this.getAiSettings();
    const next: AiSettingsState = {
      ...state,
      usageUsdMonth: Number((state.usageUsdMonth + Math.max(0, usageUsd)).toFixed(6)),
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
        monthlyBudgetUsd: next.monthlyBudgetUsd,
      },
    });
    return next;
  }

  private async rolloverAiUsageIfNeeded(state: AiSettingsState): Promise<AiSettingsState> {
    const key = this.currentMonthKey();
    if (state.usageMonthKey === key) return state;
    const next: AiSettingsState = { ...state, usageMonthKey: key, usageUsdMonth: 0 };
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
