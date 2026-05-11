import { Injectable, Logger } from "@nestjs/common";

export interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  isConfigured(): boolean {
    return Boolean(this.apiKey() && this.fromEmail());
  }

  private apiKey(): string | undefined {
    return process.env.ZEPTOMAIL_API_KEY || process.env.ZEPTO_SMTP_PASSWORD;
  }

  private fromEmail(): string | undefined {
    return process.env.ZEPTOMAIL_FROM_EMAIL || process.env.MAIL_FROM_EMAIL || process.env.ZEPTO_SMTP_FROM_EMAIL;
  }

  private fromName(): string {
    return process.env.ZEPTOMAIL_FROM_NAME || process.env.MAIL_FROM_NAME || "RashPOD";
  }

  async send(options: SendEmailOptions): Promise<{ ok: boolean; providerRef?: string; error?: string }> {
    const apiKey = this.apiKey();
    const fromEmail = this.fromEmail();
    if (!apiKey || !fromEmail) {
      this.logger.warn(`Email not sent (mailer not configured): subject="${options.subject}" to=${options.to}`);
      return { ok: false, error: "Mailer not configured" };
    }

    const apiUrl = process.env.ZEPTOMAIL_API_URL || "https://api.zeptomail.com/v1.1/email";
    const body = {
      from: { address: fromEmail, name: this.fromName() },
      to: [{ email_address: { address: options.to, name: options.toName || options.to } }],
      subject: options.subject,
      htmlbody: options.html,
      textbody: options.text ?? stripHtml(options.html),
    };

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: apiKey.startsWith("Zoho-") ? apiKey : `Zoho-enczapikey ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) {
        this.logger.error(`ZeptoMail send failed status=${res.status} body=${text.slice(0, 500)}`);
        return { ok: false, error: `Status ${res.status}` };
      }
      let providerRef: string | undefined;
      try {
        const parsed = JSON.parse(text);
        providerRef = parsed?.data?.[0]?.message_id || parsed?.request_id;
      } catch {/* ignore */}
      return { ok: true, providerRef };
    } catch (err) {
      this.logger.error(`ZeptoMail send error: ${err instanceof Error ? err.message : err}`);
      return { ok: false, error: err instanceof Error ? err.message : "Send failed" };
    }
  }
}

function stripHtml(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, "").trim();
}
