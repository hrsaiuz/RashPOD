import { WorkerRepository } from "./repository";
import { WorkerJob } from "./types";
import { EmailJobHandler, EmailSenderPort } from "./jobs/email-handler";
import { MockupJobHandler } from "./jobs/mockup-handler";
import { MarketplacePublicationJobHandler } from "./jobs/marketplace-publication-handler";
import { PipelineMockupJobHandler } from "./jobs/pipeline-mockup-handler";
import { PrintfulCatalogSyncJobHandler } from "./jobs/printful-catalog-sync-handler";
import { WorkerLogger, workerLogger } from "./logger";

export class WorkerDispatcher {
  private readonly mockupHandler: MockupJobHandler;
  private readonly pipelineMockupHandler: PipelineMockupJobHandler;
  private readonly marketplacePublicationHandler: MarketplacePublicationJobHandler;
  private readonly printfulCatalogSyncHandler: PrintfulCatalogSyncJobHandler;
  private readonly emailHandler: EmailJobHandler;
  private readonly logger: WorkerLogger;

  constructor(repo: WorkerRepository, emailSender?: EmailSenderPort, logger: WorkerLogger = workerLogger) {
    this.mockupHandler = new MockupJobHandler(repo);
    this.pipelineMockupHandler = new PipelineMockupJobHandler(repo);
    this.marketplacePublicationHandler = new MarketplacePublicationJobHandler(repo);
    this.printfulCatalogSyncHandler = new PrintfulCatalogSyncJobHandler(repo);
    this.emailHandler = new EmailJobHandler(emailSender);
    this.logger = logger;
  }

  async dispatch(job: WorkerJob) {
    this.logger.info(
      JSON.stringify({
        level: "info",
        event: "worker.dispatch.start",
        jobId: job.id,
        jobType: job.type,
      }),
    );
    switch (job.type) {
      case "GENERATE_PRODUCT_MOCKUPS":
        return this.mockupHandler.handlePreview(job.payload as { placementId: string; generatedAssetId: string });
      case "GENERATE_LOCAL_MOCKUPS":
        return this.pipelineMockupHandler.handleLocalMockups({ ...(job.payload as { designProductSelectionId: string }), workerJobId: job.id });
      case "GENERATE_PRINTFUL_MOCKUPS":
        return this.pipelineMockupHandler.handlePrintfulMockups({ ...(job.payload as { designProductSelectionId: string }), workerJobId: job.id });
      case "PUBLISH_MARKETPLACE_LISTING":
        return this.marketplacePublicationHandler.handlePublish(job.payload as { marketplacePublicationId: string });
      case "SYNC_PRINTFUL_CATALOG":
        return this.printfulCatalogSyncHandler.handleSync(job.payload as { requestedBy?: string });
      case "GENERATE_LISTING_IMAGE_PACK":
        return this.mockupHandler.handleListingPack(
          job.payload as { placementId: string; generatedAssetIds: string[] },
        );
      case "GENERATE_FILM_PREVIEW":
        return this.mockupHandler.handleFilmPreview(job.payload as { placementId: string; generatedAssetId: string });
      case "GENERATE_PRODUCTION_FILE":
        return this.mockupHandler.handleProductionFile(job.payload as { placementId: string; generatedAssetId: string });
      case "SEND_EMAIL":
        return this.emailHandler.handleSendEmail(job.payload as any);
      default:
        return { skipped: true, reason: `No handler for job type ${job.type}` };
    }
  }
}
