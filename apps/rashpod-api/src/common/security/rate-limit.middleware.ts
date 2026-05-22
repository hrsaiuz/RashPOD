import { NextFunction, Request, Response } from "express";

export interface RateLimitRule {
  id: string;
  method?: string;
  path: RegExp;
  max: number;
  windowMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export const defaultRateLimitRules: RateLimitRule[] = [
  { id: "auth-login", method: "POST", path: /^\/auth\/(login|register|forgot-password|reset-password|otp\/request|otp\/verify)/, max: 10, windowMs: 60_000 },
  { id: "upload-sign", method: "POST", path: /^\/files\/upload-url/, max: 30, windowMs: 60_000 },
  { id: "support-create", method: "POST", path: /^\/(customer\/orders\/[^/]+\/support-request|designer\/support-request|support\/tickets)/, max: 12, windowMs: 60_000 },
  { id: "ai-create", method: "POST", path: /^\/ai\//, max: 20, windowMs: 60_000 },
  { id: "payment-retry", method: "POST", path: /^\/(payments\/click\/create|customer\/orders\/[^/]+\/retry-payment)/, max: 12, windowMs: 60_000 },
  { id: "webhooks", method: "POST", path: /^\/payments\/click\/webhook/, max: 240, windowMs: 60_000 },
];

export function createRateLimitMiddleware(rules: RateLimitRule[] = defaultRateLimitRules) {
  return (req: Request, res: Response, next: NextFunction) => {
    const rule = rules.find((item) => (!item.method || item.method === req.method) && item.path.test(req.path));
    if (!rule) return next();
    const now = Date.now();
    const key = `${rule.id}:${actorKey(req)}`;
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
      res.setHeader("x-ratelimit-limit", String(rule.max));
      res.setHeader("x-ratelimit-remaining", String(rule.max - 1));
      return next();
    }
    bucket.count += 1;
    const remaining = Math.max(0, rule.max - bucket.count);
    res.setHeader("x-ratelimit-limit", String(rule.max));
    res.setHeader("x-ratelimit-remaining", String(remaining));
    res.setHeader("x-ratelimit-reset", String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > rule.max) {
      return res.status(429).json({ ok: false, statusCode: 429, code: "RATE_LIMITED", message: "Too many requests. Please try again later.", requestId: req.requestId });
    }
    return next();
  };
}

export function resetRateLimitBuckets() {
  buckets.clear();
}

function actorKey(req: Request) {
  const userId = (req as any).user?.sub;
  if (typeof userId === "string") return `user:${userId}`;
  const forwarded = req.header("x-forwarded-for")?.split(",")[0]?.trim();
  return `ip:${forwarded || req.ip || req.socket.remoteAddress || "unknown"}`;
}
