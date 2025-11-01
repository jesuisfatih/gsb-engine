# 🚀 PHASE 1 IMPLEMENTATION GUIDE
## Foundation: Security, Performance, Monitoring
**Duration:** 3 months  
**Budget:** $40,000  
**Team:** 2 backend + 1 DevOps engineer

---

## 📋 WEEK-BY-WEEK BREAKDOWN

### **WEEK 1-2: AWS Infrastructure Setup**

#### Day 1-3: VPC & Networking
```bash
# 1. Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=gsb-production}]'

# 2. Create subnets (Multi-AZ)
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.1.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.2.0/24 --availability-zone us-east-1b

# 3. Internet Gateway
aws ec2 create-internet-gateway
aws ec2 attach-internet-gateway --vpc-id vpc-xxx --internet-gateway-id igw-xxx

# 4. Route tables
aws ec2 create-route-table --vpc-id vpc-xxx
aws ec2 create-route --route-table-id rtb-xxx --destination-cidr-block 0.0.0.0/0 --gateway-id igw-xxx
```

#### Day 4-7: RDS PostgreSQL
```bash
# Create RDS instance (Multi-AZ, automated backups)
aws rds create-db-instance \
  --db-instance-identifier gsb-production \
  --db-instance-class db.t3.large \
  --engine postgres \
  --engine-version 16.1 \
  --allocated-storage 100 \
  --storage-type gp3 \
  --storage-encrypted \
  --master-username postgres \
  --master-user-password [REDACTED] \
  --vpc-security-group-ids sg-xxx \
  --db-subnet-group-name gsb-db-subnet \
  --multi-az \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "sun:04:00-sun:05:00"

# Create read replica
aws rds create-db-instance-read-replica \
  --db-instance-identifier gsb-production-read-1 \
  --source-db-instance-identifier gsb-production \
  --db-instance-class db.t3.large
```

#### Day 8-10: EKS Cluster
```bash
# Install eksctl
brew install eksctl

# Create cluster
eksctl create cluster \
  --name gsb-production \
  --region us-east-1 \
  --node-type t3.large \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 10 \
  --managed \
  --version 1.28

# Configure kubectl
aws eks update-kubeconfig --region us-east-1 --name gsb-production
```

#### Day 11-14: Redis Cluster
```bash
# Create ElastiCache Redis
aws elasticache create-cache-cluster \
  --cache-cluster-id gsb-redis \
  --cache-node-type cache.t3.medium \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --cache-subnet-group-name gsb-cache-subnet \
  --security-group-ids sg-xxx
```

---

### **WEEK 3-4: Security Hardening**

#### Secrets Manager Integration
```typescript
// server/src/config/secrets.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });

async function getSecret(secretId: string): Promise<string> {
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretId })
  );
  
  return response.SecretString || '';
}

// Load secrets
export const secrets = {
  jwtSecret: await getSecret('gsb/jwt-secret'),
  shopifyApiSecret: await getSecret('gsb/shopify-api-secret'),
  databasePassword: await getSecret('gsb/db-password'),
};
```

#### Rate Limiting
```typescript
// server/src/middlewares/rateLimiter.ts
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

const rateLimiters = {
  auth: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl:auth',
    points: 5, // requests
    duration: 60, // per 60 seconds
  }),
  
  api: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl:api',
    points: 100,
    duration: 60,
  }),
  
  cart: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl:cart',
    points: 10,
    duration: 60,
  }),
};

export async function rateLimitMiddleware(req, res, next) {
  const key = req.ip || req.connection.remoteAddress;
  const limiter = req.path.startsWith('/api/auth') 
    ? rateLimiters.auth 
    : rateLimiters.api;
  
  try {
    await limiter.consume(key);
    next();
  } catch (rejRes) {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: rejRes.msBeforeNext / 1000,
    });
  }
}
```

---

### **WEEK 5-6: CDN & Image Optimization**

#### Cloudflare R2 Setup
```typescript
// server/src/services/storage.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadDesignPreview(
  designId: string,
  imageBuffer: Buffer
): Promise<string> {
  // 1. Optimize image
  const optimized = await sharp(imageBuffer)
    .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
  
  // 2. Upload to R2
  const key = `designs/${designId}/preview.webp`;
  await r2.send(new PutObjectCommand({
    Bucket: 'gsb-designs',
    Key: key,
    Body: optimized,
    ContentType: 'image/webp',
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  
  // 3. Return CDN URL
  return `https://cdn.gsb-engine.dev/${key}`;
}

// 4. Generate blurhash placeholder
import { encode } from 'blurhash';

