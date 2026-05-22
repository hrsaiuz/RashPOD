import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { NotificationChannel, NotificationDeliveryStatus, NotificationSeverity, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { JobDispatcherService } from "../worker-jobs/job-dispatcher.service";
import { CreateNotificationDto, ListNotificationsDto, UpdateNotificationPreferencesDto } from "./dto/notifications.dto";

type NotifyInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  severity?: NotificationSeverity;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  templateKey?: string;
  variables?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
  channels?: NotificationChannel[];
};

type PreferenceJson = {
  language?: string;
  phone?: string;
  defaultDeliveryAddress?: string;
  inApp?: boolean;
  email?: boolean;
  telegram?: boolean;
  telegramChatId?: string;
  marketing?: boolean;
  mutedChannels?: NotificationChannel[];
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly jobs: JobDispatcherService,
  ) {}

  async listForUser(userId: string, filters: ListNotificationsDto = {}) {
    const rows = await this.prisma.notification.findMany({
      where: {
        userId,
        ...(filters.unreadOnly === "true" ? { readAt: null } : {}),
        ...(filters.type ? { type: filters.type } : {}),
      },
      include: { deliveries: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return rows.map((row) => ({ ...row, unread: !row.readAt }));
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({ where: { userId, readAt: null } });
    return { unread: count };
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) throw new NotFoundException("Notification not found");
    return this.prisma.notification.update({ where: { id }, data: { readAt: notification.readAt ?? new Date() } });
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return { updated: result.count };
  }

  async preferences(userId: string) {
    const prefs = await this.prisma.userPreferences.findUnique({ where: { userId } });
    return this.normalizePrefs(prefs?.notificationJson);
  }

  async updatePreferences(userId: string, dto: UpdateNotificationPreferencesDto) {
    const current = await this.preferences(userId);
    const next: PreferenceJson = {
      ...current,
      ...(dto.language !== undefined ? { language: dto.language } : {}),
      ...(dto.inApp !== undefined ? { inApp: dto.inApp } : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.telegram !== undefined ? { telegram: dto.telegram } : {}),
      ...(dto.telegramChatId !== undefined ? { telegramChatId: dto.telegramChatId.trim() } : {}),
      ...(dto.marketing !== undefined ? { marketing: dto.marketing } : {}),
      ...(dto.mutedChannels !== undefined ? { mutedChannels: dto.mutedChannels } : {}),
    };
    await this.prisma.userPreferences.upsert({
      where: { userId },
      create: { userId, notificationJson: next as Prisma.InputJsonValue },
      update: { notificationJson: next as Prisma.InputJsonValue },
    });
    await this.audit.log({ actorId: userId, action: "notifications.preferences.update", entityType: "User", entityId: userId });
    return next;
  }

  async adminCreate(actorId: string, dto: CreateNotificationDto) {
    const created = await this.notifyUser({
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      body: dto.body,
      severity: this.severity(dto.severity),
      entityType: dto.entityType,
      entityId: dto.entityId,
      actionUrl: dto.actionUrl,
      templateKey: dto.templateKey,
      idempotencyKey: `admin:${dto.type}:${dto.userId}:${Date.now()}`,
    });
    await this.audit.log({ actorId, action: "notifications.admin_create", entityType: "Notification", entityId: created.id, metadata: { type: dto.type, userId: dto.userId } });
    return created;
  }

  async notifyUser(input: NotifyInput) {
    const user = await this.prisma.user.findUnique({ where: { id: input.userId }, include: { preferences: true } });
    if (!user) throw new NotFoundException("Notification user not found");

    if (input.idempotencyKey) {
      const existing = await this.prisma.notification.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: { deliveries: true } });
      if (existing) return existing;
    }

    const prefs = this.normalizePrefs(user.preferences?.notificationJson);
    const title = this.clean(input.title, 160);
    const body = this.clean(input.body, 2000);
    if (!title || !body) throw new BadRequestException("Notification title and body are required");

    const notification = await this.prisma.notification.create({
      data: {
        userId: user.id,
        type: this.clean(input.type, 80),
        title,
        body,
        severity: input.severity ?? NotificationSeverity.INFO,
        entityType: input.entityType,
        entityId: input.entityId,
        actionUrl: input.actionUrl,
        metadataJson: (input.metadata ?? {}) as Prisma.InputJsonValue,
        idempotencyKey: input.idempotencyKey,
      },
    });

    const requestedChannels = input.channels ?? [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.TELEGRAM];
    for (const channel of requestedChannels) {
      await this.createDelivery(notification.id, user.id, user.email, prefs, channel, input);
    }

    await this.audit.log({ actorId: input.userId, action: "notifications.created", entityType: "Notification", entityId: notification.id, metadata: { type: input.type, entityType: input.entityType, entityId: input.entityId } });
    return this.prisma.notification.findUniqueOrThrow({ where: { id: notification.id }, include: { deliveries: true } });
  }

  async listDeliveries(filters: { status?: NotificationDeliveryStatus; channel?: NotificationChannel }) {
    return this.prisma.notificationDelivery.findMany({
      where: { status: filters.status, channel: filters.channel },
      include: { notification: true, user: { select: { id: true, email: true, displayName: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  private async createDelivery(notificationId: string, userId: string, email: string, prefs: PreferenceJson, channel: NotificationChannel, input: NotifyInput) {
    const enabled = this.channelEnabled(channel, prefs, input.type);
    const destination = channel === NotificationChannel.EMAIL ? email : channel === NotificationChannel.TELEGRAM ? prefs.telegramChatId : undefined;
    const skipped = !enabled || (channel === NotificationChannel.TELEGRAM && !destination);
    const status = skipped ? NotificationDeliveryStatus.SKIPPED : channel === NotificationChannel.IN_APP ? NotificationDeliveryStatus.DELIVERED : NotificationDeliveryStatus.QUEUED;
    const payload = this.deliveryPayload(channel, destination, input);
    const delivery = await this.prisma.notificationDelivery.create({
      data: {
        notificationId,
        userId,
        channel,
        status,
        destination: destination ? this.clean(destination, 120) : undefined,
        templateKey: input.templateKey,
        payloadJson: payload as Prisma.InputJsonValue,
        idempotencyKey: `${notificationId}:${channel}`,
        deliveredAt: status === NotificationDeliveryStatus.DELIVERED ? new Date() : undefined,
      },
    });
    if (status === NotificationDeliveryStatus.QUEUED) {
      const jobType = channel === NotificationChannel.EMAIL ? "SEND_EMAIL" : "TELEGRAM_SEND";
      await this.jobs.enqueue(jobType, { notificationDeliveryId: delivery.id, ...payload });
    }
    return delivery;
  }

  private deliveryPayload(channel: NotificationChannel, destination: string | undefined, input: NotifyInput) {
    if (channel === NotificationChannel.EMAIL) {
      return {
        to: destination,
        subject: input.title,
        html: `<p>${this.escapeHtml(input.body)}</p>`,
        text: input.body,
        templateKey: input.templateKey,
        variables: input.variables ?? {},
        idempotencyKey: input.idempotencyKey,
      };
    }
    if (channel === NotificationChannel.TELEGRAM) {
      return { chatId: destination, text: `${input.title}\n\n${input.body}`, idempotencyKey: input.idempotencyKey };
    }
    return { title: input.title, body: input.body, actionUrl: input.actionUrl };
  }

  private channelEnabled(channel: NotificationChannel, prefs: PreferenceJson, type: string) {
    if (prefs.mutedChannels?.includes(channel)) return false;
    if (type.toLowerCase().includes("marketing") && prefs.marketing !== true) return false;
    if (channel === NotificationChannel.IN_APP) return prefs.inApp !== false;
    if (channel === NotificationChannel.EMAIL) return prefs.email !== false;
    if (channel === NotificationChannel.TELEGRAM) return prefs.telegram === true;
    return true;
  }

  private normalizePrefs(raw: unknown): PreferenceJson {
    const value = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    return {
      language: typeof value.language === "string" ? value.language : "en",
      phone: typeof value.phone === "string" ? value.phone : undefined,
      defaultDeliveryAddress: typeof value.defaultDeliveryAddress === "string" ? value.defaultDeliveryAddress : undefined,
      inApp: typeof value.inApp === "boolean" ? value.inApp : true,
      email: typeof value.email === "boolean" ? value.email : true,
      telegram: typeof value.telegram === "boolean" ? value.telegram : false,
      telegramChatId: typeof value.telegramChatId === "string" ? value.telegramChatId : undefined,
      marketing: typeof value.marketing === "boolean" ? value.marketing : false,
      mutedChannels: Array.isArray(value.mutedChannels) ? value.mutedChannels.filter((v): v is NotificationChannel => Object.values(NotificationChannel).includes(v as NotificationChannel)) : [],
    };
  }

  private severity(value?: string) {
    return Object.values(NotificationSeverity).includes(value as NotificationSeverity) ? (value as NotificationSeverity) : NotificationSeverity.INFO;
  }

  private clean(value: string, max: number) {
    return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  }

  private escapeHtml(value: string) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
  }
}
