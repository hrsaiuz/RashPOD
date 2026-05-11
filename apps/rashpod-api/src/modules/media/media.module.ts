import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { FilesModule } from "../files/files.module";
import { AdminBrandingController, AdminMediaController, PublicBrandingController } from "./media.controller";
import { MediaService } from "./media.service";

@Module({
  imports: [AuditModule, FilesModule],
  controllers: [AdminMediaController, AdminBrandingController, PublicBrandingController],
  providers: [MediaService],
})
export class MediaModule {}
