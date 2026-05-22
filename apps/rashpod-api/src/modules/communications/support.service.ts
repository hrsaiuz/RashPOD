import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, SupportMessageVisibility, SupportPriority, SupportRequestStatus, UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "./notifications.service";
import { CreateManualSupportTicketDto, CreateSupportMessageDto, ListSupportTicketsDto, UpdateSupportTicketDto } from "./dto/support.dto";

const STAFF_ROLES = new Set<string>(["ADMIN", "SUPER_ADMIN", "OPERATIONS_MANAGER", "SUPPORT_STAFF"]);

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async kpis() {
    const [openTickets, slaBreaches, resolvedToday, waitingForUser] = await Promise.all([
      this.prisma.supportRequest.count({ where: { status: { in: [SupportRequestStatus.OPEN, SupportRequestStatus.IN_REVIEW] } } }),
      this.prisma.supportRequest.count({ where: { status: { in: [SupportRequestStatus.OPEN, SupportRequestStatus.IN_REVIEW] }, dueAt: { lt: new Date() } } }),
      this.prisma.supportRequest.count({ where: { status: SupportRequestStatus.RESOLVED, closedAt: { gte: this.startOfUtcDay(new Date()) } } }),
      this.prisma.supportRequest.count({ where: { status: SupportRequestStatus.WAITING_FOR_USER } }),
    ]);
    return { openTickets, slaBreaches, resolvedToday, waitingForUser, avgResponse: null };
  }

  async list(filters: ListSupportTicketsDto = {}) {
    const take = Math.min(Number(filters.limit) || 100, 200);
    const where: Prisma.SupportRequestWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.requesterId ? { requesterId: filters.requesterId } : {}),
      ...(filters.assignedToId ? { assignedToId: filters.assignedToId } : {}),
      ...(filters.q
        ? {
            OR: [
              { subject: { contains: filters.q, mode: "insensitive" } },
              { message: { contains: filters.q, mode: "insensitive" } },
              { requester: { email: { contains: filters.q, mode: "insensitive" } } },
              { requester: { displayName: { contains: filters.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const rows = await this.prisma.supportRequest.findMany({
      where,
      include: this.ticketInclude(),
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      take,
    });
    return rows.map((ticket) => this.toTicketSummary(ticket));
  }

  async get(id: string) {
    const ticket = await this.prisma.supportRequest.findUnique({ where: { id }, include: this.ticketDetailInclude() });
    if (!ticket) throw new NotFoundException("Support ticket not found");
    return this.toTicketDetail(ticket);
  }

  async createManual(actorId: string, dto: CreateManualSupportTicketDto) {
    const requester = await this.prisma.user.findUnique({ where: { id: dto.requesterId } });
    if (!requester) throw new NotFoundException("Requester not found");
    const ticket = await this.prisma.supportRequest.create({
      data: {
        requesterId: requester.id,
        requesterRole: requester.role,
        category: dto.category,
        subject: this.clean(dto.subject ?? dto.category, 160),
        message: this.clean(dto.message, 2000),
        priority: dto.priority ?? SupportPriority.NORMAL,
        source: "STAFF",
        status: SupportRequestStatus.OPEN,
        dueAt: this.defaultDueAt(dto.priority ?? SupportPriority.NORMAL),
        messages: { create: { authorId: actorId, authorRole: UserRole.SUPPORT_STAFF, body: this.clean(dto.message, 2000), visibility: SupportMessageVisibility.PUBLIC } },
      },
      include: this.ticketDetailInclude(),
    });
    await this.audit.log({ actorId, action: "support.ticket.create_manual", entityType: "SupportRequest", entityId: ticket.id, metadata: { requesterId: requester.id } });
    await this.notifyRequester(ticket.requesterId, ticket.id, "Support ticket opened", `Your support ticket ${ticket.subject ?? ticket.category} was opened.`, "support.ticket.opened");
    return this.toTicketDetail(ticket);
  }

  async update(actorId: string, id: string, dto: UpdateSupportTicketDto) {
    const existing = await this.prisma.supportRequest.findUnique({ where: { id }, include: { requester: true } });
    if (!existing) throw new NotFoundException("Support ticket not found");
    const statusChanged = dto.status && dto.status !== existing.status;
    const now = new Date();
    const updated = await this.prisma.supportRequest.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status, closedAt: this.closedStatus(dto.status) ? now : null } : {}),
        ...(dto.priority ? { priority: dto.priority, dueAt: this.defaultDueAt(dto.priority) } : {}),
        ...(dto.assignedToId !== undefined ? { assignedToId: dto.assignedToId || null } : {}),
        ...(dto.reviewNotes !== undefined ? { reviewNotes: this.clean(dto.reviewNotes, 1000) } : {}),
      },
      include: this.ticketDetailInclude(),
    });
    await this.audit.log({ actorId, action: "support.ticket.update", entityType: "SupportRequest", entityId: id, metadata: { status: dto.status, priority: dto.priority, assignedToId: dto.assignedToId } });
    if (statusChanged) {
      await this.notifyRequester(existing.requesterId, id, "Support ticket updated", `Your support ticket is now ${dto.status?.replace(/_/g, " ").toLowerCase()}.`, "support.ticket.status");
    }
    return this.toTicketDetail(updated);
  }

  async addMessage(actorId: string, actorRole: string, id: string, dto: CreateSupportMessageDto) {
    const ticket = await this.prisma.supportRequest.findUnique({ where: { id }, include: { requester: true } });
    if (!ticket) throw new NotFoundException("Support ticket not found");
    const isStaff = STAFF_ROLES.has(actorRole);
    if (!isStaff && ticket.requesterId !== actorId) throw new ForbiddenException("Not your support ticket");
    if (dto.internal && !isStaff) throw new ForbiddenException("Only staff can add internal notes");
    const now = new Date();
    const message = await this.prisma.supportMessage.create({
      data: {
        supportRequestId: id,
        authorId: actorId,
        authorRole: this.role(actorRole),
        body: this.clean(dto.body, 2000),
        visibility: dto.internal ? SupportMessageVisibility.INTERNAL : SupportMessageVisibility.PUBLIC,
      },
    });
    await this.prisma.supportRequest.update({
      where: { id },
      data: isStaff
        ? { lastStaffMessageAt: now, firstResponseAt: ticket.firstResponseAt ?? now, status: dto.internal ? ticket.status : SupportRequestStatus.WAITING_FOR_USER }
        : { lastCustomerMessageAt: now, status: SupportRequestStatus.IN_REVIEW },
    });
    await this.audit.log({ actorId, action: dto.internal ? "support.ticket.internal_note" : "support.ticket.message", entityType: "SupportRequest", entityId: id });
    if (!dto.internal) {
      const targetUserId = isStaff ? ticket.requesterId : ticket.assignedToId;
      if (targetUserId) {
        await this.notifyRequester(targetUserId, id, "New support reply", `A new reply was added to ${ticket.subject ?? ticket.category}.`, "support.ticket.reply");
      }
    }
    return message;
  }

  async listForRequester(userId: string) {
    const rows = await this.prisma.supportRequest.findMany({ where: { requesterId: userId }, include: this.ticketInclude(), orderBy: { updatedAt: "desc" }, take: 100 });
    return rows.map((ticket) => this.toTicketSummary(ticket));
  }

  private async notifyRequester(userId: string, ticketId: string, title: string, body: string, type: string) {
    await this.notifications.notifyUser({
      userId,
      type,
      title,
      body,
      entityType: "SupportRequest",
      entityId: ticketId,
      actionUrl: `/dashboard/support/tickets/${ticketId}`,
      templateKey: "support_ticket_update",
      idempotencyKey: `${type}:${ticketId}:${Date.now()}`,
    });
  }

  private ticketInclude() {
    return {
      requester: { select: { id: true, email: true, displayName: true, role: true } },
      assignedTo: { select: { id: true, email: true, displayName: true } },
      _count: { select: { messages: true } },
    } satisfies Prisma.SupportRequestInclude;
  }

  private ticketDetailInclude() {
    return {
      requester: { select: { id: true, email: true, displayName: true, role: true } },
      assignedTo: { select: { id: true, email: true, displayName: true } },
      order: { select: { id: true, total: true, currency: true, status: true, createdAt: true } },
      design: { select: { id: true, title: true, status: true } },
      listing: { select: { id: true, title: true, status: true } },
      messages: { include: { author: { select: { id: true, email: true, displayName: true, role: true } } }, orderBy: { createdAt: "asc" } },
    } satisfies Prisma.SupportRequestInclude;
  }

  private toTicketSummary(ticket: any) {
    return {
      id: ticket.id,
      subject: ticket.subject ?? ticket.category,
      category: ticket.category,
      customer: ticket.requester?.email ?? ticket.requesterId,
      customerName: ticket.requester?.displayName ?? ticket.requester?.email ?? ticket.requesterId,
      requester: ticket.requester,
      assignedTo: ticket.assignedTo,
      status: String(ticket.status).toLowerCase(),
      statusRaw: ticket.status,
      priority: String(ticket.priority).toLowerCase(),
      priorityRaw: ticket.priority,
      messageCount: ticket._count?.messages ?? 0,
      dueAt: ticket.dueAt,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }

  private toTicketDetail(ticket: any) {
    return { ...this.toTicketSummary({ ...ticket, _count: { messages: ticket.messages?.length ?? 0 } }), ...ticket, status: String(ticket.status).toLowerCase(), priority: String(ticket.priority).toLowerCase() };
  }

  private role(role: string) {
    if (Object.values(UserRole).includes(role as UserRole)) return role as UserRole;
    return UserRole.SUPPORT_STAFF;
  }

  private clean(value: string, max: number) {
    const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
    if (!cleaned) throw new BadRequestException("Text is required");
    return cleaned.slice(0, max);
  }

  private closedStatus(status: SupportRequestStatus) {
    return status === SupportRequestStatus.RESOLVED || status === SupportRequestStatus.CLOSED;
  }

  private defaultDueAt(priority: SupportPriority) {
    const hours = priority === SupportPriority.URGENT ? 4 : priority === SupportPriority.HIGH ? 12 : priority === SupportPriority.LOW ? 72 : 24;
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  private startOfUtcDay(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }
}
