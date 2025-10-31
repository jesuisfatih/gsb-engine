import "./types/express";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";
import { createApiRouter } from "./routes";
import { contextMiddleware } from "./middlewares/context";
import { optionalAuthMiddleware, requireAuthMiddleware } from "./middlewares/authenticate";
import { authRouter } from "./routes/auth";
import { healthRouter } from "./routes/health";
import { embedRouter } from "./routes/embed";
import { proxyRouter } from "./routes/proxy";

export function createApp() {
  const app = express();
  
  // Detailed request logging
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    
    // Log response
    const originalSend = res.send;
    res.send = function(data) {
      if (res.statusCode === 404) {
        console.error(`[404] ${req.method} ${req.path} - NOT FOUND`);
      }
      return originalSend.call(this, data);
    };
    
    next();
  });

  app.set("trust proxy", 1);
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());
  app.use(optionalAuthMiddleware);
  app.use(contextMiddleware);
  app.use(morgan("tiny"));

  // Serve uploaded files (static)
  app.use("/uploads", express.static("uploads"));

  // Serve static files from dist folder (SPA frontend)
  // This must come BEFORE API routes to handle SPA routing correctly
  const distPath = path.join(__dirname, "../../../dist");
  
  // Serve static assets (JS, CSS, images, etc.)
  app.use(express.static(distPath, {
    maxAge: "1h", // Cache static assets for 1 hour
    etag: true,
    lastModified: true,
  }));

  // Handle API routes
  app.use("/api/auth", authRouter);
  app.use("/api/health", healthRouter);
  app.use("/api/embed", embedRouter);
  app.use("/api/proxy", proxyRouter);
  app.use("/api", requireAuthMiddleware, createApiRouter());

  // SPA fallback: Serve index.html for all non-API routes
  // This handles /shopify/embedded and other SPA routes
  app.use((req, res, next) => {
    // Skip API routes
    if (req.path.startsWith("/api/")) {
      return next();
    }
    
    // Serve index.html for SPA routes
    const indexPath = path.join(distPath, "index.html");
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error("[app] Failed to serve index.html:", err);
        res.status(500).send("Internal Server Error");
      }
    });
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof Error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "Unexpected error" });
  });

  return app;
}




