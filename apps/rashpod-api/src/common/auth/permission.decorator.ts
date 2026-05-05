import { SetMetadata } from "@nestjs/common";
import { PermissionKey } from "./permissions";

export const PERMISSION_KEY = "permission_key";
export const RequirePermission = (permission: PermissionKey) => SetMetadata(PERMISSION_KEY, permission);
