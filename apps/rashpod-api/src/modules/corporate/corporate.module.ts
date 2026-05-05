import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { CorporateController } from "./corporate.controller";
import { CorporateService } from "./corporate.service";

@Module({
  imports: [AuditModule],
  controllers: [CorporateController],
  providers: [CorporateService],
})
export class CorporateModule {}
