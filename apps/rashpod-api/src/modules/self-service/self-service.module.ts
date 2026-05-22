import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { PaymentsModule } from "../payments/payments.module";
import { SelfServiceController } from "./self-service.controller";
import { SelfServiceService } from "./self-service.service";

@Module({
  imports: [AuditModule, PaymentsModule],
  controllers: [SelfServiceController],
  providers: [SelfServiceService],
  exports: [SelfServiceService],
})
export class SelfServiceModule {}
