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
  ],
})
export class AppModule {}
