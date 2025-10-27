import request from 'supertest';
import { nanoid } from 'nanoid';
import { describe, it, afterAll, expect } from 'vitest';
import { PrismaClient, type JobStatus } from '../../src/generated/prisma/client';
import { createApp } from '../src/app';
import { generateAccessToken } from '../src/auth/jwt';

const prisma = new PrismaClient();
const app = createApp();

type TenantContext = {
  tenantId: string;
  userId: string;
  token: string;
};

async function createTenantContext(): Promise<TenantContext> {
  const slugSuffix = nanoid(6).toLowerCase();
  const tenant = await prisma.tenant.create({
    data: {
      slug: `test-${slugSuffix}`,
      displayName: `Test Tenant ${slugSuffix}`,
    },
  });

  const user = await prisma.user.create({
    data: {
      email: `ops-${slugSuffix}@example.com`,
      displayName: 'Ops Tester',
    },
  });

  await prisma.tenantUser.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      role: 'MERCHANT_ADMIN',
    },
  });

  const token = generateAccessToken({
    sub: user.id,
    email: user.email,
    displayName: user.displayName,
    tenantMemberships: [{ tenantId: tenant.id, role: 'MERCHANT_ADMIN' }],
    defaultTenantId: tenant.id,
  });

  return {
    tenantId: tenant.id,
    userId: user.id,
    token,
  };
}

