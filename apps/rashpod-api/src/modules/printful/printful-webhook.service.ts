import { ForbiddenException, Injectable } from "@nestjs/common";
import { PodProviderType, Prisma, ProductionJobStatus } from "@prisma/client";
import { createHmac, timingSafeEqual } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";

type JsonRecord = Record<string, unknown>;

@Injectable()
export class PrintfulWebhookService {
  constructor(private readonly prisma: PrismaService) {}

  async handleSignedWebhook(rawBody: Buffer, signature?: string, publicKey?: string) {
    if (!Buffer.isBuffer(rawBody)) throw new ForbiddenException("PRINTFUL_WEBHOOK_RAW_BODY_REQUIRED");
    const secret = this.webhookSecret(publicKey);
    if (!secret) throw new ForbiddenException("PRINTFUL_WEBHOOK_SECRET_MISSING");
    if (!signature || !this.validSignature(rawBody, signature, secret)) {
      throw new ForbiddenException("INVALID_PRINTFUL_WEBHOOK_SIGNATURE");
    }
    let body: JsonRecord;
    try {
      body = JSON.parse(rawBody.toString("utf8")) as JsonRecord;
    } catch {
      throw new ForbiddenException("INVALID_PRINTFUL_WEBHOOK_BODY");
    }
    return this.process(body, { signatureValid: true, publicKey });
  }

  async handleWebhook(body: JsonRecord, _signature?: string) {
    if (process.env.PRINTFUL_WEBHOOK_SECRET || process.env.PRINTFUL_WEBHOOK_SECRETS_JSON) {
      return { accepted: false, reason: "SIGNED_PRINTFUL_ENDPOINT_REQUIRED" };
    }
    return this.process(body, { signatureValid: undefined });
  }

  private async process(body: JsonRecord, verification: { signatureValid?: boolean; publicKey?: string }) {
    const eventType = String(body.type ?? body.event ?? "unknown");
    const data = this.record(body.data);
    const order = this.record(data.order);
    const shipment = this.record(data.shipment);
    const providerOrderId = this.id(order.id ?? shipment.order_id ?? data.order_id);
    const storeId = this.id(body.store_id ?? body.store);

    if (providerOrderId) {
      const jobs = await this.prisma.productionJob.findMany({
        where: { providerType: PodProviderType.PRINTFUL, providerOrderId },
      });
      const update = this.statusUpdate(eventType, data, shipment);
      for (const job of jobs) {
        const metadata = this.record(job.providerPayloadSnapshotJson);
        if (storeId && metadata.providerStoreId && String(metadata.providerStoreId) !== storeId) continue;
        await this.prisma.productionJob.update({
          where: { id: job.id },
          data: {
            providerStatus: update.providerStatus,
            status: update.status,
            failureReason: update.failureReason,
            deliveryTrackingRef: update.trackingRef ?? undefined,
            providerPayloadSnapshotJson: {
              ...metadata,
              lastWebhook: {
                type: eventType,
                occurredAt: body.occurred_at ?? body.created ?? new Date().toISOString(),
                signatureValid: verification.signatureValid,
                publicKey: verification.publicKey ?? null,
              },
            } as Prisma.InputJsonValue,
          },
        });
      }
      if ((eventType === "shipment_sent" || eventType === "package_shipped") && jobs.length) {
        await this.prisma.order.updateMany({ where: { id: jobs[0].orderId }, data: { status: "SHIPPED" } });
      }
      if ((eventType === "shipment_delivered" || eventType === "package_delivered") && jobs.length) {
        await this.prisma.order.updateMany({ where: { id: jobs[0].orderId }, data: { status: "DELIVERED" } });
      }
    }

    const syncProductId = this.id(data.sync_product_id ?? data.id);
    if (syncProductId) {
      const publications = await this.prisma.marketplacePublication.findMany({
        where: { provider: "PRINTFUL", providerSyncProductId: syncProductId },
        take: 20,
      });
      for (const publication of publications) {
        const status = eventType.includes("failed") ? "FAILED" : eventType.includes("updated") || eventType.includes("synced") ? "PUBLISHED" : publication.status;
        await this.prisma.marketplacePublication.update({
          where: { id: publication.id },
          data: {
            status,
            lastSyncedAt: new Date(),
            metadataJson: {
              ...this.record(publication.metadataJson),
              lastWebhookEvent: eventType,
              webhookSignatureValid: verification.signatureValid,
            },
          },
        });
      }
    }

    return { accepted: true, eventType, signatureValid: verification.signatureValid, providerOrderId };
  }

