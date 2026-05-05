import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AdminOpsController } from "./admin-ops.controller";
import { AdminOpsService } from "./admin-ops.service";

@Module({
  imports: [AuditModule],
  controllers: [AdminOpsController],
  providers: [AdminOpsService],
  exports: [AdminOpsService],
})
export class AdminOpsModule {}
