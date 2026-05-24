import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class PrintfulWebhookService {
  constructor(private readonly prisma: PrismaService) {}

  async handleWebhook(body: Record<string, unknown>, signature?: string) {
    const secret = process.env.PRINTFUL_WEBHOOK_SECRET;
    const signatureValid = secret ? signature === secret : undefined;
    if (signatureValid === false) return { accepted: false, reason: "INVALID_SIGNATURE" };

    const eventType = String(body.type ?? body.event ?? "unknown");
    const data = body.data && typeof body.data === "object" ? (body.data as Record<string, unknown>) : {};
    const syncProductId = data.sync_product_id ?? data.id;
    if (syncProductId != null) {
      const publications = await this.prisma.marketplacePublication.findMany({
        where: { provider: "PRINTFUL", providerSyncProductId: String(syncProductId) },
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
              ...(typeof publication.metadataJson === "object" && publication.metadataJson ? (publication.metadataJson as Record<string, unknown>) : {}),
              lastWebhookEvent: eventType,
            },
          },
        });
      }
    }

    return { accepted: true, eventType, signatureValid };
  }
}
