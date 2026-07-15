CREATE TYPE "DesignerInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

CREATE TABLE "DesignerInvitation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "email" TEXT NOT NULL,
  "displayName" TEXT,
  "locale" TEXT NOT NULL DEFAULT 'uz',
  "personalMessage" TEXT,
  "tokenHash" TEXT NOT NULL,
  "status" "DesignerInvitationStatus" NOT NULL DEFAULT 'PENDING',
  "invitedById" TEXT NOT NULL,
  "acceptedById" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "lastSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DesignerInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DesignerInvitation_tokenHash_key" ON "DesignerInvitation"("tokenHash");
CREATE INDEX "DesignerInvitation_email_status_idx" ON "DesignerInvitation"("email", "status");
CREATE INDEX "DesignerInvitation_tenantId_status_createdAt_idx" ON "DesignerInvitation"("tenantId", "status", "createdAt");
CREATE INDEX "DesignerInvitation_invitedById_createdAt_idx" ON "DesignerInvitation"("invitedById", "createdAt");
ALTER TABLE "DesignerInvitation" ADD CONSTRAINT "DesignerInvitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DesignerInvitation" ADD CONSTRAINT "DesignerInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DesignerInvitation" ADD CONSTRAINT "DesignerInvitation_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
