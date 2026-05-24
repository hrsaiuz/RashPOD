import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { FilesModule } from "../files/files.module";
import { PrintfulModule } from "../printful/printful.module";
import { WorkerJobsModule } from "../worker-jobs/worker-jobs.module";
import { PodPlacementTransformService } from "./placement-transform.service";
import { PodController } from "./pod.controller";
import { PodService } from "./pod.service";
import { PrintfulProviderAdapter } from "./provider-adapters/printful-provider.adapter";
import { PrintifyProviderAdapter } from "./provider-adapters/printify-provider.adapter";

@Module({
  imports: [AuditModule, FilesModule, WorkerJobsModule, PrintfulModule],
  controllers: [PodController],
  providers: [PodService, PodPlacementTransformService, PrintfulProviderAdapter, PrintifyProviderAdapter],
  exports: [PodService],
})
export class PodModule {}
