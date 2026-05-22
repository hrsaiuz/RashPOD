import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { FilmOrderKind, ListingStatus, ListingType, OrderFulfillmentRoute, OrderStatus, PaymentStatus, PodSyncRecordStatus, Prisma, ProductionJobStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { JobDispatcherService } from "../worker-jobs/job-dispatcher.service";
import { FinanceService } from "../finance/finance.service";
import { AddCartItemDto } from "./dto/add-cart-item.dto";
import { CreateOrderDto } from "./dto/create-order.dto";

type CheckoutListing = NonNullable<Awaited<ReturnType<OrdersService["getCheckoutListing"]>>>;
type CheckoutCartItem = Awaited<ReturnType<OrdersService["getCheckoutCartItems"]>>[number];

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly jobs?: JobDispatcherService,
    private readonly finance?: FinanceService,
  ) {}

  private async ensureCart(customerId: string) {
    const existing = await this.prisma.cart.findUnique({ where: { customerId } });
    if (existing) return existing;
    return this.prisma.cart.create({ data: { customerId } });
  }

  async getCheckoutListing(listingId: string) {
    return this.prisma.commerceListing.findUnique({
      where: { id: listingId },
      include: {
        designer: { select: { id: true, email: true, displayName: true, handle: true } },
        designAsset: {
          include: {
            versions: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
        localBaseProduct: {
          include: {
            productType: true,
            mockupTemplates: {
              where: { isActive: true },
              orderBy: { sortOrder: "asc" },
              include: { printAreas: { where: { isActive: true } } },
            },
          },
        },
        designProductSelection: {
          include: {
            placementPreset: true,
            mockupAssets: { orderBy: { createdAt: "asc" } },
          },
        },
        podSyncRecords: { where: { status: { in: [PodSyncRecordStatus.READY, PodSyncRecordStatus.SYNCED] } }, orderBy: { updatedAt: "desc" }, take: 1 },
      },
    });
  }

  getCheckoutCartItems(cartId: string) {
    return this.prisma.cartItem.findMany({
      where: { cartId },
      include: {
        gangSheet: { include: { items: true } },
        listing: {
          include: {
            designer: { select: { id: true, email: true, displayName: true, handle: true } },
            designAsset: { include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } } },
            localBaseProduct: {
              include: {
                productType: true,
                mockupTemplates: {
                  where: { isActive: true },
                  orderBy: { sortOrder: "asc" },
                  include: { printAreas: { where: { isActive: true } } },
                },
              },
            },
            designProductSelection: {
              include: {
                placementPreset: true,
                mockupAssets: { orderBy: { createdAt: "asc" } },
              },
            },
            podSyncRecords: { where: { status: { in: [PodSyncRecordStatus.READY, PodSyncRecordStatus.SYNCED] } }, orderBy: { updatedAt: "desc" }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
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
    if (!selected) return { deliveryFee: 0, resolvedDeliveryType: deliveryType, resolvedDeliveryZone: deliveryZone, setting: null };
    const threshold = selected.freeDeliveryThreshold ? Number(selected.freeDeliveryThreshold) : null;
    const price = selected.price ? Number(selected.price) : 0;
    const deliveryFee = threshold != null && subtotal >= threshold ? 0 : price;
    return {
      deliveryFee,
      resolvedDeliveryType: selected.providerType,
      resolvedDeliveryZone: selected.zone,
      setting: selected,
    };
  }

  private async assertFilmCheckoutAllowed(customerId: string, items: CheckoutCartItem[]) {
    const filmItems = items.filter((item) => item.itemKind || item.listing?.type === "FILM");
    if (!filmItems.length) return;
    const filmSettings = await this.prisma.filmSaleSettings.findFirst();
    if (!filmSettings?.enableFilmSalesGlobally) {
      throw new ForbiddenException("Film checkout is currently disabled");
    }
    const designIds = [...new Set(filmItems.map((i) => i.listing?.designAssetId).filter((id): id is string => Boolean(id)))];
    const rights = await this.prisma.commercialRights.findMany({
      where: { designAssetId: { in: designIds } },
    });
    const rightsByDesign = new Map(rights.map((r) => [r.designAssetId, r]));
    for (const item of filmItems) {
      if (!item.filmType) throw new ForbiddenException("Film cart item is missing film type");
      if (item.filmType === "DTF" && !filmSettings.enableDTF) throw new ForbiddenException("DTF film checkout is currently disabled");
      if (item.filmType === "UV_DTF" && !filmSettings.enableUvDtf) throw new ForbiddenException("UV-DTF film checkout is currently disabled");
      if (!item.filmPricingSnapshotJson) throw new ForbiddenException("Film cart item is missing a pricing snapshot");
      if (item.itemKind === FilmOrderKind.GANG_SHEET_FILM) {
        if (!item.gangSheetId || !item.gangSheet) throw new ForbiddenException("Gang sheet cart item is missing sheet data");
        if (item.gangSheet.ownerId !== customerId) throw new ForbiddenException("Gang sheet does not belong to this customer");
        if (item.gangSheet.status !== "READY_FOR_CHECKOUT") throw new ForbiddenException("Gang sheet is not ready for checkout");
        if (!item.gangSheetSnapshotJson || !item.filmPricingSnapshotJson) throw new ForbiddenException("Gang sheet cart item is missing checkout snapshots");
        const snapshot = this.objectJson(item.gangSheetSnapshotJson);
        const snapshotItems = Array.isArray(snapshot.items) ? snapshot.items : [];
        for (const snapshotItem of snapshotItems) {
          if (!snapshotItem || typeof snapshotItem !== "object") continue;
          const record = snapshotItem as Record<string, unknown>;
          const sourceAssetId = this.stringFrom(record.sourceAssetId);
          if (sourceAssetId) {
            const source = await this.prisma.fileAsset.findUnique({ where: { id: sourceAssetId } });
            if (!source || source.status !== "READY" || source.uploadStatus !== "READY") throw new ForbiddenException("Gang sheet source asset is not ready");
          }
          const consent = this.objectJson(record.sourceConsentSnapshot as Prisma.JsonValue | null);
          if (record.designId && (!consent.allowFilmSales || consent.filmConsentRevokedAt)) throw new ForbiddenException("Gang sheet design film consent is not active");
        }
        continue;
      }
      if (item.itemKind === FilmOrderKind.CUSTOM_FILM) {
        if (!item.filmSourceAssetId) throw new ForbiddenException("Custom film cart item is missing source asset");
        const source = await this.prisma.fileAsset.findUnique({ where: { id: item.filmSourceAssetId } });
        if (!source || source.ownerId !== customerId || source.status !== "READY" || source.uploadStatus !== "READY") {
          throw new ForbiddenException("Custom film source asset is not ready");
        }
        continue;
      }
      if (item.listing?.type === "FILM") {
        const rightsRow = rightsByDesign.get(item.listing.designAssetId);
        if (!rightsRow?.allowFilmSales || rightsRow.filmConsentRevokedAt) {
          throw new ForbiddenException(`Film-sale rights are not valid for listing ${item.listing.id}`);
        }
      }
    }
  }

  async addCartItem(customerId: string, dto: AddCartItemDto) {
    const cart = await this.ensureCart(customerId);
    const listing = await this.getCheckoutListing(dto.listingId);
    if (!listing) throw new NotFoundException("Listing not found");
    this.assertListingPurchasable(listing);

    const existing = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        listingId: dto.listingId,
        selectedSize: dto.size ?? null,
        selectedColor: dto.color ?? null,
        selectedMaterial: dto.material ?? null,
        selectedPrintSide: dto.printSide ?? null,
      },
    });
    if (existing) {
      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + dto.quantity, unitPrice: listing.price, currency: listing.currency },
      });
    }
    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        listingId: dto.listingId,
        quantity: dto.quantity,
        unitPrice: listing.price,
        currency: listing.currency,
        selectedSize: dto.size,
        selectedColor: dto.color,
        selectedMaterial: dto.material,
        selectedPrintSide: dto.printSide,
        metadataJson: this.cleanJson({ options: this.selectedOptions(dto) }),
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
    const subtotal = items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
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
    if (!Number.isInteger(quantity) || quantity < 1) throw new BadRequestException("Quantity must be at least 1");
    const cart = await this.ensureCart(customerId);
    const item = await this.prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!item || item.cartId !== cart.id) throw new ForbiddenException("Not your cart item");
    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  async createOrder(customerId: string, dto: CreateOrderDto) {
    this.assertCheckoutInput(dto);
    const cart = await this.ensureCart(customerId);
    const items = await this.getCheckoutCartItems(cart.id);
    if (!items.length) throw new ForbiddenException("Cart is empty");
    await this.assertFilmCheckoutAllowed(customerId, items);

    for (const item of items) {
      if (!item.listing && item.itemKind !== FilmOrderKind.CUSTOM_FILM && item.itemKind !== FilmOrderKind.GANG_SHEET_FILM) throw new ForbiddenException("Cart item is missing listing");
      if (item.listing) this.assertListingPurchasable(item.listing);
      if (!Number.isInteger(item.quantity) || item.quantity < 1) throw new BadRequestException("Cart contains an invalid quantity");
    }

    const currency = items[0].currency;
    if (items.some((item) => item.currency !== currency)) {
      throw new BadRequestException("Cart contains mixed currencies");
    }

    const subtotal = items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
    const { deliveryFee, resolvedDeliveryType, resolvedDeliveryZone, setting } = await this.resolveDeliveryFee(
      subtotal,
      dto.deliveryType,
      dto.deliveryZone,
    );
    const discountTotal = 0;
    const total = subtotal + deliveryFee - discountTotal;
    if (total <= 0) throw new BadRequestException("Order total is invalid");

    const order = await this.prisma.order.create({
      data: {
        customerId,
        customerName: dto.customerName.trim(),
        customerPhone: dto.customerPhone.trim(),
        customerEmail: dto.customerEmail?.trim(),
        deliveryAddress: dto.deliveryAddress?.trim(),
        pickupLocation: dto.pickupLocation?.trim(),
        customerNote: dto.customerNote?.trim(),
        subtotal,
        deliveryFee,
        discountTotal,
        total,
        currency,
        deliveryType: resolvedDeliveryType,
        deliveryZone: resolvedDeliveryZone,
        notes: dto.notes,
        status: OrderStatus.PENDING_PAYMENT,
        pricingSnapshotJson: this.cleanJson({ subtotal, deliveryFee, discountTotal, total, currency, paymentMethod: dto.paymentMethod ?? "CLICK" }),
        deliverySnapshotJson: this.cleanJson({ requestedType: dto.deliveryType, resolvedType: resolvedDeliveryType, zone: resolvedDeliveryZone, setting }),
      },
    });

    const deliveryAllocation = items.length > 0 ? Number((deliveryFee / items.length).toFixed(2)) : 0;
    for (const item of items) {
      const snapshot = this.buildOrderItemSnapshot(item, deliveryAllocation);
      await this.prisma.orderItem.create({
        data: {
          orderId: order.id,
          listingId: item.listingId,
          listingTitle: item.listing?.title ?? (item.itemKind === FilmOrderKind.CUSTOM_FILM ? "Custom film order" : item.itemKind === FilmOrderKind.GANG_SHEET_FILM ? "Gang sheet film order" : undefined),
          designerId: item.listing?.designerId,
          designAssetId: item.listing?.designAssetId,
          designVersionId: snapshot.designVersionId,
          productTypeId: snapshot.productTypeId,
          productTypeName: snapshot.productTypeName,
          baseProductId: snapshot.baseProductId,
          baseProductName: snapshot.baseProductName,
          baseProductSku: snapshot.baseProductSku,
          selectedSize: item.selectedSize,
          selectedColor: item.selectedColor,
          selectedMaterial: item.selectedMaterial,
          selectedPrintSide: item.selectedPrintSide,
          itemKind: item.itemKind,
          filmType: item.filmType,
          filmWidthCm: item.filmWidthCm,
          filmHeightCm: item.filmHeightCm,
          filmAreaCm2: item.filmAreaCm2,
          filmSourceAssetId: item.filmSourceAssetId,
          gangSheetId: item.gangSheetId,
          gangSheetSnapshotJson: (item.gangSheetSnapshotJson ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          filmPricingSnapshotJson: (item.filmPricingSnapshotJson ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          filmConsentSnapshotJson: (item.filmConsentSnapshotJson ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          filmProductionSnapshotJson: snapshot.filmProductionSnapshot as Prisma.InputJsonValue,
          mockupAssetIds: snapshot.mockupAssetIds as Prisma.InputJsonValue,
          mockupImageUrl: snapshot.mockupImageUrl,
          productionFileAssetId: snapshot.productionFileAssetId,
          placementSnapshotJson: snapshot.placementSnapshot as Prisma.InputJsonValue,
          printAreaSnapshotJson: snapshot.printAreaSnapshot as Prisma.InputJsonValue,
          royaltySnapshotJson: snapshot.royaltySnapshot as Prisma.InputJsonValue,
          pricingSnapshotJson: snapshot.pricingSnapshot as Prisma.InputJsonValue,
          productionSnapshotJson: snapshot.productionSnapshot as Prisma.InputJsonValue,
          fulfillmentRoute: snapshot.fulfillmentRoute,
          providerSyncRecordId: snapshot.providerSyncRecordId,
          providerType: snapshot.providerType,
          providerProductId: snapshot.providerProductId,
          providerVariantId: snapshot.providerVariantId,
          providerFileId: snapshot.providerFileId,
          providerPlacementPayloadSnapshotJson: snapshot.providerPlacementPayloadSnapshot as Prisma.InputJsonValue,
          providerFulfillmentSnapshotJson: snapshot.providerFulfillmentSnapshot as Prisma.InputJsonValue,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: Number(item.unitPrice) * item.quantity,
          designerRoyaltyAmount: snapshot.designerRoyaltyAmount,
          productionCostEstimate: snapshot.productionCostEstimate,
          deliveryFeeAllocation: deliveryAllocation,
          metadataJson: this.cleanJson({ options: snapshot.selectedOptions, listingSnapshot: snapshot.listingSnapshot }),
        },
      });
      if (item.itemKind === FilmOrderKind.GANG_SHEET_FILM && item.gangSheetId) {
        await this.prisma.gangSheet.update({ where: { id: item.gangSheetId }, data: { status: "CHECKED_OUT", checkedOutAt: new Date() } });
      }
    }

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await this.audit.log({
      actorId: customerId,
      action: "order.created",
      entityType: "Order",
      entityId: order.id,
      metadata: { itemCount: items.length, total, currency },
    });
    return order;
  }

  listOwnOrders(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      include: { items: true, payments: { orderBy: { createdAt: "desc" }, take: 5 }, productionJobs: true },
      orderBy: { createdAt: "desc" },
    });
  }

  listAllOrders() {
    return this.prisma.order.findMany({
      include: {
        customer: { select: { id: true, email: true, displayName: true } },
        items: true,
        payments: { orderBy: { createdAt: "desc" } },
        productionJobs: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async getOrder(customerId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: { orderBy: { createdAt: "desc" } }, productionJobs: true },
    });
    if (!order) throw new NotFoundException("Order not found");
    if (order.customerId !== customerId) throw new ForbiddenException("Not your order");
    return order;
  }

  async markPaid(actorId: string, orderId: string, providerRef?: string) {
    return this.confirmPaid(actorId, orderId, providerRef);
  }

  async confirmPaid(actorId: string | undefined, orderId: string, providerRef?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException("Order not found");
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PAID, paymentSnapshotJson: this.cleanJson({ providerRef, confirmedAt: new Date().toISOString() }) },
    });
    await this.prisma.paymentTransaction.updateMany({
      where: { orderId, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.PAID, providerRef },
    });
    const paidPayment = await this.prisma.paymentTransaction.findFirst({ where: { orderId, status: PaymentStatus.PAID }, orderBy: { updatedAt: "desc" } });
    await this.finance?.createOrderFinance(orderId, paidPayment?.id, actorId);
    const jobs = await this.createProductionJobsForPaidOrder(actorId, orderId);
    await this.audit.log({
      actorId,
      action: "order.payment-confirmed",
      entityType: "Order",
      entityId: orderId,
      metadata: { providerRef, productionJobs: jobs.length },
    });
    return updated;
  }

  async createProductionJobsForPaidOrder(actorId: string | undefined, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException("Order not found");
    if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.IN_PRODUCTION) {
      throw new ForbiddenException("Only paid orders can be handed to production");
    }

    const createdOrExisting = [];
    for (const item of order.items) {
      const existing = item.id
        ? await this.prisma.productionJob.findFirst({ where: { orderItemId: item.id } })
        : null;
      if (existing) {
        createdOrExisting.push(existing);
        continue;
      }

      const customerSnapshot = this.cleanJson({
        orderId: order.id,
        customerId: order.customerId,
        name: order.customerName,
        phone: order.customerPhone,
        email: order.customerEmail,
        deliveryType: order.deliveryType,
        deliveryZone: order.deliveryZone,
        deliveryAddress: order.deliveryAddress,
        pickupLocation: order.pickupLocation,
        note: order.customerNote,
      });
      const productSnapshot = this.cleanJson({
        listingId: item.listingId,
        listingTitle: item.listingTitle,
        itemKind: item.itemKind,
        filmType: item.filmType,
        filmWidthCm: item.filmWidthCm,
        filmHeightCm: item.filmHeightCm,
        filmAreaCm2: item.filmAreaCm2,
        productTypeId: item.productTypeId,
        productTypeName: item.productTypeName,
        baseProductId: item.baseProductId,
        baseProductName: item.baseProductName,
        baseProductSku: item.baseProductSku,
        quantity: item.quantity,
        gangSheetId: item.gangSheetId,
        gangSheetSnapshot: item.gangSheetSnapshotJson,
      });
      const assetSnapshot = this.cleanJson({
        mockupAssetIds: item.mockupAssetIds,
        mockupImageUrl: item.mockupImageUrl,
        productionFileAssetId: item.productionFileAssetId,
        filmSourceAssetId: item.filmSourceAssetId,
        gangSheetId: item.gangSheetId,
        gangSheetSnapshot: item.gangSheetSnapshotJson,
        designAssetId: item.designAssetId,
        designVersionId: item.designVersionId,
      });
      const selectedOptions = this.cleanJson({
        size: item.selectedSize,
        color: item.selectedColor,
        material: item.selectedMaterial,
        printSide: item.selectedPrintSide,
        filmType: item.filmType,
        widthCm: item.filmWidthCm,
        heightCm: item.filmHeightCm,
      });
      const sourcePlacementId = this.sourcePlacementIdFrom(item.placementSnapshotJson);
      const isFilmItem = item.itemKind === FilmOrderKind.DESIGN_FILM || item.itemKind === FilmOrderKind.CUSTOM_FILM || item.itemKind === FilmOrderKind.GANG_SHEET_FILM;
      const isProviderItem = item.fulfillmentRoute === OrderFulfillmentRoute.GLOBAL_POD_PROVIDER && Boolean(item.providerSyncRecordId);
      const filmSourceReady = isFilmItem && Boolean(item.filmSourceAssetId || item.designVersionId || item.gangSheetId);
      const productionFileStatus = isProviderItem ? "PROVIDER_SYNC_READY" : item.productionFileAssetId ? "READY" : isFilmItem && filmSourceReady ? "SOURCE_READY" : sourcePlacementId ? "REQUESTED" : "MISSING_SOURCE";
      const productionStatus = item.productionFileAssetId
        ? ProductionJobStatus.READY_FOR_PRINT
        : isProviderItem
          ? ProductionJobStatus.ORDERED
        : isFilmItem && filmSourceReady
          ? ProductionJobStatus.FILE_CHECK
        : sourcePlacementId
          ? ProductionJobStatus.FILE_GENERATING
          : ProductionJobStatus.WAITING_FOR_FILE;
      const job = await this.prisma.productionJob.create({
        data: {
          orderId: order.id,
          orderItemId: item.id,
          queueType: isProviderItem ? "GLOBAL_POD_PROVIDER" : isFilmItem ? item.filmType ?? "DTF" : "POD",
          status: productionStatus,
          fulfillmentRoute: item.fulfillmentRoute,
          providerSyncRecordId: item.providerSyncRecordId,
          providerType: item.providerType,
          providerStatus: isProviderItem ? "READY_FOR_EXTERNAL_PROVIDER" : undefined,
          externalSourceType: item.externalSourceType,
          externalOrderId: item.externalOrderId,
          externalSku: item.externalSku,
          externalListingId: item.externalListingId,
          externalChannelSnapshotJson: item.externalChannelSnapshotJson ?? undefined,
          gangSheetId: item.gangSheetId,
          gangSheetSnapshotJson: item.gangSheetSnapshotJson ?? undefined,
          providerPayloadSnapshotJson: item.providerFulfillmentSnapshotJson ?? item.providerPlacementPayloadSnapshotJson ?? undefined,
          customerSnapshotJson: customerSnapshot,
          productSnapshotJson: productSnapshot,
          placementSnapshotJson: (item.placementSnapshotJson ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          printAreaSnapshotJson: (item.printAreaSnapshotJson ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          assetSnapshotJson: assetSnapshot,
          selectedOptionsJson: selectedOptions,
          notes: isFilmItem ? JSON.stringify(this.cleanJson({ filmProductionSnapshot: item.filmProductionSnapshotJson, pricingSnapshot: item.filmPricingSnapshotJson, gangSheetSnapshot: item.gangSheetSnapshotJson })) : undefined,
          productionFileStatus,
          productionFileAssetId: item.productionFileAssetId,
          mockupPreviewUrl: item.mockupImageUrl,
        },
      });

      if (isProviderItem) {
        await this.audit.log({
          actorId,
          action: "pod-fulfillment.route-ready",
          entityType: "ProductionJob",
          entityId: job.id,
          metadata: { orderItemId: item.id, providerSyncRecordId: item.providerSyncRecordId, providerType: item.providerType },
        });
      } else if (isFilmItem && filmSourceReady && this.jobs) {
        const enqueued = await this.jobs.enqueue("GENERATE_PRODUCTION_FILE", { productionJobId: job.id, orderItemId: item.id, filmType: item.filmType });
        await this.prisma.productionJob.update({
          where: { id: job.id },
          data: { productionFileJobId: enqueued.jobId, productionFileStatus: "QUEUED", status: ProductionJobStatus.FILE_GENERATING },
        });
        await this.audit.log({
          actorId,
          action: "film-production-file.generation-requested",
          entityType: "ProductionJob",
          entityId: job.id,
          metadata: { workerJobId: enqueued.jobId, orderItemId: item.id, filmType: item.filmType },
        });
      } else if (!item.productionFileAssetId && sourcePlacementId && this.jobs) {
        const generatedAsset = await this.prisma.generatedAsset.create({
          data: {
            sourcePlacementId,
            type: "PRODUCTION_FILE",
            status: "PENDING",
            sourceAssetId: item.designVersionId,
            placementSnapshot: item.placementSnapshotJson ?? undefined,
          },
        });
        const enqueued = await this.jobs.enqueue("GENERATE_PRODUCTION_FILE", {
          placementId: sourcePlacementId,
          generatedAssetId: generatedAsset.id,
        });
        await this.prisma.productionJob.update({
          where: { id: job.id },
          data: { productionFileAssetId: generatedAsset.id, productionFileJobId: enqueued.jobId, productionFileStatus: "QUEUED", status: ProductionJobStatus.FILE_GENERATING },
        });
        await this.audit.log({
          actorId,
          action: "production-file.generation-requested",
          entityType: "ProductionJob",
          entityId: job.id,
          metadata: { workerJobId: enqueued.jobId, generatedAssetId: generatedAsset.id, orderItemId: item.id },
        });
      } else if (!item.productionFileAssetId) {
        await this.audit.log({
          actorId,
          action: "production-file.source-missing",
          entityType: "ProductionJob",
          entityId: job.id,
          metadata: { orderItemId: item.id },
        });
      }

      await this.audit.log({
        actorId,
        action: "production-job.created",
        entityType: "ProductionJob",
        entityId: job.id,
        metadata: { orderId: order.id, orderItemId: item.id, productionFileStatus },
      });
      if (item.gangSheetId) {
        await this.prisma.gangSheet.update({ where: { id: item.gangSheetId }, data: { status: "IN_PRODUCTION" } });
      }
      createdOrExisting.push(job);
    }

    if (createdOrExisting.length > 0 && order.status === OrderStatus.PAID) {
      await this.prisma.order.update({ where: { id: order.id }, data: { status: OrderStatus.IN_PRODUCTION } });
      await this.audit.log({
        actorId,
        action: "order.moved-to-production",
        entityType: "Order",
        entityId: order.id,
        metadata: { productionJobs: createdOrExisting.map((job) => job.id) },
      });
    }
    return createdOrExisting;
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
      action: "order.cancelled",
      entityType: "Order",
      entityId: orderId,
    });
    return updated;
  }

  private assertCheckoutInput(dto: CreateOrderDto) {
    if (!dto.customerName?.trim()) throw new BadRequestException("Customer full name is required");
    if (!dto.customerPhone?.trim()) throw new BadRequestException("Customer phone is required");
    if (!dto.deliveryType?.trim()) throw new BadRequestException("Delivery method is required");
    if (!dto.deliveryAddress?.trim() && !dto.pickupLocation?.trim()) {
      throw new BadRequestException("Delivery address or pickup location is required");
    }
    const method = dto.paymentMethod ?? "CLICK";
    if (method !== "CLICK") throw new BadRequestException("Unsupported payment method");
  }

  private assertListingPurchasable(listing: CheckoutListing) {
    const reasons: string[] = [];
    if (listing.status !== ListingStatus.PUBLISHED) reasons.push("Listing is not published");
    if (Number(listing.price) <= 0) reasons.push("Listing price is missing or invalid");
    if (listing.type === ListingType.PRODUCT) {
      if (!listing.localBaseProductId || !listing.localBaseProduct) reasons.push("Listing is missing base product");
      if (!listing.designAssetId || !listing.designAsset) reasons.push("Listing is missing design");
      if (!listing.designProductSelectionId || !listing.designProductSelection) reasons.push("Listing is missing placement snapshot");
      const readyMockups = this.readyMockups(listing);
      const readyTypes = new Set(readyMockups.map((asset) => asset.mockupType));
      if (!readyTypes.has("MAIN")) reasons.push("Listing requires a ready main image");
      if (!(readyTypes.has("LIFESTYLE") || readyTypes.has("SECONDARY"))) reasons.push("Listing requires a ready secondary image");
      if (!readyTypes.has("DETAIL")) reasons.push("Listing requires a ready detail image");
      if (readyMockups.some((asset) => !asset.placementSnapshotJson)) reasons.push("Listing images are missing placement snapshots");
    }
    if (reasons.length) throw new ForbiddenException(reasons.join("; "));
  }

  private readyMockups(listing: CheckoutListing) {
    return listing.designProductSelection?.mockupAssets.filter(
      (asset) =>
        (asset.status === "READY" || asset.status === "GENERATED") &&
        !asset.archivedAt &&
        Boolean(asset.imageUrl || asset.objectKey),
    ) ?? [];
  }

  private buildOrderItemSnapshot(item: CheckoutCartItem, deliveryFeeAllocation: number) {
    if (item.itemKind === FilmOrderKind.GANG_SHEET_FILM) {
      return this.buildGangSheetOrderItemSnapshot(item, deliveryFeeAllocation);
    }
    if (item.itemKind === FilmOrderKind.CUSTOM_FILM || item.itemKind === FilmOrderKind.DESIGN_FILM) {
      return this.buildFilmOrderItemSnapshot(item, deliveryFeeAllocation);
    }
    if (!item.listing) throw new ForbiddenException("Cart item is missing listing");
    const listing = item.listing;
    const readyMockups = this.readyMockups(listing);
    const firstMockup = readyMockups[0];
    const selection = listing.designProductSelection;
    const baseProduct = listing.localBaseProduct;
    const productType = baseProduct?.productType;
    const latestVersion = listing.designAsset.versions[0];
    const printArea = baseProduct?.mockupTemplates.flatMap((template) => template.printAreas).find((area) => {
      return !selection?.placement || area.placement === selection.placement;
    }) ?? baseProduct?.mockupTemplates[0]?.printAreas[0] ?? null;
    const metadata = this.objectJson(listing.metadataJson);
    const providerSyncRecord = listing.podSyncRecords[0];
    const fulfillmentRoute = providerSyncRecord ? OrderFulfillmentRoute.GLOBAL_POD_PROVIDER : OrderFulfillmentRoute.LOCAL_PRODUCTION;
    const royaltyRuleSnapshot = {
      royaltyRuleId: metadata.royaltyRuleId ?? null,
      basis: metadata.royaltyBasis ?? null,
      value: metadata.royaltyValue ?? null,
      amount: listing.designerRoyalty ? Number(listing.designerRoyalty) * item.quantity : null,
    };
    const productionFileAssetId = this.stringFrom(metadata.productionFileAssetId) ?? this.stringFrom(metadata.generatedProductionAssetId);
    const selectedOptions = {
      size: item.selectedSize,
      color: item.selectedColor,
      material: item.selectedMaterial,
      printSide: item.selectedPrintSide,
    };

    return {
      designVersionId: latestVersion?.id,
      productTypeId: productType?.id,
      productTypeName: productType?.name,
      baseProductId: baseProduct?.id,
      baseProductName: baseProduct?.name,
      baseProductSku: baseProduct?.skuPrefix,
      mockupAssetIds: readyMockups.map((asset) => asset.id),
      mockupImageUrl: firstMockup?.imageUrl ?? this.firstImageUrl(listing.imagesJson),
      productionFileAssetId,
      selectedOptions,
      listingSnapshot: {
        id: listing.id,
        title: listing.title,
        slug: listing.slug,
        type: listing.type,
        status: listing.status,
        publishedAt: listing.publishedAt,
      },
      placementSnapshot: this.cleanJson({
        selectionId: selection?.id,
        placement: selection?.placement,
        placementPresetId: selection?.placementPresetId,
        x: selection?.x,
        y: selection?.y,
        top: selection?.top,
        left: selection?.left,
        width: selection?.width,
        height: selection?.height,
        scale: selection?.scale,
        rotation: selection?.rotation,
        units: selection?.units,
        placementConfigJson: selection?.placementConfigJson,
        sourcePlacementId: this.stringFrom(this.objectJson(firstMockup?.metadataJson ?? null).sourcePlacementId),
        assetPlacementSnapshot: firstMockup?.placementSnapshotJson,
      }),
      printAreaSnapshot: this.cleanJson(printArea ? {
        id: printArea.id,
        name: printArea.name,
        placement: printArea.placement,
        x: printArea.x,
        y: printArea.y,
        width: printArea.width,
        height: printArea.height,
        safeX: printArea.safeX,
        safeY: printArea.safeY,
        safeWidth: printArea.safeWidth,
        safeHeight: printArea.safeHeight,
        safeZonePx: printArea.safeZonePx,
      } : null),
      royaltySnapshot: this.cleanJson(royaltyRuleSnapshot),
      pricingSnapshot: this.cleanJson({
        listingPrice: Number(listing.price),
        quantity: item.quantity,
        currency: listing.currency,
        baseProductCost: listing.cost ? Number(listing.cost) : baseProduct?.baseCost ? Number(baseProduct.baseCost) : null,
        productionCostEstimate: listing.cost ? Number(listing.cost) : baseProduct?.baseCost ? Number(baseProduct.baseCost) : null,
        designerRoyaltyAmount: royaltyRuleSnapshot.amount,
        platformMarginEstimate: this.marginEstimate(listing, item.quantity),
        deliveryFeeAllocation,
      }),
      productionSnapshot: this.cleanJson({
        productType: productType ? { id: productType.id, name: productType.name, productionMethod: productType.productionMethod } : null,
        baseProduct: baseProduct ? { id: baseProduct.id, name: baseProduct.name, skuPrefix: baseProduct.skuPrefix, localProductionMethod: baseProduct.localProductionMethod } : null,
        design: { id: listing.designAsset.id, title: listing.designAsset.title, designerId: listing.designAsset.designerId },
        designVersion: latestVersion ? { id: latestVersion.id, fileKey: latestVersion.fileKey, widthPx: latestVersion.widthPx, heightPx: latestVersion.heightPx, dpi: latestVersion.dpi } : null,
        mockupPreview: firstMockup ? { id: firstMockup.id, imageUrl: firstMockup.imageUrl, objectKey: firstMockup.objectKey } : null,
        productionFileAssetId,
      }),
      fulfillmentRoute,
      providerSyncRecordId: providerSyncRecord?.id,
      providerType: providerSyncRecord?.provider,
      providerProductId: providerSyncRecord?.providerProductId,
      providerVariantId: providerSyncRecord?.providerVariantId,
      providerFileId: providerSyncRecord?.providerFileId,
      providerPlacementPayloadSnapshot: this.cleanJson(providerSyncRecord?.providerPlacementPayloadSnapshotJson ?? null),
      providerFulfillmentSnapshot: this.cleanJson(providerSyncRecord ? {
        providerSyncRecordId: providerSyncRecord.id,
        provider: providerSyncRecord.provider,
        mode: providerSyncRecord.mode,
        providerProductId: providerSyncRecord.providerProductId,
        providerVariantId: providerSyncRecord.providerVariantId,
        providerFileId: providerSyncRecord.providerFileId,
        providerDraftProductId: providerSyncRecord.providerDraftProductId,
        providerExternalProductId: providerSyncRecord.providerExternalProductId,
        status: providerSyncRecord.status,
        liveOrderSubmission: false,
      } : null),
      designerRoyaltyAmount: royaltyRuleSnapshot.amount,
      productionCostEstimate: listing.cost ?? baseProduct?.baseCost ?? null,
      filmProductionSnapshot: Prisma.JsonNull,
    };
  }

  private buildFilmOrderItemSnapshot(item: CheckoutCartItem, deliveryFeeAllocation: number) {
    const listing = item.listing;
    const latestVersion = listing?.designAsset.versions[0];
    const pricing = this.objectJson(item.filmPricingSnapshotJson ?? null);
    const consent = this.objectJson(item.filmConsentSnapshotJson ?? null);
    const options = this.objectJson(item.filmOptionsJson ?? null);
    const designerRoyaltyAmount = item.itemKind === FilmOrderKind.DESIGN_FILM && listing?.designerRoyalty
      ? Number(listing.designerRoyalty) * item.quantity
      : null;
    const filmProductionSnapshot = this.cleanJson({
      itemKind: item.itemKind,
      filmType: item.filmType,
      widthCm: item.filmWidthCm,
      heightCm: item.filmHeightCm,
      areaCm2: item.filmAreaCm2,
      quantity: item.quantity,
      sourceAssetId: item.filmSourceAssetId,
      source: item.itemKind === FilmOrderKind.CUSTOM_FILM ? "CUSTOM_UPLOAD" : "APPROVED_DESIGN",
      designVersionId: latestVersion?.id ?? null,
      designFileKey: latestVersion?.fileKey ?? null,
      options,
      pricing,
      consent,
    });
    return {
      designVersionId: latestVersion?.id,
      productTypeId: undefined,
      productTypeName: item.filmType ?? undefined,
      baseProductId: undefined,
      baseProductName: item.filmType ? `${item.filmType.replace("_", "-")} transfer film` : "Transfer film",
      baseProductSku: item.filmType,
      mockupAssetIds: [],
      mockupImageUrl: this.firstImageUrl(listing?.imagesJson ?? null),
      productionFileAssetId: item.filmSourceAssetId ?? undefined,
      selectedOptions: { filmType: item.filmType, widthCm: item.filmWidthCm, heightCm: item.filmHeightCm, areaCm2: item.filmAreaCm2 },
      listingSnapshot: listing ? { id: listing.id, title: listing.title, slug: listing.slug, type: listing.type, status: listing.status, publishedAt: listing.publishedAt } : { id: null, title: "Custom film order", slug: null, type: "CUSTOM_FILM", status: null, publishedAt: null },
      placementSnapshot: this.cleanJson({ itemKind: item.itemKind, filmType: item.filmType, sourceAssetId: item.filmSourceAssetId, designVersionId: latestVersion?.id ?? null }),
      printAreaSnapshot: this.cleanJson({ widthCm: item.filmWidthCm, heightCm: item.filmHeightCm, areaCm2: item.filmAreaCm2, units: "CM" }),
      royaltySnapshot: this.cleanJson({
        basis: item.itemKind === FilmOrderKind.DESIGN_FILM ? "FILM_SALE" : null,
        value: item.itemKind === FilmOrderKind.DESIGN_FILM ? consent.filmRoyaltyRate ?? null : null,
        amount: designerRoyaltyAmount,
      }),
      pricingSnapshot: this.cleanJson({ ...pricing, deliveryFeeAllocation }),
      productionSnapshot: filmProductionSnapshot,
      fulfillmentRoute: OrderFulfillmentRoute.LOCAL_PRODUCTION,
      providerSyncRecordId: undefined,
      providerType: undefined,
      providerProductId: undefined,
      providerVariantId: undefined,
      providerFileId: undefined,
      providerPlacementPayloadSnapshot: Prisma.JsonNull,
      providerFulfillmentSnapshot: Prisma.JsonNull,
      designerRoyaltyAmount,
      productionCostEstimate: null,
      filmProductionSnapshot,
    };
  }

  private buildGangSheetOrderItemSnapshot(item: CheckoutCartItem, deliveryFeeAllocation: number) {
    if (!item.gangSheetId || !item.gangSheetSnapshotJson) throw new ForbiddenException("Gang sheet cart item is missing checkout snapshot");
    const sheetSnapshot = this.objectJson(item.gangSheetSnapshotJson);
    const pricing = this.objectJson(item.filmPricingSnapshotJson ?? null);
    const preset = this.objectJson(sheetSnapshot.preset as Prisma.JsonValue | null);
    const sheetWidthCm = Number(sheetSnapshot.widthCm ?? item.filmWidthCm ?? 0);
    const sheetHeightCm = Number(sheetSnapshot.heightCm ?? item.filmHeightCm ?? 0);
    const sourceItems = Array.isArray(sheetSnapshot.items) ? sheetSnapshot.items : [];
    const royaltyBreakdown = Array.isArray(pricing.royaltyBreakdown) ? pricing.royaltyBreakdown : [];
    const designerRoyaltyAmount = royaltyBreakdown.reduce((sum, entry) => {
      const record = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
      const amount = typeof record.amount === "number" ? record.amount : Number(record.amount ?? 0);
      return Number.isFinite(amount) ? sum + amount : sum;
    }, 0);
    const filmProductionSnapshot = this.cleanJson({
      itemKind: item.itemKind,
      filmType: item.filmType ?? sheetSnapshot.filmType,
      gangSheetId: item.gangSheetId,
      status: item.gangSheet?.status ?? null,
      widthCm: sheetWidthCm,
      heightCm: sheetHeightCm,
      areaCm2: sheetWidthCm * sheetHeightCm,
      quantity: item.quantity,
      source: "GANG_SHEET_BUILDER",
      itemCount: sourceItems.length,
      preset,
      pricing,
      sheetSnapshot,
    });
    return {
      designVersionId: undefined,
      productTypeId: undefined,
      productTypeName: item.filmType ?? this.stringFrom(sheetSnapshot.filmType),
      baseProductId: undefined,
      baseProductName: `${this.stringFrom(item.filmType ?? sheetSnapshot.filmType) ?? "DTF"} gang sheet`,
      baseProductSku: this.stringFrom(item.filmType ?? sheetSnapshot.filmType),
      mockupAssetIds: [],
      mockupImageUrl: undefined,
      productionFileAssetId: undefined,
      selectedOptions: { filmType: item.filmType ?? sheetSnapshot.filmType, widthCm: sheetWidthCm, heightCm: sheetHeightCm, itemCount: sourceItems.length },
      listingSnapshot: { id: null, title: "Gang sheet film order", slug: null, type: "GANG_SHEET_FILM", status: item.gangSheet?.status ?? null, publishedAt: null },
      placementSnapshot: this.cleanJson({ itemKind: item.itemKind, gangSheetId: item.gangSheetId, items: sourceItems }),
      printAreaSnapshot: this.cleanJson({ widthCm: sheetWidthCm, heightCm: sheetHeightCm, areaCm2: sheetWidthCm * sheetHeightCm, units: "CM", preset }),
      royaltySnapshot: this.cleanJson({ basis: "GANG_SHEET_FILM", amount: designerRoyaltyAmount, breakdown: royaltyBreakdown }),
      pricingSnapshot: this.cleanJson({ ...pricing, deliveryFeeAllocation }),
      productionSnapshot: filmProductionSnapshot,
      fulfillmentRoute: OrderFulfillmentRoute.LOCAL_PRODUCTION,
      providerSyncRecordId: undefined,
      providerType: undefined,
      providerProductId: undefined,
      providerVariantId: undefined,
      providerFileId: undefined,
      providerPlacementPayloadSnapshot: Prisma.JsonNull,
      providerFulfillmentSnapshot: Prisma.JsonNull,
      designerRoyaltyAmount,
      productionCostEstimate: this.numberFrom(pricing.productionCostEstimate),
      filmProductionSnapshot,
    };
  }

  private marginEstimate(listing: CheckoutListing, quantity: number) {
    const price = Number(listing.price) * quantity;
    const cost = listing.cost ? Number(listing.cost) * quantity : listing.localBaseProduct?.baseCost ? Number(listing.localBaseProduct.baseCost) * quantity : 0;
    const royalty = listing.designerRoyalty ? Number(listing.designerRoyalty) * quantity : 0;
    return Number((price - cost - royalty).toFixed(2));
  }

  private selectedOptions(dto: AddCartItemDto) {
    return { size: dto.size, color: dto.color, material: dto.material, printSide: dto.printSide };
  }

  private firstImageUrl(value: Prisma.JsonValue | null) {
    return Array.isArray(value) ? value.find((item): item is string => typeof item === "string" && item.length > 0) : undefined;
  }

  private objectJson(value: Prisma.JsonValue | null): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private stringFrom(value: unknown) {
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }

  private numberFrom(value: unknown) {
    const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : null;
    return number != null && Number.isFinite(number) ? number : null;
  }

  private sourcePlacementIdFrom(value: Prisma.JsonValue | null) {
    const snapshot = this.objectJson(value);
    return this.stringFrom(snapshot.sourcePlacementId) ?? this.stringFrom(snapshot.placementId) ?? this.stringFrom(snapshot.mockupPlacementId);
  }

  private cleanJson<T>(value: T): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
  }
}
