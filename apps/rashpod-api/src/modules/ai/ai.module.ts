import { Module } from "@nestjs/common";
import { AdminOpsModule } from "../admin-ops/admin-ops.module";
import { AuditModule } from "../audit/audit.module";
import { AiAdminController } from "./ai-admin.controller";
import { AiController } from "./ai.controller";
import { AiModerationController } from "./ai-moderation.controller";
import { AiService } from "./ai.service";

@Module({
  imports: [AdminOpsModule, AuditModule],
  controllers: [AiController, AiAdminController, AiModerationController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
