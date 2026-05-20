import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { CurrencyModule } from "../currency/currency.module";
import { AdminUsersController } from "./admin-users.controller";
import { AdminUsersService } from "./admin-users.service";

@Module({
  imports: [AuditModule, CurrencyModule],
  controllers: [AdminUsersController],
  providers: [AdminUsersService],
})
export class AdminUsersModule {}
