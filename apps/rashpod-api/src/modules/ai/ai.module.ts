import { Module } from "@nestjs/common";
import { AdminOpsModule } from "../admin-ops/admin-ops.module";
import { AuditModule } from "../audit/audit.module";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";

@Module({
  imports: [AdminOpsModule, AuditModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
