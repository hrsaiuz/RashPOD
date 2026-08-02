import assert from "node:assert/strict";
import test from "node:test";
import { isPrintfulFailureRetryable, summarizePrintfulFailure, withPrintfulOperation } from "./errors";

test("summarizes a Printful validation error without persisting the complete response", () => {
  const error = new Error("PRINTFUL_REQUEST_FAILED:400") as Error & { responseBody?: unknown };
  error.responseBody = {
    error: { code: 400, message: "Invalid placement front_large" },
    request_id: "req_123",
    ignored_private_value: "do-not-copy",
  };
  withPrintfulOperation(error, "CREATE_MOCKUP_TASK");

  assert.deepEqual(summarizePrintfulFailure(error), {
    code: "PRINTFUL_REQUEST_FAILED:400",
    status: 400,
    retryable: false,
    providerMessage: "Invalid placement front_large",
    providerCode: "400",
    requestId: "req_123",
    operation: "CREATE_MOCKUP_TASK",
  });
});

test("classifies rate limits and server failures as retryable", () => {
  assert.equal(isPrintfulFailureRetryable("PRINTFUL_REQUEST_FAILED:429"), true);
  assert.equal(isPrintfulFailureRetryable("PRINTFUL_REQUEST_FAILED:503"), true);
  assert.equal(isPrintfulFailureRetryable("PRINTFUL_REQUEST_FAILED:422"), false);
});
