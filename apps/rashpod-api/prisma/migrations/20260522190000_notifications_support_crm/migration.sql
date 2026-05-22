-- Slice 15: Notifications, Support, and CRM Layer

CREATE TYPE "SupportPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "SupportMessageVisibility" AS ENUM ('PUBLIC', 'INTERNAL');
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'TELEGRAM');
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('QUEUED', 'DELIVERED', 'FAILED', 'SKIPPED');
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'CRITICAL');
CREATE TYPE "CrmContactChannel" AS ENUM ('EMAIL', 'PHONE', 'TELEGRAM', 'IN_APP', 'SUPPORT_TICKET', 'OTHER');
CREATE TYPE "CrmContactDirection" AS ENUM ('INBOUND', 'OUTBOUND');

ALTER TABLE "SupportRequest" ADD COLUMN "assignedToId" TEXT;
ALTER TABLE "SupportRequest" ADD COLUMN "priority" "SupportPriority" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "SupportRequest" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'SELF_SERVICE';
ALTER TABLE "SupportRequest" ADD COLUMN "firstResponseAt" TIMESTAMP(3);
ALTER TABLE "SupportRequest" ADD COLUMN "lastCustomerMessageAt" TIMESTAMP(3);
ALTER TABLE "SupportRequest" ADD COLUMN "lastStaffMessageAt" TIMESTAMP(3);
ALTER TABLE "SupportRequest" ADD COLUMN "dueAt" TIMESTAMP(3);

CREATE TABLE "SupportMessage" (
  "id" TEXT NOT NULL,
  "supportRequestId" TEXT NOT NULL,
  "authorId" TEXT,
  "authorRole" "UserRole",
  "body" TEXT NOT NULL,
  "visibility" "SupportMessageVisibility" NOT NULL DEFAULT 'PUBLIC',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SupportMessage" ("id", "supportRequestId", "authorId", "authorRole", "body", "visibility", "createdAt")
SELECT 'support-initial-' || "id", "id", "requesterId", "requesterRole", "message", 'PUBLIC', "createdAt"
FROM "SupportRequest";

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
  "entityType" TEXT,
  "entityId" TEXT,
  "actionUrl" TEXT,
  "metadataJson" JSONB,
  "idempotencyKey" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationDelivery" (
  "id" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
  "templateKey" TEXT,
  "destination" TEXT,
  "providerRef" TEXT,
  "errorMessage" TEXT,
  "payloadJson" JSONB,
  "idempotencyKey" TEXT,
  "attemptedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmTag" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "color" TEXT,
  "description" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserCrmTag" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserCrmTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmNote" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "authorId" TEXT,
  "note" TEXT NOT NULL,
  "isPinned" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmContactLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "authorId" TEXT,
  "channel" "CrmContactChannel" NOT NULL,
  "direction" "CrmContactDirection" NOT NULL DEFAULT 'OUTBOUND',
  "summary" TEXT NOT NULL,
  "outcome" TEXT,
  "metadataJson" JSONB,
  "contactedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmContactLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Notification_idempotencyKey_key" ON "Notification"("idempotencyKey");
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");
CREATE INDEX "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");
CREATE INDEX "Notification_entityType_entityId_idx" ON "Notification"("entityType", "entityId");

CREATE UNIQUE INDEX "NotificationDelivery_idempotencyKey_key" ON "NotificationDelivery"("idempotencyKey");
CREATE INDEX "NotificationDelivery_userId_channel_status_createdAt_idx" ON "NotificationDelivery"("userId", "channel", "status", "createdAt");
CREATE INDEX "NotificationDelivery_notificationId_channel_idx" ON "NotificationDelivery"("notificationId", "channel");
CREATE INDEX "NotificationDelivery_status_createdAt_idx" ON "NotificationDelivery"("status", "createdAt");

CREATE INDEX "SupportRequest_assignedToId_status_createdAt_idx" ON "SupportRequest"("assignedToId", "status", "createdAt");
CREATE INDEX "SupportRequest_status_priority_createdAt_idx" ON "SupportRequest"("status", "priority", "createdAt");
CREATE INDEX "SupportMessage_supportRequestId_createdAt_idx" ON "SupportMessage"("supportRequestId", "createdAt");
CREATE INDEX "SupportMessage_authorId_createdAt_idx" ON "SupportMessage"("authorId", "createdAt");

CREATE UNIQUE INDEX "CrmTag_key_key" ON "CrmTag"("key");
CREATE UNIQUE INDEX "UserCrmTag_userId_tagId_key" ON "UserCrmTag"("userId", "tagId");
CREATE INDEX "UserCrmTag_tagId_idx" ON "UserCrmTag"("tagId");
CREATE INDEX "CrmNote_userId_createdAt_idx" ON "CrmNote"("userId", "createdAt");
CREATE INDEX "CrmNote_authorId_createdAt_idx" ON "CrmNote"("authorId", "createdAt");
CREATE INDEX "CrmContactLog_userId_contactedAt_idx" ON "CrmContactLog"("userId", "contactedAt");
CREATE INDEX "CrmContactLog_authorId_contactedAt_idx" ON "CrmContactLog"("authorId", "contactedAt");

ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_supportRequestId_fkey" FOREIGN KEY ("supportRequestId") REFERENCES "SupportRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmTag" ADD CONSTRAINT "CrmTag_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserCrmTag" ADD CONSTRAINT "UserCrmTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserCrmTag" ADD CONSTRAINT "UserCrmTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "CrmTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmNote" ADD CONSTRAINT "CrmNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmNote" ADD CONSTRAINT "CrmNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmContactLog" ADD CONSTRAINT "CrmContactLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmContactLog" ADD CONSTRAINT "CrmContactLog_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
