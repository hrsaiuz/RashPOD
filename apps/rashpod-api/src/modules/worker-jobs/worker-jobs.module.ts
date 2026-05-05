import { Module } from "@nestjs/common";
import { AdminOpsModule } from "../admin-ops/admin-ops.module";
import { AuditModule } from "../audit/audit.module";
import { JobDispatcherService } from "./job-dispatcher.service";
import { WorkerJobsController } from "./worker-jobs.controller";

@Module({
  imports: [AuditModule, AdminOpsModule],
  controllers: [WorkerJobsController],
  providers: [JobDispatcherService],
  exports: [JobDispatcherService],
})
export class WorkerJobsModule {}
