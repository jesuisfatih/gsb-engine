ALTER TABLE "ShortcodeUsage"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'success',
  ADD COLUMN "errorCode" TEXT,
  ADD COLUMN "errorMessage" TEXT,
  ADD COLUMN "meta" JSONB;
