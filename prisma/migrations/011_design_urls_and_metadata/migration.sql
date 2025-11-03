-- AlterTable
ALTER TABLE "DesignDocument" 
ADD COLUMN "thumbnailUrl" TEXT,
ADD COLUMN "editUrl" TEXT,
ADD COLUMN "printReadyUrl" TEXT,
ADD COLUMN "productSlug" TEXT,
ADD COLUMN "surfaceSlug" TEXT,
ADD COLUMN "printTech" TEXT,
ADD COLUMN "color" TEXT,
ADD COLUMN "sheetWidthPx" DOUBLE PRECISION,
ADD COLUMN "sheetHeightPx" DOUBLE PRECISION,
ADD COLUMN "metadata" JSONB;

