import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateEmailTemplateDto } from "./dto/create-email-template.dto";
import { TestEmailTemplateDto } from "./dto/test-email-template.dto";
import { UpdateAdminSettingsDto } from "./dto/update-admin-settings.dto";
import { UpdateAiSettingsDto } from "./dto/update-ai-settings.dto";
import { UpdateEmailTemplateDto } from "./dto/update-email-template.dto";

type EmailTemplate = {
  id: string;
  key: string;
  subject: string;
  body: string;
  variables?: Record<string, unknown>;
  updatedAt: string;
};

type AiSettingsState = {
  enabled: boolean;
  monthlyBudgetUsd: number;
  moderationAssistEnabled: boolean;
  usageUsdMonth: number;
  usageMonthKey: string;
};

@Injectable()
export class AdminOpsService {
  private adminSettings: Record<string, unknown> = {
    companyName: "RashPOD",
    supportEmail: "support@rashpod.local",
    metadata: {},
  };

  private aiSettings: AiSettingsState = {
    enabled: true,
    monthlyBudgetUsd: 200,
    moderationAssistEnabled: true,
    usageUsdMonth: 0,
    usageMonthKey: this.currentMonthKey(),
  };

  private emailTemplates: EmailTemplate[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  getSettings() {
    return this.adminSettings;
  }

  getQueueAlertThresholds() {
    const metadata = (this.adminSettings.metadata ?? {}) as Record<string, unknown>;
    const queueAlerts = (metadata.queueAlerts ?? {}) as Record<string, unknown>;
    const supportEmail =
      typeof this.adminSettings.supportEmail === "string" ? this.adminSettings.supportEmail : "support@rashpod.local";
    const alertRecipients = Array.isArray(queueAlerts.alertRecipients)
      ? queueAlerts.alertRecipients.filter((v): v is string => typeof v === "string" && v.length > 3)
      : [supportEmail];
    return {
      oldestPendingAgeSeconds:
        typeof queueAlerts.oldestPendingAgeSeconds === "number" ? queueAlerts.oldestPendingAgeSeconds : 900,
      failedRatePercent: typeof queueAlerts.failedRatePercent === "number" ? queueAlerts.failedRatePercent : 20,
      alertCooldownSeconds: typeof queueAlerts.alertCooldownSeconds === "number" ? queueAlerts.alertCooldownSeconds : 600,
      alertRecipients,
    };
  }

  async updateSettings(actorId: string, dto: UpdateAdminSettingsDto) {
    this.adminSettings = { ...this.adminSettings, ...dto };
    await this.audit.log({ actorId, action: "admin-settings.update", entityType: "AdminSettings", entityId: "global" });
    return this.adminSettings;
  }

  listEmailTemplates() {
    return this.emailTemplates;
  }

  async createEmailTemplate(actorId: string, dto: CreateEmailTemplateDto) {
    const template: EmailTemplate = {
      id: `emt_${Date.now()}_${this.emailTemplates.length + 1}`,
      key: dto.key,
      subject: dto.subject,
      body: dto.body,
      variables: dto.variables,
      updatedAt: new Date().toISOString(),
    };
    this.emailTemplates.unshift(template);
    await this.audit.log({ actorId, action: "email-template.create", entityType: "EmailTemplate", entityId: template.id });
    return template;
  }

  async updateEmailTemplate(actorId: string, id: string, dto: UpdateEmailTemplateDto) {
    const existing = this.emailTemplates.find((t) => t.id === id);
    if (!existing) throw new NotFoundException("Email template not found");
    Object.assign(existing, dto, { updatedAt: new Date().toISOString() });
    await this.audit.log({ actorId, action: "email-template.update", entityType: "EmailTemplate", entityId: id });
    return existing;
  }

  async testEmailTemplate(actorId: string, id: string, dto: TestEmailTemplateDto) {
    const existing = this.emailTemplates.find((t) => t.id === id || t.key === dto.key);
    if (!existing) throw new NotFoundException("Email template not found");
    await this.audit.log({ actorId, action: "email-template.test", entityType: "EmailTemplate", entityId: existing.id, metadata: { to: dto.to } });
    return { ok: true, to: dto.to, subject: existing.subject, preview: existing.body.slice(0, 160) };
  }

  getAiSettings() {
    this.rolloverAiUsageIfNeeded();
    return this.aiSettings;
  }

  async updateAiSettings(actorId: string, dto: UpdateAiSettingsDto) {
    this.rolloverAiUsageIfNeeded();
    this.aiSettings = { ...this.aiSettings, ...dto };
    await this.audit.log({ actorId, action: "ai-settings.update", entityType: "AiSettings", entityId: "global" });
    return this.aiSettings;
  }

  canSpendAi(estimatedUsd: number) {
    this.rolloverAiUsageIfNeeded();
    return this.aiSettings.usageUsdMonth + Math.max(0, estimatedUsd) <= this.aiSettings.monthlyBudgetUsd;
  }

  async registerAiUsage(actorId: string, usageUsd: number, operation: string) {
    this.rolloverAiUsageIfNeeded();
    this.aiSettings.usageUsdMonth = Number((this.aiSettings.usageUsdMonth + Math.max(0, usageUsd)).toFixed(6));
    await this.audit.log({
      actorId,
      action: "ai.usage.register",
      entityType: "AiSettings",
      entityId: "global",
      metadata: {
        operation,
        usageUsd,
        usageUsdMonth: this.aiSettings.usageUsdMonth,
        monthlyBudgetUsd: this.aiSettings.monthlyBudgetUsd,
      },
    });
    return this.aiSettings;
  }

  private rolloverAiUsageIfNeeded() {
    const key = this.currentMonthKey();
    if (this.aiSettings.usageMonthKey !== key) {
      this.aiSettings.usageMonthKey = key;
      this.aiSettings.usageUsdMonth = 0;
    }
  }

  private currentMonthKey() {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
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
