import { Module } from "@nestjs/common";
import { FilesModule } from "../files/files.module";
import { WorkerJobsModule } from "../worker-jobs/worker-jobs.module";
import { PrintfulCatalogService } from "./printful-catalog.service";
import { PrintfulClient } from "./printful.client";
import { PrintfulController } from "./printful.controller";
import { PrintfulFilesService } from "./printful-files.service";
import { PrintfulMockupService } from "./printful-mockup.service";
import { PrintfulPublicationService } from "./printful-publication.service";
import { PrintfulSyncService } from "./printful-sync.service";
import { PrintfulWebhookService } from "./printful-webhook.service";
import { PrintfulWebhookController } from "./printful-webhook.controller";

@Module({
  imports: [FilesModule, WorkerJobsModule],
  controllers: [PrintfulController, PrintfulWebhookController],
  providers: [PrintfulClient, PrintfulMockupService, PrintfulCatalogService, PrintfulFilesService, PrintfulSyncService, PrintfulWebhookService, PrintfulPublicationService],
  exports: [PrintfulClient, PrintfulMockupService, PrintfulCatalogService, PrintfulFilesService, PrintfulSyncService, PrintfulWebhookService, PrintfulPublicationService],
})
export class PrintfulModule {}
