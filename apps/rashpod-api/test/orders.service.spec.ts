import { ForbiddenException } from "@nestjs/common";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { OrdersService } from "../src/modules/orders/orders.service";

describe("OrdersService completeness", () => {
  it("updates own cart item quantity", async () => {
    const prisma: any = {
      cart: { findUnique: jest.fn().mockResolvedValue({ id: "cart_1", customerId: "cust_1" }) },
      cartItem: {
        findUnique: jest.fn().mockResolvedValue({ id: "itm_1", cartId: "cart_1", quantity: 1 }),
        update: jest.fn().mockResolvedValue({ id: "itm_1", quantity: 3 }),
      },
    };
    const service = new OrdersService(prisma, { log: jest.fn() } as any);

    const result = await service.updateCartItem("cust_1", "itm_1", 3);

    expect(result.quantity).toBe(3);
    expect(prisma.cartItem.update).toHaveBeenCalledWith({ where: { id: "itm_1" }, data: { quantity: 3 } });
  });

  it("cancels pending order and cancels pending payment", async () => {
    const prisma: any = {
      order: {
        findUnique: jest.fn().mockResolvedValue({ id: "ord_1", customerId: "cust_1", status: OrderStatus.PENDING_PAYMENT }),
        update: jest.fn().mockResolvedValue({ id: "ord_1", status: OrderStatus.CANCELLED }),
      },
      paymentTransaction: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    const audit: any = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new OrdersService(prisma, audit);

    const result = await service.cancelOrder("cust_1", "ord_1");

    expect(result.status).toBe(OrderStatus.CANCELLED);
    expect(prisma.paymentTransaction.updateMany).toHaveBeenCalledWith({
      where: { orderId: "ord_1", status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.CANCELLED },
    });
  });

  it("blocks cancelling paid order", async () => {
    const prisma: any = {
      order: { findUnique: jest.fn().mockResolvedValue({ id: "ord_2", customerId: "cust_1", status: OrderStatus.PAID }) },
    };
    const service = new OrdersService(prisma, { log: jest.fn() } as any);
    await expect(service.cancelOrder("cust_1", "ord_2")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("creates production jobs only for paid order items", async () => {
    const prisma: any = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: "ord_3",
          customerId: "cust_1",
          customerName: "Customer One",
          customerPhone: "+99890",
          status: OrderStatus.PAID,
          items: [{
            id: "oi_1",
            listingId: "listing_1",
            listingTitle: "Ready Tee",
            productTypeName: "T-shirt",
            baseProductName: "Cotton Tee",
            quantity: 2,
            selectedSize: "M",
            selectedColor: "Black",
            selectedMaterial: "cotton",
            selectedPrintSide: "front",
            mockupAssetIds: ["ma_1"],
            mockupImageUrl: "https://example.test/mockup.png",
            productionFileAssetId: "ga_ready",
            placementSnapshotJson: { x: 10 },
            printAreaSnapshotJson: { width: 300 },
            designAssetId: "design_1",
            designVersionId: "version_1",
          }],
        }),
        update: jest.fn().mockResolvedValue({ id: "ord_3", status: OrderStatus.IN_PRODUCTION }),
      },
      productionJob: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "pj_1", orderId: "ord_3", orderItemId: "oi_1" }),
      },
    };
    const audit: any = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new OrdersService(prisma, audit);

    const jobs = await service.createProductionJobsForPaidOrder("admin_1", "ord_3");

    expect(jobs).toHaveLength(1);
    expect(prisma.productionJob.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        orderId: "ord_3",
        orderItemId: "oi_1",
        productionFileStatus: "READY",
        selectedOptionsJson: expect.objectContaining({ size: "M", color: "Black" }),
      }),
    }));
    expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: "ord_3" }, data: { status: OrderStatus.IN_PRODUCTION } });
  });
});
