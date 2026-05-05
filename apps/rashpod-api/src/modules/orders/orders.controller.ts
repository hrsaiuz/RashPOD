import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { AddCartItemDto } from "./dto/add-cart-item.dto";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateCartItemDto } from "./dto/update-cart-item.dto";
import { OrdersService } from "./orders.service";

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post("cart")
  @RequirePermission("cart:manage-own")
  addCartItem(@CurrentUser() user: RequestUser, @Body() dto: AddCartItemDto) {
    return this.orders.addCartItem(user.sub, dto);
  }

  @Get("cart")
  @RequirePermission("cart:manage-own")
  getCart(@CurrentUser() user: RequestUser) {
    return this.orders.getCart(user.sub);
  }

  @Delete("cart/items/:id")
  @RequirePermission("cart:manage-own")
  removeItem(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.orders.removeCartItem(user.sub, id);
  }

  @Patch("cart/items/:id")
  @RequirePermission("cart:manage-own")
  updateItem(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateCartItemDto) {
    return this.orders.updateCartItem(user.sub, id, dto.quantity);
  }

  @Post("orders")
  @RequirePermission("order:manage-own")
  createOrder(@CurrentUser() user: RequestUser, @Body() dto: CreateOrderDto) {
    return this.orders.createOrder(user.sub, dto);
  }

  @Get("orders")
  @RequirePermission("order:manage-own")
  listOrders(@CurrentUser() user: RequestUser) {
    return this.orders.listOwnOrders(user.sub);
  }

  @Get("orders/:id")
  @RequirePermission("order:manage-own")
  getOrder(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.orders.getOrder(user.sub, id);
  }

  @Post("orders/:id/cancel")
  @RequirePermission("order:manage-own")
  cancelOrder(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.orders.cancelOrder(user.sub, id);
  }

  @Get("admin/orders")
  @RequirePermission("order:manage-all")
  listAllOrders() {
    return this.orders.listAllOrders();
  }

  @Post("admin/orders/:id/mark-paid")
  @RequirePermission("order:manage-all")
  markPaid(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body("providerRef") providerRef?: string) {
    return this.orders.markPaid(user.sub, id, providerRef);
  }
}
