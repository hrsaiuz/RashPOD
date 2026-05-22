-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "actorType" TEXT,
    "actorId" TEXT,
    "channel" TEXT,
    "source" TEXT,
    "metadataJson" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMetric" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "metricKey" TEXT NOT NULL,
    "dimensionType" TEXT NOT NULL DEFAULT 'platform',
    "dimensionId" TEXT NOT NULL DEFAULT 'all',
    "channel" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "value" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "count" INTEGER NOT NULL DEFAULT 0,
    "metadataJson" JSONB,
    "rebuiltAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportExport" (
    "id" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "format" TEXT NOT NULL DEFAULT 'CSV',
    "filtersJson" JSONB,
    "currency" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tashkent',
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'text/csv; charset=utf-8',
    "contentText" TEXT,
    "fileAssetId" TEXT,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "requestedById" TEXT,
    "generatedAt" TIMESTAMP(3),
    "downloadedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventType_occurredAt_idx" ON "AnalyticsEvent"("eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_entityType_entityId_idx" ON "AnalyticsEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_channel_occurredAt_idx" ON "AnalyticsEvent"("channel", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_actorId_occurredAt_idx" ON "AnalyticsEvent"("actorId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMetric_date_metricKey_dimensionType_dimensionId_channel_currency_key" ON "DailyMetric"("date", "metricKey", "dimensionType", "dimensionId", "channel", "currency");

-- CreateIndex
CREATE INDEX "DailyMetric_metricKey_date_idx" ON "DailyMetric"("metricKey", "date");

-- CreateIndex
CREATE INDEX "DailyMetric_dimensionType_dimensionId_date_idx" ON "DailyMetric"("dimensionType", "dimensionId", "date");

-- CreateIndex
CREATE INDEX "ReportExport_reportType_createdAt_idx" ON "ReportExport"("reportType", "createdAt");

-- CreateIndex
CREATE INDEX "ReportExport_requestedById_createdAt_idx" ON "ReportExport"("requestedById", "createdAt");

-- CreateIndex
CREATE INDEX "ReportExport_status_createdAt_idx" ON "ReportExport"("status", "createdAt");
