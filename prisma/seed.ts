import { PrismaClient, Prisma, $Enums } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function ensureUser({
  email,
  password,
  displayName,
  status = $Enums.UserStatus.ACTIVE,
}: {
  email: string;
  password: string;
  displayName: string;
  status?: $Enums.UserStatus;
}) {
  const hashedPassword = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: { hashedPassword, displayName, status },
    create: { email, hashedPassword, displayName, status },
  });
}

async function ensureTenant({
  slug,
  displayName,
  status = $Enums.TenantStatus.ACTIVE,
}: {
  slug: string;
  displayName: string;
  status?: $Enums.TenantStatus;
}) {
  return prisma.tenant.upsert({
    where: { slug },
    update: { displayName, status },
    create: { slug, displayName, status },
  });
}

async function ensureMembership({
  tenantId,
  userId,
  role,
}: {
  tenantId: string;
  userId: string;
  role: $Enums.TenantRole;
}) {
  return prisma.tenantUser.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    update: { role },
    create: { tenantId, userId, role },
  });
}

async function ensureProduct(tenantId: string) {
  const product = await prisma.product.upsert({
    where: { tenantId_slug: { tenantId, slug: "tshirt" } },
    update: {},
    create: {
      tenantId,
      slug: "tshirt",
      title: "Classic T-Shirt",
      category: "textile",
      description: "Standard 100% cotton tee for demo purposes.",
      attributes: {
        materials: ["cotton"],
        colors: ["white", "black", "navy"],
        pricing: {
          base: 120,
          perSqIn: 0.24,
          colorAdder: 6,
          techMultipliers: { dtf: 1, screen: 1.1 },
        },
      },
    },
    include: { surfaces: true },
  });

  const existing = new Set(product.surfaces.map(surface => surface.name));
  const surfaces = [
    { name: "Front", widthMm: 380, heightMm: 500, safeArea: { marginMm: 20 } },
    { name: "Back", widthMm: 380, heightMm: 500, safeArea: { marginMm: 20 } },
  ];

  for (const surface of surfaces) {
    if (existing.has(surface.name)) continue;
    await prisma.surface.create({
      data: {
        productId: product.id,
        name: surface.name,
        widthMm: surface.widthMm,
        heightMm: surface.heightMm,
        safeArea: surface.safeArea,
        ppi: 300,
      },
    });
  }
}

async function ensureTechniques(tenantId: string) {
  const dtfRules = {
    kind: "DTF",
    currency: "USD",
    baseSetup: 4.5,
    squareCmRate: 0.045,
    minCharge: 18,
    whiteUnderbaseMarkup: 0.12,
    coverageAdjustments: [
      { maxCoverage: 0.3, multiplier: 1.18 },
      { maxCoverage: 0.6, multiplier: 1.08 },
      { maxCoverage: 1, multiplier: 1 },
    ],
    quantityBreaks: [
      { minQty: 25, multiplier: 0.95 },
      { minQty: 100, multiplier: 0.9 },
    ],
  };

  const gangSheetRules = {
    kind: "GANG_SHEET",
    currency: "USD",
    sheetWidthCm: 55.88, // 22 in
    sheetHeightCm: 60.96, // 24 in
    sheetCost: 18,
    minCoverage: 0.55,
    lowCoverageSurcharge: 8,
    quantityBreaks: [
      { minSheets: 5, sheetCost: 16 },
      { minSheets: 15, sheetCost: 14.5 },
      { minSheets: 30, sheetCost: 13 },
    ],
  };

  await prisma.printTechnique.upsert({
    where: { tenantId_slug: { tenantId, slug: "dtf" } },
    update: { name: "Direct-to-Film", description: "Film-based transfer, area-driven pricing.", rules: dtfRules },
    create: {
      tenantId,
      slug: "dtf",
      name: "Direct-to-Film",
      description: "Film-based transfer, area-driven pricing.",
      rules: dtfRules,
      isDefault: true,
    },
  });

  await prisma.printTechnique.upsert({
    where: { tenantId_slug: { tenantId, slug: "gangsheet" } },
    update: { name: "Gang Sheet", description: "Pre-sized sheet for batching transfers.", rules: gangSheetRules },
    create: {
      tenantId,
      slug: "gangsheet",
      name: "Gang Sheet",
      description: "Pre-sized sheet for batching transfers.",
      rules: gangSheetRules,
      isDefault: false,
    },
  });
}

