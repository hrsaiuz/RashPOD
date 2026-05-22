import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { GangSheetsController } from "./gang-sheets.controller";
import { GangSheetsService } from "./gang-sheets.service";

@Module({
  imports: [AuditModule],
  controllers: [GangSheetsController],
  providers: [GangSheetsService],
  exports: [GangSheetsService],
})
export class GangSheetsModule {}
