import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { BulkCommercialRightsController, CommercialRightsController } from "./commercial-rights.controller";
import { CommercialRightsService } from "./commercial-rights.service";

@Module({
  imports: [AuditModule],
  controllers: [BulkCommercialRightsController, CommercialRightsController],
  providers: [CommercialRightsService],
})
export class CommercialRightsModule {}
