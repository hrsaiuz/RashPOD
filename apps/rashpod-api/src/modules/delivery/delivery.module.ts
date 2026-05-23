import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { DeliveryController } from "./delivery.controller";
import { DeliveryService } from "./delivery.service";
import { ShopController } from "./shop.controller";

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [DeliveryController, ShopController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
