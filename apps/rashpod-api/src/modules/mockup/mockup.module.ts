import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { WorkerJobsModule } from "../worker-jobs/worker-jobs.module";
import { MockupController } from "./mockup.controller";
import { MockupService } from "./mockup.service";

@Module({
  imports: [AuditModule, WorkerJobsModule],
  controllers: [MockupController],
  providers: [MockupService],
})
export class MockupModule {}
