import { Module } from "@nestjs/common";
import { FilesModule } from "../files/files.module";
import { PrintfulCatalogService } from "./printful-catalog.service";
import { PrintfulClient } from "./printful.client";
import { PrintfulFilesService } from "./printful-files.service";
import { PrintfulMockupService } from "./printful-mockup.service";
import { PrintfulSyncService } from "./printful-sync.service";
import { PrintfulWebhookService } from "./printful-webhook.service";

@Module({
  imports: [FilesModule],
  providers: [PrintfulClient, PrintfulMockupService, PrintfulCatalogService, PrintfulFilesService, PrintfulSyncService, PrintfulWebhookService],
  exports: [PrintfulClient, PrintfulMockupService, PrintfulCatalogService, PrintfulFilesService, PrintfulSyncService, PrintfulWebhookService],
})
export class PrintfulModule {}
