import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { WorkerJobsModule } from "../worker-jobs/worker-jobs.module";
import { DesignerInvitationsController } from "./designer-invitations.controller";
import { DesignerInvitationsService } from "./designer-invitations.service";

@Module({ imports: [AuditModule, WorkerJobsModule], controllers: [DesignerInvitationsController], providers: [DesignerInvitationsService] })
export class DesignerInvitationsModule {}
