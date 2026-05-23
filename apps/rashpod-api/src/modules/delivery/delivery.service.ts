import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateShipmentDto } from "./dto/create-shipment.dto";
import { DeliveryQuoteDto } from "./dto/delivery-quote.dto";

@Injectable()
export class DeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listOptions(zone?: string) {
    return this.prisma.deliverySetting.findMany({
      where: { isActive: true, ...(zone ? { zone } : {}) },
      orderBy: { updatedAt: "desc" },
    });
  }

  async quote(dto: DeliveryQuoteDto) {
    const options = await this.prisma.deliverySetting.findMany({
      where: {
        isActive: true,
        zone: dto.zone,
        ...(dto.providerType ? { providerType: dto.providerType } : {}),
      },
      orderBy: { updatedAt: "desc" },
    });
    if (!options.length) {
      throw new NotFoundException("No active delivery provider configured for this zone");
    }
    const selected = options[0];
    const threshold = selected.freeDeliveryThreshold ? Number(selected.freeDeliveryThreshold) : null;
    const basePrice = selected.price ? Number(selected.price) : 0;
    const price = threshold != null && dto.subtotal >= threshold ? 0 : basePrice;
    return {
      providerType: selected.providerType,
      providerName: selected.displayName,
      zone: selected.zone,
      etaText: selected.etaText,
      subtotal: dto.subtotal,
      deliveryPrice: price,
      total: dto.subtotal + price,
    };
  }

  async createShipment(actorId: string, dto: CreateShipmentDto) {
    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException("Order not found");
    const providerType = dto.providerType || order.deliveryType;
    if (!providerType) throw new NotFoundException("Delivery provider is not selected for this order");

    const shipmentRef = `SHP-${providerType}-${Date.now()}`;
    const updated = await this.prisma.order.update({
      where: { id: dto.orderId },
      data: {
        deliveryType: providerType,
        notes: [order.notes, `shipmentRef=${shipmentRef}`].filter(Boolean).join(" | "),
      },
    });

    await this.audit.log({
      actorId,
      action: "delivery.create-shipment",
      entityType: "Order",
      entityId: order.id,
      metadata: { providerType, shipmentRef },
    });

    return {
      orderId: order.id,
      providerType,
      shipmentRef,
      status: "CREATED",
      trackingUrl: `https://tracking.rashpod.local/${shipmentRef}`,
      order: updated,
    };
  }

  async getShipment(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException("Order not found");
    const match = order.notes?.match(/shipmentRef=([^|\s]+)/);
    const shipmentRef = match?.[1] || null;
    return {
      orderId: order.id,
      providerType: order.deliveryType,
      shipmentRef,
      status: shipmentRef ? "CREATED" : "NOT_CREATED",
    };
  }

  async setProviderStatus(actorId: string, id: string, isActive: boolean) {
    const result = await this.prisma.deliverySetting.update({ where: { id }, data: { isActive } });
    await this.audit.log({
      actorId,
      action: "delivery-provider.toggle",
      entityType: "DeliverySetting",
      entityId: id,
      metadata: { isActive },
    });
    return result;
  }

  async getPublicShopSettings() {
    const [deliveryOptions, tenant] = await Promise.all([
      this.prisma.deliverySetting.findMany({
        where: { isActive: true },
        orderBy: [{ zone: "asc" }, { providerType: "asc" }],
      }),
      this.prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } }),
    ]);

    const thresholds = deliveryOptions
      .map((row) => (row.freeDeliveryThreshold != null ? Number(row.freeDeliveryThreshold) : null))
      .filter((value): value is number => value != null && value > 0);
    const freeDeliveryThreshold = thresholds.length ? Math.min(...thresholds) : null;

    const pickup = deliveryOptions.find((row) => row.providerType === "PICKUP");
    const pickupMetadata =
      pickup?.metadataJson && typeof pickup.metadataJson === "object"
        ? (pickup.metadataJson as Record<string, unknown>)
        : {};

    return {
      currency: tenant?.defaultCurrency ?? "UZS",
      defaultLocale: tenant?.defaultLocale ?? "uz-Latn",
      freeDeliveryThreshold,
      deliveryOptions: deliveryOptions.map((row) => ({
        id: row.id,
        providerType: row.providerType,
        displayName: row.displayName,
        zone: row.zone,
        price: row.price != null ? Number(row.price) : null,
        freeDeliveryThreshold: row.freeDeliveryThreshold != null ? Number(row.freeDeliveryThreshold) : null,
        etaText: row.etaText,
      })),
      pickup: pickup
        ? {
            displayName: pickup.displayName,
            zone: pickup.zone,
            address: typeof pickupMetadata.address === "string" ? pickupMetadata.address : null,
            hours: typeof pickupMetadata.hours === "string" ? pickupMetadata.hours : pickup.etaText,
          }
        : null,
    };
  }
}
