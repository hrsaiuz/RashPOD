import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import * as jwt from "jsonwebtoken";
import { AuthSessionStore } from "../../modules/auth/auth-session.store";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization as string | undefined;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    if (!token) throw new UnauthorizedException("Missing bearer token");
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || "rashpod-dev-secret") as jwt.JwtPayload;
      const subject = payload.sub;
      if (typeof subject !== "string") {
        throw new UnauthorizedException("Invalid token subject");
      }
      const tokenSessionVersion = typeof payload.sv === "number" ? payload.sv : 1;
      const activeSessionVersion = AuthSessionStore.getSessionVersion(subject);
      if (tokenSessionVersion !== activeSessionVersion) {
        throw new UnauthorizedException("Session expired");
      }
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
