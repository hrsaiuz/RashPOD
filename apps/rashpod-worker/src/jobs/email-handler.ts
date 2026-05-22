import { renderTemplate } from "./email-templates";
import { WorkerRepository } from "../repository";

export interface SendEmailPayload {
  to: string;
  subject?: string;
  html?: string;
  text?: string;
  templateKey?: string;
  variables?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface EmailSenderPort {
  send(payload: SendEmailPayload): Promise<{ accepted: boolean; providerRef?: string }>;
}

export class ZeptoMailSender implements EmailSenderPort {
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async send(payload: SendEmailPayload): Promise<{ accepted: boolean; providerRef?: string }> {
    const apiUrl = process.env.ZEPTOMAIL_API_URL || "https://api.zeptomail.com/v1.1/email";
    const apiKey = process.env.ZEPTOMAIL_API_KEY;
    const fromEmail = process.env.ZEPTOMAIL_FROM_EMAIL;
    const fromName = process.env.ZEPTOMAIL_FROM_NAME || "RashPOD";
    if (!apiUrl || !apiKey || !fromEmail) {
      return { accepted: true };
    }

    const body = JSON.stringify({
      from: { address: fromEmail, name: fromName },
      to: [{ email_address: { address: payload.to } }],
      subject: payload.subject || payload.templateKey || "RashPOD Notification",
      htmlbody: payload.html,
      textbody: payload.text,
      template_key: payload.templateKey,
      merge_info: payload.variables || {},
    });

    const maxAttempts = 3;
    let attempt = 0;
    let lastStatus = 0;
    while (attempt < maxAttempts) {
      attempt += 1;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Zoho-enczapikey ${apiKey}`,
          "Content-Type": "application/json",
          ...(payload.idempotencyKey ? { "Idempotency-Key": payload.idempotencyKey } : {}),
        },
        body,
      });
      lastStatus = response.status;
      if (response.ok) {
        const raw = await response.text();
        let providerRef = raw.slice(0, 256);
        try {
          const parsed = JSON.parse(raw) as any;
          const maybeRef = parsed?.request_id || parsed?.message_id || parsed?.data?.request_id;
          if (typeof maybeRef === "string" && maybeRef.length > 0) providerRef = maybeRef;
        } catch {
          // Keep raw fallback.
        }
        return { accepted: true, providerRef };
      }
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt >= maxAttempts) {
        break;
      }
      await this.sleep(200 * attempt);
    }
    throw new Error(`ZeptoMail send failed with status ${lastStatus}`);
  }
}

export class EmailJobHandler {
  constructor(private readonly sender: EmailSenderPort = new ZeptoMailSender(), private readonly repo?: WorkerRepository) {}

  async handleSendEmail(payload: SendEmailPayload) {
    const deliveryId = (payload as SendEmailPayload & { notificationDeliveryId?: string }).notificationDeliveryId;
    const delivery = deliveryId && this.repo?.getNotificationDelivery ? await this.repo.getNotificationDelivery(deliveryId) : null;
    const deliveryPayload = delivery?.payloadJson && typeof delivery.payloadJson === "object" ? delivery.payloadJson as SendEmailPayload : {};
    const sourcePayload = { ...deliveryPayload, ...payload };
    const rendered = sourcePayload.templateKey ? renderTemplate(sourcePayload.templateKey, sourcePayload.variables) : null;
    const resolvedPayload: SendEmailPayload = {
      ...sourcePayload,
      subject: sourcePayload.subject || rendered?.subject,
      html: sourcePayload.html || rendered?.html,
      text: sourcePayload.text || rendered?.text,
    };
    try {
      const result = await this.sender.send(resolvedPayload);
      if (deliveryId && this.repo?.updateNotificationDelivery) {
        await this.repo.updateNotificationDelivery(deliveryId, { status: result.accepted ? "DELIVERED" : "FAILED", providerRef: result.providerRef, attemptedAt: new Date(), deliveredAt: result.accepted ? new Date() : null });
      }
      return {
        ok: result.accepted,
        providerRef: result.providerRef,
      };
    } catch (error) {
      if (deliveryId && this.repo?.updateNotificationDelivery) {
        await this.repo.updateNotificationDelivery(deliveryId, { status: "FAILED", errorMessage: error instanceof Error ? error.message : "Email send failed", attemptedAt: new Date() });
      }
      throw error;
    }
  }
}
