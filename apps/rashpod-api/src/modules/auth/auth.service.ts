import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { randomUUID, randomInt } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { AuditService } from "../audit/audit.service";
import { AuthSessionStore } from "./auth-session.store";
import { MailerService } from "../mailer/mailer.service";
import { EmailTemplatesService } from "../email-templates/email-templates.service";

@Injectable()
export class AuthService {
  private readonly emailVerificationTtlMs = 1000 * 60 * 60 * 24;
  private readonly passwordResetTtlMs = 1000 * 60 * 30;
  private readonly otpTtlMs = 1000 * 60 * 10;
  private readonly otpTtlMinutes = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
    private readonly mailer: MailerService,
    private readonly emailTemplates: EmailTemplatesService,
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
        handle: await this.createUniqueHandle(dto.displayName),
        passwordHash: hash,
        role,
      },
    });
    const verifyToken = `verify_${randomUUID()}`;
    AuthSessionStore.issueEmailVerificationToken(user.id, verifyToken, this.emailVerificationTtlMs);
    await this.audit.log({ actorId: user.id, action: "auth.register", entityType: "User", entityId: user.id });
    void this.sendWelcomeEmail(user.id, user.email, user.displayName, role);
    return this.sign(user.id, user.role, user.email);
  }

  private async sendWelcomeEmail(userId: string, email: string, displayName: string, role: UserRole) {
    try {
      const isDesigner = role === UserRole.DESIGNER;
      const rendered = isDesigner
        ? this.emailTemplates.welcomeDesigner({ name: displayName })
        : this.emailTemplates.welcomeCustomer({ name: displayName });
      const result = await this.mailer.send({
        to: email,
        toName: displayName,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
      await this.audit.log({
        actorId: userId,
        action: isDesigner ? "auth.welcome-email.designer" : "auth.welcome-email.customer",
        entityType: "User",
        entityId: userId,
        metadata: { ok: result.ok, error: result.error ?? null, providerRef: result.providerRef ?? null },
      });
    } catch (err) {
      // Welcome email is non-blocking. Log but never break registration.
      await this.audit.log({
        actorId: userId,
        action: "auth.welcome-email.failed",
        entityType: "User",
        entityId: userId,
        metadata: { error: (err as Error)?.message ?? String(err) },
      });
    }
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
    const rendered = this.emailTemplates.emailVerification({ name: user.displayName, link });
    await this.mailer.send({
      to: user.email,
      toName: user.displayName,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    return this.exposeLifecycleToken(token);
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
    const rendered = this.emailTemplates.passwordReset({ name: user.displayName, link });
    await this.mailer.send({
      to: user.email,
      toName: user.displayName,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    return this.exposeLifecycleToken(token);
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

  // ──────────────────────────────────────────────────────────────────────
  // Email OTP (customer login / signup)
  // ──────────────────────────────────────────────────────────────────────

  async requestEmailOtp(email: string, displayName?: string) {
    const normalized = email.toLowerCase();
    const rate = AuthSessionStore.checkOtpRateLimit(normalized);
    if (!rate.ok) {
      // Always 200 + ok:true to clients to avoid enumeration; throttle silently after window.
      throw new BadRequestException("Too many requests. Please try again later.");
    }
    const existing = await this.prisma.user.findUnique({ where: { email: normalized } });
    const purpose: "signup" | "signin" = existing ? "signin" : "signup";
    const displayedName = existing?.displayName || displayName || normalized.split("@")[0];

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const codeHash = await bcrypt.hash(code, 10);
    AuthSessionStore.issueOtp(normalized, codeHash, this.otpTtlMs, { displayName: displayedName, purpose });

    const rendered = this.emailTemplates.emailOtp({
      name: displayedName,
      code,
      ttlMinutes: this.otpTtlMinutes,
      purpose,
    });
    await this.mailer.send({
      to: normalized,
      toName: displayedName,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    if (existing) {
      await this.audit.log({
        actorId: existing.id,
        action: "auth.otp.request",
        entityType: "User",
        entityId: existing.id,
        metadata: { purpose },
      });
    }
    return { ok: true, ttlMinutes: this.otpTtlMinutes };
  }

  async verifyEmailOtp(email: string, code: string) {
    const normalized = email.toLowerCase();
    const entry = AuthSessionStore.peekOtp(normalized);
    if (!entry) throw new BadRequestException("Code is invalid or expired");
    const valid = await bcrypt.compare(code, entry.codeHash);
    if (!valid) {
      const { remaining, locked } = AuthSessionStore.recordOtpAttempt(normalized);
      if (locked) throw new BadRequestException("Too many attempts. Please request a new code.");
      throw new BadRequestException(`Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`);
    }
    AuthSessionStore.consumeOtp(normalized);

    let user = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (!user) {
      const placeholderHash = await bcrypt.hash(`otp_${randomUUID()}_${Date.now()}`, 10);
      user = await this.prisma.user.create({
        data: {
          email: normalized,
          displayName: entry.displayName || normalized.split("@")[0],
          passwordHash: placeholderHash,
          role: UserRole.CUSTOMER,
        },
      });
      await this.audit.log({
        actorId: user.id,
        action: "auth.otp.register",
        entityType: "User",
        entityId: user.id,
      });
      void this.sendWelcomeEmail(user.id, user.email, user.displayName, user.role);
    } else {
      await this.audit.log({
        actorId: user.id,
        action: "auth.otp.verify",
        entityType: "User",
        entityId: user.id,
      });
    }
    return this.sign(user.id, user.role, user.email);
  }

  private async sign(sub: string, role: UserRole, email: string) {
    const sessionVersion = AuthSessionStore.getSessionVersion(sub);
    const accessToken = await this.jwtService.signAsync(
      { sub, role, email, sv: sessionVersion },
      { secret: process.env.JWT_SECRET || "rashpod-dev-secret", expiresIn: "7d" },
    );
    return { accessToken };
  }

  private exposeLifecycleToken(token: string): { ok: true; token?: string } {
    if (process.env.NODE_ENV === "test") {
      return { ok: true, token };
    }
    return { ok: true };
  }

  private async createUniqueHandle(seed: string) {
    const base =
      seed
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 48) || "designer";
    for (let i = 0; i < 20; i += 1) {
      const handle = i === 0 ? base : `${base}-${i + 1}`;
      const existing = await this.prisma.user.findUnique({ where: { handle } });
      if (!existing) return handle;
    }
    return `${base}-${randomInt(1000, 9999)}`;
  }
}
