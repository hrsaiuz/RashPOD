import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AdminConfigController } from "./admin-config.controller";
import { AdminConfigService } from "./admin-config.service";

@Module({
  imports: [AuditModule],
  controllers: [AdminConfigController],
  providers: [AdminConfigService],
})
export class AdminConfigModule {}
