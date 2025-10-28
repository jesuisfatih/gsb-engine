import "./types/express";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { createApiRouter } from "./routes";
import { contextMiddleware } from "./middlewares/context";
import { optionalAuthMiddleware, requireAuthMiddleware } from "./middlewares/authenticate";
import { authRouter } from "./routes/auth";
import { healthRouter } from "./routes/health";
import { embedRouter } from "./routes/embed";
import { proxyRouter } from "./routes/proxy";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());
  app.use(optionalAuthMiddleware);
  app.use(contextMiddleware);
  app.use(morgan("tiny"));

  app.use("/api/auth", authRouter);
  app.use("/api/health", healthRouter);
  app.use("/api/embed", embedRouter);
  app.use("/api/proxy", proxyRouter);
  app.use("/api", requireAuthMiddleware, createApiRouter());

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