async function cleanupTenantContext(context: TenantContext) {
  const { tenantId, userId } = context;

  await prisma.notification.deleteMany({ where: { tenantId } });
  await prisma.auditLog.deleteMany({ where: { tenantId } });
  await prisma.job.deleteMany({ where: { tenantId } });

  const gangSheets = await prisma.gangSheet.findMany({
    where: { tenantId },
    select: { id: true },
  });
  const gangSheetIds = gangSheets.map((sheet) => sheet.id);
  if (gangSheetIds.length) {
    await prisma.gangSheetItem.deleteMany({ where: { gangSheetId: { in: gangSheetIds } } });
    await prisma.gangSheet.deleteMany({ where: { id: { in: gangSheetIds } } });
  }

  const designIds = await prisma.designDocument
    .findMany({ where: { tenantId }, select: { id: true } })
    .then((rows) => rows.map((row) => row.id));
  if (designIds.length) {
    await prisma.designOutput.deleteMany({ where: { designId: { in: designIds } } });
    await prisma.designDocument.deleteMany({ where: { id: { in: designIds } } });
  }

  await prisma.supplierRoutingRule.deleteMany({ where: { tenantId } });
  await prisma.tenantUser.deleteMany({ where: { tenantId } });
  await prisma.tenant.deleteMany({ where: { id: tenantId } });
  await prisma.user.deleteMany({ where: { id: userId } });
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Merchant operations API', () => {

  it('completes checkout flow and queues job', async () => {
    const ctx = await createTenantContext();
    const { tenantId, userId, token } = ctx;

    try {
      const design = await prisma.designDocument.create({
        data: {
          tenantId,
          userId,
          status: 'DRAFT',
          snapshot: {},
        },
      });

      const checkoutResponse = await request(app)
        .post('/api/proxy/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          designId: design.id,
          productGid: 'gid://shopify/Product/999',
          productTitle: 'Test Tee',
          quantity: 2,
          technique: 'dtf',
          surfaceId: 'front',
          previewUrl: 'https://cdn.gsb.dev/mockups/test-teaser.png',
        });

      expect(checkoutResponse.status).toBe(200);
      expect(checkoutResponse.body.data).toBeDefined();
      expect(checkoutResponse.body.data.lineItem?.properties?.['Design ID']).toBe(design.id);

      const refreshedDesign = await prisma.designDocument.findUniqueOrThrow({ where: { id: design.id } });
      expect(refreshedDesign.status).toBe('SUBMITTED');
      expect(refreshedDesign.previewUrl).toBe('https://cdn.gsb.dev/mockups/test-teaser.png');

      const outputs = await prisma.designOutput.findMany({ where: { designId: design.id } });
      expect(outputs.length).toBeGreaterThanOrEqual(2);

      const orderId = `order-${nanoid(6)}`;
      const orderResponse = await request(app)
        .post('/api/proxy/orders/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({
          orderId,
          lineItems: [
            {
              designId: design.id,
              quantity: 2,
              technique: 'dtf',
              properties: {
                'Design ID': design.id,
              },
            },
          ],
        });

      expect(orderResponse.status).toBe(201);
      expect(Array.isArray(orderResponse.body.data.jobs)).toBe(true);
      expect(orderResponse.body.data.jobs).toHaveLength(1);

      const jobId = orderResponse.body.data.jobs[0].id;
      const jobRecord = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
      expect(jobRecord.status).toBe('QUEUED');
      expect(jobRecord.metadata?.lineItem?.quantity).toBe(2);
      expect(jobRecord.metadata?.orderId).toBe(orderId);

      const auditEntries = await prisma.auditLog.findMany({
        where: { tenantId, entityId: jobRecord.id, event: 'job.enqueue' },
      });
      expect(auditEntries.length).toBe(1);

      const jobNotifications = await prisma.notification.findMany({
        where: { tenantId, kind: 'job.queued' },
      });
      expect(jobNotifications.length).toBe(1);
      expect(jobNotifications[0].payload).toMatchObject({ jobId: jobRecord.id, orderId });
    } finally {
      await cleanupTenantContext(ctx);
    }
  });

  it('returns jobs filtered by status', async () => {
    const ctx = await createTenantContext();
    const { tenantId, userId, token } = ctx;

    try {
      const designQueued = await prisma.designDocument.create({
        data: {
          tenantId,
          userId,
          status: 'DRAFT',
          snapshot: {},
        },
      });
      const designCompleted = await prisma.designDocument.create({
        data: {
          tenantId,
          userId,
          status: 'DRAFT',
          snapshot: {},
        },
      });

      const queuedJob = await prisma.job.create({
        data: {
          tenantId,
          designId: designQueued.id,
          status: 'QUEUED',
        },
      });

      await prisma.job.create({
        data: {
          tenantId,
          designId: designCompleted.id,
          status: 'COMPLETED',
        },
      });

      const response = await request(app)
        .get('/api/jobs')
        .set('Authorization', `Bearer ${token}`)
        .query({ status: 'QUEUED' as JobStatus });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(queuedJob.id);
      expect(response.body.data[0].design?.id).toBe(designQueued.id);
    } finally {
      await cleanupTenantContext(ctx);
    }
  });

  it('updates job status and records audit + notification', async () => {
    const ctx = await createTenantContext();
    const { tenantId, userId, token } = ctx;

    try {
      const design = await prisma.designDocument.create({
        data: {
          tenantId,
          userId,
          status: 'DRAFT',
          snapshot: {},
        },
      });

      const job = await prisma.job.create({
        data: {
          tenantId,
          designId: design.id,
          status: 'QUEUED',
        },
      });

      const response = await request(app)
        .patch(`/api/jobs/${job.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'IN_PROGRESS' as JobStatus });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('IN_PROGRESS');
      expect(response.body.data.startedAt).toBeTruthy();

      const updated = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });
      expect(updated.status).toBe('IN_PROGRESS');
      expect(updated.startedAt).not.toBeNull();

      const auditEntries = await prisma.auditLog.findMany({
        where: { tenantId, entityId: job.id, event: 'job.update' },
      });
      expect(auditEntries.length).toBeGreaterThan(0);

      const notifications = await prisma.notification.findMany({
        where: { tenantId, kind: 'job.status_change' },
      });
      expect(notifications.length).toBe(1);
      expect(notifications[0].payload).toMatchObject({ jobId: job.id, status: 'IN_PROGRESS' });
    } finally {
      await cleanupTenantContext(ctx);
    }
  });

  it('transitions gang sheet status and emits side effects', async () => {
    const ctx = await createTenantContext();
    const { tenantId, token } = ctx;

    try {
      const sheet = await prisma.gangSheet.create({
        data: {
          tenantId,
          name: `Sheet-${nanoid(4)}`,
          sheetWidthMm: 500,
          sheetHeightMm: 700,
          snapshot: {},
          status: 'draft',
        },
      });

      const response = await request(app)
        .post(`/api/gang-sheets/${sheet.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'queued' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('queued');
      expect(response.body.data.queuedAt).toBeTruthy();

      const refreshed = await prisma.gangSheet.findUniqueOrThrow({ where: { id: sheet.id } });
      expect(refreshed.status).toBe('queued');
      expect(refreshed.queuedAt).not.toBeNull();

      const auditEntries = await prisma.auditLog.findMany({
        where: { tenantId, entityId: sheet.id, event: 'gangsheet.status_change' },
      });
      expect(auditEntries.length).toBe(1);

      const notifications = await prisma.notification.findMany({
        where: { tenantId, kind: 'gangsheet.status_change' },
      });
      expect(notifications.length).toBe(1);
      expect(notifications[0].payload).toMatchObject({ gangSheetId: sheet.id, status: 'queued' });
    } finally {
      await cleanupTenantContext(ctx);
    }
  });
});
