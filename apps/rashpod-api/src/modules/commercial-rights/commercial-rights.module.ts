import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { CommercialRightsController } from "./commercial-rights.controller";
import { CommercialRightsService } from "./commercial-rights.service";

@Module({
  imports: [AuditModule],
  controllers: [CommercialRightsController],
  providers: [CommercialRightsService],
})
export class CommercialRightsModule {}
