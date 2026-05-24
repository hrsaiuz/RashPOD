import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { FilesModule } from "../files/files.module";
import { WorkerJobsModule } from "../worker-jobs/worker-jobs.module";
import { DesignWorkflowController } from "./design-workflow.controller";
import { DesignWorkflowService } from "./design-workflow.service";
import { MarketplaceComplianceService } from "./marketplace-compliance.service";
import { PlacementCalculationService } from "./placement-calculation.service";
import { WorkflowActionsController } from "./workflow-actions.controller";

@Module({
  imports: [AuditModule, WorkerJobsModule, FilesModule],
  controllers: [DesignWorkflowController, WorkflowActionsController],
  providers: [DesignWorkflowService, PlacementCalculationService, MarketplaceComplianceService],
  exports: [DesignWorkflowService, PlacementCalculationService, MarketplaceComplianceService],
})
export class DesignWorkflowModule {}
