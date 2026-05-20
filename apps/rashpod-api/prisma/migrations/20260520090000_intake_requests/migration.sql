CREATE TYPE "IntakeStatus" AS ENUM ('NEW', 'IN_REVIEW', 'CONTACTED', 'APPROVED', 'REJECTED', 'ARCHIVED');

CREATE TABLE "DesignerApplication" (
  "id" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phoneCountryCode" TEXT,
  "phoneNumber" TEXT,
  "telegramUsername" TEXT,
  "passwordProvided" BOOLEAN NOT NULL DEFAULT false,
  "displayName" TEXT,
  "country" TEXT,
  "city" TEXT,
  "designCategories" JSONB,
  "shortBio" TEXT,
  "portfolioFiles" JSONB,
  "identityFiles" JSONB,
  "selfieFiles" JSONB,
  "confirmations" JSONB,
  "status" "IntakeStatus" NOT NULL DEFAULT 'NEW',
  "reviewNotes" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DesignerApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContactMessage" (
  "id" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT,
  "email" TEXT NOT NULL,
  "phoneNumber" TEXT,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" "IntakeStatus" NOT NULL DEFAULT 'NEW',
  "reviewNotes" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomOrderRequest" (
  "id" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "companyEventName" TEXT,
  "email" TEXT NOT NULL,
  "phoneCountryCode" TEXT,
  "phoneNumber" TEXT,
  "details" TEXT,
  "estimatedBudget" TEXT,
  "preferredDelivery" TEXT,
  "productNeed" TEXT,
  "quantity" TEXT,
  "deadline" TIMESTAMP(3),
  "hasDesign" TEXT,
  "designTypes" TEXT,
  "uploadedFiles" JSONB,
  "status" "IntakeStatus" NOT NULL DEFAULT 'NEW',
  "reviewNotes" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomOrderRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DesignerApplication_status_submittedAt_idx" ON "DesignerApplication"("status", "submittedAt");
CREATE INDEX "DesignerApplication_email_idx" ON "DesignerApplication"("email");
CREATE INDEX "ContactMessage_status_submittedAt_idx" ON "ContactMessage"("status", "submittedAt");
CREATE INDEX "ContactMessage_email_idx" ON "ContactMessage"("email");
CREATE INDEX "CustomOrderRequest_status_submittedAt_idx" ON "CustomOrderRequest"("status", "submittedAt");
CREATE INDEX "CustomOrderRequest_email_idx" ON "CustomOrderRequest"("email");
