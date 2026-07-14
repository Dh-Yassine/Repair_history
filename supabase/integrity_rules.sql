-- AutoHistory integrity constraints migration
-- Run in Supabase SQL Editor if `prisma db push` cannot reach the pooler.

-- Vehicle status enum
DO $$ BEGIN
  CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- User anonymization support
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Vehicle soft-delete + share history + VIN uniqueness
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "shareEverEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: any vehicle that already has/had sharing enabled
UPDATE "Vehicle"
SET "shareEverEnabled" = true
WHERE "shareToken" IS NOT NULL OR "shareLevel"::text <> 'NONE';

-- Unique VIN (multiple NULLs allowed in Postgres)
CREATE UNIQUE INDEX IF NOT EXISTS "Vehicle_vin_key" ON "Vehicle"("vin");
CREATE INDEX IF NOT EXISTS "Vehicle_status_idx" ON "Vehicle"("status");
CREATE INDEX IF NOT EXISTS "Vehicle_ownerId_status_idx" ON "Vehicle"("ownerId", "status");
