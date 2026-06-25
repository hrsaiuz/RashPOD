import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { AuditModule } from "../audit/audit.module";
import { FilesModule } from "../files/files.module";
import { DesignStoriesController } from "./design-stories.controller";
import { DesignStoriesService } from "./design-stories.service";

@Module({
  imports: [AuditModule, FilesModule, AiModule],
  controllers: [DesignStoriesController],
  providers: [DesignStoriesService],
  exports: [DesignStoriesService],
})
export class DesignStoriesModule {}
