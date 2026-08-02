export type PrintfulFailureSummary = {
  code: string;
  status?: number;
  retryable: boolean;
  providerMessage?: string;
  providerCode?: string;
  requestId?: string;
  operation?: string;
};

type PrintfulErrorLike = Error & {
  responseBody?: unknown;
  printfulOperation?: string;
};

const RETRYABLE_HTTP_STATUSES = new Set([408, 409, 425, 429]);

export function withPrintfulOperation(error: unknown, operation: string): unknown {
  if (error instanceof Error) {
    (error as PrintfulErrorLike).printfulOperation = operation;
  }
  return error;
}

export function summarizePrintfulFailure(error: unknown): PrintfulFailureSummary {
  const message = error instanceof Error ? error.message : "PRINTFUL_MOCKUP_FAILED";
  const match = /^PRINTFUL_REQUEST_FAILED:(\d{3})$/.exec(message);
  const status = match ? Number(match[1]) : undefined;
  const typed = error instanceof Error ? error as PrintfulErrorLike : undefined;
  const response = recordValue(typed?.responseBody);
  const nestedError = recordValue(response?.error);
  const result = recordValue(response?.result);
  const providerMessage = firstText(
    nestedError?.message,
    nestedError?.reason,
    response?.message,
    response?.reason,
    result?.message,
    result?.reason,
  );

  return {
    code: message,
    ...(status ? { status } : {}),
    retryable: status == null
      ? isKnownRetryableCode(message)
      : RETRYABLE_HTTP_STATUSES.has(status) || status >= 500,
    ...(providerMessage ? { providerMessage: providerMessage.slice(0, 500) } : {}),
    ...(firstText(nestedError?.code, response?.code) ? { providerCode: firstText(nestedError?.code, response?.code)!.slice(0, 100) } : {}),
    ...(firstText(response?.request_id, response?.requestId) ? { requestId: firstText(response?.request_id, response?.requestId)!.slice(0, 200) } : {}),
    ...(typed?.printfulOperation ? { operation: typed.printfulOperation } : {}),
  };
}

export function isPrintfulFailureRetryable(code?: string | null): boolean {
  if (!code) return false;
  const match = /^PRINTFUL_REQUEST_FAILED:(\d{3})$/.exec(code);
  if (!match) return isKnownRetryableCode(code);
  const status = Number(match[1]);
  return RETRYABLE_HTTP_STATUSES.has(status) || status >= 500;
}

function isKnownRetryableCode(code: string) {
  return code === "PRINTFUL_MOCKUP_TIMEOUT"
    || code === "PRINTFUL_MOCKUP_EMPTY"
    || code.startsWith("PRINTFUL_MOCKUP_DOWNLOAD_FAILED:");
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
}
