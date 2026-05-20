import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { WorkerJobsModule } from "../worker-jobs/worker-jobs.module";
import { AdminConfigController } from "./admin-config.controller";
import { AdminConfigService } from "./admin-config.service";

@Module({
  imports: [AuditModule, WorkerJobsModule],
  controllers: [AdminConfigController],
  providers: [AdminConfigService],
})
export class AdminConfigModule {}
