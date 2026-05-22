import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CrmContactDirection, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateCrmContactLogDto, CreateCrmNoteDto, ListCrmProfilesDto, UpsertCrmTagDto } from "./dto/crm.dto";

@Injectable()
export class CrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listProfiles(filters: ListCrmProfilesDto = {}) {
    const take = Math.min(Number(filters.limit) || 100, 200);
    const where: Prisma.UserWhereInput = {
      ...(filters.role ? { role: filters.role } : {}),
      ...(filters.q
        ? {
            OR: [
              { email: { contains: filters.q, mode: "insensitive" } },
              { displayName: { contains: filters.q, mode: "insensitive" } },
              { handle: { contains: filters.q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(filters.tag ? { crmTags: { some: { tag: { key: filters.tag } } } } : {}),
    };
    const users = await this.prisma.user.findMany({
      where,
      include: {
        preferences: true,
        crmTags: { include: { tag: true } },
        _count: { select: { orders: true, supportRequests: true, listings: true, designAssets: true } },
      },
      orderBy: { updatedAt: "desc" },
      take,
    });
    return users.map((user) => this.profileSummary(user));
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
        crmTags: { include: { tag: true }, orderBy: { createdAt: "desc" } },
        crmNotes: { include: { author: { select: { id: true, email: true, displayName: true, role: true } } }, orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }], take: 30 },
        crmContactLogs: { include: { author: { select: { id: true, email: true, displayName: true, role: true } } }, orderBy: { contactedAt: "desc" }, take: 30 },
        supportRequests: { orderBy: { updatedAt: "desc" }, take: 10 },
        orders: { orderBy: { createdAt: "desc" }, take: 10 },
        _count: { select: { orders: true, supportRequests: true, listings: true, designAssets: true } },
      },
    });
    if (!user) throw new NotFoundException("CRM profile not found");
    return { ...this.profileSummary(user), notes: user.crmNotes, contactLogs: user.crmContactLogs, supportRequests: user.supportRequests, orders: user.orders };
  }

  async addNote(actorId: string, userId: string, dto: CreateCrmNoteDto) {
    await this.ensureUser(userId);
    const note = await this.prisma.crmNote.create({ data: { userId, authorId: actorId, note: this.clean(dto.note, 2000), isPinned: dto.isPinned ?? false } });
    await this.audit.log({ actorId, action: "crm.note.create", entityType: "User", entityId: userId, metadata: { noteId: note.id } });
    return note;
  }

  async addContact(actorId: string, userId: string, dto: CreateCrmContactLogDto) {
    await this.ensureUser(userId);
    const log = await this.prisma.crmContactLog.create({
      data: {
        userId,
        authorId: actorId,
        channel: dto.channel,
        direction: dto.direction ?? CrmContactDirection.OUTBOUND,
        summary: this.clean(dto.summary, 1000),
        outcome: dto.outcome ? this.clean(dto.outcome, 500) : undefined,
      },
    });
    await this.audit.log({ actorId, action: "crm.contact_log.create", entityType: "User", entityId: userId, metadata: { contactLogId: log.id, channel: dto.channel } });
    return log;
  }

  async upsertTag(actorId: string, dto: UpsertCrmTagDto) {
    const key = dto.key.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
    if (!key) throw new BadRequestException("Tag key is required");
    const tag = await this.prisma.crmTag.upsert({
      where: { key },
      create: { key, label: this.clean(dto.label, 80), color: dto.color, description: dto.description, createdById: actorId },
      update: { label: this.clean(dto.label, 80), color: dto.color, description: dto.description },
    });
    await this.audit.log({ actorId, action: "crm.tag.upsert", entityType: "CrmTag", entityId: tag.id, metadata: { key } });
    return tag;
  }

  async assignTag(actorId: string, userId: string, tagKey: string) {
    await this.ensureUser(userId);
    const tag = await this.prisma.crmTag.findUnique({ where: { key: tagKey } });
    if (!tag) throw new NotFoundException("CRM tag not found");
    const row = await this.prisma.userCrmTag.upsert({ where: { userId_tagId: { userId, tagId: tag.id } }, create: { userId, tagId: tag.id }, update: {} });
    await this.audit.log({ actorId, action: "crm.tag.assign", entityType: "User", entityId: userId, metadata: { tagKey } });
    return row;
  }

  async removeTag(actorId: string, userId: string, tagKey: string) {
    const tag = await this.prisma.crmTag.findUnique({ where: { key: tagKey } });
    if (!tag) throw new NotFoundException("CRM tag not found");
    await this.prisma.userCrmTag.deleteMany({ where: { userId, tagId: tag.id } });
    await this.audit.log({ actorId, action: "crm.tag.remove", entityType: "User", entityId: userId, metadata: { tagKey } });
    return { removed: true };
  }

  async listTags() {
    return this.prisma.crmTag.findMany({ orderBy: { label: "asc" } });
  }

  private async ensureUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException("CRM profile not found");
  }

  private profileSummary(user: any) {
    const prefs = user.preferences?.notificationJson && typeof user.preferences.notificationJson === "object" ? user.preferences.notificationJson : {};
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      handle: user.handle,
      avatarUrl: user.avatarUrl,
      phone: typeof prefs.phone === "string" ? prefs.phone : null,
      language: typeof prefs.language === "string" ? prefs.language : "en",
      tags: (user.crmTags ?? []).map((row: any) => row.tag),
      counts: user._count,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private clean(value: string, max: number) {
    const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
    if (!cleaned) throw new BadRequestException("Text is required");
    return cleaned.slice(0, max);
  }
}
