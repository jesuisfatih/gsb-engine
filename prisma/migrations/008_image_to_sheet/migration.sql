-- CreateTable
CREATE TABLE "ImageToSheetSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "printerWidth" DECIMAL(10, 2),
    "useVariantWidths" BOOLEAN NOT NULL DEFAULT false,
    "maxHeight" DECIMAL(10, 2),
    "imageMargin" DECIMAL(10, 2),
    "artboardMargin" DECIMAL(10, 2),
    "unit" TEXT NOT NULL DEFAULT 'in',
    "enableAllLocations" BOOLEAN NOT NULL DEFAULT true,
    "disableDownloadValidation" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT,
    "pricingMode" TEXT NOT NULL DEFAULT 'area',
    "pricePerUnit" DECIMAL(10, 4),
    "pricingSide" TEXT NOT NULL DEFAULT 'Width',
    "shippingWeightRate" DECIMAL(10, 4),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ImageToSheetSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageToSheetSizePreset" (
    "id" TEXT NOT NULL,
    "settingsId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "widthIn" DECIMAL(10, 2),
    "heightIn" DECIMAL(10, 2),
    "price" DECIMAL(10, 2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ImageToSheetSizePreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImageToSheetSettings_tenantId_key" ON "ImageToSheetSettings"("tenantId");

-- CreateIndex
CREATE INDEX "ImageToSheetSizePreset_settingsId_sortOrder_idx" ON "ImageToSheetSizePreset"("settingsId", "sortOrder");

-- AddForeignKey
ALTER TABLE "ImageToSheetSettings" ADD CONSTRAINT "ImageToSheetSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageToSheetSizePreset" ADD CONSTRAINT "ImageToSheetSizePreset_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "ImageToSheetSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
