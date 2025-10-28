const jwt = require('jsonwebtoken');
const { PrismaClient } = require('./server/src/generated/prisma/client');
(async () => {
  const prisma = new PrismaClient();
  const shopDomain = 'test-cli-store.myshopify.com';
  await prisma.tenant.deleteMany({ where: { slug: 'test-cli-store' } });
  const tenant = await prisma.tenant.create({
    data: {
      slug: 'test-cli-store',
      displayName: 'Test CLI Store',
      settings: { shopify: { domain: shopDomain } },
    },
  });
  const user = await prisma.user.create({ data: { email: 'cli@example.com', displayName: 'CLI User' } });
  await prisma.tenantUser.create({ data: { tenantId: tenant.id, userId: user.id, role: 'MERCHANT_ADMIN' } });
  const token = jwt.sign({ dest: https://, aud: process.env.SHOPIFY_API_KEY }, process.env.SHOPIFY_API_SECRET, { algorithm: 'HS256', expiresIn: '5m' });
  const res = await fetch('http://127.0.0.1:4000/api/auth/shopify/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });
  const body = await res.text();
  console.log('status', res.status);
  console.log('body', body);
  await prisma.();
})();
