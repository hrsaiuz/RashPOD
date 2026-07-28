ALTER TABLE "User"
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "emailVerificationTokenHash" TEXT,
  ADD COLUMN "emailVerificationExpiresAt" TIMESTAMP(3);

-- Existing accounts predate email verification and must remain able to sign in.
UPDATE "User"
SET "emailVerifiedAt" = CURRENT_TIMESTAMP
WHERE "emailVerifiedAt" IS NULL;

ALTER TABLE "User" ALTER COLUMN "designerStatus" SET DEFAULT 'PENDING';

CREATE UNIQUE INDEX "User_emailVerificationTokenHash_key"
  ON "User"("emailVerificationTokenHash");

ALTER TABLE "DesignerApplication"
  ADD COLUMN "reviewedById" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "invitationId" TEXT;

CREATE UNIQUE INDEX "DesignerApplication_invitationId_key"
  ON "DesignerApplication"("invitationId");
CREATE INDEX "DesignerApplication_reviewedById_reviewedAt_idx"
  ON "DesignerApplication"("reviewedById", "reviewedAt");

ALTER TABLE "DesignerApplication"
  ADD CONSTRAINT "DesignerApplication_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DesignerApplication"
  ADD CONSTRAINT "DesignerApplication_invitationId_fkey"
  FOREIGN KEY ("invitationId") REFERENCES "DesignerInvitation"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
