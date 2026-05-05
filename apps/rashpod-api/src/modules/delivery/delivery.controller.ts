import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { CreateShipmentDto } from "./dto/create-shipment.dto";
import { DeliveryQuoteDto } from "./dto/delivery-quote.dto";
import { DeliveryService } from "./delivery.service";

@Controller("delivery")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

  @Get("options")
  @RequirePermission("shop:read")
  listOptions(@Query("zone") zone?: string) {
    return this.delivery.listOptions(zone);
  }

  @Post("quote")
  @RequirePermission("shop:read")
  quote(@Body() dto: DeliveryQuoteDto) {
    return this.delivery.quote(dto);
  }

  @Post("create-shipment")
  @RequirePermission("order:manage-all")
  createShipment(@CurrentUser() user: RequestUser, @Body() dto: CreateShipmentDto) {
    return this.delivery.createShipment(user.sub, dto);
  }

  @Get("shipments/:id")
  @RequirePermission("order:manage-all")
  shipment(@Param("id") id: string) {
    return this.delivery.getShipment(id);
  }

  @Patch("admin/providers/:id")
  @RequirePermission("delivery-settings:manage")
  toggleProvider(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body("isActive") isActive: boolean) {
    return this.delivery.setProviderStatus(user.sub, id, isActive);
  }
}
