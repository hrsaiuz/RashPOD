import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { FinanceModule } from "../finance/finance.module";
import { OrdersModule } from "../orders/orders.module";
import { ExternalSalesController } from "./external-sales.controller";
import { ExternalSalesService } from "./external-sales.service";

@Module({
  imports: [AuditModule, FinanceModule, OrdersModule],
  controllers: [ExternalSalesController],
  providers: [ExternalSalesService],
  exports: [ExternalSalesService],
})
export class ExternalSalesModule {}
