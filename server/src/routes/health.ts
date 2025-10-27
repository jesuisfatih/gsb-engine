import { Router } from "express";
import { env } from "../env";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  res.json({
    status: "ok",
    env: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});
