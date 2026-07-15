import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { DesignStatus, DesignStoryStatus, ListingStatus, ListingType, OrderStatus, PaymentStatus, Prisma, ProductionJobStatus, SupportMessageVisibility, SupportPriority, SupportRequestStatus, UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { PaymentsService } from "../payments/payments.service";
import { SupportRequestDto, UpdateCustomerProfileDto, UpdateDesignerProfileDto, UpdateStoryEngagementDto } from "./dto/self-service.dto";
import { AddWishlistItemDto, CreateCustomerAddressDto, UpdateCustomerAddressDto } from "./dto/customer-address.dto";

type CustomerStatus =
  | "PAYMENT_PENDING"
  | "PAYMENT_FAILED"
  | "ORDER_CONFIRMED"
  | "PREPARING"
  | "IN_PRODUCTION"
  | "QUALITY_CHECK"
  | "READY_FOR_PICKUP"
  | "READY_FOR_DELIVERY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELED";

@Injectable()
export class SelfServiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly payments: PaymentsService,
  ) {}

  async customerDashboard(customerId: string) {
    const [orders, wishlistCount] = await Promise.all([
      this.prisma.order.findMany({
        where: { customerId },
        include: { items: true, payments: { orderBy: { createdAt: "desc" } }, productionJobs: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      this.prisma.wishlistItem.count({ where: { userId: customerId } }),
    ]);
    const mapped = orders.map((order) => this.toCustomerOrderSummary(order));
    return {
      activeOrders: mapped.filter((order) => !["DELIVERED", "COMPLETED", "CANCELED"].includes(order.customerStatus)).length,
      unpaidOrders: mapped.filter((order) => order.customerStatus === "PAYMENT_PENDING" || order.customerStatus === "PAYMENT_FAILED").length,
      readyOrders: mapped.filter((order) => order.customerStatus === "READY_FOR_PICKUP" || order.customerStatus === "READY_FOR_DELIVERY").length,
      wishlistCount,
      productionSummary: mapped.reduce<Record<string, number>>((acc, order) => {
        acc[order.customerStatus] = (acc[order.customerStatus] ?? 0) + 1;
        return acc;
      }, {}),
      recentOrders: mapped.slice(0, 5),
      support: { href: "/dashboard/customer/support", label: "Contact support" },
    };
  }

  async customerOrders(customerId: string) {
    const orders = await this.prisma.order.findMany({
      where: { customerId },
      include: { items: true, payments: { orderBy: { createdAt: "desc" } }, productionJobs: true },
      orderBy: { createdAt: "desc" },
    });
    return orders.map((order) => this.toCustomerOrderSummary(order));
  }

  async customerOrder(customerId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: { orderBy: { createdAt: "desc" } }, productionJobs: { orderBy: { createdAt: "asc" } } },
    });
    if (!order) throw new NotFoundException("Order not found");
    if (order.customerId !== customerId) throw new ForbiddenException("Not your order");
    return this.toCustomerOrderDetail(order);
  }

  async retryCustomerPayment(customerId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { payments: true } });
    if (!order) throw new NotFoundException("Order not found");
    if (order.customerId !== customerId) throw new ForbiddenException("Not your order");
    const retry = this.paymentRetryState(order);
    if (!retry.canRetryPayment) throw new BadRequestException(retry.paymentRetryDisabledReason ?? "Payment retry is not available");
    return this.payments.createClickPayment(orderId, customerId);
  }

  async createCustomerSupportRequest(customerId: string, orderId: string, dto: SupportRequestDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException("Order not found");
    if (order.customerId !== customerId) throw new ForbiddenException("Not your order");
    return this.createSupportRequest(customerId, UserRole.CUSTOMER, dto, { orderId });
  }

  async customerProfile(customerId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: customerId }, include: { preferences: true } });
    if (!user) throw new NotFoundException("Customer not found");
    const prefs = this.objectJson(user.preferences?.notificationJson);
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      phone: this.stringFrom(prefs.phone),
      defaultDeliveryAddress: this.stringFrom(prefs.defaultDeliveryAddress),
      language: this.stringFrom(prefs.language) ?? "en",
    };
  }

  async updateCustomerProfile(customerId: string, dto: UpdateCustomerProfileDto) {
    const updated = await this.prisma.user.update({
      where: { id: customerId },
      data: {
        ...(dto.displayName ? { displayName: dto.displayName.trim() } : {}),
        preferences: {
          upsert: {
            create: { notificationJson: this.cleanJson({ phone: dto.phone, defaultDeliveryAddress: dto.defaultDeliveryAddress, language: dto.language }) },
            update: { notificationJson: this.cleanJson({ phone: dto.phone, defaultDeliveryAddress: dto.defaultDeliveryAddress, language: dto.language }) },
          },
        },
      },
      include: { preferences: true },
    });
    await this.audit.log({ actorId: customerId, action: "customer.profile.updated", entityType: "User", entityId: customerId });
    return this.customerProfile(updated.id);
  }

  async listCustomerAddresses(customerId: string) {
    return this.prisma.customerAddress.findMany({
      where: { userId: customerId },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });
  }

  async createCustomerAddress(customerId: string, dto: CreateCustomerAddressDto) {
    if (dto.isDefault) {
      await this.prisma.customerAddress.updateMany({ where: { userId: customerId }, data: { isDefault: false } });
    }
    const hasDefault = await this.prisma.customerAddress.count({ where: { userId: customerId, isDefault: true } });
    const address = await this.prisma.customerAddress.create({
      data: {
        userId: customerId,
        label: dto.label.trim(),
        recipientName: dto.recipientName.trim(),
        phone: dto.phone.trim(),
        line1: dto.line1.trim(),
        city: dto.city.trim(),
        zone: dto.zone?.trim() || "UZ",
        isDefault: dto.isDefault ?? !hasDefault,
      },
    });
    await this.audit.log({ actorId: customerId, action: "customer.address.created", entityType: "CustomerAddress", entityId: address.id });
    return address;
  }

  async updateCustomerAddress(customerId: string, addressId: string, dto: UpdateCustomerAddressDto) {
    const existing = await this.prisma.customerAddress.findUnique({ where: { id: addressId } });
    if (!existing) throw new NotFoundException("Address not found");
    if (existing.userId !== customerId) throw new ForbiddenException("Not your address");
    if (dto.isDefault) {
      await this.prisma.customerAddress.updateMany({ where: { userId: customerId }, data: { isDefault: false } });
    }
    const address = await this.prisma.customerAddress.update({
      where: { id: addressId },
      data: {
        ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
        ...(dto.recipientName !== undefined ? { recipientName: dto.recipientName.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() } : {}),
        ...(dto.line1 !== undefined ? { line1: dto.line1.trim() } : {}),
        ...(dto.city !== undefined ? { city: dto.city.trim() } : {}),
        ...(dto.zone !== undefined ? { zone: dto.zone.trim() || "UZ" } : {}),
        ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
      },
    });
    await this.audit.log({ actorId: customerId, action: "customer.address.updated", entityType: "CustomerAddress", entityId: address.id });
    return address;
  }

  async deleteCustomerAddress(customerId: string, addressId: string) {
    const existing = await this.prisma.customerAddress.findUnique({ where: { id: addressId } });
    if (!existing) throw new NotFoundException("Address not found");
    if (existing.userId !== customerId) throw new ForbiddenException("Not your address");
    await this.prisma.customerAddress.delete({ where: { id: addressId } });
    if (existing.isDefault) {
      const next = await this.prisma.customerAddress.findFirst({ where: { userId: customerId }, orderBy: { updatedAt: "desc" } });
      if (next) await this.prisma.customerAddress.update({ where: { id: next.id }, data: { isDefault: true } });
    }
    await this.audit.log({ actorId: customerId, action: "customer.address.deleted", entityType: "CustomerAddress", entityId: addressId });
    return { ok: true };
  }

  async setDefaultCustomerAddress(customerId: string, addressId: string) {
    const existing = await this.prisma.customerAddress.findUnique({ where: { id: addressId } });
    if (!existing) throw new NotFoundException("Address not found");
    if (existing.userId !== customerId) throw new ForbiddenException("Not your address");
    await this.prisma.customerAddress.updateMany({ where: { userId: customerId }, data: { isDefault: false } });
    return this.prisma.customerAddress.update({ where: { id: addressId }, data: { isDefault: true } });
  }

  async listCustomerWishlist(customerId: string) {
    const rows = await this.prisma.wishlistItem.findMany({
      where: { userId: customerId },
      include: {
        listing: {
          include: { designer: { select: { id: true, displayName: true, handle: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return rows
      .filter((row) => row.listing.status === ListingStatus.PUBLISHED)
      .map((row) => this.toWishlistListing(row.listing, row.createdAt));
  }

  async addCustomerWishlistItem(customerId: string, dto: AddWishlistItemDto) {
    const listing = await this.prisma.commerceListing.findUnique({ where: { id: dto.listingId } });
    if (!listing) throw new NotFoundException("Listing not found");
    if (listing.status !== ListingStatus.PUBLISHED) throw new BadRequestException("Listing is not available");
    const item = await this.prisma.wishlistItem.upsert({
      where: { userId_listingId: { userId: customerId, listingId: dto.listingId } },
      create: { userId: customerId, listingId: dto.listingId },
      update: {},
    });
    await this.audit.log({ actorId: customerId, action: "customer.wishlist.add", entityType: "WishlistItem", entityId: item.id, metadata: { listingId: dto.listingId } });
    return item;
  }

  async removeCustomerWishlistItem(customerId: string, listingId: string) {
    const existing = await this.prisma.wishlistItem.findUnique({
      where: { userId_listingId: { userId: customerId, listingId } },
    });
    if (!existing) throw new NotFoundException("Wishlist item not found");
    await this.prisma.wishlistItem.delete({ where: { id: existing.id } });
    await this.audit.log({ actorId: customerId, action: "customer.wishlist.remove", entityType: "WishlistItem", entityId: existing.id, metadata: { listingId } });
    return { ok: true };
  }

  async isListingWishlisted(customerId: string, listingId: string) {
    const item = await this.prisma.wishlistItem.findUnique({
      where: { userId_listingId: { userId: customerId, listingId } },
    });
    return { listingId, wishlisted: Boolean(item) };
  }

  async designerDashboard(designerId: string) {
    const [designsByStatus, listingsByStatus, sales, royalties, payouts, recentDesigns, recentListings] = await Promise.all([
      this.prisma.designAsset.groupBy({ by: ["status"], where: { designerId }, _count: { _all: true } }),
      this.prisma.commerceListing.groupBy({ by: ["status"], where: { designerId }, _count: { _all: true } }),
      this.prisma.orderItem.aggregate({ where: { designerId }, _sum: { totalPrice: true, quantity: true } }),
      this.prisma.royaltyLedgerEntry.groupBy({ by: ["status"], where: { designerId }, _sum: { amount: true } }),
      this.prisma.payout.aggregate({ where: { designerId, status: { in: ["PAID", "CONFIRMED"] as any } }, _sum: { amount: true } }),
      this.prisma.designAsset.findMany({ where: { designerId }, orderBy: { updatedAt: "desc" }, take: 5 }),
      this.prisma.commerceListing.findMany({ where: { designerId }, orderBy: { updatedAt: "desc" }, take: 5 }),
    ]);
    const designStatus = this.countMap(designsByStatus, "status");
    const listingStatus = this.countMap(listingsByStatus, "status");
    const royaltyStatus = royalties.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = this.decimal(row._sum.amount);
      return acc;
    }, {});
    return {
      uploadedDesigns: Object.values(designStatus).reduce((sum, count) => sum + count, 0),
      pendingModeration: (designStatus.PENDING_MODERATION ?? 0) + (designStatus.SUBMITTED ?? 0),
      rejectedDesigns: designStatus.REJECTED ?? 0,
      publishedListings: listingStatus.PUBLISHED ?? 0,
      totalSales: this.decimal(sales._sum.totalPrice),
      soldItems: sales._sum.quantity ?? 0,
      pendingRoyalties: (royaltyStatus.PENDING ?? 0) + (royaltyStatus.EARNED ?? 0),
      payableRoyalties: royaltyStatus.PAYABLE ?? 0,
      paidPayouts: this.decimal(payouts._sum.amount),
      designStatus,
      listingStatus,
      recentActivity: [
        ...recentDesigns.map((design) => ({ id: design.id, type: "design", label: design.title, status: design.status, updatedAt: design.updatedAt })),
        ...recentListings.map((listing) => ({ id: listing.id, type: "listing", label: listing.title, status: listing.status, updatedAt: listing.updatedAt })),
      ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 8),
    };
  }

  async designerDesigns(designerId: string, status?: string) {
    const designs = await this.prisma.designAsset.findMany({
      where: { designerId, ...(status ? { status: status as DesignStatus } : {}) },
      include: { versions: { orderBy: { createdAt: "desc" }, take: 1 }, listings: { select: { id: true, title: true, status: true, slug: true } }, story: true },
      orderBy: { updatedAt: "desc" },
    });
    return designs.map((design) => this.toDesignerDesignSummary(design));
  }

  async getStoryEngagement(userId: string, storyId: string) {
    await this.requirePublishedStory(storyId);
    const engagement = await this.prisma.storyEngagement.findUnique({
      where: { userId_designStoryId: { userId, designStoryId: storyId } },
    });
    return { storyId, liked: engagement?.liked ?? false, bookmarked: engagement?.bookmarked ?? false };
  }

  async updateStoryEngagement(userId: string, storyId: string, dto: UpdateStoryEngagementDto) {
    await this.requirePublishedStory(storyId);
    const key = { userId_designStoryId: { userId, designStoryId: storyId } };
    const existing = await this.prisma.storyEngagement.findUnique({ where: key });

    if (!dto.liked && !dto.bookmarked) {
      if (existing) await this.prisma.storyEngagement.delete({ where: { id: existing.id } });
      if (existing?.liked || existing?.bookmarked) {
        await this.audit.log({ actorId: userId, action: "story.engagement.cleared", entityType: "DesignStory", entityId: storyId });
      }
      return { storyId, liked: false, bookmarked: false };
    }

    const engagement = await this.prisma.storyEngagement.upsert({
      where: key,
      create: { userId, designStoryId: storyId, liked: dto.liked, bookmarked: dto.bookmarked },
      update: { liked: dto.liked, bookmarked: dto.bookmarked },
    });
    if (!existing || existing.liked !== dto.liked || existing.bookmarked !== dto.bookmarked) {
      await this.audit.log({
        actorId: userId,
        action: "story.engagement.updated",
        entityType: "DesignStory",
        entityId: storyId,
        metadata: { liked: dto.liked, bookmarked: dto.bookmarked },
      });
    }
    return { storyId, liked: engagement.liked, bookmarked: engagement.bookmarked };
  }

  private async requirePublishedStory(storyId: string) {
    const story = await this.prisma.designStory.findUnique({ where: { id: storyId }, select: { status: true } });
    if (!story) throw new NotFoundException("Story not found");
    if (story.status !== DesignStoryStatus.PUBLISHED) throw new BadRequestException("Story is not available");
  }

  async designerDesign(designerId: string, designId: string) {
    const design = await this.prisma.designAsset.findUnique({
      where: { id: designId },
      include: {
        versions: { orderBy: { createdAt: "desc" } },
        moderationCases: { orderBy: { createdAt: "desc" }, take: 5 },
        moderationAudits: { orderBy: { createdAt: "desc" }, take: 10 },
        commercialRights: true,
        productSelections: { include: { mockupAssets: true, localBaseProduct: true, printfulProductTemplate: true, placementPreset: true } },
        listings: { include: { orderItems: { select: { quantity: true, totalPrice: true } } } },
        story: true,
      },
    });
    if (!design) throw new NotFoundException("Design not found");
    if (design.designerId !== designerId) throw new ForbiddenException("Not your design");
    return this.toDesignerDesignDetail(design);
  }

  async archiveDesignerDesign(designerId: string, designId: string) {
    const design = await this.prisma.designAsset.findUnique({ where: { id: designId }, include: { listings: true } });
    if (!design) throw new NotFoundException("Design not found");
    if (design.designerId !== designerId) throw new ForbiddenException("Not your design");
    if (design.listings.some((listing) => listing.status === ListingStatus.PUBLISHED)) throw new BadRequestException("Published designs cannot be archived until listings are unpublished");
    if (this.designStatusIn(design.status, [DesignStatus.APPROVED, DesignStatus.APPROVED_LOCAL, DesignStatus.APPROVED_GLOBAL, DesignStatus.PUBLISHED])) throw new BadRequestException("Approved designs cannot be archived from self-service");
    const updated = await this.prisma.designAsset.update({ where: { id: designId }, data: { status: DesignStatus.SUSPENDED } });
    await this.audit.log({ actorId: designerId, action: "design.archived.self_service", entityType: "DesignAsset", entityId: designId });
    return this.toDesignerDesignSummary({ ...updated, versions: [], listings: [] });
  }

  async designerListings(designerId: string) {
    const listings = await this.prisma.commerceListing.findMany({
      where: { designerId },
      include: { orderItems: { select: { quantity: true, totalPrice: true } }, designAsset: { select: { id: true, title: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return listings.map((listing) => this.toDesignerListing(listing));
  }

  async designerListing(designerId: string, listingId: string) {
    const listing = await this.prisma.commerceListing.findUnique({
      where: { id: listingId },
      include: { orderItems: { select: { quantity: true, totalPrice: true, createdAt: true } }, designAsset: { select: { id: true, title: true, status: true } } },
    });
    if (!listing) throw new NotFoundException("Listing not found");
    if (listing.designerId !== designerId) throw new ForbiddenException("Not your listing");
    return this.toDesignerListing(listing);
  }

  async designerProfile(designerId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: designerId }, include: { preferences: true } });
    if (!user) throw new NotFoundException("Designer not found");
    const notification = this.objectJson(user.preferences?.notificationJson);
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      handle: user.handle,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      socialLinks: user.socialLinks,
      payoutDetails: user.preferences?.payoutDetailsJson ?? null,
      language: this.stringFrom(notification.language) ?? "en",
    };
  }

  async updateDesignerProfile(designerId: string, dto: UpdateDesignerProfileDto) {
    const payoutDetails = this.cleanJson({ note: dto.payoutNote });
    const notificationJson = this.cleanJson({ language: dto.language, phone: dto.phone });
    await this.prisma.user.update({
      where: { id: designerId },
      data: {
        ...(dto.displayName ? { displayName: dto.displayName.trim() } : {}),
        ...(dto.handle ? { handle: dto.handle.trim().replace(/^@/, "") } : {}),
        ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
        preferences: { upsert: { create: { payoutDetailsJson: payoutDetails, notificationJson }, update: { payoutDetailsJson: payoutDetails, notificationJson } } },
      },
    });
    await this.audit.log({ actorId: designerId, action: "designer.profile.updated", entityType: "User", entityId: designerId });
    return this.designerProfile(designerId);
  }

  async createDesignerSupportRequest(designerId: string, dto: SupportRequestDto) {
    const context: { designAssetId?: string; listingId?: string } = {};
    if (dto.designId) {
      const design = await this.prisma.designAsset.findUnique({ where: { id: dto.designId } });
      if (!design) throw new NotFoundException("Design not found");
      if (design.designerId !== designerId) throw new ForbiddenException("Not your design");
      context.designAssetId = design.id;
    }
    if (dto.listingId) {
      const listing = await this.prisma.commerceListing.findUnique({ where: { id: dto.listingId } });
      if (!listing) throw new NotFoundException("Listing not found");
      if (listing.designerId !== designerId) throw new ForbiddenException("Not your listing");
      context.listingId = listing.id;
    }
    return this.createSupportRequest(designerId, UserRole.DESIGNER, dto, context);
  }

  private async createSupportRequest(requesterId: string, requesterRole: UserRole, dto: SupportRequestDto, context: { orderId?: string; designAssetId?: string; listingId?: string }) {
    if (!dto.message?.trim()) throw new BadRequestException("Message is required");
    const request = await this.prisma.supportRequest.create({
      data: {
        requesterId,
        requesterRole,
        orderId: context.orderId,
        designAssetId: context.designAssetId,
        listingId: context.listingId,
        category: dto.category,
        subject: dto.subject?.trim(),
        message: dto.message.trim(),
        priority: SupportPriority.NORMAL,
        status: SupportRequestStatus.OPEN,
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        lastCustomerMessageAt: new Date(),
        messages: {
          create: {
            authorId: requesterId,
            authorRole: requesterRole,
            body: dto.message.trim(),
            visibility: SupportMessageVisibility.PUBLIC,
          },
        },
      },
    });
    await this.audit.log({ actorId: requesterId, action: "support.request.created", entityType: "SupportRequest", entityId: request.id, metadata: { category: dto.category, ...context } });
    return request;
  }

  private toCustomerOrderSummary(order: any) {
    const publicStatus = this.customerStatus(order);
    const retry = this.paymentRetryState(order);
    return {
      id: order.id,
      orderNumber: order.id.slice(-8).toUpperCase(),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      orderStatus: order.status,
      customerStatus: publicStatus,
      paymentStatus: this.paymentStatus(order.payments ?? []),
      productionStatus: this.productionStatus(order.productionJobs ?? []),
      deliveryStatus: this.deliveryStatus(order),
      itemCount: (order.items ?? []).reduce((sum: number, item: any) => sum + (item.quantity ?? 0), 0),
      total: this.decimal(order.total),
      currency: order.currency,
      thumbnailUrl: this.safeImage((order.items ?? [])[0]),
      ...retry,
    };
  }

  private toCustomerOrderDetail(order: any) {
    const summary = this.toCustomerOrderSummary(order);
    return {
      ...summary,
      customerInfo: { name: order.customerName, phone: order.customerPhone, email: order.customerEmail },
      fulfillment: { deliveryType: order.deliveryType, deliveryAddress: order.deliveryAddress, pickupLocation: order.pickupLocation, deliveryZone: order.deliveryZone },
      customerNote: order.customerNote,
      items: (order.items ?? []).map((item: any) => ({
        id: item.id,
        listingId: item.listingId,
        title: item.listingTitle,
        productTypeName: item.productTypeName,
        baseProductName: item.baseProductName,
        selectedSize: item.selectedSize,
        selectedColor: item.selectedColor,
        selectedMaterial: item.selectedMaterial,
        selectedPrintSide: item.selectedPrintSide,
        quantity: item.quantity,
        unitPrice: this.decimal(item.unitPrice),
        totalPrice: this.decimal(item.totalPrice),
        imageUrl: this.safeImage(item),
        productionStatus: this.itemProductionStatus(item.id, order.productionJobs ?? []),
      })),
      payments: (order.payments ?? []).map((payment: any) => ({ id: payment.id, provider: payment.provider, status: payment.status, amount: this.decimal(payment.amount), currency: payment.currency, attemptNumber: payment.attemptNumber, checkoutUrl: payment.status === PaymentStatus.PENDING ? payment.checkoutUrl : null, createdAt: payment.createdAt, updatedAt: payment.updatedAt })),
      timeline: this.orderTimeline(order),
    };
  }

  private customerStatus(order: any): CustomerStatus {
    const paymentStatus = this.paymentStatus(order.payments ?? []);
    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REFUNDED) return "CANCELED";
    if (order.status === OrderStatus.DELIVERED) return "DELIVERED";
    if (order.status === OrderStatus.SHIPPED) return "OUT_FOR_DELIVERY";
    if (order.status === OrderStatus.READY_FOR_PICKUP) return order.deliveryType === "PICKUP" ? "READY_FOR_PICKUP" : "READY_FOR_DELIVERY";
    if (paymentStatus === PaymentStatus.FAILED) return "PAYMENT_FAILED";
    if (order.status === OrderStatus.PENDING_PAYMENT || paymentStatus === PaymentStatus.PENDING) return "PAYMENT_PENDING";
    const production = this.productionStatus(order.productionJobs ?? []);
    if (production && this.productionStatusIn(production, [ProductionJobStatus.QUALITY_CHECK, ProductionJobStatus.QC, ProductionJobStatus.QC_FAILED, ProductionJobStatus.REPRINT_REQUIRED])) return "QUALITY_CHECK";
    if (production === ProductionJobStatus.READY_FOR_PICKUP) return "READY_FOR_PICKUP";
    if (production === ProductionJobStatus.READY_FOR_DELIVERY) return "READY_FOR_DELIVERY";
    if (production === ProductionJobStatus.OUT_FOR_DELIVERY) return "OUT_FOR_DELIVERY";
    if (production === ProductionJobStatus.DELIVERED) return "DELIVERED";
    if (production === ProductionJobStatus.COMPLETED) return "COMPLETED";
    if (order.status === OrderStatus.PAID) return "ORDER_CONFIRMED";
    if (order.status === OrderStatus.IN_PRODUCTION) return "IN_PRODUCTION";
    return "PREPARING";
  }

  private paymentRetryState(order: any) {
    const paymentStatus = this.paymentStatus(order.payments ?? []);
    const blockedStatuses = [OrderStatus.PAID, OrderStatus.IN_PRODUCTION, OrderStatus.READY_FOR_PICKUP, OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.REFUNDED];
    if (blockedStatuses.includes(order.status)) return { canRetryPayment: false, paymentRetryDisabledReason: "This order is no longer payable." };
    if (paymentStatus !== undefined && paymentStatus !== PaymentStatus.PENDING && paymentStatus !== PaymentStatus.FAILED) return { canRetryPayment: false, paymentRetryDisabledReason: "Payment retry is not available for this payment state." };
    return { canRetryPayment: true, paymentRetryDisabledReason: null };
  }

  private paymentStatus(payments: any[]): PaymentStatus | undefined {
    if (payments.some((payment) => payment.status === PaymentStatus.PAID)) return PaymentStatus.PAID;
    if (payments.some((payment) => payment.status === PaymentStatus.PENDING)) return PaymentStatus.PENDING;
    if (payments.some((payment) => payment.status === PaymentStatus.FAILED)) return PaymentStatus.FAILED;
    return payments[0]?.status;
  }

  private productionStatus(jobs: any[]): ProductionJobStatus | undefined {
    if (!jobs.length) return undefined;
    const priority = [ProductionJobStatus.BLOCKED, ProductionJobStatus.REPRINT_REQUIRED, ProductionJobStatus.QC_FAILED, ProductionJobStatus.QUALITY_CHECK, ProductionJobStatus.QC, ProductionJobStatus.OUT_FOR_DELIVERY, ProductionJobStatus.READY_FOR_DELIVERY, ProductionJobStatus.READY_FOR_PICKUP, ProductionJobStatus.IN_PRODUCTION, ProductionJobStatus.PRINTING, ProductionJobStatus.PACKING, ProductionJobStatus.READY_FOR_PRINT, ProductionJobStatus.FILE_CHECK, ProductionJobStatus.WAITING_FOR_FILE, ProductionJobStatus.ORDERED, ProductionJobStatus.COMPLETED, ProductionJobStatus.DELIVERED];
    return priority.find((status) => jobs.some((job) => job.status === status)) ?? jobs[0].status;
  }

  private deliveryStatus(order: any) {
    if (order.status === OrderStatus.SHIPPED) return "OUT_FOR_DELIVERY";
    if (order.status === OrderStatus.DELIVERED) return "DELIVERED";
    return order.deliveryType === "PICKUP" ? "PICKUP" : "DELIVERY";
  }

  private itemProductionStatus(orderItemId: string, jobs: any[]) {
    const job = jobs.find((candidate) => candidate.orderItemId === orderItemId);
    if (!job) return null;
    if ([ProductionJobStatus.BLOCKED, ProductionJobStatus.CANCELED].includes(job.status)) return "REVIEWING";
    if ([ProductionJobStatus.QC_FAILED, ProductionJobStatus.REPRINT_REQUIRED].includes(job.status)) return "DELAYED_REPRINT";
    return job.status;
  }

  private orderTimeline(order: any) {
    const status = this.customerStatus(order);
    const paymentStatus = this.paymentStatus(order.payments ?? []);
    const latestPayment = (order.payments ?? [])[0];
    const steps = [
      { key: "created", label: "Order created", status: "completed", timestamp: order.createdAt, description: "We received your order." },
      { key: "payment", label: paymentStatus === PaymentStatus.FAILED ? "Payment failed" : paymentStatus === PaymentStatus.PAID ? "Payment paid" : "Payment pending", status: paymentStatus === PaymentStatus.FAILED ? "failed" : paymentStatus === PaymentStatus.PAID ? "completed" : "current", timestamp: latestPayment?.updatedAt, description: paymentStatus === PaymentStatus.FAILED ? "You can retry payment from this order." : "Payment is being processed." },
      { key: "production", label: "Production", status: ["IN_PRODUCTION", "QUALITY_CHECK"].includes(status) ? "current" : ["READY_FOR_PICKUP", "READY_FOR_DELIVERY", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED"].includes(status) ? "completed" : "pending", timestamp: order.updatedAt, description: status === "QUALITY_CHECK" ? "Your item is going through final checks." : "We are preparing your item." },
      { key: "fulfillment", label: order.deliveryType === "PICKUP" ? "Ready for pickup" : "Delivery", status: ["READY_FOR_PICKUP", "READY_FOR_DELIVERY", "OUT_FOR_DELIVERY"].includes(status) ? "current" : ["DELIVERED", "COMPLETED"].includes(status) ? "completed" : "pending", timestamp: order.updatedAt, description: order.deliveryType === "PICKUP" ? "We will let you know when pickup is ready." : "We will update delivery progress here." },
      { key: "done", label: "Completed", status: ["DELIVERED", "COMPLETED"].includes(status) ? "completed" : status === "CANCELED" ? "failed" : "pending", timestamp: ["DELIVERED", "COMPLETED", "CANCELED"].includes(status) ? order.updatedAt : null, description: status === "CANCELED" ? "This order is closed." : "Order complete." },
    ];
    return steps;
  }

  private toDesignerDesignSummary(design: any) {
    return {
      id: design.id,
      title: design.title,
      description: design.description,
      status: this.designerStatus(design.status),
      rawStatus: design.status,
      previewUrl: design.previewUrl,
      submittedAt: design.status === DesignStatus.PENDING_MODERATION || design.status === DesignStatus.SUBMITTED ? design.updatedAt : null,
      reviewedAt: design.moderatedAt,
      rejectionReason: design.customRejectionReason ?? this.firstReason(design.rejectionReasons),
      nextAction: this.designNextAction(design),
      latestVersion: design.versions?.[0] ? { id: design.versions[0].id, createdAt: design.versions[0].createdAt, widthPx: design.versions[0].widthPx, heightPx: design.versions[0].heightPx, dpi: design.versions[0].dpi } : null,
      listings: (design.listings ?? []).map((listing: any) => ({ id: listing.id, title: listing.title, status: listing.status, slug: listing.slug, publicUrl: `/product/${listing.slug}` })),
      story: design.story
        ? {
            id: design.story.id,
            title: design.story.title,
            slug: design.story.slug,
            status: design.story.status,
            publicUrl: design.story.publicUrl,
            qrCodeImageUrl: design.story.qrCodeImageUrl,
            requestedPublishAt: design.story.requestedPublishAt,
            publishedAt: design.story.publishedAt,
            reviewNotes: design.story.reviewNotes,
          }
        : null,
      updatedAt: design.updatedAt,
      createdAt: design.createdAt,
    };
  }

  private toDesignerDesignDetail(design: any) {
    const summary = this.toDesignerDesignSummary(design);
    const sales = (design.listings ?? []).flatMap((listing: any) => listing.orderItems ?? []).reduce((acc: { quantity: number; revenue: number }, item: any) => ({ quantity: acc.quantity + (item.quantity ?? 0), revenue: acc.revenue + this.decimal(item.totalPrice) }), { quantity: 0, revenue: 0 });
    return {
      ...summary,
      versions: (design.versions ?? []).map((version: any) => ({ id: version.id, createdAt: version.createdAt, widthPx: version.widthPx, heightPx: version.heightPx, dpi: version.dpi, hasTransparency: version.hasTransparency })),
      moderation: {
        status: summary.status,
        submittedAt: summary.submittedAt,
        reviewedAt: design.moderatedAt,
        reviewedBy: design.moderatedById ? "RashPOD moderation team" : null,
        rejectionReason: summary.rejectionReason,
        note: design.customRejectionReason,
        timeline: this.designTimeline(design),
      },
      rights: design.commercialRights ? { allowProductSales: design.commercialRights.allowProductSales, allowMarketplacePublishing: design.commercialRights.allowMarketplacePublishing, allowFilmSales: design.commercialRights.allowFilmSales, allowCorporateBidding: design.commercialRights.allowCorporateBidding, filmConsentGrantedAt: design.commercialRights.filmConsentGrantedAt, filmConsentRevokedAt: design.commercialRights.filmConsentRevokedAt } : null,
      productSelections: (design.productSelections ?? []).map((selection: any) => ({ id: selection.id, status: selection.status, baseProduct: selection.localBaseProduct?.name ?? selection.printfulProductTemplate?.name ?? null, placementPreset: selection.placementPreset?.name ?? null, mockups: (selection.mockupAssets ?? []).map((asset: any) => ({ id: asset.id, status: asset.status, publicUrl: asset.publicUrl ?? asset.previewUrl ?? null, failureReason: asset.failureReason ?? null })) })),
      sales,
    };
  }

  private toDesignerListing(listing: any) {
    const quantity = (listing.orderItems ?? []).reduce((sum: number, item: any) => sum + (item.quantity ?? 0), 0);
    const revenue = (listing.orderItems ?? []).reduce((sum: number, item: any) => sum + this.decimal(item.totalPrice), 0);
    return {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      status: listing.status,
      type: listing.type,
      slug: listing.slug,
      publicUrl: listing.status === ListingStatus.PUBLISHED ? `/product/${listing.slug}` : null,
      imageUrl: this.firstListingImage(listing.imagesJson),
      price: this.decimal(listing.price),
      currency: listing.currency,
      designerRoyalty: this.decimal(listing.designerRoyalty),
      salesCount: quantity,
      grossSales: revenue,
      design: listing.designAsset ? { id: listing.designAsset.id, title: listing.designAsset.title, status: listing.designAsset.status } : null,
      unavailableReason: listing.status === ListingStatus.SUSPENDED || listing.status === ListingStatus.REJECTED ? "This listing is not currently available." : null,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
    };
  }

  private designerStatus(status: DesignStatus) {
    const map: Record<string, string> = { DRAFT: "DRAFT", SUBMITTED: "SUBMITTED", PENDING_MODERATION: "IN_REVIEW", NEEDS_FIX: "NEEDS_CHANGES", APPROVED: "APPROVED", APPROVED_LOCAL: "APPROVED", APPROVED_GLOBAL: "APPROVED", REJECTED: "REJECTED", READY_FOR_MOCKUP: "MOCKUPS_GENERATING", READY_TO_PUBLISH: "LISTING_DRAFTED", PUBLISHED: "PUBLISHED", SUSPENDED: "ARCHIVED" };
    return map[status] ?? status;
  }

  private designNextAction(design: any) {
    const status = this.designerStatus(design.status);
    if (status === "DRAFT") return "Upload a ready file and submit for moderation.";
    if (status === "IN_REVIEW" || status === "SUBMITTED") return "Wait for moderation.";
    if (status === "REJECTED" || status === "NEEDS_CHANGES") return "Upload a new version or contact support.";
    if (status === "APPROVED" || status === "LISTING_DRAFTED") return "Review linked listings.";
    if (status === "PUBLISHED") return "View published listing.";
    return "Contact support if you need help.";
  }

  private designTimeline(design: any) {
    return [
      { key: "draft", label: "Draft", status: "completed", timestamp: design.createdAt, description: "Design was created." },
      { key: "submitted", label: "Submitted", status: ["SUBMITTED", "PENDING_MODERATION", "APPROVED", "APPROVED_LOCAL", "APPROVED_GLOBAL", "REJECTED", "NEEDS_FIX", "PUBLISHED"].includes(design.status) ? "completed" : "pending", timestamp: design.status === DesignStatus.DRAFT ? null : design.updatedAt, description: "Design entered moderation." },
      { key: "review", label: "Review", status: ["PENDING_MODERATION", "SUBMITTED"].includes(design.status) ? "current" : ["REJECTED", "NEEDS_FIX"].includes(design.status) ? "failed" : ["APPROVED", "APPROVED_LOCAL", "APPROVED_GLOBAL", "READY_FOR_MOCKUP", "READY_TO_PUBLISH", "PUBLISHED"].includes(design.status) ? "completed" : "pending", timestamp: design.moderatedAt, description: design.customRejectionReason || "RashPOD moderation team is checking the design." },
      { key: "publish", label: "Listing", status: design.status === DesignStatus.PUBLISHED ? "completed" : ["READY_FOR_MOCKUP", "READY_TO_PUBLISH"].includes(design.status) ? "current" : "pending", timestamp: design.publishedAt ?? null, description: "Approved designs can become product listings." },
    ];
  }

  private safeImage(item: any) {
    return item?.mockupImageUrl ?? this.firstListingImage(item?.mockupAssetIds) ?? null;
  }

  private firstListingImage(value: unknown) {
    const json = this.objectJson(value);
    if (Array.isArray(value)) return this.stringFrom(value[0]);
    if (Array.isArray(json.images)) return this.stringFrom(json.images[0]?.url ?? json.images[0]);
    if (Array.isArray(json.urls)) return this.stringFrom(json.urls[0]);
    return this.stringFrom(json.mainImageUrl ?? json.imageUrl ?? json.url);
  }

  private countMap(rows: Array<Record<string, any>>, key: string) {
    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row[key]] = row._count?._all ?? 0;
      return acc;
    }, {});
  }

  private firstReason(value: unknown) {
    if (Array.isArray(value)) return this.stringFrom(value[0]);
    const json = this.objectJson(value);
    return this.stringFrom(json.reason ?? json[0]);
  }

  private decimal(value: Prisma.Decimal | number | string | null | undefined): number {
    if (value === null || value === undefined) return 0;
    return typeof value === "number" ? value : Number(value);
  }

  private objectJson(value: unknown): Record<string, any> {
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, any>;
    return {};
  }

  private stringFrom(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value : undefined;
  }

  private designStatusIn(status: DesignStatus, statuses: DesignStatus[]) {
    return statuses.includes(status);
  }

  private productionStatusIn(status: ProductionJobStatus, statuses: ProductionJobStatus[]) {
    return statuses.includes(status);
  }

  private cleanJson(value: Record<string, unknown>): Prisma.InputJsonObject {
    return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== "")) as Prisma.InputJsonObject;
  }

  private toWishlistListing(
    row: {
      id: string;
      slug: string;
      title: string;
      description: string | null;
      price: Prisma.Decimal;
      currency: string;
      type: ListingType;
      imagesJson: unknown;
      designer: { id: string; displayName: string; handle: string | null };
    },
    savedAt: Date,
  ) {
    const images = Array.isArray(row.imagesJson)
      ? (row.imagesJson as unknown[]).filter((value): value is string => typeof value === "string")
      : [];
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      price: Number(row.price),
      currency: row.currency,
      type: row.type,
      imageUrl: images[0] ?? null,
      designer: {
        id: row.designer.id,
        displayName: row.designer.displayName,
        handle: row.designer.handle ?? row.designer.displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      },
      savedAt,
    };
  }
}
