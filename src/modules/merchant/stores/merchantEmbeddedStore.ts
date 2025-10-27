import { computed, reactive, watch } from "vue";
import { defineStore } from "pinia";

type ChecklistStatus = "not-started" | "in-progress" | "done";

export type ChecklistItem = {
  text: string;
  completed: boolean;
};

export type MetricTone = "positive" | "warning" | "critical" | "neutral";

export type MetricItem = {
  label: string;
  value: string;
  tone?: MetricTone;
};

export type PanelAction = {
  label: string;
  variant?: "primary" | "secondary" | "ghost";
  intent?: "markDone" | "start" | "openLink";
};

export type PanelCard = {
  id: string;
  title: string;
  description: string;
  checklist?: ChecklistItem[];
  status?: ChecklistStatus;
  statusLabel?: string;
  actions?: PanelAction[];
  metrics?: MetricItem[];
};

export type PanelSection = {
  id: string;
  title: string;
  description: string;
  cards: PanelCard[];
};

type ActivityEntry = {
  timestamp: string;
  sectionId: string;
  cardId: string;
  action: string;
};

const now = () => new Date().toISOString();

type TokenStatus = "active" | "pending" | "rotation-needed";

type TokenEntry = {
  label: string;
  value: string;
  status: TokenStatus;
  lastRotated: string | null;
};

type RoleStatus = "Active" | "Invitation sent" | "Disabled";

type RoleAssignment = {
  email: string;
  role: "Merchant Admin" | "Merchant Staff" | "Support";
  status: RoleStatus;
  lastSeen: string;
};

type AppBootstrapState = {
  appUrl: string;
  redirectUrls: string[];
  notes: string;
  tokens: Record<"storefront" | "admin" | "mockup", TokenEntry>;
  roleAssignments: RoleAssignment[];
};

type ProductSyncStatus = "idle" | "running" | "success" | "failed";

type ProductSyncState = {
  status: ProductSyncStatus;
  lastRun: string | null;
  nextRun: string | null;
  autoSync: boolean;
  error: string | null;
};

type VariantMappingStatus = "linked" | "pending" | "missing";

type VariantMappingEntry = {
  id: string;
  productTitle: string;
  variantTitle: string;
  surface: string;
  technique: string;
  status: VariantMappingStatus;
};

type WebhookStatus = "connected" | "retrying" | "failed";

type WebhookEndpoint = {
  topic: string;
  url: string;
  status: WebhookStatus;
  lastResponse: string | null;
  retries: number;
  enabled: boolean;
};

type ShopifyIntegrationState = {
  productSync: ProductSyncState;
  variantMappings: VariantMappingEntry[];
  webhooks: WebhookEndpoint[];
};

type PersistedSnapshot = {
  appBootstrap: AppBootstrapState;
  shopifyIntegration: ShopifyIntegrationState;
};

const bootstrapDefaults: AppBootstrapState = {
  appUrl: "https://gsb.example.com",
  redirectUrls: [
    "https://gsb.example.com/auth/callback",
    "https://gsb.example.com/api/auth/callback",
  ],
  notes: "",
  tokens: {
    storefront: {
      label: "Storefront token",
      value: "985b2588219e3e530073fa1f42fbf2dd",
      status: "active",
      lastRotated: "2025-10-24T10:12:00.000Z",
    },
    admin: {
      label: "Admin token",
      value: "shpat_*******************",
      status: "rotation-needed",
      lastRotated: "2025-09-30T08:45:00.000Z",
    },
    mockup: {
      label: "Mockup service token",
      value: "",
      status: "pending",
      lastRotated: null,
    },
  },
  roleAssignments: [
    {
      email: "merchantadmin@gsb.dev",
      role: "Merchant Admin",
      status: "Active",
      lastSeen: "2025-10-26T10:42:00.000Z",
    },
    {
      email: "merchantstaff@gsb.dev",
      role: "Merchant Staff",
      status: "Active",
      lastSeen: "2025-10-26T08:18:00.000Z",
    },
    {
      email: "ops@gsb.dev",
      role: "Merchant Staff",
      status: "Invitation sent",
      lastSeen: "",
    },
  ],
};

const shopifyIntegrationDefaults: ShopifyIntegrationState = {
  productSync: {
    status: "idle",
    lastRun: null,
    nextRun: null,
    autoSync: false,
    error: null,
  },
  variantMappings: [
    {
      id: "var-001",
      productTitle: "Classic Tee",
      variantTitle: "White / M",
      surface: "tshirt-front",
      technique: "DTF",
      status: "linked",
    },
    {
      id: "var-002",
      productTitle: "Classic Tee",
      variantTitle: "Black / XL",
      surface: "tshirt-back",
      technique: "DTF",
      status: "linked",
    },
    {
      id: "var-003",
      productTitle: "Mug 11oz",
      variantTitle: "Default",
      surface: "mug-wrap",
      technique: "Sublimation",
      status: "pending",
    },
  ],
  webhooks: [
    {
      topic: "orders/create",
      url: "/api/webhooks/orders",
      status: "connected",
      lastResponse: "2025-10-26T10:15:00.000Z",
      retries: 0,
      enabled: true,
    },
    {
      topic: "products/update",
      url: "/api/webhooks/products",
      status: "retrying",
      lastResponse: "2025-10-26T09:58:00.000Z",
      retries: 2,
      enabled: true,
    },
    {
      topic: "variants/update",
      url: "/api/webhooks/variants",
      status: "failed",
      lastResponse: "2025-10-25T22:11:00.000Z",
      retries: 5,
      enabled: false,
    },
  ],
};

