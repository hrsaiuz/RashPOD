type TimedToken = {
  userId: string;
  expiresAt: number;
};

type OtpEntry = {
  email: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
  displayName?: string;
  purpose: "signup" | "signin" | "verify";
};

export class AuthSessionStore {
  private static readonly sessionVersionByUser = new Map<string, number>();
  private static readonly emailVerificationTokens = new Map<string, TimedToken>();
  private static readonly emailVerificationTokenByUser = new Map<string, string>();
  private static readonly passwordResetTokens = new Map<string, TimedToken>();
  private static readonly passwordResetTokenByUser = new Map<string, string>();
  private static readonly otpByEmail = new Map<string, OtpEntry>();
  private static readonly otpRateLimitByEmail = new Map<string, { count: number; windowStart: number }>();

  static readonly OTP_MAX_ATTEMPTS = 5;
  static readonly OTP_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
  static readonly OTP_RATE_LIMIT_MAX = 6;

  static getSessionVersion(userId: string): number {
    return this.sessionVersionByUser.get(userId) ?? 1;
  }

  static bumpSessionVersion(userId: string): number {
    const next = this.getSessionVersion(userId) + 1;
    this.sessionVersionByUser.set(userId, next);
    return next;
  }

  static issueEmailVerificationToken(userId: string, token: string, ttlMs: number) {
    const prev = this.emailVerificationTokenByUser.get(userId);
    if (prev) this.emailVerificationTokens.delete(prev);
    this.emailVerificationTokenByUser.set(userId, token);
    this.emailVerificationTokens.set(token, { userId, expiresAt: Date.now() + ttlMs });
  }

  static consumeEmailVerificationToken(token: string): string | null {
    const entry = this.emailVerificationTokens.get(token);
    if (!entry) return null;
    this.emailVerificationTokens.delete(token);
    this.emailVerificationTokenByUser.delete(entry.userId);
    if (entry.expiresAt < Date.now()) return null;
    return entry.userId;
  }

  static issuePasswordResetToken(userId: string, token: string, ttlMs: number) {
    const prev = this.passwordResetTokenByUser.get(userId);
    if (prev) this.passwordResetTokens.delete(prev);
    this.passwordResetTokenByUser.set(userId, token);
    this.passwordResetTokens.set(token, { userId, expiresAt: Date.now() + ttlMs });
  }

  static consumePasswordResetToken(token: string): string | null {
    const entry = this.passwordResetTokens.get(token);
    if (!entry) return null;
    this.passwordResetTokens.delete(token);
    this.passwordResetTokenByUser.delete(entry.userId);
    if (entry.expiresAt < Date.now()) return null;
    return entry.userId;
  }

  static checkOtpRateLimit(email: string): { ok: boolean; retryInMs?: number } {
    const key = email.toLowerCase();
    const now = Date.now();
    const entry = this.otpRateLimitByEmail.get(key);
    if (!entry || now - entry.windowStart > this.OTP_RATE_LIMIT_WINDOW_MS) {
      this.otpRateLimitByEmail.set(key, { count: 1, windowStart: now });
      return { ok: true };
    }
    if (entry.count >= this.OTP_RATE_LIMIT_MAX) {
      return { ok: false, retryInMs: this.OTP_RATE_LIMIT_WINDOW_MS - (now - entry.windowStart) };
    }
    entry.count += 1;
    return { ok: true };
  }

  static issueOtp(
    email: string,
    codeHash: string,
    ttlMs: number,
    opts?: { displayName?: string; purpose?: "signup" | "signin" | "verify" },
  ): void {
    const key = email.toLowerCase();
    this.otpByEmail.set(key, {
      email: key,
      codeHash,
      expiresAt: Date.now() + ttlMs,
      attempts: 0,
      displayName: opts?.displayName,
      purpose: opts?.purpose ?? "verify",
    });
  }

  static peekOtp(email: string): OtpEntry | null {
    const entry = this.otpByEmail.get(email.toLowerCase());
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.otpByEmail.delete(email.toLowerCase());
      return null;
    }
    return entry;
  }

  static recordOtpAttempt(email: string): { remaining: number; locked: boolean } {
    const key = email.toLowerCase();
    const entry = this.otpByEmail.get(key);
    if (!entry) return { remaining: 0, locked: true };
    entry.attempts += 1;
    if (entry.attempts >= this.OTP_MAX_ATTEMPTS) {
      this.otpByEmail.delete(key);
      return { remaining: 0, locked: true };
    }
    return { remaining: this.OTP_MAX_ATTEMPTS - entry.attempts, locked: false };
  }

  static consumeOtp(email: string): void {
    this.otpByEmail.delete(email.toLowerCase());
  }
}
