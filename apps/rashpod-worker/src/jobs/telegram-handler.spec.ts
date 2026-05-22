import { TelegramJobHandler } from "./telegram-handler";

describe("TelegramJobHandler", () => {
  it("sends a Telegram message and marks delivery delivered", async () => {
    const delivery = { id: "delivery-1", channel: "TELEGRAM", status: "QUEUED", destination: "123", payloadJson: { text: "Hello" } };
    const repo: any = {
      getNotificationDelivery: jest.fn().mockResolvedValue(delivery),
      updateNotificationDelivery: jest.fn().mockImplementation((_id: string, data: Record<string, unknown>) => Promise.resolve({ ...delivery, ...data })),
    };
    const sender = { send: jest.fn().mockResolvedValue({ accepted: true, providerRef: "42" }) };
    const handler = new TelegramJobHandler(repo, sender);

    const result = await handler.handleSendTelegram({ notificationDeliveryId: "delivery-1" });

    expect(result).toEqual({ ok: true, providerRef: "42" });
    expect(sender.send).toHaveBeenCalledWith({ chatId: "123", text: "Hello" });
    expect(repo.updateNotificationDelivery).toHaveBeenCalledWith("delivery-1", expect.objectContaining({ status: "DELIVERED", providerRef: "42" }));
  });

  it("marks delivery failed when the provider fails", async () => {
    const delivery = { id: "delivery-1", channel: "TELEGRAM", status: "QUEUED", destination: "123", payloadJson: { text: "Hello" } };
    const repo: any = { getNotificationDelivery: jest.fn().mockResolvedValue(delivery), updateNotificationDelivery: jest.fn().mockResolvedValue(delivery) };
    const sender = { send: jest.fn().mockRejectedValue(new Error("telegram down")) };
    const handler = new TelegramJobHandler(repo, sender);

    await expect(handler.handleSendTelegram({ notificationDeliveryId: "delivery-1" })).rejects.toThrow("telegram down");
    expect(repo.updateNotificationDelivery).toHaveBeenCalledWith("delivery-1", expect.objectContaining({ status: "FAILED", errorMessage: "telegram down" }));
  });
});