export async function generateBlurhash(imageBuffer: Buffer): Promise<string> {
  const { data, info } = await sharp(imageBuffer)
    .resize(32, 32, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  return encode(
    new Uint8ClampedArray(data),
    info.width,
    info.height,
    4,
    4
  );
}
```

---

### **WEEK 7-8: Monitoring Setup**

#### Datadog Integration
```typescript
// server/src/index.ts
import tracer from 'dd-trace';

tracer.init({
  service: 'gsb-engine-api',
  env: process.env.NODE_ENV,
  version: process.env.APP_VERSION,
  logInjection: true,
  runtimeMetrics: true,
  profiling: true,
});

// Custom metrics
import { StatsD } from 'node-dogstatsd';
const dogstatsd = new StatsD();

// Track design operations
app.post('/api/designs', async (req, res) => {
  const start = Date.now();
  
  try {
    const design = await createDesign(req.body);
    
    dogstatsd.increment('design.created', 1, [
      `product:${design.productSlug}`,
      `technique:${design.printTech}`,
    ]);
    
    dogstatsd.histogram('design.create_duration', Date.now() - start);
    
    res.json({ data: design });
  } catch (error) {
    dogstatsd.increment('design.create_error', 1);
    throw error;
  }
});
```

#### Sentry Error Tracking
```typescript
// Frontend: src/main.ts
import * as Sentry from '@sentry/vue';

Sentry.init({
  app,
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    new Sentry.BrowserTracing({
      routingInstrumentation: Sentry.vueRouterInstrumentation(router),
    }),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// Backend: server/src/index.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
    new Sentry.Integrations.Prisma({ client: prisma }),
  ],
});

// Must be BEFORE other middleware
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Must be AFTER all routes
app.use(Sentry.Handlers.errorHandler());
```

---

### **WEEK 9-12: Testing & Documentation**

#### E2E Testing (Playwright)
```typescript
// tests/e2e/customize-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete customize flow', async ({ page }) => {
  // 1. Navigate to product page
  await page.goto('https://we-dream-studio.myshopify.com/products/custom-tshirt');
  
  // 2. Click customize button
  await page.click('.gsb-customize-button');
  
  // 3. Wait for editor to load
  await page.waitForURL('**/editor?product=tshirt**');
  
  // 4. Add text element
  await page.click('[data-tool="text"]');
  await page.click('.stage-canvas');
  await page.keyboard.type('Hello World');
  
  // 5. Change color
  await page.click('[data-property="fill"]');
  await page.fill('input[type="color"]', '#FF0000');
  
  // 6. Add to cart
  await page.click('button:has-text("Add to Cart")');
  
  // 7. Verify redirect to cart
  await page.waitForURL('**/cart**');
  
  // 8. Verify line item properties
  const designId = await page.textContent('[data-property="Design ID"]');
  expect(designId).toMatch(/^[a-f0-9-]{36}$/);
});

test('session persistence across page reload', async ({ page, context }) => {
  // Enable persistence
  await context.addCookies([{
    name: '__Host-sid',
    value: 'test-token',
    domain: 'app.gsb-engine.dev',
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'None',
  }]);
  
  await page.goto('https://app.gsb-engine.dev/editor');
  
  // Reload
  await page.reload();
  
  // Verify still authenticated
  const userMenu = await page.locator('[data-user-menu]');
  await expect(userMenu).toBeVisible();
});
```

---

## 🎯 DELIVERABLES CHECKLIST

### **Month 1: Infrastructure**
- [ ] AWS VPC configured
- [ ] RDS PostgreSQL Multi-AZ
- [ ] ElastiCache Redis cluster
- [ ] EKS cluster running
- [ ] ALB configured
- [ ] Route 53 DNS

### **Month 2: Performance**
- [ ] Cloudflare CDN active
- [ ] R2 object storage integrated
- [ ] Image optimization pipeline
- [ ] Bundle size < 1MB
- [ ] Page load < 2s
- [ ] PWA support

### **Month 3: Monitoring**
- [ ] Datadog APM
- [ ] Sentry error tracking
- [ ] Custom dashboards
- [ ] Alert rules
- [ ] On-call rotation
- [ ] Incident playbook

---

## 📊 SUCCESS METRICS (End of Phase 1)

```
Performance:
✅ Page load time: < 2s (p95)
✅ API response: < 200ms (p95)
✅ Uptime: > 99.5%

Security:
✅ Signature validation: Enabled
✅ Rate limiting: Active
✅ WAF rules: Configured
✅ Secrets: In Vault

Scalability:
✅ Auto-scaling: Configured
✅ Database replicas: 2
✅ CDN: Global
✅ Cache hit rate: > 80%
```

---

**Next:** Phase 2 (Real-time collaboration, AI features, Template marketplace)


