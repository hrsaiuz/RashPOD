import { createHmac } from "node:crypto";
import { PrintfulWebhookService } from "../src/modules/printful/printful-webhook.service";

describe("PrintfulWebhookService", () => {
  const previousSecret = process.env.PRINTFUL_WEBHOOK_SECRET;
  const previousSecretsJson = process.env.PRINTFUL_WEBHOOK_SECRETS_JSON;

  afterEach(() => {
    if (previousSecret == null) delete process.env.PRINTFUL_WEBHOOK_SECRET;
    else process.env.PRINTFUL_WEBHOOK_SECRET = previousSecret;
    if (previousSecretsJson == null) delete process.env.PRINTFUL_WEBHOOK_SECRETS_JSON;
    else process.env.PRINTFUL_WEBHOOK_SECRETS_JSON = previousSecretsJson;
  });

  it("validates the raw-body HMAC and moves shipped provider jobs forward", async () => {
    const secretHex = "00112233445566778899aabbccddeeff";
    process.env.PRINTFUL_WEBHOOK_SECRET = secretHex;
    const body = Buffer.from(JSON.stringify({
      type: "shipment_sent",
      occurred_at: "2026-07-26T12:00:00Z",
      store_id: 22,
      data: {
        shipment: { order_id: 707, tracking_number: "TRACK-1" },
      },
    }));
    const signature = createHmac("sha256", Buffer.from(secretHex, "hex")).update(body).digest("hex");
    const prisma: any = {
      productionJob: {
        findMany: jest.fn().mockResolvedValue([{
          id: "job-1",
          orderId: "order-1",
          providerPayloadSnapshotJson: { providerStoreId: "22" },
        }]),
        update: jest.fn().mockResolvedValue({ id: "job-1" }),
      },
      order: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      marketplacePublication: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
    };

    const result = await new PrintfulWebhookService(prisma).handleSignedWebhook(body, signature, "public-key");

    expect(result).toMatchObject({ accepted: true, eventType: "shipment_sent", providerOrderId: "707" });
    expect(prisma.productionJob.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "job-1" },
      data: expect.objectContaining({
        providerStatus: "shipped",
        status: "OUT_FOR_DELIVERY",
        deliveryTrackingRef: "TRACK-1",
      }),
    }));
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { status: "SHIPPED" },
    });
  });

  it("rejects a webhook with an invalid signature", async () => {
    process.env.PRINTFUL_WEBHOOK_SECRET = "00112233445566778899aabbccddeeff";
    const service = new PrintfulWebhookService({} as any);

    await expect(service.handleSignedWebhook(Buffer.from("{}"), "deadbeef"))
      .rejects.toThrow("INVALID_PRINTFUL_WEBHOOK_SIGNATURE");
  });

  it("selects the correct per-configuration secret by webhook public key", async () => {
    delete process.env.PRINTFUL_WEBHOOK_SECRET;
    const publicKey = "store-22-public-key";
    const secretHex = "ffeeddccbbaa99887766554433221100";
    process.env.PRINTFUL_WEBHOOK_SECRETS_JSON = JSON.stringify({
      "store-11-public-key": "00112233445566778899aabbccddeeff",
      [publicKey]: secretHex,
    });
    const body = Buffer.from(JSON.stringify({ type: "order_created", store_id: 22, data: {} }));
    const signature = createHmac("sha256", Buffer.from(secretHex, "hex")).update(body).digest("hex");

    await expect(new PrintfulWebhookService({} as any).handleSignedWebhook(body, signature, publicKey))
      .resolves.toMatchObject({ accepted: true, eventType: "order_created", signatureValid: true });
  });

  it("rejects an unknown public key when a multi-store secret map is configured", async () => {
    delete process.env.PRINTFUL_WEBHOOK_SECRET;
    process.env.PRINTFUL_WEBHOOK_SECRETS_JSON = JSON.stringify({
      "known-public-key": "00112233445566778899aabbccddeeff",
    });

    await expect(new PrintfulWebhookService({} as any).handleSignedWebhook(Buffer.from("{}"), "deadbeef", "unknown"))
      .rejects.toThrow("PRINTFUL_WEBHOOK_PUBLIC_KEY_UNKNOWN");
  });
});
