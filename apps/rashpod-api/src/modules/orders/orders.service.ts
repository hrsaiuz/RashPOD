import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { OrderStatus, PaymentStatus, ProductionJobStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AddCartItemDto } from "./dto/add-cart-item.dto";
import { CreateOrderDto } from "./dto/create-order.dto";

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async ensureCart(customerId: string) {
    const existing = await this.prisma.cart.findUnique({ where: { customerId } });
    if (existing) return existing;
    return this.prisma.cart.create({ data: { customerId } });
  }

  private async resolveDeliveryFee(subtotal: number, deliveryType?: string, deliveryZone?: string) {
    const candidates = await this.prisma.deliverySetting.findMany({
      where: {
        isActive: true,
        ...(deliveryType ? { providerType: deliveryType } : {}),
        ...(deliveryZone ? { zone: deliveryZone } : {}),
      },
      orderBy: { updatedAt: "desc" },
    });
    const selected = candidates[0];
    if (!selected) return { deliveryFee: 0, resolvedDeliveryType: deliveryType, resolvedDeliveryZone: deliveryZone };
    const threshold = selected.freeDeliveryThreshold ? Number(selected.freeDeliveryThreshold) : null;
    const price = selected.price ? Number(selected.price) : 0;
    const deliveryFee = threshold != null && subtotal >= threshold ? 0 : price;
    return {
      deliveryFee,
      resolvedDeliveryType: selected.providerType,
      resolvedDeliveryZone: selected.zone,
    };
  }

  private async assertFilmCheckoutAllowed(items: Array<{ listing: { id: string; type: string; designAssetId: string } }>) {
    const filmItems = items.filter((item) => item.listing.type === "FILM");
    if (!filmItems.length) return;
    const filmSettings = await this.prisma.filmSaleSettings.findFirst();
    if (!filmSettings?.enableFilmSalesGlobally) {
      throw new ForbiddenException("Film checkout is currently disabled");
    }
    const designIds = [...new Set(filmItems.map((i) => i.listing.designAssetId))];
    const rights = await this.prisma.commercialRights.findMany({
      where: { designAssetId: { in: designIds } },
    });
    const rightsByDesign = new Map(rights.map((r) => [r.designAssetId, r]));
    for (const item of filmItems) {
      const r = rightsByDesign.get(item.listing.designAssetId);
      if (!r?.allowFilmSales || r.filmConsentRevokedAt) {
        throw new ForbiddenException(`Film-sale rights are not valid for listing ${item.listing.id}`);
      }
    }
  }

  async addCartItem(customerId: string, dto: AddCartItemDto) {
    const cart = await this.ensureCart(customerId);
    const listing = await this.prisma.commerceListing.findUnique({ where: { id: dto.listingId } });
    if (!listing) throw new NotFoundException("Listing not found");
    const existing = await this.prisma.cartItem.findFirst({
      where: { cartId: cart.id, listingId: dto.listingId },
    });
    if (existing) {
      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + dto.quantity },
      });
    }
    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        listingId: dto.listingId,
        quantity: dto.quantity,
        unitPrice: listing.price,
      },
    });
  }

  async getCart(customerId: string) {
    const cart = await this.ensureCart(customerId);
    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: { listing: true },
      orderBy: { createdAt: "desc" },
    });
    const subtotal = items.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);
    return { cart, items, subtotal };
  }

  async removeCartItem(customerId: string, itemId: string) {
    const cart = await this.ensureCart(customerId);
    const item = await this.prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!item || item.cartId !== cart.id) throw new ForbiddenException("Not your cart item");
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return { ok: true };
  }

  async updateCartItem(customerId: string, itemId: string, quantity: number) {
    const cart = await this.ensureCart(customerId);
    const item = await this.prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!item || item.cartId !== cart.id) throw new ForbiddenException("Not your cart item");
    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  async createOrder(customerId: string, dto: CreateOrderDto) {
    const cart = await this.ensureCart(customerId);
    const items = await this.prisma.cartItem.findMany({ where: { cartId: cart.id }, include: { listing: true } });
    if (!items.length) throw new ForbiddenException("Cart is empty");
    await this.assertFilmCheckoutAllowed(items);
    const subtotal = items.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);
    const { deliveryFee, resolvedDeliveryType, resolvedDeliveryZone } = await this.resolveDeliveryFee(
      subtotal,
      dto.deliveryType,
      dto.deliveryZone,
    );
    const total = subtotal + deliveryFee;

    const order = await this.prisma.order.create({
      data: {
        customerId,
        subtotal,
        deliveryFee,
        total,
        deliveryType: resolvedDeliveryType,
        deliveryZone: resolvedDeliveryZone,
        notes: dto.notes,
        status: OrderStatus.PENDING_PAYMENT,
      },
    });

    for (const item of items) {
      const orderItem = await this.prisma.orderItem.create({
        data: {
          orderId: order.id,
          listingId: item.listingId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: Number(item.unitPrice) * item.quantity,
        },
      });
      await this.prisma.productionJob.create({
        data: {
          orderId: order.id,
          orderItemId: orderItem.id,
          queueType: item.listing.type === "FILM" ? "FILM" : "POD",
          status: ProductionJobStatus.ORDERED,
        },
      });
    }

    await this.prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        provider: "CLICK",
        amount: total,
        status: PaymentStatus.PENDING,
      },
    });

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await this.audit.log({
      actorId: customerId,
      action: "order.create",
      entityType: "Order",
      entityId: order.id,
      metadata: { itemCount: items.length, total },
    });
    return order;
  }

  listOwnOrders(customerId: string) {
    return this.prisma.order.findMany({ where: { customerId }, orderBy: { createdAt: "desc" } });
  }

  listAllOrders() {
    return this.prisma.order.findMany({
      include: { customer: { select: { id: true, email: true, displayName: true } }, payments: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async getOrder(customerId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { listing: true } }, payments: true, productionJobs: true },
    });
    if (!order) throw new NotFoundException("Order not found");
    if (order.customerId !== customerId) throw new ForbiddenException("Not your order");
    return order;
  }

  async markPaid(actorId: string, orderId: string, providerRef?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException("Order not found");
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PAID },
    });
    await this.prisma.paymentTransaction.updateMany({
      where: { orderId, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.PAID, providerRef },
    });
    await this.audit.log({
      actorId,
      action: "order.mark-paid",
      entityType: "Order",
      entityId: orderId,
      metadata: { providerRef },
    });
    return updated;
  }

  async cancelOrder(customerId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException("Order not found");
    if (order.customerId !== customerId) throw new ForbiddenException("Not your order");
    if (order.status === OrderStatus.PAID || order.status === OrderStatus.IN_PRODUCTION) {
      throw new ForbiddenException("Paid or in-production orders cannot be cancelled");
    }
    if (order.status === OrderStatus.CANCELLED) return order;
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
    });
    await this.prisma.paymentTransaction.updateMany({
      where: { orderId, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.CANCELLED },
    });
    await this.audit.log({
      actorId: customerId,
      action: "order.cancel",
      entityType: "Order",
      entityId: orderId,
    });
    return updated;
  }
}
