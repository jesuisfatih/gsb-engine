-- Add autosave fields to design documents
ALTER TABLE "DesignDocument"
  ADD COLUMN IF NOT EXISTS "autosaveSnapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "autosaveAt" TIMESTAMP(3);

-- Add autosave fields to gang sheets
ALTER TABLE "GangSheet"
  ADD COLUMN IF NOT EXISTS "autosaveSnapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "autosaveAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "status" TEXT;

UPDATE "GangSheet"
SET "status" = COALESCE("status", 'draft');

ALTER TABLE "GangSheet"
  ALTER COLUMN "status" SET DEFAULT 'draft';
