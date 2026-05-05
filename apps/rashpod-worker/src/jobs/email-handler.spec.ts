import { EmailJobHandler, ZeptoMailSender } from "./email-handler";

describe("EmailJobHandler", () => {
  it("returns success with provider ref from sender", async () => {
    const sender = {
      send: jest.fn().mockResolvedValue({ accepted: true, providerRef: "zepto-123" }),
    };
    const handler = new EmailJobHandler(sender);

    const result = await handler.handleSendEmail({
      to: "designer@test.local",
      subject: "Test",
      html: "<b>hello</b>",
      idempotencyKey: "k1",
    });

    expect(result.ok).toBe(true);
    expect(result.providerRef).toBe("zepto-123");
    expect(sender.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: "designer@test.local", idempotencyKey: "k1" }),
    );
  });

  it("renders worker_queue_alert template into subject/html/text", async () => {
    const sender = {
      send: jest.fn().mockResolvedValue({ accepted: true, providerRef: "zepto-456" }),
    };
    const handler = new EmailJobHandler(sender);

    await handler.handleSendEmail({
      to: "ops@test.local",
      templateKey: "worker_queue_alert",
      variables: {
        breaches: { lagBreached: true, failedRateBreached: true },
        metrics: {
          totals: { pending: 2, processing: 1, failed: 3 },
          rates: { failedRatePercent: 50 },
          lag: { oldestPendingAgeSeconds: 1200 },
        },
        thresholds: { oldestPendingAgeSeconds: 900, failedRatePercent: 20 },
      },
      idempotencyKey: "alert-key",
    });

    expect(sender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ops@test.local",
        templateKey: "worker_queue_alert",
        idempotencyKey: "alert-key",
        subject: expect.stringContaining("RashPOD Queue Alert"),
        html: expect.stringContaining("Queue health threshold breached"),
        text: expect.stringContaining("Failed rate: 50%"),
      }),
    );
  });
});

describe("ZeptoMailSender", () => {
  const prev = {
    apiUrl: process.env.ZEPTOMAIL_API_URL,
    apiKey: process.env.ZEPTOMAIL_API_KEY,
    fromEmail: process.env.ZEPTOMAIL_FROM_EMAIL,
  };

  beforeEach(() => {
    process.env.ZEPTOMAIL_API_URL = "https://zepto.test/send";
    process.env.ZEPTOMAIL_API_KEY = "k";
    process.env.ZEPTOMAIL_FROM_EMAIL = "noreply@test.local";
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env.ZEPTOMAIL_API_URL = prev.apiUrl;
    process.env.ZEPTOMAIL_API_KEY = prev.apiKey;
    process.env.ZEPTOMAIL_FROM_EMAIL = prev.fromEmail;
  });

  it("retries transient failures and succeeds", async () => {
    const sender = new ZeptoMailSender();
    const fetchMock = jest
      .spyOn(global, "fetch" as any)
      .mockResolvedValueOnce({ ok: false, status: 503 } as any)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ request_id: "req-123" }),
      } as any);

    const result = await sender.send({ to: "ops@test.local", subject: "x" });
    expect(result.accepted).toBe(true);
    expect(result.providerRef).toBe("req-123");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fails fast on non-retryable status", async () => {
    const sender = new ZeptoMailSender();
    jest.spyOn(global, "fetch" as any).mockResolvedValueOnce({ ok: false, status: 400 } as any);
    await expect(sender.send({ to: "ops@test.local", subject: "x" })).rejects.toThrow(
      "ZeptoMail send failed with status 400",
    );
  });
});
