import { Injectable, Logger, OnModuleInit } from "@nestjs/common";

export type RuntimeService = "api" | "worker" | "dashboard" | "web";
export type ReadinessStatus = "PASS" | "WARN" | "FAIL";

export interface LaunchCheck {
  key: string;
  label: string;
  status: ReadinessStatus;
  explanation: string;
  docsPath?: string;
}

export interface EnvironmentValidationResult {
  service: RuntimeService;
  environment: string;
  production: boolean;
  checks: LaunchCheck[];
  errors: LaunchCheck[];
  warnings: LaunchCheck[];
}

const SECRET_KEYS = [
  "DATABASE_URL",
  "JWT_SECRET",
  "PASSWORD_RESET_SECRET",
  "EMAIL_VERIFICATION_SECRET",
  "CLICK_SECRET_KEY",
  "CLICK_WEBHOOK_SECRET",
  "TELEGRAM_BOT_TOKEN",
  "Telegram_BOT_TOKEN",
  "ZEPTOMAIL_API_KEY",
  "ZEPTO_SMTP_PASSWORD",
  "OPENAI_API_KEY",
  "PRINTFUL_API_TOKEN",
  "PRINTIFY_API_TOKEN",
  "PRINTFUL_WEBHOOK_SECRET",
  "PRINTIFY_WEBHOOK_SECRET",
  "WORKER_SECRET",
];

@Injectable()
export class PlatformConfigService implements OnModuleInit {
  private readonly logger = new Logger(PlatformConfigService.name);
  private lastValidation?: EnvironmentValidationResult;

  onModuleInit() {
    this.lastValidation = validateEnvironment("api");
    for (const warning of this.lastValidation.warnings) {
      this.logger.warn(`${warning.key}: ${warning.explanation}`);
    }
  }

  validate(service: RuntimeService = "api") {
    this.lastValidation = validateEnvironment(service);
    return this.lastValidation;
  }

  getLastValidation() {
    return this.lastValidation ?? this.validate("api");
  }

  redactedConfig(service: RuntimeService = "api") {
    const validation = this.lastValidation ?? this.validate(service);
    return {
      service: validation.service,
      environment: validation.environment,
      production: validation.production,
      configured: {
        database: configured("DATABASE_URL"),
        jwtSecret: configured("JWT_SECRET"),
        clickWebhookSecret: configured("CLICK_WEBHOOK_SECRET"),
        zeptoMail: configured("ZEPTOMAIL_API_KEY") || configured("ZEPTO_SMTP_PASSWORD"),
        telegram: configured("TELEGRAM_BOT_TOKEN") || configured("Telegram_BOT_TOKEN"),
        openAi: configured("OPENAI_API_KEY"),
        gcsProject: configured("GCP_PROJECT_ID") || configured("GCS_PROJECT_ID"),
        gcsAssetsBucket: configured("GCS_BUCKET_ASSETS"),
        gcsPrivateBucket: configured("GCS_BUCKET_PRIVATE"),
        printfulToken: configured("PRINTFUL_API_TOKEN"),
        printifyToken: configured("PRINTIFY_API_TOKEN"),
      },
      checks: validation.checks,
    };
  }
}

