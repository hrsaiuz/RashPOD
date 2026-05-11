import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { AuditService } from "../audit/audit.service";
import { AuthSessionStore } from "./auth-session.store";
import { MailerService } from "../mailer/mailer.service";

@Injectable()
export class AuthService {
  private readonly emailVerificationTtlMs = 1000 * 60 * 60 * 24;
  private readonly passwordResetTtlMs = 1000 * 60 * 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
    private readonly mailer: MailerService,
  ) {}

  async register(dto: RegisterDto) {
    const hash = await bcrypt.hash(dto.password, 10);
    const role: UserRole = dto.role
      ? (UserRole[dto.role as keyof typeof UserRole] ?? UserRole.CUSTOMER)
      : UserRole.DESIGNER;
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        displayName: dto.displayName,
        passwordHash: hash,
        role,
      },
    });
    const verifyToken = `verify_${randomUUID()}`;
    AuthSessionStore.issueEmailVerificationToken(user.id, verifyToken, this.emailVerificationTtlMs);
    await this.audit.log({ actorId: user.id, action: "auth.register", entityType: "User", entityId: user.id });
    return this.sign(user.id, user.role, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user) throw new UnauthorizedException("Invalid credentials");
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid credentials");
    await this.audit.log({ actorId: user.id, action: "auth.login", entityType: "User", entityId: user.id });
    return this.sign(user.id, user.role, user.email);
  }

  async logout(userId: string) {
    AuthSessionStore.bumpSessionVersion(userId);
    await this.audit.log({ actorId: userId, action: "auth.logout", entityType: "User", entityId: userId });
    return { ok: true };
  }

  async requestEmailVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return { ok: true };
    const token = `verify_${randomUUID()}`;
    AuthSessionStore.issueEmailVerificationToken(user.id, token, this.emailVerificationTtlMs);
    await this.audit.log({ actorId: user.id, action: "auth.verify-email.request", entityType: "User", entityId: user.id });
    const webUrl = process.env.WEB_URL || process.env.NEXT_PUBLIC_WEB_URL || "https://rashpod.uz";
    const link = `${webUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;
    await this.mailer.send({
      to: user.email,
      toName: user.displayName,
      subject: "Verify your RashPOD email",
      html: `<p>Hi ${escapeHtml(user.displayName)},</p><p>Please verify your email by clicking the link below:</p><p><a href="${link}">Verify email</a></p><p>If the button doesn't work, paste this URL into your browser:<br/><code>${link}</code></p><p>— RashPOD</p>`,
    });
    return { ok: true };
  }

  async verifyEmailToken(token: string) {
    const userId = AuthSessionStore.consumeEmailVerificationToken(token);
    if (!userId) throw new BadRequestException("Invalid verification token");
    await this.audit.log({ actorId: userId, action: "auth.verify-email.confirm", entityType: "User", entityId: userId });
    return { ok: true };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return { ok: true };
    const token = `reset_${randomUUID()}`;
    AuthSessionStore.issuePasswordResetToken(user.id, token, this.passwordResetTtlMs);
    await this.audit.log({ actorId: user.id, action: "auth.forgot-password", entityType: "User", entityId: user.id });
    const webUrl = process.env.WEB_URL || process.env.NEXT_PUBLIC_WEB_URL || "https://rashpod.uz";
    const link = `${webUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
    await this.mailer.send({
      to: user.email,
      toName: user.displayName,
      subject: "Reset your RashPOD password",
      html: `<p>Hi ${escapeHtml(user.displayName)},</p><p>You requested a password reset. Click the link below to choose a new password (valid for 30 minutes):</p><p><a href="${link}">Reset password</a></p><p>If you didn't request this, you can safely ignore this email.</p><p>— RashPOD</p>`,
    });
    return { ok: true };
  }

  async resetPassword(token: string, password: string) {
    const userId = AuthSessionStore.consumePasswordResetToken(token);
    if (!userId) throw new BadRequestException("Invalid reset token");
    const hash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    AuthSessionStore.bumpSessionVersion(userId);
    await this.audit.log({ actorId: userId, action: "auth.reset-password", entityType: "User", entityId: userId });
    return { ok: true };
  }

  private async sign(sub: string, role: UserRole, email: string) {
    const sessionVersion = AuthSessionStore.getSessionVersion(sub);
    const accessToken = await this.jwtService.signAsync(
      { sub, role, email, sv: sessionVersion },
      { secret: process.env.JWT_SECRET || "rashpod-dev-secret", expiresIn: "7d" },
    );
    return { accessToken };
  }
}

function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
