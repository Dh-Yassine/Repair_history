-- Site visit tracking for admin traffic analytics
-- Safe to run in Supabase SQL Editor if prisma db push is unavailable.

CREATE TABLE IF NOT EXISTS "SiteVisit" (
  "id"        TEXT PRIMARY KEY,
  "path"      TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "referrer"  TEXT,
  "userAgent" TEXT,
  "userId"    TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "SiteVisit_createdAt_idx" ON "SiteVisit"("createdAt");
CREATE INDEX IF NOT EXISTS "SiteVisit_path_idx" ON "SiteVisit"("path");
CREATE INDEX IF NOT EXISTS "SiteVisit_sessionId_idx" ON "SiteVisit"("sessionId");
CREATE INDEX IF NOT EXISTS "SiteVisit_createdAt_path_idx" ON "SiteVisit"("createdAt", "path");
