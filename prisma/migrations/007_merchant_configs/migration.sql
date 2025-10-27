-- CreateTable
CREATE TABLE "ProductBuilderConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sizeOption" TEXT DEFAULT 'Size',
    "sizeUnit" TEXT DEFAULT 'in',
    "productType" TEXT DEFAULT 'Gang Sheet',
    "printFileNameTokens" JSONB,
    "useCustomButtonLabel" BOOLEAN NOT NULL DEFAULT false,
    "customButtonLabel" TEXT,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductBuilderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSizePreset" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "widthIn" DECIMAL(10, 2),
    "heightIn" DECIMAL(10, 2),
    "price" DECIMAL(10, 2),
    "maxFiles" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSizePreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuilderSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuilderSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GallerySettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "builderOptions" JSONB,
    "watermark" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GallerySettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductBuilderConfig_tenantId_productId_key" ON "ProductBuilderConfig"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "ProductSizePreset_configId_sortOrder_idx" ON "ProductSizePreset"("configId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "BuilderSettings_tenantId_key" ON "BuilderSettings"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "GallerySettings_tenantId_key" ON "GallerySettings"("tenantId");

-- AddForeignKey
ALTER TABLE "ProductBuilderConfig" ADD CONSTRAINT "ProductBuilderConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBuilderConfig" ADD CONSTRAINT "ProductBuilderConfig_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSizePreset" ADD CONSTRAINT "ProductSizePreset_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ProductBuilderConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderSettings" ADD CONSTRAINT "BuilderSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GallerySettings" ADD CONSTRAINT "GallerySettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
