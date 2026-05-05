import { Injectable } from "@nestjs/common";
import { ListingStatus, ListingType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async exportListings(actorId: string, input: { type?: "PRODUCT" | "FILM" }) {
    const rows = await this.prisma.commerceListing.findMany({
      where: {
        status: ListingStatus.PUBLISHED,
        ...(input.type ? { type: input.type as ListingType } : {}),
      },
      orderBy: { publishedAt: "desc" },
      take: 500,
    });
    const exportedAt = new Date().toISOString();
    const items = rows.map((r) => ({
      listingId: r.id,
      type: r.type,
      title: r.title,
      description: r.description,
      slug: r.slug,
      price: Number(r.price),
      currency: r.currency,
      publishedAt: r.publishedAt?.toISOString() ?? null,
      imageCount: Array.isArray(r.imagesJson) ? r.imagesJson.length : 0,
    }));
    const result = {
      exportedAt,
      total: items.length,
      channel: "generic-marketplace",
      type: input.type ?? "ALL",
      items,
    };
    await this.audit.log({
      actorId,
      action: "marketplace.export.generate",
      entityType: "MarketplaceExport",
      entityId: exportedAt,
      metadata: { total: items.length, type: input.type ?? "ALL" },
    });
    return result;
  }

  async exportListingsCsv(actorId: string, input: { type?: "PRODUCT" | "FILM" }) {
    const json = await this.exportListings(actorId, input);
    const header = [
      "listingId",
      "type",
      "title",
      "description",
      "slug",
      "price",
      "currency",
      "publishedAt",
      "imageCount",
    ];
    const lines = [header.join(",")];
    for (const item of json.items) {
      const row = [
        item.listingId,
        item.type,
        this.escapeCsv(item.title),
        this.escapeCsv(item.description ?? ""),
        item.slug,
        String(item.price),
        item.currency,
        item.publishedAt ?? "",
        String(item.imageCount),
      ];
      lines.push(row.join(","));
    }
    return {
      exportedAt: json.exportedAt,
      total: json.total,
      csv: lines.join("\n"),
    };
  }

  private escapeCsv(value: string) {
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }
}