async function ensurePricingRules(tenantId: string) {
  const rules = [
    {
      name: "Rush 24h surcharge",
      scope: "order",
      formula: { type: "PERCENTAGE", value: 0.25, appliesTo: "total" },
    },
    {
      name: "Wholesale 50+ discount",
      scope: "order",
      criteria: { minQty: 50 },
      formula: { type: "PERCENTAGE", value: -0.1, appliesTo: "total" },
    },
    {
      name: "DTF midnight cleanup",
      scope: "technique",
      criteria: { cutoffHour: 20 },
      formula: { type: "TECHNIQUE_MULTIPLIER", techniqueSlug: "dtf", multiplier: 1.05 },
    },
  ];

  for (const rule of rules) {
    const existing = await prisma.pricingRule.findFirst({
      where: { tenantId, name: rule.name },
    });

    if (existing) {
      await prisma.pricingRule.update({
        where: { id: existing.id },
        data: { scope: rule.scope, criteria: rule.criteria ?? null, formula: rule.formula, active: true },
      });
    } else {
      await prisma.pricingRule.create({
        data: {
          tenantId,
          name: rule.name,
          scope: rule.scope,
          criteria: rule.criteria ?? null,
          formula: rule.formula,
          active: true,
        },
      });
    }
  }
}

async function ensureBilling(tenantId: string) {
  await prisma.billingConfig.upsert({
    where: { tenantId },
    update: {
      currency: "USD",
      perOrderFee: new Prisma.Decimal("1.75"),
      freeOrderAllowance: 25,
    },
    create: {
      tenantId,
      currency: "USD",
      perOrderFee: new Prisma.Decimal("1.75"),
      freeOrderAllowance: 25,
      notes: "Demo config with 25 free orders monthly, $1.75 afterwards.",
    },
  });

  const charges = await prisma.billingCharge.count({ where: { tenantId } });
  if (charges > 0) return;

  const now = new Date();
  const sampleCharges = [
    {
      tenantId,
      type: "order_fee",
      description: "Order #GSB-1001 usage fee",
      currency: "USD",
      quantity: 1,
      unitAmount: new Prisma.Decimal("1.75"),
      totalAmount: new Prisma.Decimal("1.75"),
      status: $Enums.BillingChargeStatus.PAID,
      occurredAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      settledAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      tenantId,
      type: "order_fee",
      description: "Order #GSB-1002 usage fee",
      currency: "USD",
      quantity: 1,
      unitAmount: new Prisma.Decimal("1.75"),
      totalAmount: new Prisma.Decimal("1.75"),
      status: $Enums.BillingChargeStatus.INVOICED,
      occurredAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      invoicedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
    },
    {
      tenantId,
      type: "order_fee",
      description: "Order #GSB-1003 usage fee",
      currency: "USD",
      quantity: 1,
      unitAmount: new Prisma.Decimal("1.75"),
      totalAmount: new Prisma.Decimal("1.75"),
      status: $Enums.BillingChargeStatus.PENDING,
      occurredAt: now,
    },
  ];

  await prisma.billingCharge.createMany({
    data: sampleCharges,
  });
}

async function main() {
  const superAdminUser = await ensureUser({
    email: "superadmin@gsb.dev",
    password: "superadmin",
    displayName: "Global Super Admin",
  });

  const demoTenant = await ensureTenant({
    slug: "demo-merchant",
    displayName: "Demo Merchant",
  });

  const merchantAdminUser = await ensureUser({
    email: "merchantadmin@gsb.dev",
    password: "merchantadmin",
    displayName: "Merchant Admin",
  });

  const merchantStaffUser = await ensureUser({
    email: "merchantstaff@gsb.dev",
    password: "merchantstaff",
    displayName: "Merchant Staff",
  });

  const customerUser = await ensureUser({
    email: "customer@gsb.dev",
    password: "customer",
    displayName: "Customer",
  });

  await ensureMembership({
    tenantId: demoTenant.id,
    userId: merchantAdminUser.id,
    role: $Enums.TenantRole.MERCHANT_ADMIN,
  });

  await ensureMembership({
    tenantId: demoTenant.id,
    userId: merchantStaffUser.id,
    role: $Enums.TenantRole.MERCHANT_STAFF,
  });

  await ensureMembership({
    tenantId: demoTenant.id,
    userId: superAdminUser.id,
    role: $Enums.TenantRole.SUPER_ADMIN,
  });

  await ensureProduct(demoTenant.id);
  await ensureTechniques(demoTenant.id);
  await ensurePricingRules(demoTenant.id);
  await ensureBilling(demoTenant.id);

  console.log("Seed completed with users:");
  console.log("Super Admin -> superadmin@gsb.dev / superadmin");
  console.log("Merchant Admin -> merchantadmin@gsb.dev / merchantadmin");
  console.log("Merchant Staff -> merchantstaff@gsb.dev / merchantstaff");
  console.log("Customer -> customer@gsb.dev / customer");
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
