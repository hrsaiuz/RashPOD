import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AIJobStatus, AISuggestionStatus, AISuggestionType, ListingStatus, ListingType, OrderStatus, PaymentReconciliationStatus, PaymentStatus, PayoutStatus, Prisma, ProductionJobStatus, RoyaltyLedgerStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AnalyticsQueryDto, CreateReportExportDto } from "./dto/analytics-query.dto";

type JsonRecord = Record<string, unknown>;
type ChannelKey = "DIRECT" | "FILM" | "GANG_SHEET" | "EXTERNAL_MARKETPLACE" | "GLOBAL_POD";

type FilterContext = {
  from: Date;
  to: Date;
  channel?: string;
  productTypeId?: string;
  baseProductId?: string;
  designerId?: string;
  paymentStatus?: string;
  productionStatus?: string;
  marketplaceConfigId?: string;
  currency?: string;
  timezone: string;
  page: number;
  limit: number;
};

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async overview(actorId: string, query: AnalyticsQueryDto) {
    const filters = this.filters(query);
    const [sales, production, finance, marketplace, film, ai, warnings] = await Promise.all([
      this.sales(query),
      this.production(query),
      this.finance(query),
      this.marketplace(query),
      this.film(query),
      this.aiSummary(filters),
      this.warnings(query),
    ]);
    await this.audit.log({ actorId, action: "analytics.report.viewed", entityType: "AnalyticsReport", entityId: "overview", metadata: this.auditFilters(filters) });
    return {
      filters: this.serializeFilters(filters),
      executive: {
        grossSales: sales.kpis.grossSales,
        netSales: sales.kpis.netSales,
        orderCount: sales.kpis.orderCount,
        averageOrderValue: sales.kpis.averageOrderValue,
        marginEstimate: finance.kpis.estimatedPlatformMargin,
        paidOrders: sales.kpis.paidOrders,
        unpaidOrders: sales.kpis.unpaidOrders,
        productionQueue: production.kpis.queueCount,
        payableRoyalties: finance.kpis.designerRoyaltiesPayable,
        reconciliationIssues: finance.kpis.reconciliationIssues,
        currency: sales.currency,
      },
      salesTrend: sales.trend,
      revenueByChannel: sales.breakdowns.byChannel,
      topListings: sales.tables.topListings.slice(0, 5),
      topDesigners: sales.tables.topDesigners.slice(0, 5),
      operationalHealth: {
        productionBlocked: production.kpis.blockedItems,
        overdue: production.kpis.overdueItems,
        qcFailRate: production.kpis.qcFailRate,
        paymentFailures: sales.kpis.paymentFailedOrders,
        failedJobs: warnings.counts.failedWorkerJobs,
        failedAssets: warnings.counts.failedGeneratedAssets,
      },
      warnings,
      ai,
    };
  }

  async warnings(query: AnalyticsQueryDto) {
    const filters = this.filters(query);
    const [incompleteMargins, reconciliationIssues, blockedExports, failedWorkerJobs, failedGeneratedAssets, failedAiJobs] = await Promise.all([
      this.prisma.orderFinanceSnapshot.count({ where: { createdAt: { gte: filters.from, lte: filters.to }, marginIncomplete: true, ...(filters.currency ? { currency: filters.currency } : {}) } }),
      this.prisma.paymentReconciliation.count({ where: { createdAt: { gte: filters.from, lte: filters.to }, status: { in: [PaymentReconciliationStatus.MISMATCHED, PaymentReconciliationStatus.MANUAL_REVIEW, PaymentReconciliationStatus.UNRECONCILED] } } }),
      this.prisma.marketplaceExportItem.count({ where: { createdAt: { gte: filters.from, lte: filters.to }, OR: [{ eligible: false }, { status: { in: ["BLOCKED", "FAILED"] as any } }] } }),
      this.prisma.workerJob.count({ where: { createdAt: { gte: filters.from, lte: filters.to }, status: "FAILED" as any } }),
      this.prisma.generatedAsset.count({ where: { createdAt: { gte: filters.from, lte: filters.to }, status: "FAILED" as any } }),
      this.prisma.aiJob.count({ where: { createdAt: { gte: filters.from, lte: filters.to }, status: AIJobStatus.FAILED } }),
    ]);
    return {
      counts: { incompleteMargins, reconciliationIssues, blockedExports, failedWorkerJobs, failedGeneratedAssets, failedAiJobs },
      items: [
        { key: "incompleteMargins", label: "Incomplete margin warnings", count: incompleteMargins, severity: incompleteMargins ? "WARNING" : "INFO" },
        { key: "reconciliationIssues", label: "Payment reconciliation issues", count: reconciliationIssues, severity: reconciliationIssues ? "BLOCKER" : "INFO" },
        { key: "blockedExports", label: "Blocked marketplace export candidates", count: blockedExports, severity: blockedExports ? "WARNING" : "INFO" },
        { key: "failedWorkerJobs", label: "Failed worker jobs", count: failedWorkerJobs, severity: failedWorkerJobs ? "WARNING" : "INFO" },
        { key: "failedGeneratedAssets", label: "Failed generated assets", count: failedGeneratedAssets, severity: failedGeneratedAssets ? "WARNING" : "INFO" },
        { key: "failedAiJobs", label: "Failed AI jobs", count: failedAiJobs, severity: failedAiJobs ? "WARNING" : "INFO" },
      ],
    };
  }

  async sales(query: AnalyticsQueryDto) {
    const filters = this.filters(query);
    const orders = await this.orders(filters);
    const paidOrders = orders.filter((order) => this.isPaidOrder(order.status));
    const allItems = this.filteredItems(orders, filters);
    const paidItems = this.filteredItems(paidOrders, filters);
    const paidOrderIds = new Set(paidOrders.map((order) => order.id));
    const paidSnapshots = orders.flatMap((order) => order.financeSnapshots ?? []).filter((snapshot: any) => paidOrderIds.has(snapshot.orderId) && this.snapshotMatches(snapshot, filters));
    const grossSales = this.sum(paidOrders.map((order) => order.total));
    const netSales = paidSnapshots.length ? this.sum(paidSnapshots.map((snapshot: any) => snapshot.netRevenue)) : this.sum(paidItems.map((item) => item.totalPrice));
    const refundedCanceled = orders.filter((order) => order.status === OrderStatus.REFUNDED || order.status === OrderStatus.CANCELLED).reduce((sum, order) => sum + this.num(order.total), 0);
    const paymentFailedOrders = orders.filter((order) => (order.payments ?? []).some((payment: any) => payment.status === PaymentStatus.FAILED)).length;
    const byChannel = this.groupRevenue(paidOrders, paidItems, filters, (order, item) => this.channelFor(order, item));
    const byProductType = this.groupItems(paidItems, (item) => item.productTypeName ?? item.productTypeId ?? "Unknown");
    const byBaseProduct = this.groupItems(paidItems, (item) => item.baseProductName ?? item.baseProductId ?? "Unknown");
    const byListing = this.groupItems(paidItems, (item) => item.listingTitle ?? item.listingId ?? "Unknown", "listingId");
    const byDesigner = this.groupItems(paidItems, (item) => item.designerId ?? "Unknown", "designerId");
    return {
      filters: this.serializeFilters(filters),
      currency: this.currencyFor(orders, filters),
      kpis: {
        grossSales: this.round(grossSales),
        netSales: this.round(netSales),
        paidOrders: paidOrders.length,
        unpaidOrders: orders.filter((order) => order.status === OrderStatus.PENDING_PAYMENT).length,
        paymentFailedOrders,
        refundedCanceledAmount: this.round(refundedCanceled),
        averageOrderValue: paidOrders.length ? this.round(grossSales / paidOrders.length) : 0,
        orderCount: orders.length,
        itemCount: allItems.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0),
      },
      trend: this.salesTrend(paidOrders, filters),
      breakdowns: { byChannel, byProductType, byBaseProduct, byListing, byDesigner, paidStatusSplit: this.paymentSplit(orders) },
      tables: {
        topListings: byListing.slice(0, filters.limit),
        topDesigners: byDesigner.slice(0, filters.limit),
        topProducts: byBaseProduct.slice(0, filters.limit),
        topChannels: byChannel,
        recentHighValueOrders: paidOrders.sort((a, b) => this.num(b.total) - this.num(a.total)).slice(0, 20).map((order) => ({ id: order.id, total: this.num(order.total), currency: order.currency, status: order.status, source: order.source, channel: order.channel, createdAt: order.createdAt })),
      },
    };
  }

  async topListings(query: AnalyticsQueryDto) {
    return (await this.sales(query)).tables.topListings;
  }

  async topDesigners(query: AnalyticsQueryDto) {
    return (await this.sales(query)).tables.topDesigners;
  }

  async channels(query: AnalyticsQueryDto) {
    return (await this.sales(query)).breakdowns.byChannel;
  }

  async production(query: AnalyticsQueryDto) {
    const filters = this.filters(query);
    const jobs = await this.productionJobs(filters);
    const terminal = new Set<ProductionJobStatus>([ProductionJobStatus.DELIVERED, ProductionJobStatus.COMPLETED, ProductionJobStatus.CANCELED]);
    const qcJobs = jobs.filter((job) => job.qcStatus || job.qcCheckedAt || job.qcAt || job.status === ProductionJobStatus.QC_FAILED || job.status === ProductionJobStatus.REPRINT_REQUIRED);
    const qcFailed = qcJobs.filter((job) => job.qcStatus === "FAILED" || job.status === ProductionJobStatus.QC_FAILED || job.status === ProductionJobStatus.REPRINT_REQUIRED || Number(job.rejectedQuantity ?? 0) > 0);
    return {
      filters: this.serializeFilters(filters),
      kpis: {
        queueCount: jobs.filter((job) => !terminal.has(job.status)).length,
        blockedItems: jobs.filter((job) => job.status === ProductionJobStatus.BLOCKED || Boolean(job.blockerReason)).length,
        overdueItems: jobs.filter((job) => job.dueAt && job.dueAt.getTime() < Date.now() && !terminal.has(job.status)).length,
        productionFileFailures: jobs.filter((job) => ["FAILED", "MISSING_SOURCE"].includes(String(job.productionFileStatus ?? ""))).length,
        averagePaidToQueuedHours: this.averageDurationHours(jobs, (job) => job.order?.createdAt, (job) => job.queuedAt),
        averageQueuedToStartedHours: this.averageDurationHours(jobs, (job) => job.queuedAt, (job) => job.startedAt),
        averageProductionHours: this.averageDurationHours(jobs, (job) => job.startedAt, (job) => job.qcAt ?? job.readyAt),
        averageQcHours: this.averageDurationHours(jobs, (job) => job.qcAt, (job) => job.readyAt ?? job.completedAt),
        qcPassRate: qcJobs.length ? this.round(((qcJobs.length - qcFailed.length) / qcJobs.length) * 100) : 0,
        qcFailRate: qcJobs.length ? this.round((qcFailed.length / qcJobs.length) * 100) : 0,
      },
      byStatus: this.countBy(jobs, (job) => job.status),
      byQueueType: this.countBy(jobs, (job) => job.queueType),
      byProductType: this.countBy(jobs, (job) => this.stringFrom(this.objectJson(job.productSnapshotJson).productTypeName) ?? this.stringFrom(this.objectJson(job.productSnapshotJson).productTypeId) ?? "Unknown"),
      tables: {
        blocked: jobs.filter((job) => job.status === ProductionJobStatus.BLOCKED || Boolean(job.blockerReason)).slice(0, filters.limit),
        overdue: jobs.filter((job) => job.dueAt && job.dueAt.getTime() < Date.now() && !terminal.has(job.status)).slice(0, filters.limit),
        failedProductionFiles: jobs.filter((job) => ["FAILED", "MISSING_SOURCE"].includes(String(job.productionFileStatus ?? ""))).slice(0, filters.limit),
        qcFailures: qcFailed.slice(0, filters.limit),
        operatorWorkload: this.operatorWorkload(jobs),
      },
    };
  }

  async productionQueue(query: AnalyticsQueryDto) {
    const data = await this.production(query);
    return { byStatus: data.byStatus, byQueueType: data.byQueueType, blocked: data.tables.blocked, overdue: data.tables.overdue };
  }

  async productionQc(query: AnalyticsQueryDto) {
    const data = await this.production(query);
    return { qcPassRate: data.kpis.qcPassRate, qcFailRate: data.kpis.qcFailRate, failures: data.tables.qcFailures };
  }

  async productionOperators(query: AnalyticsQueryDto) {
    return (await this.production(query)).tables.operatorWorkload;
  }

  async designers(query: AnalyticsQueryDto) {
    const filters = this.filters(query);
    const [users, sales] = await Promise.all([
      this.prisma.user.findMany({ where: { role: "DESIGNER" as any }, select: { id: true, email: true, displayName: true, handle: true }, take: 500 }),
      this.sales(query),
    ]);
    const rows = await Promise.all(users.map(async (designer) => {
      const analytics = await this.designerAnalytics(designer.id, { ...query, designerId: designer.id }, false);
      return { designer, ...(analytics.summary as any) };
    }));
    return { filters: this.serializeFilters(filters), platformTopDesigners: sales.tables.topDesigners, rows: rows.sort((a: any, b: any) => b.revenue - a.revenue).slice(0, filters.limit) };
  }

  async designerAnalytics(designerId: string, query: AnalyticsQueryDto, ownView: boolean) {
    const filters = this.filters({ ...query, designerId });
    const [orders, designsByStatus, listingsByStatus, royalties, payouts] = await Promise.all([
      this.orders(filters),
      this.prisma.designAsset.groupBy({ by: ["status"], where: { designerId, createdAt: { gte: filters.from, lte: filters.to } }, _count: { _all: true } }),
      this.prisma.commerceListing.groupBy({ by: ["status"], where: { designerId, createdAt: { gte: filters.from, lte: filters.to } }, _count: { _all: true } }),
      this.prisma.royaltyLedgerEntry.findMany({ where: { designerId, createdAt: { gte: filters.from, lte: filters.to }, ...(filters.currency ? { currency: filters.currency } : {}) } }),
      this.prisma.payout.findMany({ where: { designerId, createdAt: { gte: filters.from, lte: filters.to }, ...(filters.currency ? { currency: filters.currency } : {}) }, orderBy: { createdAt: "desc" }, take: 50 }),
    ]);
    const paidOrders = orders.filter((order) => this.isPaidOrder(order.status));
    const paidItems = this.filteredItems(paidOrders, filters);
    const designStatus = this.statusCounts(designsByStatus);
    const listingStatus = this.statusCounts(listingsByStatus);
    const royaltyByStatus = this.sumByStatus(royalties);
    const revenue = this.sum(paidItems.map((item) => item.totalPrice));
    const response: any = {
      filters: this.serializeFilters(filters),
      summary: {
        designerId,
        revenue: this.round(revenue),
        orderCount: paidOrders.length,
        soldItems: paidItems.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0),
        royaltyGenerated: this.round(this.sum(royalties.map((entry) => entry.amount))),
        payableRoyalties: this.round(royaltyByStatus.PAYABLE ?? 0),
        paidPayouts: this.round(payouts.filter((payout) => payout.status === PayoutStatus.PAID || payout.status === PayoutStatus.CONFIRMED).reduce((sum, payout) => sum + this.num(payout.amount), 0)),
        uploadedDesigns: Object.values(designStatus).reduce((sum, count) => sum + Number(count), 0),
        approvedDesigns: (designStatus.APPROVED ?? 0) + (designStatus.APPROVED_LOCAL ?? 0) + (designStatus.APPROVED_GLOBAL ?? 0) + (designStatus.PUBLISHED ?? 0),
        rejectedDesigns: designStatus.REJECTED ?? 0,
        publishedListings: listingStatus.PUBLISHED ?? 0,
      },
      designStatus,
      listingStatus,
      earningsTrend: this.royaltyTrend(royalties),
      channelBreakdown: this.groupRevenue(paidOrders, paidItems, filters, (order, item) => this.channelFor(order, item)),
      topListings: this.groupItems(paidItems, (item) => item.listingTitle ?? item.listingId ?? "Unknown", "listingId").slice(0, 10),
      payouts: payouts.map((payout) => ({ id: payout.id, amount: this.num(payout.amount), currency: payout.currency, status: payout.status, paidAt: payout.paidAt, createdAt: payout.createdAt })),
    };
    if (!ownView) response.royaltyByStatus = royaltyByStatus;
    return response;
  }

  async marketplace(query: AnalyticsQueryDto) {
    const filters = this.filters(query);
    const [configs, batches, items, exportedListings, externalSales, intakes, mappingGaps] = await Promise.all([
      this.prisma.marketplaceConfig.count({ where: { ...(filters.marketplaceConfigId ? { id: filters.marketplaceConfigId } : {}) } }),
      this.prisma.marketplaceExportBatch.findMany({ where: { createdAt: { gte: filters.from, lte: filters.to }, ...(filters.marketplaceConfigId ? { marketplaceConfigId: filters.marketplaceConfigId } : {}) }, include: { marketplaceConfig: true }, orderBy: { createdAt: "desc" }, take: 200 }),
      this.prisma.marketplaceExportItem.findMany({ where: { createdAt: { gte: filters.from, lte: filters.to }, ...(filters.marketplaceConfigId ? { batch: { marketplaceConfigId: filters.marketplaceConfigId } } : {}) }, take: 1000 }),
      this.prisma.exportedListing.findMany({ where: { createdAt: { gte: filters.from, lte: filters.to }, ...(filters.marketplaceConfigId ? { marketplaceConfigId: filters.marketplaceConfigId } : {}) }, include: { marketplaceConfig: true }, take: 1000 }),
      this.prisma.marketplaceExternalSale.findMany({ where: { createdAt: { gte: filters.from, lte: filters.to }, ...(filters.marketplaceConfigId ? { marketplaceConfigId: filters.marketplaceConfigId } : {}), ...(filters.currency ? { currency: filters.currency } : {}) }, include: { marketplaceConfig: true }, take: 1000 }),
      this.prisma.externalOrderIntake.findMany({ where: { createdAt: { gte: filters.from, lte: filters.to }, ...(filters.marketplaceConfigId ? { marketplaceConfigId: filters.marketplaceConfigId } : {}), ...(filters.currency ? { currency: filters.currency } : {}) }, take: 1000 }),
      this.prisma.externalOrderIntakeItem.count({ where: { createdAt: { gte: filters.from, lte: filters.to }, mappingStatus: "NEEDS_MAPPING" as any, ...(filters.marketplaceConfigId ? { marketplaceConfigId: filters.marketplaceConfigId } : {}) } }),
    ]);
    const revenue = externalSales.reduce((sum, sale) => sum + this.num(sale.salePrice) * Number(sale.quantity ?? 1), 0) + intakes.filter((row) => String(row.paymentStatus).includes("PAID")).reduce((sum, row) => sum + this.num(row.totalAmount), 0);
    return {
      filters: this.serializeFilters(filters),
      kpis: {
        configs,
        exportReadyListings: items.filter((item) => item.eligible).length,
        blockedExportCandidates: items.filter((item) => !item.eligible || ["BLOCKED", "FAILED"].includes(String(item.status))).length,
        exportedListingCount: exportedListings.length,
        manuallyListedCount: exportedListings.filter((item) => item.manuallyListedAt).length,
        externalSalesCount: externalSales.length + intakes.length,
        externalSalesRevenue: this.round(revenue),
        exportBatchFailures: batches.filter((batch) => String(batch.status) === "FAILED").length,
        mappingGaps,
      },
      byMarketplace: this.countBy(exportedListings, (item) => item.marketplaceConfig?.name ?? item.marketplaceConfigId),
      byBatchStatus: this.countBy(batches, (batch) => String(batch.status)),
      byExternalSource: this.countBy(externalSales, (sale) => String(sale.source)),
      tables: { blockedExportCandidates: items.filter((item) => !item.eligible).slice(0, filters.limit), failedExportBatches: batches.filter((batch) => String(batch.status) === "FAILED").slice(0, filters.limit), externalSalesNeedingReview: intakes.filter((row) => ["DRAFT", "NEEDS_REVIEW", "VALIDATION_FAILED"].includes(String(row.status))).slice(0, filters.limit) },
    };
  }

  async marketplaceExportReadiness(query: AnalyticsQueryDto) {
    const data = await this.marketplace(query);
    return { exportReadyListings: data.kpis.exportReadyListings, blockedExportCandidates: data.kpis.blockedExportCandidates, blocked: data.tables.blockedExportCandidates };
  }

  async marketplaceExternalSales(query: AnalyticsQueryDto) {
    const data = await this.marketplace(query);
    return { count: data.kpis.externalSalesCount, revenue: data.kpis.externalSalesRevenue, bySource: data.byExternalSource, needingReview: data.tables.externalSalesNeedingReview };
  }

  async finance(query: AnalyticsQueryDto) {
    const filters = this.filters(query);
    const [snapshots, payments, royalties, payouts, reconciliations] = await Promise.all([
      this.prisma.orderFinanceSnapshot.findMany({ where: { createdAt: { gte: filters.from, lte: filters.to }, ...(filters.currency ? { currency: filters.currency } : {}), ...(filters.designerId ? { designerId: filters.designerId } : {}) }, take: 5000 }),
      this.prisma.paymentTransaction.findMany({ where: { createdAt: { gte: filters.from, lte: filters.to }, ...(filters.currency ? { currency: filters.currency } : {}) }, take: 5000 }),
      this.prisma.royaltyLedgerEntry.findMany({ where: { createdAt: { gte: filters.from, lte: filters.to }, ...(filters.currency ? { currency: filters.currency } : {}), ...(filters.designerId ? { designerId: filters.designerId } : {}) }, take: 5000 }),
      this.prisma.payout.findMany({ where: { createdAt: { gte: filters.from, lte: filters.to }, ...(filters.currency ? { currency: filters.currency } : {}), ...(filters.designerId ? { designerId: filters.designerId } : {}) }, take: 1000 }),
      this.prisma.paymentReconciliation.findMany({ where: { createdAt: { gte: filters.from, lte: filters.to }, ...(filters.currency ? { currency: filters.currency } : {}) }, take: 1000 }),
    ]);
    return {
      filters: this.serializeFilters(filters),
      kpis: {
        paymentCollected: this.round(this.sum(payments.filter((payment) => payment.status === PaymentStatus.PAID).map((payment) => payment.amount))),
        pendingPayments: this.round(this.sum(payments.filter((payment) => payment.status === PaymentStatus.PENDING).map((payment) => payment.amount))),
        failedPayments: this.round(this.sum(payments.filter((payment) => payment.status === PaymentStatus.FAILED).map((payment) => payment.amount))),
        designerRoyaltiesPending: this.sumRoyalty(royalties, [RoyaltyLedgerStatus.PENDING, RoyaltyLedgerStatus.CALCULATED]),
        designerRoyaltiesEarned: this.sumRoyalty(royalties, [RoyaltyLedgerStatus.EARNED]),
        designerRoyaltiesPayable: this.sumRoyalty(royalties, [RoyaltyLedgerStatus.PAYABLE]),
        designerRoyaltiesPaid: this.sumRoyalty(royalties, [RoyaltyLedgerStatus.PAID, RoyaltyLedgerStatus.PAIDOUT]),
        payoutBatchesPaid: this.round(this.sum(payouts.filter((payout) => payout.status === PayoutStatus.PAID || payout.status === PayoutStatus.CONFIRMED).map((payout) => payout.amount))),
        estimatedPlatformMargin: this.round(this.sum(snapshots.map((snapshot) => snapshot.platformMarginEstimate ?? 0))),
        incompleteMarginWarnings: snapshots.filter((snapshot) => snapshot.marginIncomplete).length,
        reconciliationIssues: reconciliations.filter((row) => row.status === PaymentReconciliationStatus.MISMATCHED || row.status === PaymentReconciliationStatus.MANUAL_REVIEW || row.status === PaymentReconciliationStatus.UNRECONCILED).length,
      },
      royaltyByStatus: this.sumByStatus(royalties),
      payoutByStatus: this.groupMoney(payouts, (payout) => payout.status, (payout) => payout.amount),
      reconciliationByStatus: this.countBy(reconciliations, (row) => row.status),
      tables: { costMissingWarnings: snapshots.filter((snapshot) => snapshot.marginIncomplete).slice(0, filters.limit), reconciliationIssues: reconciliations.filter((row) => row.status !== PaymentReconciliationStatus.MATCHED).slice(0, filters.limit), payoutHistory: payouts.slice(0, filters.limit) },
    };
  }

  async financeRoyalties(query: AnalyticsQueryDto) {
    const data = await this.finance(query);
    return { kpis: data.kpis, royaltyByStatus: data.royaltyByStatus };
  }

  async financeReconciliation(query: AnalyticsQueryDto) {
    const data = await this.finance(query);
    return { reconciliationByStatus: data.reconciliationByStatus, issues: data.tables.reconciliationIssues };
  }

  async film(query: AnalyticsQueryDto) {
    const filters = this.filters({ ...query, channel: query.channel ?? undefined });
    const orders = await this.orders(filters);
    const paidItems = this.filteredItems(orders.filter((order) => this.isPaidOrder(order.status)), filters).filter((item) => item.filmType || item.itemKind || item.gangSheetId);
    const filmItems = paidItems.filter((item) => item.filmType || item.itemKind === "CUSTOM_FILM" || item.itemKind === "DESIGN_FILM");
    return {
      filters: this.serializeFilters(filters),
      kpis: {
        filmOrderCount: new Set(filmItems.map((item) => item.orderId)).size,
        filmRevenue: this.round(this.sum(filmItems.map((item) => item.totalPrice))),
        customFilmRevenue: this.round(this.sum(filmItems.filter((item) => item.itemKind === "CUSTOM_FILM").map((item) => item.totalPrice))),
        designerFilmRevenue: this.round(this.sum(filmItems.filter((item) => item.itemKind === "DESIGN_FILM").map((item) => item.totalPrice))),
        filmRoyaltyGenerated: this.round(this.sum(filmItems.map((item) => item.designerRoyaltyAmount ?? 0))),
      },
      byFilmType: this.groupItems(filmItems, (item) => item.filmType ?? "UNKNOWN"),
      byKind: this.groupItems(filmItems, (item) => item.itemKind ?? "UNKNOWN"),
    };
  }

  async gangSheets(query: AnalyticsQueryDto) {
    const filters = this.filters(query);
    const [orders, sheets] = await Promise.all([
      this.orders(filters),
      this.prisma.gangSheet.findMany({ where: { createdAt: { gte: filters.from, lte: filters.to } }, include: { items: true }, take: 1000 }),
    ]);
    const gangItems = this.filteredItems(orders.filter((order) => this.isPaidOrder(order.status)), filters).filter((item) => item.gangSheetId || item.itemKind === "GANG_SHEET_FILM");
    const utilization = sheets.map((sheet) => this.num(this.objectJson(sheet.layoutMetricsJson).utilizationPercent)).filter((value) => value > 0);
    return {
      filters: this.serializeFilters(filters),
      kpis: {
        gangSheetOrders: new Set(gangItems.map((item) => item.orderId)).size,
        gangSheetRevenue: this.round(this.sum(gangItems.map((item) => item.totalPrice))),
        gangSheetUtilizationAverage: utilization.length ? this.round(utilization.reduce((sum, value) => sum + value, 0) / utilization.length) : null,
        productionFileFailures: sheets.filter((sheet) => sheet.status === "FAILED" as any || sheet.failureReason).length,
      },
      byFilmType: this.countBy(sheets, (sheet) => sheet.filmType),
      byStatus: this.countBy(sheets, (sheet) => sheet.status),
    };
  }

  async createExport(actorId: string, dto: CreateReportExportDto) {
    const reportType = String(dto.reportType ?? "").trim();
    if (!reportType) throw new BadRequestException("reportType is required");
    if (dto.format && dto.format !== "CSV") throw new BadRequestException("Only CSV exports are available in this MVP");
    const filters = this.filters(dto);
    const rows = await this.exportRows(reportType, dto);
    const csv = this.toCsv([["generatedAt", new Date().toISOString()], ["timezone", filters.timezone], ["currency", filters.currency ?? "mixed"], [], ...rows]);
    const exportRow = await this.prisma.reportExport.create({
      data: {
        reportType,
        status: "GENERATED",
        format: "CSV",
        filtersJson: this.cleanJson(this.serializeFilters(filters)),
        currency: filters.currency,
        timezone: filters.timezone,
        filename: `analytics-${reportType}-${Date.now()}.csv`,
        contentType: "text/csv; charset=utf-8",
        contentText: csv,
        rowCount: Math.max(0, rows.length - 1),
        requestedById: actorId,
        generatedAt: new Date(),
      },
    });
    await this.audit.log({ actorId, action: "analytics.export.generated", entityType: "ReportExport", entityId: exportRow.id, metadata: { reportType, filters: this.auditFilters(filters), rows: exportRow.rowCount } });
    return { id: exportRow.id, reportType, status: exportRow.status, filename: exportRow.filename, contentType: exportRow.contentType, rowCount: exportRow.rowCount, generatedAt: exportRow.generatedAt };
  }

  async getExport(id: string) {
    const exportRow = await this.prisma.reportExport.findUnique({ where: { id } });
    if (!exportRow) throw new NotFoundException("Report export not found");
    const { contentText: _contentText, ...safe } = exportRow;
    return safe;
  }

  async downloadExport(actorId: string, id: string) {
    const exportRow = await this.prisma.reportExport.findUnique({ where: { id } });
    if (!exportRow) throw new NotFoundException("Report export not found");
    await this.prisma.reportExport.update({ where: { id }, data: { downloadedAt: new Date() } });
    await this.audit.log({ actorId, action: "analytics.export.downloaded", entityType: "ReportExport", entityId: id, metadata: { reportType: exportRow.reportType, filename: exportRow.filename } });
    return { filename: exportRow.filename, contentType: exportRow.contentType, csv: exportRow.contentText ?? "" };
  }

  private async exportRows(reportType: string, query: AnalyticsQueryDto) {
    if (reportType === "sales") {
      const data = await this.sales(query);
      return [["listingOrChannel", "revenue", "orders", "items"], ...data.tables.topChannels.map((row: any) => [row.key, row.revenue, row.orders, row.items])];
    }
    if (reportType === "production") {
      const data = await this.production(query);
      return [["status", "count"], ...data.byStatus.map((row: any) => [row.key, row.count])];
    }
    if (reportType === "finance" || reportType === "royalties") {
      const data = await this.finance(query);
      return [["metric", "value"], ...Object.entries(data.kpis).map(([key, value]) => [key, value])];
    }
    if (reportType === "designers") {
      const data = await this.designers(query);
      return [["designerId", "revenue", "royaltyGenerated", "payableRoyalties", "publishedListings"], ...data.rows.map((row: any) => [row.designer.id, row.revenue, row.royaltyGenerated, row.payableRoyalties, row.publishedListings])];
    }
    if (reportType === "marketplace" || reportType === "external-sales") {
      const data = await this.marketplace(query);
      return [["metric", "value"], ...Object.entries(data.kpis).map(([key, value]) => [key, value])];
    }
    if (reportType === "film" || reportType === "gang-sheets") {
      const data = reportType === "film" ? await this.film(query) : await this.gangSheets(query);
      return [["metric", "value"], ...Object.entries(data.kpis).map(([key, value]) => [key, value])];
    }
    throw new BadRequestException(`Unsupported reportType: ${reportType}`);
  }

  private async aiSummary(filters: FilterContext) {
    const [jobs, suggestions] = await Promise.all([
      this.prisma.aiJob.findMany({ where: { createdAt: { gte: filters.from, lte: filters.to } }, take: 2000 }),
      this.prisma.aiSuggestion.findMany({ where: { createdAt: { gte: filters.from, lte: filters.to } }, take: 2000 }),
    ]);
    const failed = jobs.filter((job) => job.status === AIJobStatus.FAILED);
    const succeeded = jobs.filter((job) => job.status === AIJobStatus.SUCCEEDED);
    const confidences = suggestions.map((suggestion) => suggestion.confidence).filter((value): value is number => typeof value === "number");
    return {
      jobsRun: jobs.length,
      successRate: jobs.length ? this.round((succeeded.length / jobs.length) * 100) : 0,
      failureRate: jobs.length ? this.round((failed.length / jobs.length) * 100) : 0,
      averageConfidence: confidences.length ? this.round(confidences.reduce((sum, value) => sum + value, 0) / confidences.length) : null,
      acceptedSuggestions: suggestions.filter((suggestion) => suggestion.status === AISuggestionStatus.ACCEPTED || suggestion.status === AISuggestionStatus.APPLIED).length,
      rejectedSuggestions: suggestions.filter((suggestion) => suggestion.status === AISuggestionStatus.REJECTED).length,
      listingCopyAppliedCount: suggestions.filter((suggestion) => suggestion.status === AISuggestionStatus.APPLIED && (suggestion.suggestionType === AISuggestionType.LISTING_TITLE || suggestion.suggestionType === AISuggestionType.LISTING_DESCRIPTION || suggestion.suggestionType === AISuggestionType.TAGS)).length,
      moderationSuggestionAcceptedCount: suggestions.filter((suggestion) => suggestion.status === AISuggestionStatus.ACCEPTED && (suggestion.suggestionType === AISuggestionType.MODERATION_REASON || suggestion.suggestionType === AISuggestionType.APPROVAL_RECOMMENDATION || suggestion.suggestionType === AISuggestionType.REJECTION_RECOMMENDATION)).length,
      costEstimate: this.round(this.sum(jobs.map((job) => job.costEstimateUsd ?? 0))),
      failedByWorkflow: this.countBy(failed, (job) => job.workflow),
    };
  }

  private async orders(filters: FilterContext) {
    const where: Prisma.OrderWhereInput = {
      createdAt: { gte: filters.from, lte: filters.to },
      ...(filters.currency ? { currency: filters.currency } : {}),
      ...(filters.designerId || filters.productTypeId || filters.baseProductId ? { items: { some: { ...(filters.designerId ? { designerId: filters.designerId } : {}), ...(filters.productTypeId ? { productTypeId: filters.productTypeId } : {}), ...(filters.baseProductId ? { baseProductId: filters.baseProductId } : {}) } } } : {}),
      ...(filters.paymentStatus ? { payments: { some: { status: filters.paymentStatus as PaymentStatus } } } : {}),
    };
    const orders = await this.prisma.order.findMany({ where, include: { items: true, payments: true, financeSnapshots: true }, orderBy: { createdAt: "desc" }, take: 5000 });
    return filters.channel ? orders.filter((order) => this.filteredItems([order], filters).length > 0) : orders;
  }

  private async productionJobs(filters: FilterContext) {
    return this.prisma.productionJob.findMany({
      where: {
        createdAt: { gte: filters.from, lte: filters.to },
        ...(filters.productionStatus ? { status: filters.productionStatus as ProductionJobStatus } : {}),
        ...(filters.productTypeId ? { orderItem: { productTypeId: filters.productTypeId } } : {}),
        ...(filters.baseProductId ? { orderItem: { baseProductId: filters.baseProductId } } : {}),
        ...(filters.designerId ? { orderItem: { designerId: filters.designerId } } : {}),
      },
      include: { order: true, orderItem: true },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
  }

  private filteredItems(orders: any[], filters: FilterContext) {
    const rows: any[] = [];
    for (const order of orders) {
      for (const item of order.items ?? []) {
        if (filters.designerId && item.designerId !== filters.designerId) continue;
        if (filters.productTypeId && item.productTypeId !== filters.productTypeId) continue;
        if (filters.baseProductId && item.baseProductId !== filters.baseProductId) continue;
        if (filters.channel && this.channelFor(order, item) !== filters.channel) continue;
        rows.push({ ...item, order });
      }
    }
    return rows;
  }

  private snapshotMatches(snapshot: any, filters: FilterContext) {
    if (filters.designerId && snapshot.designerId !== filters.designerId) return false;
    if (filters.currency && snapshot.currency !== filters.currency) return false;
    return true;
  }

  private channelFor(order: any, item: any): ChannelKey {
    if (item.gangSheetId || item.itemKind === "GANG_SHEET_FILM") return "GANG_SHEET";
    if (item.filmType || item.itemKind === "CUSTOM_FILM" || item.itemKind === "DESIGN_FILM") return "FILM";
    if (order.externalSourceType || item.externalSourceType || (order.source && order.source !== "RASHPOD")) return "EXTERNAL_MARKETPLACE";
    if (item.providerType || order.fulfillmentRoute === "GLOBAL_POD") return "GLOBAL_POD";
    return "DIRECT";
  }

  private isPaidOrder(status: OrderStatus) {
    return status === OrderStatus.PAID || status === OrderStatus.IN_PRODUCTION || status === OrderStatus.READY_FOR_PICKUP || status === OrderStatus.SHIPPED || status === OrderStatus.DELIVERED;
  }

  private salesTrend(orders: any[], filters: FilterContext) {
    const buckets = new Map<string, { date: string; revenue: number; orders: number }>();
    for (const order of orders) {
      const date = order.createdAt.toISOString().slice(0, 10);
      const bucket = buckets.get(date) ?? { date, revenue: 0, orders: 0 };
      bucket.revenue += this.num(order.total);
      bucket.orders += 1;
      buckets.set(date, bucket);
    }
    return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date)).map((row) => ({ ...row, revenue: this.round(row.revenue), timezone: filters.timezone }));
  }

  private royaltyTrend(entries: Array<{ createdAt: Date; amount: Prisma.Decimal }>) {
    const buckets = new Map<string, { date: string; amount: number }>();
    for (const entry of entries) {
      const date = entry.createdAt.toISOString().slice(0, 10);
      const bucket = buckets.get(date) ?? { date, amount: 0 };
      bucket.amount += this.num(entry.amount);
      buckets.set(date, bucket);
    }
    return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date)).map((row) => ({ ...row, amount: this.round(row.amount) }));
  }

  private groupRevenue(orders: any[], items: any[], filters: FilterContext, keyFn: (order: any, item: any) => string) {
    const rows = new Map<string, { key: string; revenue: number; orders: Set<string>; items: number }>();
    for (const item of items) {
      const key = keyFn(item.order, item);
      const row = rows.get(key) ?? { key, revenue: 0, orders: new Set<string>(), items: 0 };
      row.revenue += this.num(item.totalPrice);
      row.orders.add(item.orderId);
      row.items += Number(item.quantity ?? 0);
      rows.set(key, row);
    }
    return Array.from(rows.values()).map((row) => ({ key: row.key, revenue: this.round(row.revenue), orders: row.orders.size, items: row.items, currency: filters.currency ?? this.currencyFor(orders, filters) })).sort((a, b) => b.revenue - a.revenue);
  }

  private groupItems(items: any[], keyFn: (item: any) => string, idField?: string) {
    const rows = new Map<string, { key: string; id?: string; revenue: number; orders: Set<string>; items: number; royalty: number }>();
    for (const item of items) {
      const key = keyFn(item);
      const row = rows.get(key) ?? { key, id: idField ? item[idField] ?? undefined : undefined, revenue: 0, orders: new Set<string>(), items: 0, royalty: 0 };
      row.revenue += this.num(item.totalPrice);
      row.orders.add(item.orderId);
      row.items += Number(item.quantity ?? 0);
      row.royalty += this.num(item.designerRoyaltyAmount ?? 0);
      rows.set(key, row);
    }
    return Array.from(rows.values()).map((row) => ({ key: row.key, id: row.id, revenue: this.round(row.revenue), orders: row.orders.size, items: row.items, royalty: this.round(row.royalty) })).sort((a, b) => b.revenue - a.revenue);
  }

  private paymentSplit(orders: any[]) {
    return [
      { key: "paid", count: orders.filter((order) => this.isPaidOrder(order.status)).length },
      { key: "unpaid", count: orders.filter((order) => order.status === OrderStatus.PENDING_PAYMENT).length },
      { key: "failed", count: orders.filter((order) => (order.payments ?? []).some((payment: any) => payment.status === PaymentStatus.FAILED)).length },
      { key: "refunded", count: orders.filter((order) => order.status === OrderStatus.REFUNDED).length },
      { key: "cancelled", count: orders.filter((order) => order.status === OrderStatus.CANCELLED).length },
    ];
  }

  private operatorWorkload(jobs: any[]) {
    const grouped = new Map<string, { operatorId: string; active: number; completed: number; blocked: number }>();
    for (const job of jobs) {
      const operatorId = job.assignedOperatorId ?? "UNASSIGNED";
      const row = grouped.get(operatorId) ?? { operatorId, active: 0, completed: 0, blocked: 0 };
      if ([ProductionJobStatus.COMPLETED, ProductionJobStatus.DELIVERED].includes(job.status)) row.completed += 1;
      else row.active += 1;
      if (job.status === ProductionJobStatus.BLOCKED || job.blockerReason) row.blocked += 1;
      grouped.set(operatorId, row);
    }
    return Array.from(grouped.values()).sort((a, b) => b.active - a.active);
  }

  private averageDurationHours<T>(rows: T[], start: (row: T) => Date | null | undefined, end: (row: T) => Date | null | undefined) {
    const durations = rows.map((row) => {
      const from = start(row);
      const to = end(row);
      return from && to && to.getTime() >= from.getTime() ? to.getTime() - from.getTime() : null;
    }).filter((value): value is number => typeof value === "number");
    return durations.length ? this.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) / 36e5) : null;
  }

  private countBy<T>(rows: T[], keyFn: (row: T) => string) {
    const grouped = new Map<string, number>();
    for (const row of rows) grouped.set(keyFn(row), (grouped.get(keyFn(row)) ?? 0) + 1);
    return Array.from(grouped.entries()).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
  }

  private groupMoney<T>(rows: T[], keyFn: (row: T) => string, amountFn: (row: T) => unknown) {
    const grouped = new Map<string, { key: string; value: number; count: number }>();
    for (const row of rows) {
      const key = keyFn(row);
      const item = grouped.get(key) ?? { key, value: 0, count: 0 };
      item.value += this.num(amountFn(row));
      item.count += 1;
      grouped.set(key, item);
    }
    return Array.from(grouped.values()).map((row) => ({ ...row, value: this.round(row.value) })).sort((a, b) => b.value - a.value);
  }

  private statusCounts(rows: Array<{ status: string; _count: { _all: number } }>) {
    return rows.reduce<Record<string, number>>((acc, row) => { acc[row.status] = row._count._all; return acc; }, {});
  }

  private sumByStatus(rows: Array<{ status: string; amount: Prisma.Decimal }>) {
    return rows.reduce<Record<string, number>>((acc, row) => { acc[row.status] = this.round((acc[row.status] ?? 0) + this.num(row.amount)); return acc; }, {});
  }

  private sumRoyalty(rows: Array<{ status: RoyaltyLedgerStatus; amount: Prisma.Decimal }>, statuses: RoyaltyLedgerStatus[]) {
    return this.round(this.sum(rows.filter((row) => statuses.includes(row.status)).map((row) => row.amount)));
  }

  private filters(query: AnalyticsQueryDto): FilterContext {
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(now.getDate() - 30);
    const from = query.from ? new Date(query.from) : defaultFrom;
    const to = query.to ? new Date(query.to) : now;
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw new BadRequestException("Invalid date range");
    const limit = Math.min(200, Math.max(1, Number(query.limit ?? 25) || 25));
    const page = Math.max(1, Number(query.page ?? 1) || 1);
    return { from, to, channel: query.channel || undefined, productTypeId: query.productTypeId || undefined, baseProductId: query.baseProductId || undefined, designerId: query.designerId || undefined, paymentStatus: query.paymentStatus || undefined, productionStatus: query.productionStatus || undefined, marketplaceConfigId: query.marketplaceConfigId || undefined, currency: query.currency || undefined, timezone: "Asia/Tashkent", page, limit };
  }

  private serializeFilters(filters: FilterContext) {
    return { ...filters, from: filters.from.toISOString(), to: filters.to.toISOString() };
  }

  private auditFilters(filters: FilterContext) {
    return { from: filters.from.toISOString(), to: filters.to.toISOString(), channel: filters.channel ?? null, currency: filters.currency ?? null, designerId: filters.designerId ?? null };
  }

  private currencyFor(orders: any[], filters: FilterContext) {
    return filters.currency ?? orders[0]?.currency ?? "UZS";
  }

  private objectJson(value: unknown): JsonRecord {
    return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
  }

  private stringFrom(value: unknown): string | undefined {
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }

  private num(value: unknown): number {
    if (value instanceof Prisma.Decimal) return Number(value);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
    return 0;
  }

  private sum(values: unknown[]): number {
    return values.reduce<number>((total, value) => total + this.num(value), 0);
  }

  private round(value: number): number {
    return Number((value || 0).toFixed(2));
  }

  private toCsv(rows: unknown[][]) {
    return rows.map((row) => row.map((cell) => cell == null ? "" : `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  }

  private cleanJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
  }
}
