DO $$
BEGIN
  CREATE TYPE "ModerationDecision" AS ENUM ('APPROVE', 'REJECT', 'REQUEST_CHANGES', 'SUSPEND');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AIProvider" AS ENUM ('OPENAI', 'DISABLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AIWorkflow" AS ENUM ('DESIGN_QA', 'MODERATION_ASSIST', 'PRODUCT_RECOMMENDATION', 'LISTING_COPY', 'MARKETPLACE_COPY', 'TRANSLATION', 'TAG_GENERATION', 'RISK_CHECK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AIEntityType" AS ENUM ('DESIGN', 'DESIGN_VERSION', 'LISTING', 'MARKETPLACE_EXPORT_ITEM', 'GANG_SHEET', 'FILM_ORDER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AIJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AISuggestionType" AS ENUM ('QA_WARNING', 'MODERATION_REASON', 'APPROVAL_RECOMMENDATION', 'REJECTION_RECOMMENDATION', 'PRODUCT_TYPE_RECOMMENDATION', 'BASE_PRODUCT_RECOMMENDATION', 'TEMPLATE_RECOMMENDATION', 'PRINT_AREA_RECOMMENDATION', 'LISTING_TITLE', 'LISTING_DESCRIPTION', 'TAGS', 'MARKETPLACE_CATEGORY', 'TRANSLATION', 'RISK_FLAG');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AISuggestionSeverity" AS ENUM ('INFO', 'WARNING', 'BLOCKER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AISuggestionStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'REJECTED', 'APPLIED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "DesignModerationCase" (
  "id" TEXT NOT NULL,
  "designAssetId" TEXT NOT NULL,
  "designVersionId" TEXT,
  "reviewerId" TEXT,
  "decision" "ModerationDecision" NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DesignModerationCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AiJob" (
  "id" TEXT NOT NULL,
  "workflow" "AIWorkflow" NOT NULL,
  "entityType" "AIEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "provider" "AIProvider" NOT NULL DEFAULT 'OPENAI',
  "model" TEXT,
  "status" "AIJobStatus" NOT NULL DEFAULT 'QUEUED',
  "inputSummary" JSONB,
  "inputSnapshot" JSONB,
  "promptVersion" TEXT NOT NULL,
  "outputSummary" JSONB,
  "outputSnapshot" JSONB,
  "tokenUsageJson" JSONB,
  "costEstimateUsd" DECIMAL(10, 6),
  "failureReason" TEXT,
  "idempotencyKey" TEXT,
  "workerJobId" TEXT,
  "createdById" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AiSuggestion" (
  "id" TEXT NOT NULL,
  "aiJobId" TEXT NOT NULL,
  "suggestionType" "AISuggestionType" NOT NULL,
  "confidence" DOUBLE PRECISION,
  "severity" "AISuggestionSeverity" NOT NULL DEFAULT 'INFO',
  "payload" JSONB NOT NULL,
  "status" "AISuggestionStatus" NOT NULL DEFAULT 'PROPOSED',
  "humanDecisionReason" TEXT,
  "appliedAt" TIMESTAMP(3),
  "appliedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AiJob_idempotencyKey_key" ON "AiJob"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "AiJob_workflow_entityType_entityId_idx" ON "AiJob"("workflow", "entityType", "entityId");
CREATE INDEX IF NOT EXISTS "AiJob_status_createdAt_idx" ON "AiJob"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "AiJob_createdById_createdAt_idx" ON "AiJob"("createdById", "createdAt");
CREATE INDEX IF NOT EXISTS "AiJob_workerJobId_idx" ON "AiJob"("workerJobId");

CREATE INDEX IF NOT EXISTS "AiSuggestion_aiJobId_status_idx" ON "AiSuggestion"("aiJobId", "status");
CREATE INDEX IF NOT EXISTS "AiSuggestion_suggestionType_status_idx" ON "AiSuggestion"("suggestionType", "status");
CREATE INDEX IF NOT EXISTS "AiSuggestion_createdAt_idx" ON "AiSuggestion"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DesignModerationCase_designAssetId_fkey') THEN
    ALTER TABLE "DesignModerationCase" ADD CONSTRAINT "DesignModerationCase_designAssetId_fkey" FOREIGN KEY ("designAssetId") REFERENCES "DesignAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DesignModerationCase_designVersionId_fkey') THEN
    ALTER TABLE "DesignModerationCase" ADD CONSTRAINT "DesignModerationCase_designVersionId_fkey" FOREIGN KEY ("designVersionId") REFERENCES "DesignVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DesignModerationCase_reviewerId_fkey') THEN
    ALTER TABLE "DesignModerationCase" ADD CONSTRAINT "DesignModerationCase_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiJob_createdById_fkey') THEN
    ALTER TABLE "AiJob" ADD CONSTRAINT "AiJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiJob_reviewedById_fkey') THEN
    ALTER TABLE "AiJob" ADD CONSTRAINT "AiJob_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiSuggestion_aiJobId_fkey') THEN
    ALTER TABLE "AiSuggestion" ADD CONSTRAINT "AiSuggestion_aiJobId_fkey" FOREIGN KEY ("aiJobId") REFERENCES "AiJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiSuggestion_appliedById_fkey') THEN
    ALTER TABLE "AiSuggestion" ADD CONSTRAINT "AiSuggestion_appliedById_fkey" FOREIGN KEY ("appliedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
