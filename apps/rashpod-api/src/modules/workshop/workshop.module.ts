import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { CommunicationsModule } from "../communications/communications.module";
import { FilesModule } from "../files/files.module";
import { ProductionModule } from "../production/production.module";
import { WorkshopController } from "./workshop.controller";
import { WorkshopService } from "./workshop.service";

@Module({
  imports: [AuditModule, CommunicationsModule, FilesModule, ProductionModule],
  controllers: [WorkshopController],
  providers: [WorkshopService],
})
export class WorkshopModule {}
