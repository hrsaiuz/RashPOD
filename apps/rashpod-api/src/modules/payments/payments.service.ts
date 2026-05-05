import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { OrderStatus, PaymentStatus, Prisma, ProductionJobStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { createHmac, timingSafeEqual } from "crypto";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  verifyClickWebhookSignature(
    payload: { paymentId: string; status: "PAID" | "FAILED"; providerRef?: string },
    signature?: string,
    timestamp?: string,
  ) {
    const secret = process.env.CLICK_WEBHOOK_SECRET;
    if (!secret) return true;
    if (!signature || !timestamp) {
      throw new ForbiddenException("Missing Click webhook signature headers");
    }
    const ts = Number(timestamp);
    if (!Number.isFinite(ts)) {
      throw new ForbiddenException("Invalid Click webhook timestamp");
    }
    const skewMs = Math.abs(Date.now() - ts * 1000);
    if (skewMs > 5 * 60 * 1000) {
      throw new ForbiddenException("Stale Click webhook timestamp");
    }
    const base = `${timestamp}.${payload.paymentId}.${payload.status}.${payload.providerRef || ""}`;
    const expected = createHmac("sha256", secret).update(base).digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new ForbiddenException("Invalid Click webhook signature");
    }
    return true;
  }

  async createClickPayment(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException("Order not found");
    const txn = await this.prisma.paymentTransaction.findFirst({
      where: { orderId, provider: "CLICK", status: PaymentStatus.PENDING },
      orderBy: { createdAt: "desc" },
    });
    const id = txn?.id || (await this.prisma.paymentTransaction.create({
      data: {
        orderId,
        provider: "CLICK",
        amount: order.total,
        status: PaymentStatus.PENDING,
      },
    })).id;
    const idempotencyKey = `click:create:${orderId}:${id}`;
    await this.prisma.paymentTransaction.update({
      where: { id },
      data: { idempotencyKey },
    });
    return {
      paymentId: id,
      provider: "CLICK",
      checkoutUrl: `${process.env.APP_URL || "http://localhost:3000"}/checkout?paymentId=${id}`,
      amount: Number(order.total),
      currency: order.currency,
      idempotencyKey,
    };
  }

  async clickWebhook(payload: { paymentId: string; status: "PAID" | "FAILED"; providerRef?: string; raw?: Record<string, unknown> }) {
    const webhookIdempotencyKey = payload.providerRef ? `click:webhook:${payload.providerRef}` : null;
    if (webhookIdempotencyKey) {
      const existingByRef = await this.prisma.paymentTransaction.findFirst({
        where: { provider: "CLICK", idempotencyKey: webhookIdempotencyKey },
        orderBy: { createdAt: "desc" },
      });
      if (existingByRef && existingByRef.id !== payload.paymentId) {
        await this.audit.log({
          action: "payment.click.webhook.duplicate-provider-ref",
          entityType: "PaymentTransaction",
          entityId: existingByRef.id,
          metadata: { providerRef: payload.providerRef, incomingPaymentId: payload.paymentId },
        });
        return existingByRef;
      }
    }

    const payment = await this.prisma.paymentTransaction.findUnique({ where: { id: payload.paymentId } });
    if (!payment) throw new NotFoundException("Payment not found");
    const nextStatus = payload.status === "PAID" ? PaymentStatus.PAID : PaymentStatus.FAILED;
    const terminalStatuses: PaymentStatus[] = [
      PaymentStatus.PAID,
      PaymentStatus.FAILED,
      PaymentStatus.CANCELLED,
      PaymentStatus.REFUNDED,
    ];
    const alreadyTerminal = terminalStatuses.includes(payment.status);
    if (alreadyTerminal && payment.status === nextStatus) {
      await this.audit.log({
        action: "payment.click.webhook.duplicate",
        entityType: "PaymentTransaction",
        entityId: payment.id,
        metadata: { providerRef: payload.providerRef, status: nextStatus },
      });
      return payment;
    }
    if (alreadyTerminal && payment.status !== nextStatus) {
      await this.audit.log({
        action: "payment.click.webhook.conflict",
        entityType: "PaymentTransaction",
        entityId: payment.id,
        metadata: { currentStatus: payment.status, incomingStatus: nextStatus, providerRef: payload.providerRef },
      });
      return payment;
    }
    const updated = await this.prisma.paymentTransaction.update({
      where: { id: payload.paymentId },
      data: {
        status: nextStatus,
        providerRef: payload.providerRef,
        rawPayloadJson: (payload.raw || {}) as Prisma.InputJsonValue,
        idempotencyKey: webhookIdempotencyKey ?? payment.idempotencyKey,
      },
    });
    if (nextStatus === PaymentStatus.PAID) {
      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.PAID },
      });
      await this.prisma.productionJob.updateMany({
        where: { orderId: payment.orderId, status: ProductionJobStatus.ORDERED },
        data: { status: ProductionJobStatus.FILE_CHECK },
      });
    } else if (nextStatus === PaymentStatus.FAILED) {
      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.PENDING_PAYMENT },
      });
    }
    await this.audit.log({
      action: "payment.click.webhook",
      entityType: "PaymentTransaction",
      entityId: payment.id,
      metadata: { status: nextStatus, providerRef: payload.providerRef },
    });
    return updated;
  }

  getPayment(id: string) {
    return this.prisma.paymentTransaction.findUnique({ where: { id } });
  }
}
