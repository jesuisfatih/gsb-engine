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
import { billingRouter } from "./billing";
import { merchantConfigRouter } from "./merchant-config";
import { ordersRouter } from "./orders";
import { uploadRouter } from "./upload";
import { shopifyRouter } from "./shopify";
import { webhooksRouter } from "./webhooks";
import { analyticsRouter } from "./analytics";
// import { anonymousRouter } from "./anonymous"; // Moved to app.ts (public route)
// import { graphqlRouter } from "./graphql"; // TEMP DISABLED - Apollo Server v5 import issue

export function createApiRouter() {
  const router = Router();

  // router.use("/graphql", graphqlRouter); // TEMP DISABLED
  // anonymousRouter moved to app.ts - must be public (no auth)
  router.use("/catalog", catalogRouter);
  router.use("/designs", designsRouter);
  router.use("/gang-sheets", gangSheetRouter);
  router.use("/jobs", jobsRouter);
  router.use("/notifications", notificationsRouter);
  router.use("/audit", auditRouter);
  router.use("/pricing", pricingRouter);
  router.use("/orders", ordersRouter);
  router.use("/suppliers/routing", supplierRoutingRouter);
  router.use("/templates", templatesRouter);
  router.use("/shortcodes", shortcodesRouter);
  router.use("/billing", billingRouter);
  router.use("/merchant/config", merchantConfigRouter);
  router.use("/proxy", proxyRouter);
  router.use("/upload", uploadRouter);
  router.use("/shopify", shopifyRouter);
  router.use("/webhooks", webhooksRouter);
  router.use("/analytics", analyticsRouter);

  return router;
}

