import { Router } from "express";
import { catalogRouter } from "./catalog";
import { designsRouter } from "./designs";
import { gangSheetRouter } from "./gang-sheets";
import { jobsRouter } from "./jobs";
import { notificationsRouter } from "./notifications";
import { auditRouter } from "./audit";
import { pricingRouter } from "./pricing";
import { shortcodesRouter } from "./shortcodes";
import { proxyRouter } from "./proxy";
import { supplierRoutingRouter } from "./supplier-routing";
import { templatesRouter } from "./templates";

export function createApiRouter() {
  const router = Router();

  router.use("/catalog", catalogRouter);
  router.use("/designs", designsRouter);
  router.use("/gang-sheets", gangSheetRouter);
  router.use("/jobs", jobsRouter);
  router.use("/notifications", notificationsRouter);
  router.use("/audit", auditRouter);
  router.use("/pricing", pricingRouter);
  router.use("/suppliers/routing", supplierRoutingRouter);
  router.use("/templates", templatesRouter);
  router.use("/shortcodes", shortcodesRouter);
  router.use("/proxy", proxyRouter);

  return router;
}




