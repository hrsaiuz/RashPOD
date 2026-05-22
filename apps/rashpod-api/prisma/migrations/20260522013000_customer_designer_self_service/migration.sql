-- Slice 7: customer/designer authenticated self-service support requests

DO $$ BEGIN
  CREATE TYPE "SupportRequestStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "SupportRequest" (
  "id" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "requesterRole" "UserRole" NOT NULL,
  "orderId" TEXT,
  "designAssetId" TEXT,
  "listingId" TEXT,
  "category" TEXT NOT NULL,
  "subject" TEXT,
  "message" TEXT NOT NULL,
  "status" "SupportRequestStatus" NOT NULL DEFAULT 'OPEN',
  "reviewNotes" TEXT,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SupportRequest_requesterId_status_createdAt_idx" ON "SupportRequest"("requesterId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "SupportRequest_orderId_idx" ON "SupportRequest"("orderId");
CREATE INDEX IF NOT EXISTS "SupportRequest_designAssetId_idx" ON "SupportRequest"("designAssetId");
CREATE INDEX IF NOT EXISTS "SupportRequest_listingId_idx" ON "SupportRequest"("listingId");

ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_designAssetId_fkey" FOREIGN KEY ("designAssetId") REFERENCES "DesignAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "CommerceListing"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
