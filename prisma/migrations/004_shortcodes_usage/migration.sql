CREATE TABLE "ShortcodeUsage" (
    "id" TEXT NOT NULL,
    "shortcodeId" TEXT NOT NULL,
    "tenantId" TEXT,
    "handle" TEXT NOT NULL,
    "referrer" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShortcodeUsage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ShortcodeUsage_shortcodeId_fkey" FOREIGN KEY ("shortcodeId") REFERENCES "Shortcode"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShortcodeUsage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ShortcodeUsage_shortcodeId_createdAt_idx" ON "ShortcodeUsage"("shortcodeId", "createdAt");
CREATE INDEX "ShortcodeUsage_handle_createdAt_idx" ON "ShortcodeUsage"("handle", "createdAt");