export const useMerchantEmbeddedStore = defineStore("merchantEmbeddedStore", () => {
  const STORAGE_KEY = "gsb-merchant-embedded-bootstrap-v1";
  const appBootstrap = reactive<AppBootstrapState>({
    ...bootstrapDefaults,
    redirectUrls: [...bootstrapDefaults.redirectUrls],
    tokens: {
      storefront: { ...bootstrapDefaults.tokens.storefront },
      admin: { ...bootstrapDefaults.tokens.admin },
      mockup: { ...bootstrapDefaults.tokens.mockup },
    },
    roleAssignments: bootstrapDefaults.roleAssignments.map((entry) => ({ ...entry })),
  });
  const shopifyIntegration = reactive<ShopifyIntegrationState>({
    productSync: { ...shopifyIntegrationDefaults.productSync },
    variantMappings: shopifyIntegrationDefaults.variantMappings.map((entry) => ({ ...entry })),
    webhooks: shopifyIntegrationDefaults.webhooks.map((entry) => ({ ...entry })),
  });
  const sections = reactive<PanelSection[]>([
    {
      id: "app-bootstrap",
      title: "App Bootstrap",
      description:
        "Connect the embedded app to the production domain, tokens, and merchant roles.",
      cards: [
        {
          id: "app-url",
          title: "Shopify App URL & redirects",
          description:
            "Point the app to the live domain and register the OAuth callbacks.",
          checklist: [
            {
              text: "Set primary app URL (ex: https://gangsheet.example.com).",
              completed: false,
            },
            {
              text: "Add /auth/callback and /api/auth/callback to redirect list.",
              completed: false,
            },
            {
              text: "Verify Cloudflare tunnel or reverse proxy reaches the app.",
              completed: false,
            },
          ],
          actions: [
            { label: "Open app settings", variant: "primary", intent: "openLink" },
            { label: "Copy redirect sample", variant: "ghost", intent: "openLink" },
          ],
          status: "not-started",
          statusLabel: "Awaiting setup",
        },
        {
          id: "token-management",
          title: "Token management",
          description:
            "Storefront, Admin API, and mockup service secrets managed per tenant.",
          checklist: [
            {
              text: "Create Storefront access token and copy to environment.",
              completed: false,
            },
            {
              text: "Generate Admin API token for proxy/webhook calls.",
              completed: false,
            },
            {
              text: "Sync secrets with infra vault or password manager.",
              completed: false,
            },
          ],
          status: "in-progress",
          statusLabel: "Needs vault sync",
          metrics: [
            { label: "Storefront token", value: "Active", tone: "positive" },
            { label: "Admin token", value: "Pending rotation", tone: "warning" },
          ],
          actions: [
            { label: "Mark complete", variant: "secondary", intent: "markDone" },
          ],
        },
        {
          id: "role-assignment",
          title: "Role assignment",
          description:
            "Grant merchant admin and staff access to operations and editor modules.",
          checklist: [
            { text: "Invite merchant admin (full access).", completed: false },
            {
              text: "Add production staff with gang sheet permissions.",
              completed: false,
            },
            {
              text: "Review default ability matrix (CASL) before launch.",
              completed: false,
            },
          ],
          status: "not-started",
          statusLabel: "Invites pending",
          actions: [
            { label: "Manage roles", variant: "secondary", intent: "openLink" },
            { label: "Mark complete", variant: "ghost", intent: "markDone" },
          ],
        },
      ],
    },
    {
      id: "shopify-integration",
      title: "Shopify Integration",
      description:
        "Sync catalog, variants, metafields, and webhooks from the merchant store.",
      cards: [
        {
          id: "product-import",
          title: "Product import",
          description:
            "Pull Shopify products and surfaces into the gang sheet catalog.",
          checklist: [
            { text: "Run product sync for initial catalog import.", completed: false },
            {
              text: "Map product metafields to surface definitions.",
              completed: false,
            },
            {
              text: "Schedule nightly delta sync or webhook refresh.",
              completed: false,
            },
          ],
          status: "in-progress",
          statusLabel: "Initial sync running",
        },
        {
          id: "variant-mapping",
          title: "Variant mapping",
          description:
            "Connect Shopify variants to print surfaces and default techniques.",
          checklist: [
            {
              text: "Match variants to front/back/pocket surfaces.",
              completed: false,
            },
            { text: "Set default technique (DTF, gang, embroidery).", completed: false },
            { text: "Verify preview thumbnails per surface.", completed: false },
          ],
          actions: [
            { label: "Open mapping table", variant: "primary", intent: "openLink" },
          ],
        },
        {
          id: "webhooks",
          title: "Webhook setup",
          description:
            "Enable order, product, and variant webhooks for realtime updates.",
          checklist: [
            { text: "Register orders/create and orders/paid.", completed: false },
            {
              text: "Register products/update and variants/update.",
              completed: false,
            },
            {
              text: "Confirm HMAC validation succeeds against API server.",
              completed: false,
            },
          ],
          metrics: [
            { label: "orders/create", value: "200 OK", tone: "positive" },
            { label: "products/update", value: "Retrying", tone: "warning" },
          ],
        },
      ],
    },
    {
      id: "branding",
      title: "Brand & Customization",
      description:
        "Apply merchant branding across the editor, mockups, and customer flows.",
      cards: [
        {
          id: "brand-assets",
          title: "Brand assets",
          description:
            "Upload logo, color palette, and branded mockup placeholders.",
          checklist: [
            { text: "Upload primary and secondary logos.", completed: false },
            { text: "Define palette tokens for UI and preview.", completed: false },
            { text: "Provide default watermark for previews.", completed: false },
          ],
        },
        {
          id: "font-library",
          title: "Font library",
          description:
            "Configure Google and premium fonts available in the editor.",
          checklist: [
            { text: "Select base fonts (ex: Inter, Poppins).", completed: false },
            { text: "Upload premium fonts (WOFF2).", completed: false },
            { text: "Assign default font per product category.", completed: false },
          ],
          actions: [
            { label: "Open font manager", variant: "secondary", intent: "openLink" },
          ],
        },
        {
          id: "theme-embed",
          title: "Theme embed",
          description:
            "Customize the app embed button label, colors, and open mode.",
          checklist: [
            { text: "Set button copy.", completed: true },
            { text: "Adjust button colors to match theme.", completed: true },
            { text: "Choose open mode (modal vs navigate).", completed: true },
          ],
          status: "done",
          statusLabel: "Live",
        },
      ],
    },
    {
      id: "templates-assets",
      title: "Template & Asset Library",
      description:
        "Maintain gang sheet templates, campaign assets, and personalization rules.",
      cards: [
        {
          id: "template-library",
          title: "Template library",
          description:
            "Organize default templates by product, surface, and campaign tags.",
          checklist: [
            { text: "Import baseline templates from global catalog.", completed: false },
            { text: "Tag merchant campaigns (Black Friday, TeamSports).", completed: false },
            { text: "Lock personalization placeholders where needed.", completed: false },
          ],
          actions: [{ label: "Create template", variant: "primary", intent: "openLink" }],
        },
        {
          id: "asset-gallery",
          title: "Asset gallery",
          description:
            "Manage logos, icons, and art packs used inside the editor.",
          checklist: [
            { text: "Upload merchant logos and reusable assets.", completed: false },
            { text: "Apply labels (logo, vector, photo, mascot).", completed: false },
            { text: "Enable shared assets for gang vs DTF workflows.", completed: false },
          ],
        },
        {
          id: "constraint-rules",
          title: "Constraint rules",
          description:
            "Define placeholder requirements, text limits, and locked layers.",
          checklist: [
            { text: "Mark mandatory personalization fields.", completed: false },
            { text: "Set character limits and allowed fonts.", completed: false },
            { text: "Restrict editing of brand watermark layers.", completed: false },
          ],
          status: "in-progress",
          statusLabel: "Review with marketing",
        },
      ],
    },
    {
      id: "product-tech",
      title: "Product & Technique Rules",
      description:
        "Capture print area masks, safe zones, and print technique restrictions.",
      cards: [
        {
          id: "surface-masks",
          title: "Surface masks",
          description:
            "Upload SVG masks for each surface, including bleed and safe areas.",
          checklist: [
            { text: "Define dimensions in millimeters and DPI target.", completed: false },
            { text: "Mark safe zone vs bleed overlay colors.", completed: false },
            { text: "Flag no-print zones.", completed: false },
          ],
        },
        {
          id: "technique-specs",
          title: "Technique specs",
          description:
            "Record requirements for DTF, DTG, sublimation, screen print, and embroidery.",
          checklist: [
            { text: "Set minimum DPI and line thickness per technique.", completed: false },
            { text: "Restrict unsupported effects.", completed: false },
            { text: "Document trapping, mirroring, and white underbase rules.", completed: false },
          ],
        },
        {
          id: "pack-presets",
          title: "Pack presets",
          description:
            "Store gang sheet canvas sizes and packing heuristics.",
          checklist: [
            { text: "Add gang sheet presets (ex: 22x24 in, 600 DPI).", completed: false },
            { text: "Choose packing mode (MaxRects, Guillotine).", completed: false },
            { text: "Configure margin, rotation, and grouping defaults.", completed: false },
          ],
          metrics: [{ label: "Default preset", value: "22x24 in / 600 DPI", tone: "neutral" }],
        },
      ],
    },
    {
      id: "pricing",
      title: "Pricing & Promotions",
      description:
        "Combine product base cost, technique fees, color breaks, and quantity tiers.",
      cards: [
        {
          id: "base-pricing",
          title: "Base pricing",
          description:
            "Define base price per product and variant adjustments.",
          checklist: [
            { text: "Set base cost per product template.", completed: false },
            { text: "Configure size/material surcharges.", completed: false },
            { text: "Sync with Shopify price or metafields if required.", completed: false },
          ],
        },
        {
          id: "technique-formulas",
          title: "Technique formulas",
          description:
            "Calculate fees by print area, color count, or sheet usage.",
          checklist: [
            { text: "Add color break table for screen print.", completed: false },
            { text: "Set area-based pricing for DTF.", completed: false },
            { text: "Enable automatic gang sheet quoting.", completed: false },
          ],
          actions: [{ label: "Edit formulas", variant: "primary", intent: "openLink" }],
        },
        {
          id: "promotions-tax",
          title: "Promotions & tax",
          description:
            "Manage discounts, bundle offers, VAT, and shipping add-ons.",
          checklist: [
            { text: "Create campaign coupons and usage limits.", completed: false },
            { text: "Apply location based tax profiles.", completed: false },
            { text: "Add estimated shipping or setup fee components.", completed: false },
          ],
        },
      ],
    },
    {
      id: "order-flow",
      title: "Order & Proof Flow",
      description:
        "Control preflight checks, proof approvals, and supplier routing.",
      cards: [
        {
          id: "preflight",
          title: "Preflight policies",
          description:
            "Decide which editor warnings block checkout vs allow override.",
          checklist: [
            { text: "Set DPI, bleed, and effect warnings as block/warn.", completed: false },
            { text: "Enable auto repair where possible.", completed: false },
            { text: "Require acknowledgement for risky submissions.", completed: false },
          ],
          status: "in-progress",
          statusLabel: "Policy review",
        },
        {
          id: "proof-approvals",
          title: "Proof approvals",
          description:
            "Configure email notifications and approval queue for operations team.",
          checklist: [
            { text: "Define proof email template and subject.", completed: false },
            { text: "Enable reminder cadence (24h, 48h).", completed: false },
            { text: "Route approved jobs to supplier queue automatically.", completed: false },
          ],
        },
        {
          id: "supplier-routing",
          title: "Supplier routing",
          description:
            "Assign default facility per technique with SLA awareness.",
          checklist: [
            { text: "Map technique to preferred supplier.", completed: false },
            { text: "Set fallback supplier and escalation rules.", completed: false },
            { text: "Track SLA targets (turnaround, shipping).", completed: false },
          ],
          metrics: [
            { label: "Primary facility", value: "DTF Labs - Chicago", tone: "neutral" },
            { label: "SLA target", value: "<= 48h ship", tone: "warning" },
          ],
        },
      ],
    },
    {
      id: "operations",
      title: "Operations & Fulfillment",
      description:
        "Handle gang sheet packing, production outputs, barcodes, and shipping prep.",
      cards: [
        {
          id: "gang-pack",
          title: "Gang sheet packing",
          description:
            "Tune spacing, rotation, and auto-pack presets for production.",
          checklist: [
            { text: "Set default margin and bleed tolerance.", completed: false },
            { text: "Decide rotation increments (0/90 vs free rotate).", completed: false },
            { text: "Toggle grouping by order vs global efficiency.", completed: false },
          ],
        },
        {
          id: "production-outputs",
          title: "Production outputs",
          description:
            "Prepare download bundles per technique (PNG, PDF, DST, etc.).",
          checklist: [
            { text: "Configure naming format and storage path.", completed: false },
            { text: "Enable white ink info layer for DTF/DTG.", completed: false },
            { text: "Attach registration or crop marks.", completed: false },
          ],
          actions: [
            { label: "Manage output presets", variant: "secondary", intent: "openLink" },
          ],
        },
        {
          id: "packing-labels",
          title: "Packing & labels",
          description:
            "Generate barcodes, packing slips, and checklist for fulfillment.",
          checklist: [
            { text: "Set barcode schema (order + line item).", completed: false },
            { text: "Design packing slip template with branding.", completed: false },
            { text: "Add final QC checklist for operators.", completed: false },
          ],
        },
      ],
    },
    {
      id: "analytics",
      title: "Reporting & Monitoring",
      description:
        "Track sales performance, technical metrics, supplier SLA, and webhooks.",
      cards: [
        {
          id: "dashboard-metrics",
          title: "Dashboard metrics",
          description:
            "Review revenue, template usage, and conversion within the editor.",
          checklist: [
            { text: "Add date range and campaign filters.", completed: false },
            { text: "Surface top selling templates and variants.", completed: false },
            { text: "Track editor abandon vs add-to-cart rate.", completed: false },
          ],
        },
        {
          id: "technique-efficiency",
          title: "Technique efficiency",
          description:
            "Compare rejection rate, rework, and profitability per print method.",
          checklist: [
            { text: "Log failure reasons (banding, low DPI).", completed: false },
            { text: "Track sheet utilization percentage.", completed: false },
            { text: "Monitor reprint ratio and margin impact.", completed: false },
          ],
          metrics: [
            { label: "DTF utilization", value: "82%", tone: "positive" },
            { label: "Reprint rate", value: "5.4%", tone: "warning" },
          ],
        },
        {
          id: "webhook-health",
          title: "Webhook health",
          description:
            "Ensure Shopify webhooks and background jobs stay healthy.",
          checklist: [
            { text: "Monitor 200 vs 401/500 responses.", completed: false },
            { text: "Alert on repeated retries or timeouts.", completed: false },
            { text: "Review last successful ping per endpoint.", completed: false },
          ],
        },
      ],
    },
    {
      id: "security",
      title: "Users & Security",
      description:
        "Manage staff permissions, audit log retention, and critical alerts.",
      cards: [
        {
          id: "role-matrix",
          title: "Role matrix",
          description:
            "Review CASL ability rules for merchant admin vs staff roles.",
          checklist: [
            { text: "Confirm staff cannot edit pricing or plan limits.", completed: false },
            { text: "Allow operators access to gang sheet and fulfillment only.", completed: false },
            { text: "Enable read-only analytics role if needed.", completed: false },
          ],
        },
        {
          id: "audit-log",
          title: "Audit log",
          description:
            "Store high value actions for compliance and troubleshooting.",
          checklist: [
            { text: "Log template changes, pricing edits, and webhook settings.", completed: false },
            { text: "Set retention window (90 or 180 days).", completed: false },
            { text: "Expose export to CSV for compliance requests.", completed: false },
          ],
          status: "not-started",
          statusLabel: "Schema design",
        },
        {
          id: "security-policies",
          title: "Security policies",
          description:
            "Apply MFA, session limits, and production access alerts.",
          checklist: [
            { text: "Enforce MFA for merchant admins via Shopify.", completed: false },
            { text: "Expire staff sessions after idle window.", completed: false },
            { text: "Alert when sensitive settings change.", completed: false },
          ],
          actions: [{ label: "Configure policies", variant: "primary", intent: "openLink" }],
        },
      ],
    },
    {
      id: "support",
      title: "Support & Documentation",
      description:
        "Provide onboarding, troubleshooting, and contact channels for the merchant team.",
      cards: [
        {
          id: "onboarding-guide",
          title: "Onboarding guide",
          description:
            "Publish quick start and video walkthroughs inside the app.",
          checklist: [
            { text: "Link to setup checklist PDF or Notion doc.", completed: false },
            { text: "Embed short video about editor workflow.", completed: false },
            { text: "Highlight support hours and escalation path.", completed: false },
          ],
        },
        {
          id: "troubleshooter",
          title: "Troubleshooter",
          description:
            "Surface common issues (embed not showing, webhook failure, mockup missing).",
          checklist: [
            { text: "Create decision tree for theme embed issues.", completed: false },
            { text: "Document token refresh and catalog sync steps.", completed: false },
            { text: "List known CDN or render outages.", completed: false },
          ],
          actions: [{ label: "Edit troubleshooter", variant: "secondary", intent: "openLink" }],
        },
        {
          id: "support-channels",
          title: "Support channels",
          description:
            "Keep contact information and SLAs accessible for merchants.",
          metrics: [
            { label: "Slack", value: "#gsb-support", tone: "neutral" },
            { label: "Email", value: "support@gangsheets.app", tone: "neutral" },
            { label: "Phone", value: "+1 (312) 555-0188", tone: "neutral" },
          ],
        },
      ],
    },
  ]);

  const activityLog = reactive<ActivityEntry[]>([]);

  function toSnapshot(): PersistedSnapshot {
    return {
      appBootstrap: {
        appUrl: appBootstrap.appUrl,
        redirectUrls: [...appBootstrap.redirectUrls],
        notes: appBootstrap.notes,
        tokens: {
          storefront: { ...appBootstrap.tokens.storefront },
          admin: { ...appBootstrap.tokens.admin },
          mockup: { ...appBootstrap.tokens.mockup },
        },
        roleAssignments: appBootstrap.roleAssignments.map((entry) => ({ ...entry })),
      },
      shopifyIntegration: {
        productSync: { ...shopifyIntegration.productSync },
        variantMappings: shopifyIntegration.variantMappings.map((entry) => ({ ...entry })),
        webhooks: shopifyIntegration.webhooks.map((entry) => ({ ...entry })),
      },
    };
  }

  function hydrateBootstrap(partial: Partial<AppBootstrapState>) {
    if (partial.appUrl) appBootstrap.appUrl = partial.appUrl;
    if (Array.isArray(partial.redirectUrls)) {
      appBootstrap.redirectUrls.splice(0, appBootstrap.redirectUrls.length, ...partial.redirectUrls);
    }
    if (typeof partial.notes === "string") {
      appBootstrap.notes = partial.notes;
    }
    if (partial.tokens) {
      (Object.keys(appBootstrap.tokens) as Array<keyof AppBootstrapState["tokens"]>).forEach((key) => {
        if (partial.tokens && partial.tokens[key]) {
          Object.assign(appBootstrap.tokens[key], partial.tokens[key]);
        }
      });
    }
    if (Array.isArray(partial.roleAssignments)) {
      appBootstrap.roleAssignments.splice(
        0,
        appBootstrap.roleAssignments.length,
        ...partial.roleAssignments.map((entry) => ({ ...entry })),
      );
    }
    syncAppBootstrapDerivedState();
  }

  function hydrateIntegration(partial: Partial<ShopifyIntegrationState>) {
    if (partial.productSync) {
      Object.assign(shopifyIntegration.productSync, partial.productSync);
    }
    if (Array.isArray(partial.variantMappings)) {
      shopifyIntegration.variantMappings.splice(
        0,
        shopifyIntegration.variantMappings.length,
        ...partial.variantMappings.map((entry) => ({ ...entry })),
      );
    }
    if (Array.isArray(partial.webhooks)) {
      shopifyIntegration.webhooks.splice(
        0,
        shopifyIntegration.webhooks.length,
        ...partial.webhooks.map((entry) => ({ ...entry })),
      );
    }
    syncShopifyIntegrationDerivedState();
  }

  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedSnapshot> | Partial<AppBootstrapState>;
        if ("appBootstrap" in parsed || "shopifyIntegration" in parsed) {
          if ("appBootstrap" in parsed && parsed.appBootstrap) {
            hydrateBootstrap(parsed.appBootstrap);
          }
          if ("shopifyIntegration" in parsed && parsed.shopifyIntegration) {
            hydrateIntegration(parsed.shopifyIntegration);
          }
        } else {
          hydrateBootstrap(parsed as Partial<AppBootstrapState>);
        }
      }
    } catch (error) {
      console.warn("[merchantEmbeddedStore] Failed to hydrate embedded state", error);
    }

    watch(
      [appBootstrap, shopifyIntegration],
      () => {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSnapshot()));
        } catch (error) {
          console.warn("[merchantEmbeddedStore] Failed to persist embedded state", error);
        }
      },
      { deep: true },
    );
  }

  function setAppUrl(url: string) {
    appBootstrap.appUrl = url.trim();
    activityLog.unshift({
      timestamp: now(),
      sectionId: "app-bootstrap",
      cardId: "app-url",
      action: `App URL updated to ${appBootstrap.appUrl || "—"}`,
    });
    syncAppBootstrapDerivedState();
  }

  function addRedirect(url: string) {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (appBootstrap.redirectUrls.includes(trimmed)) return;
    appBootstrap.redirectUrls.push(trimmed);
    activityLog.unshift({
      timestamp: now(),
      sectionId: "app-bootstrap",
      cardId: "app-url",
      action: `Redirect added: ${trimmed}`,
    });
    syncAppBootstrapDerivedState();
  }

  function removeRedirect(url: string) {
    const index = appBootstrap.redirectUrls.findIndex((entry) => entry === url);
    if (index === -1) return;
    appBootstrap.redirectUrls.splice(index, 1);
    activityLog.unshift({
      timestamp: now(),
      sectionId: "app-bootstrap",
      cardId: "app-url",
      action: `Redirect removed: ${url}`,
    });
    syncAppBootstrapDerivedState();
  }

  function updateToken(key: keyof AppBootstrapState["tokens"], payload: Partial<TokenEntry>) {
    const token = appBootstrap.tokens[key];
    Object.assign(token, payload);
    if (payload.value) {
      token.status = payload.status ?? token.status ?? "active";
      token.lastRotated = payload.lastRotated ?? now();
    }
    activityLog.unshift({
      timestamp: now(),
      sectionId: "app-bootstrap",
      cardId: "token-management",
      action: `${token.label} updated`,
    });
    syncAppBootstrapDerivedState();
  }

  function rotateToken(key: keyof AppBootstrapState["tokens"]) {
    const token = appBootstrap.tokens[key];
    token.lastRotated = now();
    token.status = "active";
    activityLog.unshift({
      timestamp: token.lastRotated,
      sectionId: "app-bootstrap",
      cardId: "token-management",
      action: `${token.label} rotated`,
    });
    syncAppBootstrapDerivedState();
  }

  function setTokenStatus(key: keyof AppBootstrapState["tokens"], status: TokenStatus) {
    const token = appBootstrap.tokens[key];
    token.status = status;
    if (status === "active" && !token.lastRotated) {
      token.lastRotated = now();
    }
    activityLog.unshift({
      timestamp: now(),
      sectionId: "app-bootstrap",
      cardId: "token-management",
      action: `${token.label} marked ${status}`,
    });
    syncAppBootstrapDerivedState();
  }

  function upsertRoleAssignment(entry: RoleAssignment) {
    const existing = appBootstrap.roleAssignments.find((role) => role.email === entry.email);
    if (existing) {
      Object.assign(existing, entry);
      activityLog.unshift({
        timestamp: now(),
        sectionId: "app-bootstrap",
        cardId: "role-assignment",
        action: `Role updated: ${entry.email}`,
      });
      syncAppBootstrapDerivedState();
      return;
    }
    appBootstrap.roleAssignments.push(entry);
    activityLog.unshift({
      timestamp: now(),
      sectionId: "app-bootstrap",
      cardId: "role-assignment",
      action: `Role invited: ${entry.email}`,
    });
    syncAppBootstrapDerivedState();
  }

  function removeRole(email: string) {
    const index = appBootstrap.roleAssignments.findIndex((role) => role.email === email);
    if (index === -1) return;
    appBootstrap.roleAssignments.splice(index, 1);
    activityLog.unshift({
      timestamp: now(),
      sectionId: "app-bootstrap",
      cardId: "role-assignment",
      action: `Role removed: ${email}`,
    });
    syncAppBootstrapDerivedState();
  }

  function updateRoleStatus(email: string, status: RoleStatus) {
    const entry = appBootstrap.roleAssignments.find((role) => role.email === email);
    if (!entry) return;
    entry.status = status;
    if (status === "Active" && !entry.lastSeen) {
      entry.lastSeen = now();
    }
    activityLog.unshift({
      timestamp: now(),
      sectionId: "app-bootstrap",
      cardId: "role-assignment",
      action: `${email} set to ${status}`,
    });
    syncAppBootstrapDerivedState();
  }

  function runProductSync() {
    if (shopifyIntegration.productSync.status === "running") return;
    shopifyIntegration.productSync.status = "running";
    shopifyIntegration.productSync.error = null;
    shopifyIntegration.productSync.lastRun = now();
    activityLog.unshift({
      timestamp: shopifyIntegration.productSync.lastRun,
      sectionId: "shopify-integration",
      cardId: "product-import",
      action: "Product sync triggered",
    });
    syncShopifyIntegrationDerivedState();
    const completeSuccess = () => {
      shopifyIntegration.productSync.status = "success";
      shopifyIntegration.productSync.nextRun = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      activityLog.unshift({
        timestamp: now(),
        sectionId: "shopify-integration",
        cardId: "product-import",
        action: "Product sync completed",
      });
      syncShopifyIntegrationDerivedState();
    };
    if (typeof window !== "undefined") {
      window.setTimeout(completeSuccess, 350);
    } else {
      completeSuccess();
    }
  }

  function setProductAutoSync(enabled: boolean) {
    shopifyIntegration.productSync.autoSync = enabled;
    if (enabled && !shopifyIntegration.productSync.nextRun) {
      shopifyIntegration.productSync.nextRun = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    }
    activityLog.unshift({
      timestamp: now(),
      sectionId: "shopify-integration",
      cardId: "product-import",
      action: enabled ? "Auto sync enabled" : "Auto sync disabled",
    });
    syncShopifyIntegrationDerivedState();
  }

  function markProductSyncFailed(message: string) {
    shopifyIntegration.productSync.status = "failed";
    shopifyIntegration.productSync.error = message;
    activityLog.unshift({
      timestamp: now(),
      sectionId: "shopify-integration",
      cardId: "product-import",
      action: `Product sync failed: ${message}`,
    });
    syncShopifyIntegrationDerivedState();
  }

  function updateVariantMappingSurface(id: string, surface: string) {
    const entry = shopifyIntegration.variantMappings.find((mapping) => mapping.id === id);
    if (!entry) return;
    entry.surface = surface;
    entry.status = entry.surface && entry.technique ? "linked" : "pending";
    activityLog.unshift({
      timestamp: now(),
      sectionId: "shopify-integration",
      cardId: "variant-mapping",
      action: `Surface updated (${entry.variantTitle} → ${surface || "—"})`,
    });
    syncShopifyIntegrationDerivedState();
  }

  function updateVariantMappingTechnique(id: string, technique: string) {
    const entry = shopifyIntegration.variantMappings.find((mapping) => mapping.id === id);
    if (!entry) return;
    entry.technique = technique;
    entry.status = entry.surface && entry.technique ? "linked" : "pending";
    activityLog.unshift({
      timestamp: now(),
      sectionId: "shopify-integration",
      cardId: "variant-mapping",
      action: `Technique updated (${entry.variantTitle} → ${technique || "—"})`,
    });
    syncShopifyIntegrationDerivedState();
  }

  function setVariantMappingStatus(id: string, status: VariantMappingStatus) {
    const entry = shopifyIntegration.variantMappings.find((mapping) => mapping.id === id);
    if (!entry) return;
    entry.status = status;
    activityLog.unshift({
      timestamp: now(),
      sectionId: "shopify-integration",
      cardId: "variant-mapping",
      action: `Mapping status set (${entry.variantTitle} → ${status})`,
    });
    syncShopifyIntegrationDerivedState();
  }

  function toggleWebhook(topic: string, enabled: boolean) {
    const endpoint = shopifyIntegration.webhooks.find((entry) => entry.topic === topic);
    if (!endpoint) return;
    endpoint.enabled = enabled;
    activityLog.unshift({
      timestamp: now(),
      sectionId: "shopify-integration",
      cardId: "webhooks",
      action: `${topic} ${enabled ? "enabled" : "disabled"}`,
    });
    syncShopifyIntegrationDerivedState();
  }

  function setWebhookStatus(topic: string, status: WebhookStatus, retries?: number) {
    const endpoint = shopifyIntegration.webhooks.find((entry) => entry.topic === topic);
    if (!endpoint) return;
    endpoint.status = status;
    if (typeof retries === "number") {
      endpoint.retries = retries;
    } else if (status === "connected") {
      endpoint.retries = 0;
    }
    endpoint.lastResponse = now();
    activityLog.unshift({
      timestamp: endpoint.lastResponse,
      sectionId: "shopify-integration",
      cardId: "webhooks",
      action: `${topic} status → ${status}`,
    });
    syncShopifyIntegrationDerivedState();
  }

  function findCard(sectionId: string, cardId: string) {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return undefined;
    const card = section.cards.find((c) => c.id === cardId);
    if (!card) return undefined;
    return { section, card };
  }

  function syncAppBootstrapDerivedState() {
    const appUrlCard = findCard("app-bootstrap", "app-url")?.card;
    if (appUrlCard?.checklist) {
      appUrlCard.checklist[0].completed = Boolean(appBootstrap.appUrl);
      appUrlCard.checklist[1].completed = appBootstrap.redirectUrls.length >= 2;
    }

    const tokenCard = findCard("app-bootstrap", "token-management")?.card;
    if (tokenCard?.checklist) {
      tokenCard.checklist[0].completed = Boolean(appBootstrap.tokens.storefront.value);
      tokenCard.checklist[1].completed = Boolean(appBootstrap.tokens.admin.value);
      tokenCard.checklist[2].completed =
        appBootstrap.tokens.storefront.status === "active" &&
        appBootstrap.tokens.admin.status !== "rotation-needed";

      if (
        tokenCard.checklist.every((item) => item.completed) &&
        appBootstrap.tokens.mockup.value
      ) {
        tokenCard.status = "done";
        tokenCard.statusLabel = "Completed";
      } else if (tokenCard.checklist.some((item) => item.completed)) {
        tokenCard.status = "in-progress";
        tokenCard.statusLabel = "In progress";
      } else {
        tokenCard.status = "not-started";
        tokenCard.statusLabel = "Awaiting setup";
      }
    }

    const roleCard = findCard("app-bootstrap", "role-assignment")?.card;
    if (roleCard?.checklist) {
      const hasAdmin = appBootstrap.roleAssignments.some(
        (role) => role.role === "Merchant Admin" && role.status === "Active",
      );
      const hasStaff = appBootstrap.roleAssignments.some(
        (role) => role.role === "Merchant Staff" && role.status !== "Disabled",
      );
      const caslReviewed = roleCard.checklist[2]?.completed ?? false;
      roleCard.checklist[0].completed = hasAdmin;
      roleCard.checklist[1].completed = hasStaff;

      if (hasAdmin && hasStaff && caslReviewed) {
        roleCard.status = "done";
        roleCard.statusLabel = "Completed";
      } else if (hasAdmin || hasStaff) {
        roleCard.status = "in-progress";
        roleCard.statusLabel = "Invites in progress";
      } else {
        roleCard.status = "not-started";
        roleCard.statusLabel = "Invites pending";
      }
    }
  }

  syncAppBootstrapDerivedState();

  function syncShopifyIntegrationDerivedState() {
    const productCard = findCard("shopify-integration", "product-import")?.card;
    if (productCard) {
      const sync = shopifyIntegration.productSync;
      if (productCard.checklist) {
        productCard.checklist[0].completed = sync.status !== "idle";
        productCard.checklist[1].completed = Boolean(sync.lastRun);
        productCard.checklist[2].completed = sync.autoSync;
      }
      if (sync.status === "success") {
        productCard.status = "done";
        productCard.statusLabel = "Catalog in sync";
      } else if (sync.status === "running") {
        productCard.status = "in-progress";
        productCard.statusLabel = "Sync running";
      } else if (sync.status === "failed") {
        productCard.status = "in-progress";
        productCard.statusLabel = "Needs attention";
      } else {
        productCard.status = "not-started";
        productCard.statusLabel = "Initial sync pending";
      }
    }

    const mappingCard = findCard("shopify-integration", "variant-mapping")?.card;
    if (mappingCard) {
      const total = shopifyIntegration.variantMappings.length;
      const linked = shopifyIntegration.variantMappings.filter((entry) => entry.status === "linked").length;
      const withTechnique = shopifyIntegration.variantMappings.every((entry) => Boolean(entry.technique));
      if (mappingCard.checklist) {
        mappingCard.checklist[0].completed = linked > 0;
        mappingCard.checklist[1].completed = withTechnique;
        mappingCard.checklist[2].completed = total > 0 && linked === total;
      }
      mappingCard.metrics = [
        {
          label: "Linked variants",
          value: `${linked}/${total}`,
          tone: linked === total ? "positive" : linked === 0 ? "critical" : "warning",
        },
      ];
      if (total > 0 && linked === total) {
        mappingCard.status = "done";
        mappingCard.statusLabel = "Mappings aligned";
      } else if (linked > 0) {
        mappingCard.status = "in-progress";
        mappingCard.statusLabel = "Some mappings pending";
      } else {
        mappingCard.status = "not-started";
        mappingCard.statusLabel = "Mapping required";
      }
    }

    const webhookCard = findCard("shopify-integration", "webhooks")?.card;
    if (webhookCard) {
      const endpoints = shopifyIntegration.webhooks;
      const enabled = endpoints.filter((entry) => entry.enabled);
      const healthy = enabled.filter((entry) => entry.status === "connected");
      if (webhookCard.checklist) {
        webhookCard.checklist[0].completed = enabled.length === endpoints.length && endpoints.length > 0;
        webhookCard.checklist[1].completed = healthy.length === enabled.length && enabled.length > 0;
        webhookCard.checklist[2].completed = endpoints.every((entry) => Boolean(entry.lastResponse));
      }
      webhookCard.metrics = endpoints.map((entry) => ({
        label: entry.topic,
        value:
          entry.status === "connected"
            ? "200 OK"
            : entry.status === "retrying"
              ? `Retrying (${entry.retries})`
              : "Failed",
        tone: entry.status === "connected" ? "positive" : entry.status === "retrying" ? "warning" : "critical",
      }));
      if (enabled.length && healthy.length === enabled.length) {
        webhookCard.status = "done";
        webhookCard.statusLabel = "All healthy";
      } else if (enabled.length) {
        webhookCard.status = "in-progress";
        webhookCard.statusLabel = "Monitor retries";
      } else {
        webhookCard.status = "not-started";
        webhookCard.statusLabel = "Enable webhooks";
      }
    }
  }

  syncShopifyIntegrationDerivedState();

  function toggleChecklist(sectionId: string, cardId: string, index: number) {
    const resolved = findCard(sectionId, cardId);
    if (!resolved) return;
    const { card } = resolved;
    if (!card.checklist || !card.checklist[index]) return;
    card.checklist[index].completed = !card.checklist[index].completed;
    activityLog.unshift({
      timestamp: now(),
      sectionId,
      cardId,
      action: `Checklist toggled: ${card.checklist[index].text}`,
    });
  }

  function setStatus(sectionId: string, cardId: string, status: ChecklistStatus, label?: string) {
    const resolved = findCard(sectionId, cardId);
    if (!resolved) return;
    const { card } = resolved;
    card.status = status;
    card.statusLabel = label ?? defaultLabelFor(status);
    activityLog.unshift({
      timestamp: now(),
      sectionId,
      cardId,
      action: `Status updated to ${card.statusLabel}`,
    });
  }

  function markDone(sectionId: string, cardId: string) {
    const resolved = findCard(sectionId, cardId);
    if (!resolved) return;
    const { card } = resolved;
    if (card.checklist) {
      card.checklist.forEach((item) => {
        item.completed = true;
      });
    }
    setStatus(sectionId, cardId, "done", "Completed");
  }

  function defaultLabelFor(status: ChecklistStatus) {
    switch (status) {
      case "done":
        return "Completed";
      case "in-progress":
        return "In progress";
      default:
        return "Not started";
    }
  }

  function runAction(sectionId: string, cardId: string, action: PanelAction) {
    if (action.intent === "markDone") {
      markDone(sectionId, cardId);
      return;
    }
    if (action.intent === "start") {
      setStatus(sectionId, cardId, "in-progress");
      return;
    }
    activityLog.unshift({
      timestamp: now(),
      sectionId,
      cardId,
      action: action.label,
    });
  }

  const progressBySection = computed(() =>
    sections.map((section) => {
      const cardsWithChecklist = section.cards.filter((card) => card.checklist?.length);
      const totalItems = cardsWithChecklist.reduce(
        (acc, card) => acc + (card.checklist?.length ?? 0),
        0,
      );
      const completedItems = cardsWithChecklist.reduce(
        (acc, card) =>
          acc +
          (card.checklist?.filter((item) => item.completed).length ?? 0),
        0,
      );
      const percent = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);
      return {
        sectionId: section.id,
        percent,
        completedItems,
        totalItems,
      };
    }),
  );

  return {
    appBootstrap,
    shopifyIntegration,
    sections,
    activityLog,
    progressBySection,
    setAppUrl,
    addRedirect,
    removeRedirect,
    updateToken,
    rotateToken,
    setTokenStatus,
    upsertRoleAssignment,
    removeRole,
    updateRoleStatus,
    runProductSync,
    setProductAutoSync,
    markProductSyncFailed,
    updateVariantMappingSurface,
    updateVariantMappingTechnique,
    setVariantMappingStatus,
    toggleWebhook,
    setWebhookStatus,
    toggleChecklist,
    setStatus,
    markDone,
    runAction,
  };
});
