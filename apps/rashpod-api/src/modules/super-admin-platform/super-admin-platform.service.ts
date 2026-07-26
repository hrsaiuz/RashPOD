import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DesignerStatus, Prisma, UserRole } from "@prisma/client";
import { RbacService } from "../../common/auth/rbac.service";
import { PermissionKey } from "../../common/auth/permissions";
import { PlatformConfigService } from "../../common/config/platform-config.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AdminOpsService } from "../admin-ops/admin-ops.service";
import { UpdateAdminSettingsDto } from "../admin-ops/dto/update-admin-settings.dto";
import { randomUUID } from "node:crypto";

const SECRETS_KEY = "integrations.secrets";

export type SecretReference = {
  id: string;
  name: string;
  envVar: string;
  secretManagerRef?: string | null;
  service: string;
  lastRotatedAt?: string | null;
  notes?: string | null;
};

@Injectable()
export class SuperAdminPlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
    private readonly adminOps: AdminOpsService,
    private readonly platformConfig: PlatformConfigService,
  ) {}

  getPermissionsMatrix() {
    return {
      defaults: this.rbac.getDefaultMatrix(),
      overrides: this.rbac.getOverrides(),
      effective: this.rbac.getEffectiveMatrix(),
    };
  }

  async updatePermissions(actorId: string, overrides: Partial<Record<PermissionKey, UserRole[]>>) {
    try {
      const result = await this.rbac.updateOverrides(actorId, overrides);
      await this.audit.log({
        actorId,
        action: "rbac.overrides.update",
        entityType: "PlatformSetting",
        entityId: "rbac.permissionOverrides",
        metadata: { overriddenPermissions: Object.keys(overrides).sort(), overrideCount: Object.keys(overrides).length },
      });
      return result;
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Invalid RBAC overrides");
    }
  }

  async listUsers(opts: { search?: string; role?: UserRole; limit?: number; page?: number }) {
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
    const page = Math.max(opts.page ?? 1, 1);
    const where: Record<string, unknown> = {};
    if (opts.role) where.role = opts.role;
    if (opts.search) {
      where.OR = [
        { email: { contains: opts.search, mode: "insensitive" } },
        { displayName: { contains: opts.search, mode: "insensitive" } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, email: true, displayName: true, role: true, designerStatus: true, createdAt: true, updatedAt: true },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async updateUserRole(actorId: string, userId: string, role: UserRole) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    if (user.role === role) return user;
    if (actorId === userId && role !== UserRole.SUPER_ADMIN) {
      throw new BadRequestException("You cannot demote your own super admin account");
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      if (user.role === UserRole.SUPER_ADMIN && role !== UserRole.SUPER_ADMIN) {
        const superAdminCount = await tx.user.count({ where: { role: UserRole.SUPER_ADMIN } });
        if (superAdminCount <= 1) {
          throw new BadRequestException("The final super admin account cannot be demoted");
        }
      }
      return tx.user.update({ where: { id: userId }, data: { role } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await this.audit.log({ actorId, action: "user.role.update", entityType: "User", entityId: userId, metadata: { from: user.role, to: role } });
    return updated;
  }

  async updateDesignerStatus(actorId: string, userId: string, designerStatus: DesignerStatus) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    if (user.role !== UserRole.DESIGNER) throw new BadRequestException("Designer status applies to designer accounts only");
    const updated = await this.prisma.user.update({ where: { id: userId }, data: { designerStatus } });
    await this.audit.log({ actorId, action: "user.designer-status.update", entityType: "User", entityId: userId, metadata: { designerStatus } });
    return updated;
  }

  async listSecrets() {
    const row = await this.prisma.platformSetting.findUnique({ where: { key: SECRETS_KEY } });
    return this.parseSecrets(row?.value);
  }

  private parseSecrets(value: unknown) {
    return Array.isArray(value) ? (value as SecretReference[]) : [];
  }

  private async mutateSecrets<T>(mutate: (secrets: SecretReference[]) => T) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "key" FROM "PlatformSetting" WHERE "key" = ${SECRETS_KEY} FOR UPDATE`;
      const row = await tx.platformSetting.findUnique({ where: { key: SECRETS_KEY } });
      const secrets = [...this.parseSecrets(row?.value)];
      const result = mutate(secrets);
      await tx.platformSetting.upsert({
        where: { key: SECRETS_KEY },
        create: { key: SECRETS_KEY, value: secrets as object[] },
        update: { value: secrets as object[] },
      });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async createSecret(actorId: string, input: Omit<SecretReference, "id">) {
    const item = await this.mutateSecrets((secrets) => {
      if (secrets.some((secret) => secret.envVar === input.envVar)) {
        throw new BadRequestException(`A reference for ${input.envVar} already exists`);
      }
      const created: SecretReference = { ...input, id: `sec_${randomUUID()}` };
      secrets.unshift(created);
      return created;
    });
    await this.audit.log({ actorId, action: "secret-reference.create", entityType: "PlatformSetting", entityId: item.id });
    return item;
  }

  async updateSecret(actorId: string, id: string, input: Partial<Omit<SecretReference, "id">>) {
    const updated = await this.mutateSecrets((secrets) => {
      const index = secrets.findIndex((item) => item.id === id);
      if (index < 0) throw new NotFoundException("Secret reference not found");
      if (input.envVar && secrets.some((secret) => secret.id !== id && secret.envVar === input.envVar)) {
        throw new BadRequestException(`A reference for ${input.envVar} already exists`);
      }
      secrets[index] = { ...secrets[index], ...input, id };
      return secrets[index];
    });
    await this.audit.log({ actorId, action: "secret-reference.update", entityType: "PlatformSetting", entityId: id });
    return updated;
  }

  async deleteSecret(actorId: string, id: string) {
    await this.mutateSecrets((secrets) => {
      const index = secrets.findIndex((item) => item.id === id);
      if (index < 0) throw new NotFoundException("Secret reference not found");
      secrets.splice(index, 1);
      return true;
    });
    await this.audit.log({ actorId, action: "secret-reference.delete", entityType: "PlatformSetting", entityId: id });
    return { deleted: true };
  }

  getSystemSettings() {
    return this.adminOps.getSettings();
  }

  updateSystemSettings(actorId: string, dto: UpdateAdminSettingsDto) {
    return this.adminOps.updateSettings(actorId, dto);
  }

  async getSystemHealth() {
    const [launchReadiness, workerPending, workerFailed, tenantCount] = await Promise.all([
      this.adminOps.launchReadiness(),
      this.prisma.workerJob.count({ where: { status: "PENDING" } }),
      this.prisma.workerJob.count({ where: { status: "FAILED" } }),
      this.prisma.tenant.count(),
    ]);
    return {
      environment: this.platformConfig.getLastValidation(),
      launchReadiness,
      worker: { pending: workerPending, failed: workerFailed },
      tenants: tenantCount,
    };
  }
}
