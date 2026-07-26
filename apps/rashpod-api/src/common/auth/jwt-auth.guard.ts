import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Optional, UnauthorizedException } from "@nestjs/common";
import * as jwt from "jsonwebtoken";
import { AuthSessionStore } from "../../modules/auth/auth-session.store";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Optional() private readonly prisma?: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization as string | undefined;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    if (!token) throw new UnauthorizedException("Missing bearer token");
    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || "rashpod-dev-secret") as jwt.JwtPayload;
      const subject = payload.sub;
      if (typeof subject !== "string") {
        throw new UnauthorizedException("Invalid token subject");
      }
      const tokenSessionVersion = typeof payload.sv === "number" ? payload.sv : 1;
      const activeSessionVersion = AuthSessionStore.getSessionVersion(subject);
      if (tokenSessionVersion !== activeSessionVersion) {
        throw new UnauthorizedException("Session expired");
      }
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
    const subject = payload.sub as string;
    if (this.prisma) {
      const user = await this.prisma.user.findUnique({
        where: { id: subject },
        select: { id: true, email: true, role: true, designerStatus: true, emailVerifiedAt: true },
      });
      if (!user) throw new UnauthorizedException("Account no longer exists");
      if (!user.emailVerifiedAt) throw new ForbiddenException("Verify your email before continuing");
      if (user.role === "DESIGNER" && user.designerStatus !== "ACTIVE") {
        throw new ForbiddenException(
          user.designerStatus === "SUSPENDED"
            ? "This designer account is suspended"
            : "Your designer account is awaiting activation",
        );
      }
      payload.role = user.role;
      payload.email = user.email;
    }
    const tenantId = typeof payload.tid === "string" ? payload.tid : undefined;
    request.user = { ...payload, tenantId };
    return true;
  }
}
