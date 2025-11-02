import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";

export const anonymousRouter = Router();

const syncSchema = z.object({
  fingerprint: z.string().min(32),
  designKey: z.string(),
  snapshot: z.any(),
  previewUrl: z.string().optional(),
  shopifyVariantId: z.string().optional(),
});

/**
 * Hash fingerprint for privacy (SHA-256)
 */
function hashFingerprint(fp: string): string {
  return crypto.createHash('sha256').update(fp).digest('hex');
}

/**
 * POST /api/anonymous/sync
 * Save anonymous design to backend (Safari 7-day fallback)
 */
anonymousRouter.post("/sync", async (req, res, next) => {
  try {
    const { prisma } = req.context;
    const { fingerprint, designKey, snapshot, previewUrl, shopifyVariantId } = syncSchema.parse(req.body);
    
    const fpHash = hashFingerprint(fingerprint);
    
    // Find or create anonymous session
    let session = await prisma.anonymousSession.findUnique({
      where: { fingerprintHash: fpHash },
    });
    
    const designs = (session?.designs as any) || {};
    designs[designKey] = {
      snapshot,
      previewUrl,
      shopifyVariantId,
      updatedAt: new Date().toISOString(),
    };
    
    if (session) {
      // Update existing session
      session = await prisma.anonymousSession.update({
        where: { id: session.id },
        data: {
          designs,
          lastActiveAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        },
      });
    } else {
      // Create new session
      session = await prisma.anonymousSession.create({
        data: {
          fingerprintHash: fpHash,
          designs,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });
    }
    
    console.log(`[anonymous/sync] Synced design for session ${session.id}, key: ${designKey}`);
    
    res.json({ data: { synced: true, sessionId: session.id } });
  } catch (error) {
    console.error('[anonymous/sync] Error:', error);
    next(error);
  }
});

/**
 * GET /api/anonymous/designs/:fingerprint/:key
 * Restore design from backend (Safari 7-day recovery)
 */
anonymousRouter.get("/designs/:fingerprint/:key", async (req, res, next) => {
  try {
    const { prisma } = req.context;
    const fpHash = hashFingerprint(req.params.fingerprint);
    const designKey = req.params.key;
    
    const session = await prisma.anonymousSession.findUnique({
      where: { fingerprintHash: fpHash },
    });
    
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    
    const designs = session.designs as any;
    const design = designs?.[designKey];
    
    if (!design) {
      return res.status(404).json({ error: "Design not found" });
    }
    
    console.log(`[anonymous/designs] Restored design for key: ${designKey}`);
    
    res.json({ data: design });
  } catch (error) {
    console.error('[anonymous/designs] Error:', error);
    next(error);
  }
});

/**
 * POST /api/anonymous/cleanup
 * Delete expired sessions (Cron job)
 */
anonymousRouter.post("/cleanup", async (req, res, next) => {
  try {
    const { prisma } = req.context;
    
    const result = await prisma.anonymousSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    
    console.log(`[anonymous/cleanup] Deleted ${result.count} expired sessions`);
    
    res.json({ data: { deleted: result.count } });
  } catch (error) {
    console.error('[anonymous/cleanup] Error:', error);
    next(error);
  }
});

