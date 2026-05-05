/**
 * API Base URL Configuration
 */
export function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
}

/**
 * Dashboard URL Configuration
 */
export function getDashboardUrl(): string {
  return process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:3003";
}
