ALTER TABLE "User"
ADD COLUMN "bio" TEXT,
ADD COLUMN "avatarUrl" TEXT,
ADD COLUMN "coverUrl" TEXT,
ADD COLUMN "handle" TEXT,
ADD COLUMN "socialLinks" JSONB;

CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

CREATE TABLE "UserPreferences" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "portfolioJson" JSONB,
  "payoutDetailsJson" JSONB,
  "notificationJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");

ALTER TABLE "UserPreferences"
ADD CONSTRAINT "UserPreferences_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
