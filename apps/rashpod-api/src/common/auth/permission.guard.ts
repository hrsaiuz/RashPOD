import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSION_KEY } from "./permission.decorator";
import { PermissionKey, permissions } from "./permissions";

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.getAllAndOverride<PermissionKey | undefined>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!permission) return true;
    const request = context.switchToHttp().getRequest();
    const role = request.user?.role as string | undefined;
    if (!role) throw new ForbiddenException("Missing role");
    const allowedRoles = permissions[permission];
    if (!allowedRoles.includes(role as never)) {
      throw new ForbiddenException(`Missing permission: ${permission}`);
    }
    return true;
  }
}
