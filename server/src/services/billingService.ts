import { PrismaClient, Prisma } from "@prisma/client";

export type BillingSummary = {
  currency: string;
  perOrderFee: number | null;
  freeOrderAllowance: number;
  monthToDateOrders: number;
  monthToDateCharges: number;
  pendingCharges: number;
  invoicedCharges: number;
  paidCharges: number;
};

const toNumber = (value: Prisma.Decimal | null | undefined) => (value ? Number(value) : null);

export async function getTenantBillingConfig(prisma: PrismaClient, tenantId: string) {
  return prisma.billingConfig.findUnique({
    where: { tenantId },
  });
}

export async function upsertTenantBillingConfig(
  prisma: PrismaClient,
  tenantId: string,
  payload: {
    currency: string;
    perOrderFee: number | null;
    freeOrderAllowance: number;
    notes?: string | null;
  },
) {
  return prisma.billingConfig.upsert({
    where: { tenantId },
    update: {
      currency: payload.currency,
      perOrderFee: payload.perOrderFee,
      freeOrderAllowance: payload.freeOrderAllowance,
      notes: payload.notes ?? null,
    },
    create: {
      tenantId,
      currency: payload.currency,
      perOrderFee: payload.perOrderFee,
      freeOrderAllowance: payload.freeOrderAllowance,
      notes: payload.notes ?? null,
    },
  });
}

export async function listTenantCharges(prisma: PrismaClient, tenantId: string, options?: { limit?: number }) {
  return prisma.billingCharge.findMany({
    where: { tenantId },
    orderBy: { occurredAt: "desc" },
    take: options?.limit ?? 100,
  });
}

export async function getBillingSummary(prisma: PrismaClient, tenantId: string, monthStart: Date) {
  const [config, monthCharges, pendingAggregate, invoicedAggregate, paidAggregate] = await Promise.all([
    prisma.billingConfig.findUnique({ where: { tenantId } }),
    prisma.billingCharge.aggregate({
      where: { tenantId, occurredAt: { gte: monthStart } },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    prisma.billingCharge.aggregate({
      where: { tenantId, status: "PENDING" },
      _sum: { totalAmount: true },
    }),
    prisma.billingCharge.aggregate({
      where: { tenantId, status: "INVOICED" },
      _sum: { totalAmount: true },
    }),
    prisma.billingCharge.aggregate({
      where: { tenantId, status: "PAID" },
      _sum: { totalAmount: true },
    }),
  ]);

  return {
    currency: config?.currency ?? "USD",
    perOrderFee: toNumber(config?.perOrderFee),
    freeOrderAllowance: config?.freeOrderAllowance ?? 0,
    monthToDateOrders: monthCharges._count.id,
    monthToDateCharges: toNumber(monthCharges._sum.totalAmount) ?? 0,
    pendingCharges: toNumber(pendingAggregate._sum.totalAmount) ?? 0,
    invoicedCharges: toNumber(invoicedAggregate._sum.totalAmount) ?? 0,
    paidCharges: toNumber(paidAggregate._sum.totalAmount) ?? 0,
  } satisfies BillingSummary;
}