export function validateEnvironment(service: RuntimeService = "api", env: NodeJS.ProcessEnv = process.env): EnvironmentValidationResult {
  const environment = env.APP_ENV || env.NODE_ENV || "development";
  const production = env.NODE_ENV === "production" || env.APP_ENV === "production";
  const checks: LaunchCheck[] = [];
  const add = (check: LaunchCheck) => checks.push(check);
  const requireInProduction = (key: string, label: string, docsPath = "docs/env-vars.md") => {
    if (has(env, key)) add({ key, label, status: "PASS", explanation: `${key} is configured.`, docsPath });
    else add({ key, label, status: production ? "FAIL" : "WARN", explanation: production ? `${key} is required in production.` : `${key} is not set; local fallback may apply.`, docsPath });
  };

  if (service === "api" || service === "worker") {
    requireInProduction("DATABASE_URL", "Database URL");
  }
  if (service === "api") {
    requireInProduction("JWT_SECRET", "JWT signing secret");
    if ((env.JWT_SECRET || "") === "rashpod-dev-secret") {
      add({ key: "JWT_SECRET_DEFAULT", label: "JWT default secret", status: production ? "FAIL" : "WARN", explanation: "Default development JWT secret must not be used outside local development.", docsPath: "docs/env-vars.md" });
    }
    requireInProduction("WEB_URL", "Storefront URL");
    requireInProduction("DASHBOARD_URL", "Dashboard URL");
    requireInProduction("CLICK_WEBHOOK_SECRET", "Click webhook secret");
    if (production && env.CLICK_TEST_MODE === "true") {
      add({ key: "CLICK_TEST_MODE", label: "Click production mode", status: "FAIL", explanation: "CLICK_TEST_MODE=true in production would route payments through test behavior.", docsPath: "docs/env-vars.md" });
    }
    if (production && wildcardCors(env.CORS_ORIGINS)) {
      add({ key: "CORS_ORIGINS", label: "Strict CORS", status: "FAIL", explanation: "Wildcard CORS is not allowed in production.", docsPath: "docs/env-vars.md" });
    } else if (!has(env, "CORS_ORIGINS")) {
      add({ key: "CORS_ORIGINS", label: "Configured CORS origins", status: production ? "WARN" : "PASS", explanation: production ? "CORS_ORIGINS is not set; WEB_URL and DASHBOARD_URL will be used only." : "Local development uses app URLs and localhost origins.", docsPath: "docs/env-vars.md" });
    } else {
      add({ key: "CORS_ORIGINS", label: "Configured CORS origins", status: "PASS", explanation: "Explicit CORS origins are configured.", docsPath: "docs/env-vars.md" });
    }
  }

  if (service === "api" || service === "worker") {
    const hasGcs = has(env, "GCP_PROJECT_ID") || has(env, "GCS_PROJECT_ID");
    add({ key: "GCS_PROJECT", label: "GCS project", status: hasGcs ? "PASS" : production ? "FAIL" : "WARN", explanation: hasGcs ? "GCS project is configured." : production ? "GCS project is required in production." : "Local storage fallback is allowed only in development.", docsPath: "docs/env-vars.md" });
    add({ key: "GCS_BUCKET_ASSETS", label: "Assets bucket", status: has(env, "GCS_BUCKET_ASSETS") ? "PASS" : production ? "FAIL" : "WARN", explanation: has(env, "GCS_BUCKET_ASSETS") ? "Assets bucket is configured." : "Assets bucket is missing.", docsPath: "docs/env-vars.md" });
    add({ key: "GCS_BUCKET_PRIVATE", label: "Private bucket", status: has(env, "GCS_BUCKET_PRIVATE") ? "PASS" : production ? "FAIL" : "WARN", explanation: has(env, "GCS_BUCKET_PRIVATE") ? "Private bucket is configured." : "Private bucket is missing.", docsPath: "docs/env-vars.md" });
  }

  if (service === "dashboard" || service === "web") {
    requireInProduction("API_URL", "Server API URL");
    requireInProduction("NEXT_PUBLIC_API_URL", "Browser API URL");
    const apiUrl = env.API_URL || env.NEXT_PUBLIC_API_URL || "";
    if (apiUrl.includes(":3001") || apiUrl.includes("office.rashpod")) {
      add({ key: "API_URL_SELF_REFERENCE", label: "API URL target", status: "FAIL", explanation: "Dashboard/web API_URL appears to point at the dashboard rather than the API service.", docsPath: "docs/env-vars.md" });
    }
  }

  optionalIntegrationCheck(env, checks, "ZEPTOMAIL", has(env, "ZEPTOMAIL_API_KEY") || has(env, "ZEPTO_SMTP_PASSWORD"), "Email delivery provider", "Email credentials are missing; email delivery will be disabled or skipped.");
  optionalIntegrationCheck(env, checks, "TELEGRAM", has(env, "TELEGRAM_BOT_TOKEN") || has(env, "Telegram_BOT_TOKEN"), "Telegram bot token", "Telegram credentials are missing; Telegram delivery will be skipped.");
  optionalIntegrationCheck(env, checks, "OPENAI", has(env, "OPENAI_API_KEY"), "OpenAI key", "OpenAI key is missing while AI feature flags may be enabled.");

  const errors = checks.filter((check) => check.status === "FAIL");
  const warnings = checks.filter((check) => check.status === "WARN");
  return { service, environment, production, checks, errors, warnings };
}

export function assertEnvironment(service: RuntimeService = "api") {
  const result = validateEnvironment(service);
  if (result.production && result.errors.length > 0) {
    const keys = result.errors.map((error) => error.key).join(", ");
    throw new Error(`Production environment validation failed: ${keys}`);
  }
  return result;
}

export function redactSecrets<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => redactSecrets(item)) as T;
  if (!value || typeof value !== "object") return value;
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (isSecretKey(key)) output[key] = item ? "[REDACTED]" : item;
    else output[key] = redactSecrets(item);
  }
  return output as T;
}

function optionalIntegrationCheck(env: NodeJS.ProcessEnv, checks: LaunchCheck[], prefix: string, ok: boolean, label: string, missing: string) {
  const enabled = env[`${prefix}_ENABLED`] === "true" || env[`FEATURE_${prefix}`] === "true" || prefix === "ZEPTOMAIL";
  if (ok) checks.push({ key: `${prefix}_CONFIGURED`, label, status: "PASS", explanation: `${label} is configured.`, docsPath: "docs/env-vars.md" });
  else checks.push({ key: `${prefix}_CONFIGURED`, label, status: enabled ? "WARN" : "WARN", explanation: missing, docsPath: "docs/env-vars.md" });
}

function configured(key: string) {
  return Boolean(process.env[key] && String(process.env[key]).trim());
}

function has(env: NodeJS.ProcessEnv, key: string) {
  return Boolean(env[key] && String(env[key]).trim());
}

function wildcardCors(value?: string) {
  if (!value) return false;
  return value.split(",").map((item) => item.trim()).includes("*");
}

function isSecretKey(key: string) {
  const normalized = key.toUpperCase();
  return SECRET_KEYS.some((secret) => normalized.includes(secret.toUpperCase())) || /TOKEN|SECRET|PASSWORD|PRIVATE_KEY|API_KEY/.test(normalized);
}
