import { PaymentStatus } from "@prisma/client";
import { PaymentsService } from "../src/modules/payments/payments.service";
import { ForbiddenException } from "@nestjs/common";
import { createHmac } from "crypto";

describe("PaymentsService reconciliation", () => {
  it("treats duplicate terminal webhook as idempotent", async () => {
    const payment = { id: "p1", orderId: "o1", status: PaymentStatus.PAID, idempotencyKey: "k1" };
    const prisma: any = {
      paymentTransaction: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(payment),
      },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new PaymentsService(prisma, audit);

    const result = await service.clickWebhook({ paymentId: "p1", status: "PAID", providerRef: "r1" });

    expect(result).toBe(payment);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "payment.click.webhook.duplicate", entityId: "p1" }),
    );
  });

  it("marks payment paid and hands paid orders to production", async () => {
    const payment = { id: "p2", orderId: "o2", status: PaymentStatus.PENDING, idempotencyKey: null };
    const prisma: any = {
      paymentTransaction: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(payment),
        update: jest.fn().mockResolvedValue({ ...payment, status: PaymentStatus.PAID }),
      },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as any;
    const orders = { confirmPaid: jest.fn().mockResolvedValue({ id: "o2" }) } as any;
    const service = new PaymentsService(prisma, audit, orders);

    await service.clickWebhook({ paymentId: "p2", status: "PAID", providerRef: "ref-22" });

    expect(orders.confirmPaid).toHaveBeenCalledWith(undefined, "o2", "ref-22");
  });

  it("ignores conflicting terminal transition and logs conflict", async () => {
    const payment = { id: "p3", orderId: "o3", status: PaymentStatus.PAID, idempotencyKey: "k3" };
    const prisma: any = {
      paymentTransaction: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(payment),
      },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new PaymentsService(prisma, audit);

    const result = await service.clickWebhook({ paymentId: "p3", status: "FAILED", providerRef: "r3" });

    expect(result).toBe(payment);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "payment.click.webhook.conflict", entityId: "p3" }),
    );
  });

  it("deduplicates webhook by providerRef across payment ids", async () => {
    const existing = { id: "p-existing", orderId: "o-existing", status: PaymentStatus.PAID, idempotencyKey: "click:webhook:ref-1" };
    const prisma: any = {
      paymentTransaction: {
        findFirst: jest.fn().mockResolvedValue(existing),
        findUnique: jest.fn(),
      },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new PaymentsService(prisma, audit);

    const result = await service.clickWebhook({ paymentId: "p-other", status: "PAID", providerRef: "ref-1" });
    expect(result).toBe(existing);
    expect(prisma.paymentTransaction.findUnique).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "payment.click.webhook.duplicate-provider-ref",
        entityId: "p-existing",
      }),
    );
  });

  it("blocks Click payment creation when settings are disabled", async () => {
    const prisma: any = {
      order: { findUnique: jest.fn().mockResolvedValue({ id: "o4", customerId: "cust-1", status: "PENDING_PAYMENT", payments: [], total: 100, currency: "UZS" }) },
      platformSetting: { findUnique: jest.fn().mockResolvedValue({ valueJson: { enabled: false } }) },
    };
    const service = new PaymentsService(prisma, { log: jest.fn() } as any);

    await expect(service.createClickPayment("o4", "cust-1")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("verifies click webhook signature when secret is configured", async () => {
    const previous = process.env.CLICK_WEBHOOK_SECRET;
    process.env.CLICK_WEBHOOK_SECRET = "test-secret";
    const prisma: any = { paymentTransaction: { findFirst: jest.fn(), findUnique: jest.fn() } };
    const service = new PaymentsService(prisma, { log: jest.fn() } as any);
    const payload = { paymentId: "p1", status: "PAID" as const, providerRef: "r1" };
    const timestamp = `${Math.floor(Date.now() / 1000)}`;
    const signature = createHmac("sha256", "test-secret")
      .update(`${timestamp}.${payload.paymentId}.${payload.status}.${payload.providerRef}`)
      .digest("hex");

    expect(service.verifyClickWebhookSignature(payload, signature, timestamp)).toBe(true);
    expect(() => service.verifyClickWebhookSignature(payload, "bad", timestamp)).toThrow(ForbiddenException);
    process.env.CLICK_WEBHOOK_SECRET = previous;
  });
});
