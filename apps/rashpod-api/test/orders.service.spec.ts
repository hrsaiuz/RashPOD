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
});
