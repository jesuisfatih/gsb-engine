import { Router } from "express";
import { z } from "zod";

const variantParamSchema = z.object({
  variantId: z.string().trim().min(1),
});

const logSchema = z.object({
  status: z.enum(["success", "error", "timeout", "unavailable"]).default("error"),
  errorCode: z.string().trim().max(64).optional(),
  errorMessage: z.string().trim().max(512).optional(),
  meta: z.record(z.any()).optional(),
  referrer: z.string().trim().max(2048).optional(),
});

export const embedRouter = Router();

embedRouter.get("/shortcodes/:handle", async (req, res, next) => {
  try {
    const { prisma } = req.context;
    const normalized = req.params.handle.toLowerCase();
    const record = await prisma.shortcode.findUnique({
      where: { handle: normalized },
    });
    if (!record) {
      return res.status(404).json({ error: "Shortcode not found" });
    }

    const referrer = req.get("referer") ?? undefined;
    const userAgent = req.get("user-agent") ?? undefined;

    prisma.shortcodeUsage
      .create({
        data: {
          shortcodeId: record.id,
          tenantId: record.tenantId,
          handle: normalized,
          referrer,
          userAgent,
          status: "success",
        },
      })
      .catch(error => {
        console.warn("[shortcodes] usage logging failed", error);
      });

    res.json({ data: record });
  } catch (error) {
    next(error);
  }
});

embedRouter.get("/catalog/mappings/:variantId", async (req, res, next) => {
  try {
    const { prisma } = req.context;
    const { variantId } = variantParamSchema.parse(req.params);

    const mapping = await prisma.variantSurfaceMapping.findFirst({
      where: { shopifyVariantId: variantId },
      include: {
        product: { select: { id: true, slug: true, title: true } },
        surface: { select: { id: true, name: true } },
      },
    });

    if (!mapping) {
      return res.status(404).json({ error: "Variant mapping not found" });
    }

    res.json({
      data: {
        productId: mapping.productId,
        productSlug: mapping.product?.slug ?? null,
        productTitle: mapping.product?.title ?? null,
        surfaceId: mapping.surfaceId,
        surfaceName: mapping.surface?.name ?? null,
        technique: mapping.technique ?? null,
        shortcodeHandle: mapping.shortcodeHandle ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
});

embedRouter.post("/shortcodes/:handle/log", async (req, res, next) => {
  try {
    const { prisma } = req.context;
    const normalized = req.params.handle.toLowerCase();
    const record = await prisma.shortcode.findUnique({
      where: { handle: normalized },
    });
    if (!record) {
      return res.status(404).json({ error: "Shortcode not found" });
    }

    const parsed = logSchema.safeParse({
      ...req.body,
      referrer: req.body?.referrer ?? req.get("referer"),
    });
    if (!parsed.success) {
      return res.status(422).json({ error: parsed.error.flatten() });
    }
    const payload = parsed.data;

    prisma.shortcodeUsage
      .create({
        data: {
          shortcodeId: record.id,
          tenantId: record.tenantId,
          handle: normalized,
          referrer: payload.referrer ?? undefined,
          userAgent: req.get("user-agent") ?? undefined,
          status: payload.status,
          errorCode: payload.errorCode ?? undefined,
          errorMessage: payload.errorMessage ?? undefined,
          meta: payload.meta ?? undefined,
        },
      })
      .catch(error => {
        console.warn("[shortcodes] failure logging failed", error);
      });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
