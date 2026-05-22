import { randomUUID } from "crypto";
import { Request, Response, NextFunction } from "express";

declare module "express-serve-static-core" {
  interface Request {
    requestId?: string;
    startedAtMs?: number;
    user?: { id?: string; role?: string };
  }
}

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header("x-request-id");
  const requestId = incoming && incoming.length <= 128 ? incoming : randomUUID();
  req.requestId = requestId;
  req.startedAtMs = Date.now();
  res.setHeader("x-request-id", requestId);
  res.on("finish", () => {
    if (req.path === "/health" || req.path === "/health/live") return;
    const durationMs = Date.now() - (req.startedAtMs ?? Date.now());
    console.log(JSON.stringify({
      level: "info",
      event: "http.request",
      requestId,
      method: req.method,
      route: req.route?.path ?? req.path,
      statusCode: res.statusCode,
      durationMs,
      userId: req.user?.id,
      userRole: req.user?.role,
    }));
  });
  next();
}
