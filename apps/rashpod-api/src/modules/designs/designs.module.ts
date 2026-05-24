import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { FilesModule } from "../files/files.module";
import { DesignerDesignsController } from "./designer-designs.controller";
import { DesignsController } from "./designs.controller";
import { DesignsService } from "./designs.service";

@Module({
  imports: [AuditModule, FilesModule],
  controllers: [DesignsController, DesignerDesignsController],
  providers: [DesignsService],
  exports: [DesignsService],
})
export class DesignsModule {}
