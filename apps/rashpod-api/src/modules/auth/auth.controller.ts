import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { VerifyEmailTokenDto } from "./dto/verify-email-token.dto";
import { RequestEmailOtpDto } from "./dto/request-email-otp.dto";
import { VerifyEmailOtpDto } from "./dto/verify-email-otp.dto";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: RequestUser) {
    return this.prisma.user.findUnique({
      where: { id: user.sub },
      select: {
        id: true,
        email: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        coverUrl: true,
        handle: true,
        socialLinks: true,
        role: true,
        createdAt: true,
        preferences: true,
      },
    });
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  async updateMe(
    @CurrentUser() user: RequestUser,
    @Body()
    body: {
      displayName?: string;
      bio?: string | null;
      avatarUrl?: string | null;
      coverUrl?: string | null;
      socialLinks?: Record<string, unknown> | null;
      portfolio?: Record<string, unknown> | null;
      payoutDetails?: Record<string, unknown> | null;
      notifications?: Record<string, unknown> | null;
    },
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { id: true, email: true, displayName: true, handle: true },
    });
    const data: {
      displayName?: string;
      bio?: string | null;
      avatarUrl?: string | null;
      coverUrl?: string | null;
      socialLinks?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
      handle?: string;
    } = {};
    if (typeof body?.displayName === "string") {
      const trimmed = body.displayName.trim();
      if (trimmed.length > 0 && trimmed.length <= 120) data.displayName = trimmed;
    }
    if (body.bio !== undefined) data.bio = typeof body.bio === "string" ? body.bio.trim().slice(0, 1000) : null;
    if (body.avatarUrl !== undefined) data.avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl.trim().slice(0, 500) : null;
    if (body.coverUrl !== undefined) data.coverUrl = typeof body.coverUrl === "string" ? body.coverUrl.trim().slice(0, 500) : null;
    if (body.socialLinks !== undefined) data.socialLinks = body.socialLinks === null ? Prisma.JsonNull : (body.socialLinks as Prisma.InputJsonValue);
    if (!existing?.handle) {
      data.handle = await this.createUniqueHandle(data.displayName ?? existing?.displayName ?? existing?.email ?? "designer");
    }
    const preferencesPatch: {
      portfolioJson?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
      payoutDetailsJson?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
      notificationJson?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
    } = {};
    if (body.portfolio !== undefined) preferencesPatch.portfolioJson = body.portfolio === null ? Prisma.JsonNull : (body.portfolio as Prisma.InputJsonValue);
    if (body.payoutDetails !== undefined) preferencesPatch.payoutDetailsJson = body.payoutDetails === null ? Prisma.JsonNull : (body.payoutDetails as Prisma.InputJsonValue);
    if (body.notifications !== undefined) preferencesPatch.notificationJson = body.notifications === null ? Prisma.JsonNull : (body.notifications as Prisma.InputJsonValue);
    if (Object.keys(preferencesPatch).length > 0) {
      await this.prisma.userPreferences.upsert({
        where: { userId: user.sub },
        create: { userId: user.sub, ...preferencesPatch },
        update: preferencesPatch,
      });
    }
    return this.prisma.user.update({
      where: { id: user.sub },
      data,
      select: {
        id: true,
        email: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        coverUrl: true,
        handle: true,
        socialLinks: true,
        role: true,
        createdAt: true,
        preferences: true,
      },
    });
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser() user: RequestUser) {
    return this.authService.logout(user.sub);
  }

  @Post("verify-email")
  verifyEmailRequest(@Body() dto: VerifyEmailDto) {
    return this.authService.requestEmailVerification(dto.email);
  }

  @Post("verify-email/confirm")
  verifyEmailConfirm(@Body() dto: VerifyEmailTokenDto) {
    return this.authService.verifyEmailToken(dto.token);
  }

  @Post("forgot-password")
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post("reset-password")
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Post("otp/request")
  requestEmailOtp(@Body() dto: RequestEmailOtpDto) {
    return this.authService.requestEmailOtp(dto.email, dto.displayName);
  }

  @Post("otp/verify")
  verifyEmailOtp(@Body() dto: VerifyEmailOtpDto) {
    return this.authService.verifyEmailOtp(dto.email, dto.code);
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
    return `${base}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
}
