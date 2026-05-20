import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { FilesModule } from "../files/files.module";
import { AdminBrandingController, AdminMediaController, PublicBrandingController, PublicMediaController } from "./media.controller";
import { MediaService } from "./media.service";

@Module({
  imports: [AuditModule, FilesModule],
  controllers: [AdminMediaController, AdminBrandingController, PublicBrandingController, PublicMediaController],
  providers: [MediaService],
})
export class MediaModule {}
