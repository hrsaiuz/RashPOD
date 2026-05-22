import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { AnalyticsService } from "./analytics.service";
import { AnalyticsQueryDto, CreateReportExportDto } from "./dto/analytics-query.dto";

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("admin/analytics/overview")
  @RequirePermission("analytics:read")
  overview(@CurrentUser() user: RequestUser, @Query() query: AnalyticsQueryDto) {
    return this.analytics.overview(user.sub, query);
  }

  @Get("admin/analytics/warnings")
  @RequirePermission("analytics:read")
  warnings(@Query() query: AnalyticsQueryDto) {
    return this.analytics.warnings(query);
  }

  @Get("admin/analytics/sales")
  @RequirePermission("analytics:sales-read")
  sales(@Query() query: AnalyticsQueryDto) {
    return this.analytics.sales(query);
  }

  @Get("admin/analytics/sales/top-listings")
  @RequirePermission("analytics:sales-read")
  topListings(@Query() query: AnalyticsQueryDto) {
    return this.analytics.topListings(query);
  }

  @Get("admin/analytics/sales/top-designers")
  @RequirePermission("analytics:sales-read")
  topDesigners(@Query() query: AnalyticsQueryDto) {
    return this.analytics.topDesigners(query);
  }

  @Get("admin/analytics/sales/channels")
  @RequirePermission("analytics:sales-read")
  channels(@Query() query: AnalyticsQueryDto) {
    return this.analytics.channels(query);
  }

  @Get("admin/analytics/production")
  @RequirePermission("analytics:production-read")
  production(@Query() query: AnalyticsQueryDto) {
    return this.analytics.production(query);
  }

  @Get("admin/analytics/production/queue")
  @RequirePermission("analytics:production-read")
  productionQueue(@Query() query: AnalyticsQueryDto) {
    return this.analytics.productionQueue(query);
  }

  @Get("admin/analytics/production/qc")
  @RequirePermission("analytics:production-read")
  productionQc(@Query() query: AnalyticsQueryDto) {
    return this.analytics.productionQc(query);
  }

  @Get("admin/analytics/production/operators")
  @RequirePermission("analytics:production-read")
  productionOperators(@Query() query: AnalyticsQueryDto) {
    return this.analytics.productionOperators(query);
  }

  @Get("admin/analytics/designers")
  @RequirePermission("analytics:designers-read")
  designers(@Query() query: AnalyticsQueryDto) {
    return this.analytics.designers(query);
  }

  @Get("admin/analytics/designers/:designerId")
  @RequirePermission("analytics:designers-read")
  designer(@Param("designerId") designerId: string, @Query() query: AnalyticsQueryDto) {
    return this.analytics.designerAnalytics(designerId, query, false);
  }

  @Get("designer/analytics")
  @RequirePermission("designer:analytics-read-own")
  ownDesigner(@CurrentUser() user: RequestUser, @Query() query: AnalyticsQueryDto) {
    return this.analytics.designerAnalytics(user.sub, query, true);
  }

  @Get("admin/analytics/marketplace")
  @RequirePermission("analytics:marketplace-read")
  marketplace(@Query() query: AnalyticsQueryDto) {
    return this.analytics.marketplace(query);
  }

  @Get("admin/analytics/marketplace/export-readiness")
  @RequirePermission("analytics:marketplace-read")
  marketplaceExportReadiness(@Query() query: AnalyticsQueryDto) {
    return this.analytics.marketplaceExportReadiness(query);
  }

  @Get("admin/analytics/marketplace/external-sales")
  @RequirePermission("analytics:marketplace-read")
  marketplaceExternalSales(@Query() query: AnalyticsQueryDto) {
    return this.analytics.marketplaceExternalSales(query);
  }

  @Get("admin/analytics/finance")
  @RequirePermission("analytics:finance-read")
  finance(@Query() query: AnalyticsQueryDto) {
    return this.analytics.finance(query);
  }

  @Get("admin/analytics/finance/royalties")
  @RequirePermission("analytics:finance-read")
  financeRoyalties(@Query() query: AnalyticsQueryDto) {
    return this.analytics.financeRoyalties(query);
  }

  @Get("admin/analytics/finance/reconciliation")
  @RequirePermission("analytics:finance-read")
  financeReconciliation(@Query() query: AnalyticsQueryDto) {
    return this.analytics.financeReconciliation(query);
  }

  @Get("admin/analytics/film")
  @RequirePermission("analytics:sales-read")
  film(@Query() query: AnalyticsQueryDto) {
    return this.analytics.film(query);
  }

  @Get("admin/analytics/gang-sheets")
  @RequirePermission("analytics:sales-read")
  gangSheets(@Query() query: AnalyticsQueryDto) {
    return this.analytics.gangSheets(query);
  }

  @Post("admin/analytics/exports")
  @RequirePermission("analytics:export")
  createExport(@CurrentUser() user: RequestUser, @Body() dto: CreateReportExportDto) {
    return this.analytics.createExport(user.sub, dto);
  }

  @Get("admin/analytics/exports/:id")
  @RequirePermission("analytics:export")
  exportStatus(@Param("id") id: string) {
    return this.analytics.getExport(id);
  }

  @Get("admin/analytics/exports/:id/download")
  @RequirePermission("analytics:export")
  downloadExport(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.analytics.downloadExport(user.sub, id);
  }
}
