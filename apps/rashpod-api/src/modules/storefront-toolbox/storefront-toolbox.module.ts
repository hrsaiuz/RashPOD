import { Module } from "@nestjs/common";
import { StorefrontToolboxController } from "./storefront-toolbox.controller";
import { StorefrontToolboxService } from "./storefront-toolbox.service";

@Module({
  controllers: [StorefrontToolboxController],
  providers: [StorefrontToolboxService],
})
export class StorefrontToolboxModule {}
