import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./modules/auth/auth.module";
import { DesignsModule } from "./modules/designs/designs.module";
import { ModerationModule } from "./modules/moderation/moderation.module";
import { AdminConfigModule } from "./modules/admin-config/admin-config.module";
import { AuditModule } from "./modules/audit/audit.module";
import { PrismaModule } from "./prisma/prisma.module";
import { CommercialRightsModule } from "./modules/commercial-rights/commercial-rights.module";
import { FilesModule } from "./modules/files/files.module";
import { MockupModule } from "./modules/mockup/mockup.module";
import { WorkerJobsModule } from "./modules/worker-jobs/worker-jobs.module";
import { ListingsModule } from "./modules/listings/listings.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { ProductionModule } from "./modules/production/production.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { CorporateModule } from "./modules/corporate/corporate.module";
import { DeliveryModule } from "./modules/delivery/delivery.module";
import { AdminOpsModule } from "./modules/admin-ops/admin-ops.module";
import { AiModule } from "./modules/ai/ai.module";
import { MarketplaceModule } from "./modules/marketplace/marketplace.module";
import { PodModule } from "./modules/pod/pod.module";
import { ExternalSalesModule } from "./modules/external-sales/external-sales.module";
import { MailerModule } from "./modules/mailer/mailer.module";
import { EmailTemplatesModule } from "./modules/email-templates/email-templates.module";
import { MediaModule } from "./modules/media/media.module";
import { AdminUsersModule } from "./modules/admin-users/admin-users.module";
import { IntakeModule } from "./modules/intake/intake.module";
import { CurrencyModule } from "./modules/currency/currency.module";
import { DesignWorkflowModule } from "./modules/design-workflow/design-workflow.module";
import { PrintfulModule } from "./modules/printful/printful.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { SelfServiceModule } from "./modules/self-service/self-service.module";
import { FilmModule } from "./modules/film/film.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditModule,
    AuthModule,
    DesignsModule,
    ModerationModule,
    CommercialRightsModule,
    FilesModule,
    WorkerJobsModule,
    MockupModule,
    ListingsModule,
    OrdersModule,
    PaymentsModule,
    DeliveryModule,
    CorporateModule,
    AiModule,
    ProductionModule,
    DashboardModule,
    AdminConfigModule,
    AdminOpsModule,
    MarketplaceModule,
    PodModule,
    ExternalSalesModule,
    MailerModule,
    EmailTemplatesModule,
    MediaModule,
    AdminUsersModule,
    CurrencyModule,
    FinanceModule,
    SelfServiceModule,
    FilmModule,
    IntakeModule,
    DesignWorkflowModule,
    PrintfulModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
