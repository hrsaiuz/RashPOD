import { WorkerRepository } from "../repository";

export interface TelegramSendPayload {
  chatId?: string;
  text?: string;
  notificationDeliveryId?: string;
  idempotencyKey?: string;
}

export interface TelegramSenderPort {
  send(payload: { chatId: string; text: string }): Promise<{ accepted: boolean; providerRef?: string }>;
}

export class TelegramBotSender implements TelegramSenderPort {
  async send(payload: { chatId: string; text: string }): Promise<{ accepted: boolean; providerRef?: string }> {
    const token = process.env.TELEGRAM_BOT_TOKEN || process.env.Telegram_BOT_TOKEN;
    if (!token) return { accepted: true };
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: payload.chatId, text: payload.text, disable_web_page_preview: true }),
    });
    const raw = await response.text();
    if (!response.ok) throw new Error(`Telegram send failed with status ${response.status}`);
    try {
      const parsed = JSON.parse(raw) as { result?: { message_id?: number } };
      return { accepted: true, providerRef: parsed.result?.message_id == null ? undefined : String(parsed.result.message_id) };
    } catch {
      return { accepted: true, providerRef: raw.slice(0, 128) };
    }
  }
}

export class TelegramJobHandler {
  constructor(private readonly repo: WorkerRepository, private readonly sender: TelegramSenderPort = new TelegramBotSender()) {}

  async handleSendTelegram(payload: TelegramSendPayload) {
    const delivery = payload.notificationDeliveryId && this.repo.getNotificationDelivery ? await this.repo.getNotificationDelivery(payload.notificationDeliveryId) : null;
    const deliveryPayload = delivery?.payloadJson && typeof delivery.payloadJson === "object" ? delivery.payloadJson as TelegramSendPayload : {};
    const resolved = { ...deliveryPayload, ...payload };
    const chatId = resolved.chatId || delivery?.destination || undefined;
    if (!chatId || !resolved.text) throw new Error("Telegram chatId and text are required");
    try {
      const result = await this.sender.send({ chatId, text: resolved.text });
      if (payload.notificationDeliveryId && this.repo.updateNotificationDelivery) {
        await this.repo.updateNotificationDelivery(payload.notificationDeliveryId, { status: result.accepted ? "DELIVERED" : "FAILED", providerRef: result.providerRef, attemptedAt: new Date(), deliveredAt: result.accepted ? new Date() : null });
      }
      return { ok: result.accepted, providerRef: result.providerRef };
    } catch (error) {
      if (payload.notificationDeliveryId && this.repo.updateNotificationDelivery) {
        await this.repo.updateNotificationDelivery(payload.notificationDeliveryId, { status: "FAILED", errorMessage: error instanceof Error ? error.message : "Telegram send failed", attemptedAt: new Date() });
      }
      throw error;
    }
  }
}
