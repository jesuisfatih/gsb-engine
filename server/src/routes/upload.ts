import { Router } from "express";
import { z } from "zod";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { env } from "../env";

const uploadRouter = Router();

const base64ImageSchema = z.object({
  filename: z.string().optional(),
  mimeType: z.string().regex(/^image\/(png|jpeg|jpg|gif|webp|svg\+xml)$/).default("image/png"),
  data: z.string().min(1), // Base64 encoded image data
  folder: z.enum(["designs", "assets", "mockups", "temp"]).default("temp"),
});

const uploadUrlSchema = z.object({
  url: z.string().url(),
  filename: z.string().optional(),
  folder: z.enum(["designs", "assets", "mockups", "temp"]).default("temp"),
});

/**
 * POST /api/upload/base64
 * Upload an image as base64 data
 */
uploadRouter.post("/base64", async (req, res, next) => {
  try {
    const { tenantId } = req.context;
    if (!tenantId) {
      return res.status(400).json({ error: "Missing tenant context" });
    }

    const payload = base64ImageSchema.parse(req.body);

    // Decode base64 data
    const base64Data = payload.data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Generate unique filename
    const ext = payload.mimeType.split("/")[1]?.replace("+xml", "") || "png";
    const filename = payload.filename 
      ? `${payload.filename.replace(/\.[^.]+$/, "")}-${randomUUID()}.${ext}`
      : `${randomUUID()}.${ext}`;

    // Create upload directory structure
    const uploadDir = join(process.cwd(), "uploads", tenantId, payload.folder);
    await mkdir(uploadDir, { recursive: true });

    // Save file
    const filePath = join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // Generate public URL
    const publicUrl = `/uploads/${tenantId}/${payload.folder}/${filename}`;

    console.log(`[upload] Saved base64 image: ${publicUrl} (${buffer.length} bytes)`);

    res.json({
      data: {
        url: publicUrl,
        filename,
        size: buffer.length,
        mimeType: payload.mimeType,
      },
    });
  } catch (error) {
    console.error("[upload] base64 upload failed:", error);
    next(error);
  }
});

/**
 * POST /api/upload/url
 * Upload an image from a URL
 */
uploadRouter.post("/url", async (req, res, next) => {
  try {
    const { tenantId } = req.context;
    if (!tenantId) {
      return res.status(400).json({ error: "Missing tenant context" });
    }

    const payload = uploadUrlSchema.parse(req.body);

    // Fetch image from URL
    const response = await fetch(payload.url);
    if (!response.ok) {
      return res.status(400).json({ error: "Failed to fetch image from URL" });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Detect MIME type from response or filename
    const contentType = response.headers.get("content-type") || "image/png";
    const ext = contentType.split("/")[1]?.split(";")[0] || "png";

    // Generate unique filename
    const filename = payload.filename
      ? `${payload.filename.replace(/\.[^.]+$/, "")}-${randomUUID()}.${ext}`
      : `${randomUUID()}.${ext}`;

    // Create upload directory structure
    const uploadDir = join(process.cwd(), "uploads", tenantId, payload.folder);
    await mkdir(uploadDir, { recursive: true });

    // Save file
    const filePath = join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // Generate public URL
    const publicUrl = `/uploads/${tenantId}/${payload.folder}/${filename}`;

    console.log(`[upload] Saved image from URL: ${publicUrl} (${buffer.length} bytes)`);

    res.json({
      data: {
        url: publicUrl,
        filename,
        size: buffer.length,
        mimeType: contentType,
      },
    });
  } catch (error) {
    console.error("[upload] URL upload failed:", error);
    next(error);
  }
});

/**
 * DELETE /api/upload
 * Delete an uploaded file
 */
uploadRouter.delete("/", async (req, res, next) => {
  try {
    const { tenantId } = req.context;
    if (!tenantId) {
      return res.status(400).json({ error: "Missing tenant context" });
    }

    const { url } = z.object({ url: z.string() }).parse(req.query);

    // Extract tenant and path from URL
    const match = url.match(/^\/uploads\/([^\/]+)\/(.+)$/);
    if (!match || match[1] !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const relativePath = match[2];
    const filePath = join(process.cwd(), "uploads", tenantId, relativePath);

    // Delete file (ignore errors if file doesn't exist)
    const { unlink } = await import("fs/promises");
    await unlink(filePath).catch(() => {});

    console.log(`[upload] Deleted file: ${url}`);

    res.status(204).send();
  } catch (error) {
    console.error("[upload] Delete failed:", error);
    next(error);
  }
});

export { uploadRouter };

