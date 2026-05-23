-- CreateTable
CREATE TABLE "CustomerAddress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "zone" TEXT NOT NULL DEFAULT 'UZ',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerAddress_userId_idx" ON "CustomerAddress"("userId");

-- CreateIndex
CREATE INDEX "WishlistItem_userId_idx" ON "WishlistItem"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_userId_listingId_key" ON "WishlistItem"("userId", "listingId");

-- AddForeignKey
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "CommerceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate legacy defaultDeliveryAddress from UserPreferences.notificationJson
INSERT INTO "CustomerAddress" ("id", "userId", "label", "recipientName", "phone", "line1", "city", "zone", "isDefault", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  up."userId",
  'Home',
  u."displayName",
  COALESCE(up."notificationJson"->>'phone', ''),
  COALESCE(up."notificationJson"->>'defaultDeliveryAddress', ''),
  'Tashkent',
  'UZ',
  true,
  NOW(),
  NOW()
FROM "UserPreferences" up
JOIN "User" u ON u."id" = up."userId"
WHERE COALESCE(up."notificationJson"->>'defaultDeliveryAddress', '') <> ''
  AND NOT EXISTS (
    SELECT 1 FROM "CustomerAddress" ca WHERE ca."userId" = up."userId"
  );
