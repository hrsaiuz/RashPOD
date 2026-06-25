import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DesignStoriesModule } from "../design-stories/design-stories.module";
import { FilesModule } from "../files/files.module";
import { PodModule } from "../pod/pod.module";
import { PrintfulModule } from "../printful/printful.module";
import { WorkerJobsModule } from "../worker-jobs/worker-jobs.module";
import { DesignWorkflowController } from "./design-workflow.controller";
import { DesignWorkflowService } from "./design-workflow.service";
import { MarketplaceComplianceService } from "./marketplace-compliance.service";
import { PlacementCalculationService } from "./placement-calculation.service";
import { WorkflowActionsController } from "./workflow-actions.controller";

@Module({
  imports: [AuditModule, WorkerJobsModule, FilesModule, PrintfulModule, PodModule, DesignStoriesModule],
  controllers: [DesignWorkflowController, WorkflowActionsController],
  providers: [DesignWorkflowService, PlacementCalculationService, MarketplaceComplianceService],
  exports: [DesignWorkflowService, PlacementCalculationService, MarketplaceComplianceService],
})
export class DesignWorkflowModule {}
