CREATE TABLE "VariantSurfaceMapping" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "surfaceId" TEXT NOT NULL,
    "shopifyProductId" TEXT,
    "shopifyProductTitle" TEXT,
    "shopifyVariantId" TEXT NOT NULL,
    "shopifyVariantTitle" TEXT,
    "options" JSONB,
    "technique" TEXT,
    "color" TEXT,
    "material" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VariantSurfaceMapping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VariantSurfaceMapping_tenantId_shopifyVariantId_key" ON "VariantSurfaceMapping"("tenantId", "shopifyVariantId");
CREATE INDEX "VariantSurfaceMapping_tenantId_productId_idx" ON "VariantSurfaceMapping"("tenantId", "productId");
CREATE INDEX "VariantSurfaceMapping_shopifyVariantId_idx" ON "VariantSurfaceMapping"("shopifyVariantId");

ALTER TABLE "VariantSurfaceMapping"
  ADD CONSTRAINT "VariantSurfaceMapping_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VariantSurfaceMapping"
  ADD CONSTRAINT "VariantSurfaceMapping_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VariantSurfaceMapping"
  ADD CONSTRAINT "VariantSurfaceMapping_surfaceId_fkey" FOREIGN KEY ("surfaceId") REFERENCES "Surface"("id") ON DELETE CASCADE ON UPDATE CASCADE;
