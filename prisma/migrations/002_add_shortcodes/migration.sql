-- CreateTable
CREATE TABLE "Shortcode" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "productId" TEXT,
    "productGid" TEXT NOT NULL,
    "productTitle" TEXT,
    "productHandle" TEXT,
    "surfaceId" TEXT,
    "templateId" TEXT,
    "technique" TEXT,
    "locale" TEXT DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shortcode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shortcode_handle_key" ON "Shortcode"("handle");

-- CreateIndex
CREATE INDEX "Shortcode_tenantId_idx" ON "Shortcode"("tenantId");

-- AddForeignKey
ALTER TABLE "Shortcode" ADD CONSTRAINT "Shortcode_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shortcode" ADD CONSTRAINT "Shortcode_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

