import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { WorkerJobsModule } from "../worker-jobs/worker-jobs.module";
import { CrmController } from "./crm.controller";
import { CrmService } from "./crm.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { SupportController } from "./support.controller";
import { SupportService } from "./support.service";

@Module({
  imports: [AuditModule, WorkerJobsModule],
  controllers: [NotificationsController, SupportController, CrmController],
  providers: [NotificationsService, SupportService, CrmService],
  exports: [NotificationsService, SupportService, CrmService],
})
export class CommunicationsModule {}
