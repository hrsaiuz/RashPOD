import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { createHmac, timingSafeEqual } from "crypto";
import { OrdersService } from "../orders/orders.service";
import { FinanceService } from "../finance/finance.service";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly orders?: OrdersService,
    private readonly finance?: FinanceService,
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

  async createClickPayment(orderId: string, customerId?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { payments: true } });
    if (!order) throw new NotFoundException("Order not found");
    if (customerId && order.customerId !== customerId) throw new ForbiddenException("Not your order");
    if (order.status === OrderStatus.PAID || order.status === OrderStatus.IN_PRODUCTION) {
      throw new BadRequestException("Order is already paid");
    }
    const settings = await this.requireClickPaymentSettings();
    const txn = await this.prisma.paymentTransaction.findFirst({
      where: { orderId, provider: "CLICK", status: PaymentStatus.PENDING },
      orderBy: { createdAt: "desc" },
    });
    const attempts = await this.prisma.paymentTransaction.count({ where: { orderId, provider: "CLICK" } });
    const checkoutUrl = this.buildClickCheckoutUrl(order.id, txn?.id, settings);
    const id = txn?.id || (await this.prisma.paymentTransaction.create({
      data: {
        orderId,
        provider: "CLICK",
        providerPaymentId: `click-${order.id}-${attempts + 1}`,
        checkoutUrl,
        attemptNumber: attempts + 1,
        amount: order.total,
        currency: order.currency,
        status: PaymentStatus.PENDING,
        settingsSnapshotJson: this.cleanJson(settings),
      },
    })).id;
    const idempotencyKey = `click:create:${orderId}:${id}`;
    const updated = await this.prisma.paymentTransaction.update({
      where: { id },
      data: { idempotencyKey, checkoutUrl: this.buildClickCheckoutUrl(order.id, id, settings) },
    });
    await this.audit.log({
      actorId: customerId,
      action: txn ? "payment.click.reused-pending" : "payment.created",
      entityType: "PaymentTransaction",
      entityId: id,
      metadata: { orderId, provider: "CLICK", attemptNumber: updated.attemptNumber, mode: settings.mode },
    });
    return {
      paymentId: id,
      provider: "CLICK",
      checkoutUrl: updated.checkoutUrl,
      amount: Number(order.total),
      currency: order.currency,
      idempotencyKey,
      attemptNumber: updated.attemptNumber,
    };
  }

  async getClickSettings() {
    const setting = await this.prisma.platformSetting.findUnique({ where: { key: "click.payment.settings" } });
    return setting?.value ?? {
      enabled: false,
      mode: "TEST",
      merchantId: "",
      serviceId: "",
      secretName: "",
      returnUrl: "",
      webhookPath: "/payments/click/webhook",
      allowedUseCases: ["PRODUCT_ORDER", "FILM_ORDER"],
    };
  }

  async listPayments() {
    const rows = await this.prisma.paymentTransaction.findMany({
      include: { order: { include: { customer: { select: { id: true, email: true, displayName: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map((row) => ({
      id: row.id,
      orderId: row.orderId,
      customerName: row.order.customerName ?? row.order.customer.displayName ?? row.order.customer.email,
      amount: Number(row.amount),
      currency: row.currency,
      method: row.provider,
      status: this.toFinanceStatus(row.status),
      providerRef: row.providerRef,
      attemptNumber: row.attemptNumber,
      createdAt: row.createdAt,
    }));
  }

  async updateClickSettings(actorId: string, dto: Record<string, unknown>) {
    const value = {
      enabled: Boolean(dto.enabled),
      mode: dto.mode === "PRODUCTION" ? "PRODUCTION" : "TEST",
      merchantId: typeof dto.merchantId === "string" ? dto.merchantId : "",
      serviceId: typeof dto.serviceId === "string" ? dto.serviceId : "",
      secretName: typeof dto.secretName === "string" ? dto.secretName : "",
      returnUrl: typeof dto.returnUrl === "string" ? dto.returnUrl : "",
      webhookPath: typeof dto.webhookPath === "string" ? dto.webhookPath : "/payments/click/webhook",
      allowedUseCases: Array.isArray(dto.allowedUseCases) ? dto.allowedUseCases.filter((item) => typeof item === "string") : [],
    };
    const item = await this.prisma.platformSetting.upsert({
      where: { key: "click.payment.settings" },
      create: { key: "click.payment.settings", value: value as Prisma.InputJsonValue },
      update: { value: value as Prisma.InputJsonValue },
    });
    await this.audit.log({
      actorId,
      action: "payment-settings.click.update",
      entityType: "PlatformSetting",
      entityId: item.key,
      metadata: { enabled: value.enabled, mode: value.mode, merchantId: value.merchantId, serviceId: value.serviceId, secretName: value.secretName },
    });
    return item.value;
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
      if (this.orders) {
        await this.orders.confirmPaid(undefined, payment.orderId, payload.providerRef);
      } else {
        await this.prisma.order.update({
          where: { id: payment.orderId },
          data: { status: OrderStatus.PAID },
        });
      }
      await this.finance?.handlePaymentSucceeded(payment.id, undefined, Number(payment.amount), payload.raw);
    } else if (nextStatus === PaymentStatus.FAILED) {
      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.PENDING_PAYMENT },
      });
      await this.finance?.reconcilePayment({ ...payment, status: PaymentStatus.FAILED }, 0, payload.raw);
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

  private async requireClickPaymentSettings() {
    const raw = await this.getClickSettings();
    const settings = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, any> : {};
    const mockEnabled = process.env.CLICK_MOCK_PAYMENTS === "true" || (process.env.NODE_ENV !== "production" && settings.mode === "TEST" && settings.enabled === true);
    if (!settings.enabled && !mockEnabled) {
      throw new ForbiddenException("Click payment is not enabled. Please configure payment settings.");
    }
    if (!mockEnabled && (!settings.merchantId || !settings.serviceId)) {
      throw new ForbiddenException("Click payment settings are incomplete.");
    }
    return {
      enabled: Boolean(settings.enabled || mockEnabled),
      mode: settings.mode === "PRODUCTION" ? "PRODUCTION" : "TEST",
      merchantId: typeof settings.merchantId === "string" ? settings.merchantId : "",
      serviceId: typeof settings.serviceId === "string" ? settings.serviceId : "",
      returnUrl: typeof settings.returnUrl === "string" ? settings.returnUrl : "",
      mock: mockEnabled,
    };
  }

  private buildClickCheckoutUrl(orderId: string, paymentId: string | undefined, settings: { returnUrl?: string; mock?: boolean }) {
    const webUrl = process.env.WEB_URL || process.env.APP_URL || "http://localhost:3000";
    const id = paymentId ?? "pending";
    if (settings.mock) return `${webUrl}/checkout/success?orderId=${encodeURIComponent(orderId)}&paymentId=${encodeURIComponent(id)}`;
    const returnUrl = settings.returnUrl || `${webUrl}/checkout/success`;
    return `${returnUrl}?orderId=${encodeURIComponent(orderId)}&paymentId=${encodeURIComponent(id)}`;
  }

  private toFinanceStatus(status: PaymentStatus) {
    if (status === PaymentStatus.PAID) return "completed";
    if (status === PaymentStatus.FAILED || status === PaymentStatus.CANCELLED) return "failed";
    if (status === PaymentStatus.REFUNDED || status === PaymentStatus.PARTIALLY_REFUNDED) return "refunded";
    return "pending";
  }

  private cleanJson<T>(value: T): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
  }
}
