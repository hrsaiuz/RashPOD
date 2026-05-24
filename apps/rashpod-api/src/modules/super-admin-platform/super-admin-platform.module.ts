import { Module } from "@nestjs/common";
import { AdminOpsModule } from "../admin-ops/admin-ops.module";
import { AuditModule } from "../audit/audit.module";
import { SuperAdminPlatformController } from "./super-admin-platform.controller";
import { SuperAdminPlatformService } from "./super-admin-platform.service";

@Module({
  imports: [AuditModule, AdminOpsModule],
  controllers: [SuperAdminPlatformController],
  providers: [SuperAdminPlatformService],
})
export class SuperAdminPlatformModule {}
