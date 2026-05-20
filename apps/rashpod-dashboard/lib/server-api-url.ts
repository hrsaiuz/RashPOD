export class ApiUrlConfigurationError extends Error {
  constructor() {
    super("Dashboard API URL is not configured");
    this.name = "ApiUrlConfigurationError";
  }
}

export function getServerApiUrl() {
  const configuredUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  const apiUrl = configuredUrl?.trim().replace(/\/+$/, "");

  if (apiUrl) return apiUrl;

  if (process.env.NODE_ENV === "production") {
    throw new ApiUrlConfigurationError();
  }

  return "http://localhost:3002";
}

export function isApiUrlConfigurationError(error: unknown) {
  return error instanceof ApiUrlConfigurationError;
}
