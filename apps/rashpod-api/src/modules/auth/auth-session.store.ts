type TimedToken = {
  userId: string;
  expiresAt: number;
};

export class AuthSessionStore {
  private static readonly sessionVersionByUser = new Map<string, number>();
  private static readonly emailVerificationTokens = new Map<string, TimedToken>();
  private static readonly emailVerificationTokenByUser = new Map<string, string>();
  private static readonly passwordResetTokens = new Map<string, TimedToken>();
  private static readonly passwordResetTokenByUser = new Map<string, string>();

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
}
