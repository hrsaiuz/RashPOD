import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DesignStoriesModule } from "../design-stories/design-stories.module";
import { ModerationController } from "./moderation.controller";
import { ModerationService } from "./moderation.service";

@Module({
  imports: [AuditModule, DesignStoriesModule],
  controllers: [ModerationController],
  providers: [ModerationService],
})
export class ModerationModule {}
