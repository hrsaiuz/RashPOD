import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { DesignerInvitationStatus, UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes, randomInt } from "crypto";
import { RequestUser } from "../../common/auth/current-user.decorator";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { EmailTemplatesService } from "../email-templates/email-templates.service";
import { JobDispatcherService } from "../worker-jobs/job-dispatcher.service";
import { AcceptDesignerInvitationDto, CreateDesignerInvitationDto } from "./dto/designer-invitation.dto";

@Injectable()
export class DesignerInvitationsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly jobs: JobDispatcherService, private readonly emails: EmailTemplatesService) {}

  async list(user: RequestUser) {
    await this.expirePending();
    return this.prisma.designerInvitation.findMany({ where: user.tenantId || user.tid ? { tenantId: user.tenantId ?? user.tid } : {}, orderBy: { createdAt: "desc" }, include: { invitedBy: { select: { id: true, displayName: true, email: true } }, acceptedBy: { select: { id: true, displayName: true, email: true } } } });
  }

  async create(user: RequestUser, dto: CreateDesignerInvitationDto) {
    const email = dto.email.trim().toLowerCase();
    const tenantId = user.tenantId ?? user.tid ?? await this.defaultTenantId();
    await this.expirePending();
    const existing = await this.prisma.designerInvitation.findFirst({ where: { email, tenantId, status: DesignerInvitationStatus.PENDING } });
    const token = this.newToken();
    const expiresAt = this.expiration();
    const invitation = existing
      ? await this.prisma.designerInvitation.update({ where: { id: existing.id }, data: { displayName: clean(dto.displayName), locale: normalizeLocale(dto.locale), personalMessage: clean(dto.personalMessage), tokenHash: hashToken(token), expiresAt, lastSentAt: new Date() } })
      : await this.prisma.designerInvitation.create({ data: { email, displayName: clean(dto.displayName), locale: normalizeLocale(dto.locale), personalMessage: clean(dto.personalMessage), tokenHash: hashToken(token), expiresAt, lastSentAt: new Date(), invitedById: user.sub, tenantId } });
    await this.send(invitation.id, token);
    await this.audit.log({ actorId: user.sub, tenantId, action: existing ? "designer-invitation.rotate" : "designer-invitation.create", entityType: "DesignerInvitation", entityId: invitation.id, metadata: { email, expiresAt: expiresAt.toISOString() } });
    return { ...invitation, invitationUrl: this.url(invitation.locale, token) };
  }

  async resend(user: RequestUser, id: string) {
    const current = await this.manageable(user, id);
    if (current.status === DesignerInvitationStatus.ACCEPTED || current.status === DesignerInvitationStatus.REVOKED) throw new BadRequestException("Accepted or revoked invitations cannot be resent");
    const token = this.newToken();
    const invitation = await this.prisma.designerInvitation.update({ where: { id }, data: { tokenHash: hashToken(token), status: DesignerInvitationStatus.PENDING, expiresAt: this.expiration(), lastSentAt: new Date(), revokedAt: null } });
    await this.send(invitation.id, token);
    await this.audit.log({ actorId: user.sub, tenantId: invitation.tenantId ?? undefined, action: "designer-invitation.resend", entityType: "DesignerInvitation", entityId: id });
    return { ...invitation, invitationUrl: this.url(invitation.locale, token) };
  }

  async revoke(user: RequestUser, id: string) {
    const current = await this.manageable(user, id);
    if (current.status !== DesignerInvitationStatus.PENDING) throw new BadRequestException("Only pending invitations can be revoked");
    const invitation = await this.prisma.designerInvitation.update({ where: { id }, data: { status: DesignerInvitationStatus.REVOKED, revokedAt: new Date(), tokenHash: hashToken(this.newToken()) } });
    await this.audit.log({ actorId: user.sub, tenantId: invitation.tenantId ?? undefined, action: "designer-invitation.revoke", entityType: "DesignerInvitation", entityId: id });
    return invitation;
  }

  async publicDetail(token: string) {
    const invitation = await this.resolve(token);
    return { id: invitation.id, email: invitation.email, displayName: invitation.displayName, locale: invitation.locale, personalMessage: invitation.personalMessage, status: invitation.status, expiresAt: invitation.expiresAt, acceptedAt: invitation.acceptedAt, inviter: invitation.invitedBy };
  }

  async acceptNew(token: string, dto: AcceptDesignerInvitationDto) {
    if (!dto.agreementsAccepted) throw new BadRequestException("Required agreements must be accepted");
    const invitation = await this.resolve(token, true);
    const existing = await this.prisma.user.findUnique({ where: { email: invitation.email } });
    if (existing) return { requiresAuthentication: true, email: invitation.email };
    if (!dto.password) throw new BadRequestException("Password is required");
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const displayName = clean(dto.displayName) || invitation.displayName || invitation.email.split("@")[0];
    const now = new Date();
    const user = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.designerInvitation.updateMany({ where: { id: invitation.id, tokenHash: hashToken(token), status: DesignerInvitationStatus.PENDING, expiresAt: { gt: now } }, data: { status: DesignerInvitationStatus.ACCEPTED, acceptedAt: now } });
      if (claimed.count !== 1) throw new BadRequestException("Invitation is no longer valid");
      const created = await tx.user.create({ data: { email: invitation.email, displayName, handle: await this.uniqueHandle(displayName), passwordHash, role: UserRole.DESIGNER } });
      if (invitation.tenantId) await tx.tenantMember.upsert({ where: { tenantId_userId: { tenantId: invitation.tenantId, userId: created.id } }, create: { tenantId: invitation.tenantId, userId: created.id, roleKey: UserRole.DESIGNER, status: "ACTIVE", invitedById: invitation.invitedById, invitedAt: invitation.createdAt, joinedAt: now }, update: { roleKey: UserRole.DESIGNER, status: "ACTIVE", joinedAt: now } });
      await tx.designerInvitation.update({ where: { id: invitation.id }, data: { acceptedById: created.id } });
      return created;
    });
    await this.audit.log({ actorId: user.id, tenantId: invitation.tenantId ?? undefined, action: "designer-invitation.accept", entityType: "DesignerInvitation", entityId: invitation.id, metadata: { account: "new" } });
    return { accepted: true, email: user.email, redirectTo: "/dashboard/designer" };
  }

  async acceptExisting(user: RequestUser, token: string, dto: AcceptDesignerInvitationDto) {
    if (!dto.agreementsAccepted) throw new BadRequestException("Required agreements must be accepted");
    const invitation = await this.resolve(token, true);
    if (user.email.toLowerCase() !== invitation.email) throw new ForbiddenException("This invitation belongs to a different account");
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.designerInvitation.updateMany({ where: { id: invitation.id, tokenHash: hashToken(token), status: DesignerInvitationStatus.PENDING, expiresAt: { gt: now } }, data: { status: DesignerInvitationStatus.ACCEPTED, acceptedAt: now, acceptedById: user.sub } });
      if (claimed.count !== 1) throw new BadRequestException("Invitation is no longer valid");
      await tx.user.update({ where: { id: user.sub }, data: { role: UserRole.DESIGNER } });
      if (invitation.tenantId) await tx.tenantMember.upsert({ where: { tenantId_userId: { tenantId: invitation.tenantId, userId: user.sub } }, create: { tenantId: invitation.tenantId, userId: user.sub, roleKey: UserRole.DESIGNER, status: "ACTIVE", invitedById: invitation.invitedById, invitedAt: invitation.createdAt, joinedAt: now }, update: { roleKey: UserRole.DESIGNER, status: "ACTIVE", joinedAt: now } });
    });
    await this.audit.log({ actorId: user.sub, tenantId: invitation.tenantId ?? undefined, action: "designer-invitation.accept", entityType: "DesignerInvitation", entityId: invitation.id, metadata: { account: "existing" } });
    return { accepted: true, requiresReauthentication: true, redirectTo: "/dashboard/designer" };
  }

  private async send(id: string, token: string) {
    const invitation = await this.prisma.designerInvitation.findUnique({ where: { id }, include: { invitedBy: { select: { displayName: true } } } });
    if (!invitation) throw new NotFoundException("Invitation not found");
    const rendered = this.emails.designerInvitation({ recipientName: invitation.displayName, inviterName: invitation.invitedBy.displayName, personalMessage: invitation.personalMessage, invitationUrl: this.url(invitation.locale, token), expiresAt: invitation.expiresAt, locale: invitation.locale });
    await this.jobs.enqueue("SEND_EMAIL", { to: invitation.email, subject: rendered.subject, html: rendered.html, text: rendered.text, idempotencyKey: `designer-invitation:${id}:${invitation.tokenHash.slice(0, 16)}` });
  }

  private async resolve(token: string, requirePending = false) {
    if (!token || token.length < 32) throw new NotFoundException("Invitation not found");
    const invitation = await this.prisma.designerInvitation.findUnique({ where: { tokenHash: hashToken(token) }, include: { invitedBy: { select: { displayName: true } } } });
    if (!invitation) throw new NotFoundException("Invitation not found");
    if (invitation.status === DesignerInvitationStatus.PENDING && invitation.expiresAt <= new Date()) {
      const updated = await this.prisma.designerInvitation.update({ where: { id: invitation.id }, data: { status: DesignerInvitationStatus.EXPIRED } });
      if (requirePending) throw new BadRequestException("Invitation has expired");
      return { ...invitation, ...updated, status: DesignerInvitationStatus.EXPIRED };
    }
    if (requirePending && invitation.status !== DesignerInvitationStatus.PENDING) throw new BadRequestException(`Invitation is ${invitation.status.toLowerCase()}`);
    return invitation;
  }

  private async manageable(user: RequestUser, id: string) {
    const invitation = await this.prisma.designerInvitation.findUnique({ where: { id } });
    if (!invitation) throw new NotFoundException("Invitation not found");
    const tenantId = user.tenantId ?? user.tid;
    if (tenantId && invitation.tenantId && tenantId !== invitation.tenantId) throw new ForbiddenException("Invitation is outside the active workspace");
    return invitation;
  }
  private expirePending() { return this.prisma.designerInvitation.updateMany({ where: { status: DesignerInvitationStatus.PENDING, expiresAt: { lte: new Date() } }, data: { status: DesignerInvitationStatus.EXPIRED } }); }
  private expiration() { const hours = Math.min(720, Math.max(1, Number(process.env.DESIGNER_INVITATION_TTL_HOURS || 168) || 168)); return new Date(Date.now() + hours * 3_600_000); }
  private newToken() { return randomBytes(32).toString("base64url"); }
  private url(locale: string, token: string) { const base = (process.env.WEB_URL || process.env.APP_URL || "https://rashpod.uz").replace(/\/$/, ""); return `${base}/${normalizeLocale(locale)}/designer-invitation/${encodeURIComponent(token)}`; }
  private async defaultTenantId() { return (await this.prisma.tenant.findUnique({ where: { slug: "rashpod" }, select: { id: true } }))?.id; }
  private async uniqueHandle(seed: string) { const base = seed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48) || "designer"; for (let i = 0; i < 20; i += 1) { const handle = i ? `${base}-${i + 1}` : base; if (!await this.prisma.user.findUnique({ where: { handle } })) return handle; } return `${base}-${randomInt(1000, 9999)}`; }
}

function hashToken(token: string) { return createHash("sha256").update(token, "utf8").digest("hex"); }
function clean(value?: string | null) { const result = value?.trim(); return result || undefined; }
function normalizeLocale(value?: string | null) { return value === "ru" || value === "en" ? value : "uz"; }
