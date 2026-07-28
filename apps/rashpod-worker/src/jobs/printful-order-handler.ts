import { PrintfulApiClient } from "@rashpod/printful";
import { createHash } from "node:crypto";
import { WorkerRepository } from "../repository";

export class PrintfulOrderJobHandler {
  constructor(
    private readonly repo: WorkerRepository,
    private readonly client = new PrintfulApiClient(),
  ) {}

  async handleSubmit(input: { orderId: string; storeId: string }) {
    if (!this.repo.getPrintfulFulfillmentOrderContext || !this.repo.updatePrintfulFulfillmentJobs) {
      throw new Error("Printful fulfillment repository methods are not configured");
    }
    const context = await this.repo.getPrintfulFulfillmentOrderContext(input.orderId, input.storeId);
    if (!context) throw new Error("PRINTFUL_FULFILLMENT_ORDER_NOT_FOUND");
    if (context.existingProviderOrderId) {
      return { skipped: true, reason: "PRINTFUL_ORDER_ALREADY_SUBMITTED", providerOrderId: context.existingProviderOrderId };
    }
    if (!context.jobs.length) throw new Error("PRINTFUL_FULFILLMENT_ITEMS_MISSING");

    const payload = {
      external_id: this.externalId(context.orderId, context.storeId),
      recipient: this.recipient(context.recipient),
      items: context.jobs.map((job) => ({
        sync_variant_id: Number(job.providerVariantId),
        quantity: job.quantity,
        retail_price: job.retailPrice,
      })),
    };
    if (payload.items.some((item) => !Number.isFinite(item.sync_variant_id))) {
      throw new Error("PRINTFUL_SYNC_VARIANT_INVALID");
    }

    const jobIds = context.jobs.map((job) => job.id);
    try {
      await this.repo.updatePrintfulFulfillmentJobs(jobIds, {
        providerStatus: "SUBMITTING",
        failureReason: null,
      });
      const response = await this.client.createOrder(payload, context.storeId, true);
      const result = this.record(response.result);
      const providerOrderId = result.id == null ? undefined : String(result.id);
      if (!providerOrderId) throw new Error("PRINTFUL_ORDER_ID_MISSING");
      const providerStatus = String(result.status ?? "PENDING");
      await this.repo.updatePrintfulFulfillmentJobs(jobIds, {
        providerOrderId,
        providerStatus,
        status: "ORDERED",
        failureReason: null,
        providerResponse: result,
      });
      return { submitted: true, orderId: context.orderId, storeId: context.storeId, providerOrderId, providerStatus };
    } catch (error) {
      const message = error instanceof Error ? error.message : "PRINTFUL_ORDER_SUBMISSION_FAILED";
      await this.repo.updatePrintfulFulfillmentJobs(jobIds, {
        providerStatus: "SUBMISSION_FAILED",
        failureReason: message,
      });
      throw error;
    }
  }

  private recipient(input: Record<string, unknown>) {
    const required = ["name", "address1", "city", "countryCode", "postalCode"] as const;
    for (const field of required) {
      if (typeof input[field] !== "string" || !input[field].trim()) {
        throw new Error(`PRINTFUL_RECIPIENT_${field.toUpperCase()}_MISSING`);
      }
    }
    return {
      name: String(input.name),
      address1: String(input.address1),
      ...(input.address2 ? { address2: String(input.address2) } : {}),
      city: String(input.city),
      ...(input.stateCode ? { state_code: String(input.stateCode) } : {}),
      country_code: String(input.countryCode).toUpperCase(),
      zip: String(input.postalCode),
      ...(input.phone ? { phone: String(input.phone) } : {}),
      ...(input.email ? { email: String(input.email) } : {}),
    };
  }

  private record(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }

  private externalId(orderId: string, storeId: string) {
    const digest = createHash("sha256").update(`${orderId}:${storeId}`).digest("hex").slice(0, 24);
    return `rpd_${digest}`;
  }
}
