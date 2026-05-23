import { Controller, Get } from "@nestjs/common";
import { DeliveryService } from "./delivery.service";

@Controller("shop")
export class ShopController {
  constructor(private readonly delivery: DeliveryService) {}

  @Get("settings")
  settings() {
    return this.delivery.getPublicShopSettings();
  }
}