  private statusUpdate(eventType: string, data: JsonRecord, shipment: JsonRecord) {
    if (eventType === "order_failed") {
      return {
        providerStatus: "failed",
        status: ProductionJobStatus.BLOCKED,
        failureReason: String(data.reason ?? "Printful order failed"),
        trackingRef: null,
      };
    }
    if (eventType === "order_canceled") {
      return { providerStatus: "canceled", status: ProductionJobStatus.CANCELED, failureReason: null, trackingRef: null };
    }
    if (eventType === "shipment_sent" || eventType === "package_shipped") {
      return {
        providerStatus: "shipped",
        status: ProductionJobStatus.OUT_FOR_DELIVERY,
        failureReason: null,
        trackingRef: this.id(shipment.tracking_number ?? shipment.tracking_url),
      };
    }
    if (eventType === "shipment_delivered" || eventType === "package_delivered") {
      return { providerStatus: "delivered", status: ProductionJobStatus.DELIVERED, failureReason: null, trackingRef: null };
    }
    if (eventType === "shipment_returned" || eventType === "package_returned") {
      return {
        providerStatus: "returned",
        status: ProductionJobStatus.BLOCKED,
        failureReason: String(data.reason ?? "Printful shipment was returned"),
        trackingRef: this.id(shipment.tracking_number ?? shipment.tracking_url),
      };
    }
    if (eventType === "order_remove_hold") {
      return { providerStatus: "pending", status: ProductionJobStatus.ORDERED, failureReason: null, trackingRef: null };
    }
    if (eventType.includes("hold")) {
      return { providerStatus: eventType, status: ProductionJobStatus.BLOCKED, failureReason: String(data.reason ?? eventType), trackingRef: null };
    }
    const providerOrderStatus = String(this.record(data.order).status ?? eventType);
    const status = providerOrderStatus === "inprocess"
      ? ProductionJobStatus.IN_PRODUCTION
      : providerOrderStatus === "fulfilled"
        ? ProductionJobStatus.READY_FOR_DELIVERY
        : undefined;
    return {
      providerStatus: providerOrderStatus,
      status,
      failureReason: null,
      trackingRef: null,
    };
  }

  private validSignature(rawBody: Buffer, provided: string, secretHex: string) {
    if (!/^[0-9a-f]+$/i.test(secretHex) || !/^[0-9a-f]+$/i.test(provided)) return false;
    const expected = createHmac("sha256", Buffer.from(secretHex, "hex")).update(rawBody).digest();
    const actual = Buffer.from(provided, "hex");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private webhookSecret(publicKey?: string) {
    const secretMapJson = process.env.PRINTFUL_WEBHOOK_SECRETS_JSON;
    if (!secretMapJson) return process.env.PRINTFUL_WEBHOOK_SECRET;
    if (!publicKey) throw new ForbiddenException("PRINTFUL_WEBHOOK_PUBLIC_KEY_MISSING");
    try {
      const parsed = JSON.parse(secretMapJson) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("invalid map");
      }
      const secret = (parsed as Record<string, unknown>)[publicKey];
      if (typeof secret !== "string" || !secret) {
        throw new ForbiddenException("PRINTFUL_WEBHOOK_PUBLIC_KEY_UNKNOWN");
      }
      return secret;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new ForbiddenException("PRINTFUL_WEBHOOK_SECRETS_INVALID");
    }
  }

  private record(value: unknown): JsonRecord {
    return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
  }

  private id(value: unknown) {
    return value == null || value === "" ? undefined : String(value);
  }
}
