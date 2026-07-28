ALTER TABLE "CustomerAddress"
  ADD COLUMN "line2" TEXT,
  ADD COLUMN "stateCode" TEXT,
  ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'UZ',
  ADD COLUMN "postalCode" TEXT;
