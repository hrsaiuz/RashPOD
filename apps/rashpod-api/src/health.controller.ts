import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";
import { StorageService } from "./modules/files/storage.service";
import { PlatformConfigService } from "./common/config/platform-config.service";

@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: PlatformConfigService,
  ) {}

  @Get()
  health() {
    return { ok: true, status: "live", service: "rashpod-api" };
  }

  @Get("live")
  live() {
    return { ok: true, status: "live", service: "rashpod-api" };
  }

  @Get("ready")
  async ready() {
    const checks = await this.readinessChecks();
    const failed = checks.filter((check) => check.status === "FAIL");
    const body = { ok: failed.length === 0, status: failed.length === 0 ? "ready" : "not_ready", service: "rashpod-api", checks };
    if (failed.length > 0) throw new ServiceUnavailableException(body);
    return body;
  }

  private async readinessChecks() {
    const config = this.config.redactedConfig("api");
    const checks = [...config.checks];
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.push({ key: "DB_CONNECTIVITY", label: "Database connectivity", status: "PASS" as const, explanation: "Database connection succeeded." });
    } catch {
      checks.push({ key: "DB_CONNECTIVITY", label: "Database connectivity", status: "FAIL" as const, explanation: "Database connection failed." });
    }
    const storageConfigured = this.storage.isCloudStorageConfigured();
    checks.push({
      key: "STORAGE_PROVIDER",
      label: "Storage provider",
      status: storageConfigured ? "PASS" as const : process.env.NODE_ENV === "production" ? "FAIL" as const : "WARN" as const,
      explanation: storageConfigured ? "Google Cloud Storage is configured." : "Using local storage fallback; only acceptable in development.",
      docsPath: "docs/env-vars.md",
    });
    return checks;
  }
}
