import { WorkerRepository } from "./repository";
import { WorkerJob } from "./types";
import { EmailJobHandler, EmailSenderPort } from "./jobs/email-handler";
import { TelegramJobHandler } from "./jobs/telegram-handler";
import { AiJobHandler } from "./jobs/ai-handler";
import { MockupJobHandler } from "./jobs/mockup-handler";
import { MarketplacePublicationJobHandler } from "./jobs/marketplace-publication-handler";
import { PipelineMockupJobHandler } from "./jobs/pipeline-mockup-handler";
import { PodSyncJobHandler } from "./jobs/pod-sync-handler";
import { PrintfulCatalogSyncJobHandler } from "./jobs/printful-catalog-sync-handler";
import { WorkerLogger, workerLogger } from "./logger";

export class WorkerDispatcher {
  private readonly mockupHandler: MockupJobHandler;
  private readonly pipelineMockupHandler: PipelineMockupJobHandler;
  private readonly marketplacePublicationHandler: MarketplacePublicationJobHandler;
  private readonly printfulCatalogSyncHandler: PrintfulCatalogSyncJobHandler;
  private readonly podSyncHandler: PodSyncJobHandler;
  private readonly emailHandler: EmailJobHandler;
  private readonly telegramHandler: TelegramJobHandler;
  private readonly aiHandler: AiJobHandler;
  private readonly logger: WorkerLogger;

  constructor(repo: WorkerRepository, emailSender?: EmailSenderPort, logger: WorkerLogger = workerLogger) {
    this.mockupHandler = new MockupJobHandler(repo);
    this.pipelineMockupHandler = new PipelineMockupJobHandler(repo);
    this.marketplacePublicationHandler = new MarketplacePublicationJobHandler(repo);
    this.printfulCatalogSyncHandler = new PrintfulCatalogSyncJobHandler(repo);
    this.podSyncHandler = new PodSyncJobHandler();
    this.emailHandler = new EmailJobHandler(emailSender, repo);
    this.telegramHandler = new TelegramJobHandler(repo);
    this.aiHandler = new AiJobHandler(repo);
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
      case "SYNC_POD_CATALOG":
        return this.podSyncHandler.handleCatalogSync(job.payload as { providerConfigId: string; syncRunId?: string });
      case "UPLOAD_POD_PROVIDER_FILE":
        return this.podSyncHandler.handleProviderFileUpload(job.payload as { providerFileId?: string; providerConfigId?: string; sourceAssetId?: string });
      case "SYNC_POD_PRODUCT_DRAFT":
        return this.podSyncHandler.handleProductDraftSync(job.payload as { syncRecordId: string });
      case "GENERATE_LISTING_IMAGE_PACK":
        return this.mockupHandler.handleListingPack(
          job.payload as { placementId: string; generatedAssetIds: string[] },
        );
      case "GENERATE_FILM_PREVIEW":
        return this.mockupHandler.handleFilmPreview(job.payload as { placementId: string; generatedAssetId: string });
      case "GENERATE_PRODUCTION_FILE":
        if (typeof (job.payload as { productionJobId?: unknown }).productionJobId === "string") {
          return this.mockupHandler.handleProductionFile(job.payload as { productionJobId: string });
        }
        return this.mockupHandler.handleProductionFile(job.payload as { placementId: string; generatedAssetId: string });
      case "SEND_EMAIL":
        return this.emailHandler.handleSendEmail(job.payload as any);
      case "TELEGRAM_SEND":
        return this.telegramHandler.handleSendTelegram(job.payload as any);
      case "NOTIFICATION_DISPATCH":
      case "SUPPORT_NOTIFICATION":
        return { skipped: true, reason: `${job.type} is handled by API orchestration` };
      case "AI_DESIGN_QA":
      case "AI_MODERATION_ASSIST":
      case "AI_PRODUCT_RECOMMENDATION":
      case "AI_LISTING_COPY":
      case "AI_MARKETPLACE_COPY":
      case "AI_TRANSLATION":
        return this.aiHandler.handle(job.payload as { aiJobId: string });
      default:
        return { skipped: true, reason: `No handler for job type ${job.type}` };
    }
  }
}
