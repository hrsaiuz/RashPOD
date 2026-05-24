import { Injectable, OnModuleInit } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { PermissionKey, permissions } from "./permissions";

const OVERRIDES_KEY = "rbac.permissionOverrides";

@Injectable()
export class RbacService implements OnModuleInit {
  private overrides: Partial<Record<PermissionKey, UserRole[]>> = {};

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.reload();
  }

  async reload() {
    const row = await this.prisma.platformSetting.findUnique({ where: { key: OVERRIDES_KEY } });
    this.overrides = this.parseOverrides(row?.value);
  }

  getDefaultMatrix() {
    return permissions;
  }

  getOverrides() {
    return this.overrides;
  }

  getEffectiveMatrix() {
    const effective: Record<string, UserRole[]> = {};
    for (const key of Object.keys(permissions) as PermissionKey[]) {
      effective[key] = this.getAllowedRoles(key);
    }
    return effective;
  }

  getAllowedRoles(permission: PermissionKey): UserRole[] {
    const override = this.overrides[permission];
    if (override) return override;
    return [...permissions[permission]] as UserRole[];
  }

  async updateOverrides(actorId: string, next: Partial<Record<PermissionKey, UserRole[]>>) {
    this.validateOverrides(next);
    await this.prisma.platformSetting.upsert({
      where: { key: OVERRIDES_KEY },
      create: { key: OVERRIDES_KEY, value: next as object },
      update: { value: next as object },
    });
    this.overrides = next;
    return { overrides: this.overrides, effective: this.getEffectiveMatrix() };
  }

  private validateOverrides(next: Partial<Record<PermissionKey, UserRole[]>>) {
    const validPermissions = new Set(Object.keys(permissions));
    const validRoles = new Set(Object.values(UserRole));
    for (const [key, roles] of Object.entries(next)) {
      if (!validPermissions.has(key)) throw new Error(`Unknown permission: ${key}`);
      if (!Array.isArray(roles) || roles.some((role) => !validRoles.has(role as UserRole))) {
        throw new Error(`Invalid roles for permission: ${key}`);
      }
    }
  }

  private parseOverrides(value: unknown): Partial<Record<PermissionKey, UserRole[]>> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const result: Partial<Record<PermissionKey, UserRole[]>> = {};
    for (const [key, roles] of Object.entries(value as Record<string, unknown>)) {
      if (!(key in permissions)) continue;
      if (!Array.isArray(roles)) continue;
      result[key as PermissionKey] = roles.filter((role): role is UserRole => typeof role === "string") as UserRole[];
    }
    return result;
  }
}
