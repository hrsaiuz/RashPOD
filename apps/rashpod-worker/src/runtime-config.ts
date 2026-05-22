export type WorkerReadinessStatus = "PASS" | "WARN" | "FAIL";

export interface WorkerRuntimeCheck {
  key: string;
  label: string;
  status: WorkerReadinessStatus;
  explanation: string;
}

export function validateWorkerEnvironment(env: NodeJS.ProcessEnv = process.env) {
  const production = env.NODE_ENV === "production" || env.APP_ENV === "production";
  const checks: WorkerRuntimeCheck[] = [];
  const required = (key: string, label: string) => {
    const ok = Boolean(env[key] && String(env[key]).trim());
    checks.push({ key, label, status: ok ? "PASS" : production ? "FAIL" : "WARN", explanation: ok ? `${key} is configured.` : `${key} is missing.` });
  };
  required("DATABASE_URL", "Database URL");
  required("GCS_BUCKET_ASSETS", "Assets bucket");
  required("GCS_BUCKET_PRIVATE", "Private bucket");
  const hasProject = Boolean(env.GCP_PROJECT_ID || env.GCS_PROJECT_ID);
  checks.push({ key: "GCS_PROJECT", label: "GCS project", status: hasProject ? "PASS" : production ? "FAIL" : "WARN", explanation: hasProject ? "GCS project is configured." : "GCS project is missing." });
  const telegram = Boolean(env.TELEGRAM_BOT_TOKEN || env.Telegram_BOT_TOKEN);
  checks.push({ key: "TELEGRAM_BOT_TOKEN", label: "Telegram token", status: telegram ? "PASS" : "WARN", explanation: telegram ? "Telegram token is configured." : "Telegram sends will be skipped without a token." });
  return { production, checks, errors: checks.filter((check) => check.status === "FAIL"), warnings: checks.filter((check) => check.status === "WARN") };
}

export function assertWorkerEnvironment() {
  const result = validateWorkerEnvironment();
  if (result.production && result.errors.length > 0) {
    throw new Error(`Worker production environment validation failed: ${result.errors.map((error) => error.key).join(", ")}`);
  }
  return result;
}
