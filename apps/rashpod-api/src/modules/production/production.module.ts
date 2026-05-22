import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { FinanceModule } from "../finance/finance.module";
import { FilesModule } from "../files/files.module";
import { WorkerJobsModule } from "../worker-jobs/worker-jobs.module";
import { ProductionController } from "./production.controller";
import { ProductionService } from "./production.service";

@Module({
  imports: [AuditModule, FilesModule, WorkerJobsModule, FinanceModule],
  controllers: [ProductionController],
  providers: [ProductionService],
  exports: [ProductionService],
})
export class ProductionModule {}
