# Sprint 10 — Production Hardening (Local Deployment)

You completed Sprint 9 (admin console) — all features built, 289 tests passing. Sprint 10 makes the platform **production-ready for local/on-premise deployment**.

Branch: `sprint/10-production` (branched from `sprint/9-admin`)

---

## Sprint 10 Philosophy: Cloud-Agnostic Production Readiness

**Goal:** Make Techorbit production-ready on **any infrastructure** (local server, VPS, Docker Swarm, Kubernetes) without cloud vendor lock-in.

**What you'll build:**
1. Playwright E2E test suite (prevents regressions)
2. Security hardening (rate limiting, input sanitization, SSL/TLS)
3. Performance optimization (caching, query optimization, bundle size)
4. Production Docker setup (multi-stage builds, health checks, logging)
5. Deployment documentation (local, VPS, Docker Swarm)

**What you'll defer to Sprint 10.5 (cloud-specific):**
- AWS ECS/Fargate setup
- CloudWatch monitoring
- RDS/ElastiCache managed services
- Route53/CloudFront CDN
- Auto-scaling groups

**After Sprint 10:** You can deploy to a local server, DigitalOcean VPS, or Hetzner dedicated server and run production traffic.

---

## Context you MUST re-read

1. `CLAUDE.md` — conventions
2. `ENGINEERING_SPEC.md` — Section 9 (Deployment Architecture)
3. Manual verification prompt (if you ran it, reference findings)

---

## Sprint 10 scope

Build production-grade infrastructure **without cloud dependencies**. Everything should work on a single server or Docker Swarm cluster.

---

## Task breakdown

### PART A — E2E Test Suite (Playwright)

#### Task 1 — Install Playwright

```bash
cd apps/web
pnpm create playwright

# Follow prompts:
# - TypeScript: Yes
# - Test folder: tests/e2e
# - GitHub Actions: No (we'll add manually later)
# - Install browsers: Yes
```

This creates:
- `playwright.config.ts`
- `tests/e2e/` folder
- `.github/workflows/playwright.yml` (optional)

#### Task 2 — Configure Playwright for local services

Edit `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Run tests sequentially (they share database)
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid DB conflicts
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes for all services to start
  },
});
```

#### Task 3 — Record the 9 critical flows with Codegen

For each flow from the verification prompt, record with Codegen:

```bash
# Flow 1: Customer journey
npx playwright codegen http://localhost:3000

# Manually perform:
# 1. Signup as customer1@test.com
# 2. Verify email (go to http://localhost:8025, click link)
# 3. Select CUSTOMER role
# 4. Fill company profile
# 5. Post requirement
# 6. Publish requirement

# Playwright generates code automatically
# Save to: tests/e2e/01-customer-journey.spec.ts
```

**Repeat for all 9 flows:**
1. `01-customer-journey.spec.ts` (signup → post requirement)
2. `02-candidate-journey.spec.ts` (signup → submit to requirement)
3. `03-shortlist-management.spec.ts` (customer moves submission through pipeline)
4. `04-interview-flow.spec.ts` (schedule → conduct → scorecard)
5. `05-placement-creation.spec.ts` (hire candidate → verify Value Chain)
6. `06-timesheets-invoicing.spec.ts` (submit timesheet → approve → generate invoice)
7. `07-messaging.spec.ts` (customer ↔ candidate thread)
8. `08-ratings.spec.ts` (end placement → bilateral ratings)
9. `09-admin-console.spec.ts` (role approval → user management → disputes)

#### Task 4 — Clean up generated tests

Codegen produces verbose code. Clean it up:

**Before (generated):**
```typescript
await page.goto('http://localhost:3000/');
await page.getByRole('link', { name: 'Sign up' }).click();
await page.getByLabel('Email').click();
await page.getByLabel('Email').fill('customer1@test.com');
await page.getByLabel('Email').press('Tab');
await page.getByLabel('Password', { exact: true }).fill('Test123!');
```

**After (cleaned):**
```typescript
test('Customer can sign up and post requirement', async ({ page }) => {
  // Signup
  await page.goto('/signup');
  await page.fill('[name="email"]', `customer-${Date.now()}@test.com`); // Unique email
  await page.fill('[name="password"]', 'Test123!');
  await page.fill('[name="confirmPassword"]', 'Test123!');
  await page.click('button[type="submit"]');
  
  // Verify redirected to email verification
  await expect(page).toHaveURL(/\/verify-email/);
  
  // Mock email verification (in real test, fetch from Mailpit API)
  const token = await getVerificationToken(page); // Helper function
  await page.goto(`/verify-email?token=${token}`);
  
  // Select CUSTOMER role
  await page.click('[data-testid="role-customer"]');
  await expect(page).toHaveURL(/\/onboarding/);
  
  // Fill company profile
  await page.fill('[name="companyName"]', 'TechCorp Inc');
  await page.fill('[name="ein"]', '12-3456789');
  await page.click('button:has-text("Continue")');
  
  // Post requirement
  await page.goto('/requirements/new');
  await page.fill('[name="title"]', 'Senior Full-Stack Engineer');
  await page.fill('[name="description"]', 'Need React + Node expert');
  // ... fill rest
  await page.click('button:has-text("Publish")');
  
  // Assert: requirement created
  await expect(page.locator('text=OPEN')).toBeVisible();
});
```

#### Task 5 — Handle multi-user flows

For flows requiring multiple users (customer + candidate):

```typescript
test('End-to-end placement flow', async ({ browser }) => {
  // Create two isolated browser contexts
  const customerCtx = await browser.newContext();
  const candidateCtx = await browser.newContext();
  
  const customerPage = await customerCtx.newPage();
  const candidatePage = await candidateCtx.newPage();
  
  // Customer: signup → post requirement
  await customerPage.goto('/signup');
  // ... signup flow
  await customerPage.goto('/requirements/new');
  // ... post requirement
  const reqId = await customerPage.getAttribute('[data-testid="requirement-id"]', 'data-id');
  
  // Candidate: signup → submit
  await candidatePage.goto('/signup');
  // ... signup flow
  await candidatePage.goto(`/requirements/${reqId}`);
  await candidatePage.click('button:has-text("Submit")');
  
  // Customer: view submission
  await customerPage.goto(`/requirements/${reqId}/shortlist`);
  await expect(customerPage.locator('text=candidate')).toBeVisible();
});
```

#### Task 6 — Add test helpers

Create `tests/e2e/helpers.ts`:

```typescript
import { Page } from '@playwright/test';

export async function signupUser(page: Page, email: string, role: 'CUSTOMER' | 'CANDIDATE') {
  await page.goto('/signup');
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', 'Test123!');
  await page.fill('[name="confirmPassword"]', 'Test123!');
  await page.click('button[type="submit"]');
  
  // Get verification token from Mailpit
  const token = await getVerificationTokenFromMailpit(email);
  await page.goto(`/verify-email?token=${token}`);
  
  // Select role
  await page.click(`[data-testid="role-${role}"]`);
}

async function getVerificationTokenFromMailpit(email: string): Promise<string> {
  // Fetch from Mailpit API: http://localhost:8025/api/v1/messages
  const res = await fetch('http://localhost:8025/api/v1/messages');
  const data = await res.json();
  const message = data.messages.find(m => m.To[0].Address === email);
  // Extract token from email body
  const match = message.Content.Body.match(/token=([a-zA-Z0-9-_]+)/);
  return match[1];
}

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.click('button[type="submit"]');
}
```

#### Task 7 — Run E2E tests

```bash
# Run all tests
npx playwright test

# Run with UI (watch tests execute)
npx playwright test --ui

# Run specific test
npx playwright test tests/e2e/01-customer-journey.spec.ts

# Generate report
npx playwright show-report
```

**✅ Definition of Done:**
- [ ] 9 E2E tests covering critical flows
- [ ] All tests passing locally
- [ ] Tests run in <5 minutes total
- [ ] Screenshots/videos captured on failure

---

### PART B — Security Hardening

#### Task 8 — Rate limiting (local, no Redis required for v1)

**Add rate limiting to auth endpoints:**

In `services/identity-svc/src/server.ts`:

```typescript
import rateLimit from '@fastify/rate-limit';

// In-memory rate limiting (for single-server deployment)
app.register(rateLimit, {
  max: 5, // 5 requests
  timeWindow: '1 minute',
  cache: 10000, // keep 10k IPs in memory
  allowList: ['127.0.0.1'], // whitelist localhost
  redis: process.env.REDIS_URL ? redisClient : undefined, // Use Redis if available
});

// Apply to auth routes
app.post('/api/v1/auth/login', {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '5 minutes'
    }
  }
}, loginHandler);

app.post('/api/v1/auth/signup', {
  config: {
    rateLimit: {
      max: 3,
      timeWindow: '1 hour'
    }
  }
}, signupHandler);
```

**✅ Add to all services:**
- identity-svc: login (5/5min), signup (3/hr), password-reset (3/hr)
- payments-svc: invoice endpoints (10/min per customer)
- admin-svc: all endpoints (30/min per admin)

#### Task 9 — Input sanitization audit

**Install sanitization library:**
```bash
pnpm add --filter @techorbit/identity xss validator
```

**Sanitize user inputs:**

```typescript
import xss from 'xss';
import validator from 'validator';

// In route handlers
app.post('/api/v1/requirements', async (req, reply) => {
  const { title, description } = req.body;
  
  // Sanitize HTML (prevent XSS)
  const sanitizedTitle = xss(title);
  const sanitizedDescription = xss(description);
  
  // Validate email
  if (!validator.isEmail(req.body.email)) {
    throw new ValidationError('Invalid email');
  }
  
  // Continue with sanitized data...
});
```

**✅ Audit checklist:**
- [ ] All text inputs sanitized with `xss()`
- [ ] All emails validated with `validator.isEmail()`
- [ ] All URLs validated with `validator.isURL()`
- [ ] No `eval()`, `innerHTML`, or `dangerouslySetInnerHTML` in frontend
- [ ] All SQL queries use Prisma (parameterized, no raw SQL)

#### Task 10 — SSL/TLS setup (local self-signed for dev, Let's Encrypt for prod)

**Generate self-signed cert for local HTTPS:**

```bash
# In repo root
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes
```

**Update docker-compose.yml:**

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - web
```

**Create nginx.conf:**

```nginx
events {
  worker_connections 1024;
}

http {
  # Redirect HTTP to HTTPS
  server {
    listen 80;
    server_name localhost;
    return 301 https://$server_name$request_uri;
  }

  # HTTPS server
  server {
    listen 443 ssl;
    server_name localhost;

    ssl_certificate /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy to Next.js
    location / {
      proxy_pass http://web:3000;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_cache_bypass $http_upgrade;
    }

    # Proxy to services
    location /api/ {
      proxy_pass http://api-gateway:3001;
      # ... same proxy settings
    }
  }
}
```

**✅ Definition of Done:**
- [ ] HTTPS works locally (https://localhost with self-signed cert warning)
- [ ] HTTP redirects to HTTPS
- [ ] Security headers present (X-Frame-Options, X-XSS-Protection, etc.)

---

### PART C — Performance Optimization

#### Task 11 — Frontend bundle size optimization

**Analyze bundle:**
```bash
cd apps/web
pnpm build
# Check .next/static/chunks for large bundles

# Install analyzer
pnpm add -D @next/bundle-analyzer

# Add to next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // ... existing config
});

# Analyze
ANALYZE=true pnpm build
```

**Common optimizations:**
- Dynamic imports for heavy components
- Remove unused dependencies
- Use `next/dynamic` for client-only components
- Tree-shake UI library (import only used components)

#### Task 12 — Database query optimization

**Add indexes for slow queries:**

Check Prisma schema for missing indexes:

```prisma
// BEFORE (slow query)
model Requirement {
  // Missing index on status + publishedAt
}

// AFTER (fast query)
model Requirement {
  @@index([status, publishedAt])
  @@index([customerCompanyId, status])
}
```

**Generate migration:**
```bash
cd services/requirement-svc
pnpm prisma migrate dev --name add_performance_indexes
```

**✅ Critical indexes to add:**
- `Requirement`: `[status, publishedAt]`, `[customerCompanyId, status]`
- `Submission`: `[requirementId, status]`, `[candidateId, status]`
- `Timesheet`: `[placementId, status]`, `[candidateId, weekStartDate]`
- `Invoice`: `[customerCompanyId, status]`, `[status, dueDate]`
- `Notification`: `[userId, readAt]`, `[userId, createdAt]`

#### Task 13 — Caching strategy (optional, can use in-memory for single server)

**Add simple in-memory cache for expensive queries:**

```typescript
// In matching-svc
const cache = new Map<string, { data: any; expires: number }>();

async function getMatchingSignals(requirementId: string) {
  const cacheKey = `signals:${requirementId}`;
  const cached = cache.get(cacheKey);
  
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  
  const data = await prisma.matchingSignal.findMany({
    where: { requirementId }
  });
  
  cache.set(cacheKey, {
    data,
    expires: Date.now() + 5 * 60 * 1000 // 5 min TTL
  });
  
  return data;
}
```

**Don't over-optimize:** Only cache if you see actual slow queries in production.

---

### PART D — Production Docker Setup

#### Task 14 — Multi-stage Docker builds

Create production Dockerfiles for each service:

**Example: `services/identity-svc/Dockerfile.prod`**

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm prisma generate
RUN pnpm build

# Stage 3: Production
FROM node:20-alpine
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
# Copy built app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "require('http').get('http://localhost:3002/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

EXPOSE 3002
CMD ["node", "dist/server.js"]
```

**Repeat for all services.**

#### Task 15 — Production docker-compose.yml

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s

  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASS}
    restart: unless-stopped

  identity-svc:
    build:
      context: ./services/identity-svc
      dockerfile: Dockerfile.prod
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      REDIS_URL: redis://redis:6379
      RABBITMQ_URL: amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@rabbitmq:5672
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  # Repeat for all services...

  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile.prod
    environment:
      NEXT_PUBLIC_API_URL: https://yourdomain.com/api
    depends_on:
      - identity-svc
      - requirement-svc
      # ... all services
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - web
    restart: unless-stopped

volumes:
  postgres_data:
```

#### Task 16 — Environment variables management

Create `.env.production.example`:

```bash
# Database
DB_USER=techorbit
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD
DB_NAME=techorbit

# Redis
REDIS_URL=redis://redis:6379

# RabbitMQ
RABBITMQ_USER=techorbit
RABBITMQ_PASS=CHANGE_ME_STRONG_PASSWORD
RABBITMQ_URL=amqp://techorbit:CHANGE_ME_STRONG_PASSWORD@rabbitmq:5672

# JWT
JWT_SECRET=CHANGE_ME_RANDOM_256_BIT_STRING
JWT_REFRESH_SECRET=CHANGE_ME_DIFFERENT_256_BIT_STRING

# Encryption
FIELD_ENCRYPTION_KEY=CHANGE_ME_32_BYTE_HEX_STRING

# Services
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
NEXT_PUBLIC_WEB_URL=https://yourdomain.com

# Third-party (leave empty if using mocks)
STRIPE_SECRET_KEY=
SENDGRID_API_KEY=
TWILIO_ACCOUNT_SID=
DAILY_API_KEY=
```

**✅ Security checklist:**
- [ ] All secrets use strong random values (never `password123`)
- [ ] `.env.production` in `.gitignore`
- [ ] `.env.production.example` committed (with placeholder values)

---

### PART E — Deployment Documentation

#### Task 17 — Local server deployment guide

Create `docs/DEPLOYMENT_LOCAL.md`:

```markdown
# Local Server Deployment

Deploy Techorbit to a single server (localhost, VPS, or dedicated server).

## Prerequisites

- Ubuntu 22.04 LTS (or similar Linux)
- 8GB RAM minimum (16GB recommended)
- 50GB disk space
- Docker + Docker Compose installed

## Step 1: Clone repo

\`\`\`bash
git clone https://github.com/yourorg/techorbit.git
cd techorbit
\`\`\`

## Step 2: Configure environment

\`\`\`bash
cp .env.production.example .env.production
nano .env.production
# Fill in all CHANGE_ME values
\`\`\`

## Step 3: Build images

\`\`\`bash
docker-compose -f docker-compose.prod.yml build
\`\`\`

## Step 4: Run migrations

\`\`\`bash
# For each service
docker-compose -f docker-compose.prod.yml run identity-svc pnpm prisma migrate deploy
docker-compose -f docker-compose.prod.yml run profile-svc pnpm prisma migrate deploy
# ... repeat for all services
\`\`\`

## Step 5: Seed admin user

\`\`\`bash
docker-compose -f docker-compose.prod.yml run admin-svc pnpm seed:admin
\`\`\`

## Step 6: Start services

\`\`\`bash
docker-compose -f docker-compose.prod.yml up -d
\`\`\`

## Step 7: Verify

- Web app: https://localhost (accept self-signed cert warning)
- Health checks: curl http://localhost/health

## Backups

\`\`\`bash
# Backup database
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U techorbit techorbit > backup.sql

# Restore
cat backup.sql | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U techorbit techorbit
\`\`\`

## Monitoring

\`\`\`bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check service health
docker-compose -f docker-compose.prod.yml ps
\`\`\`
```

#### Task 18 — VPS deployment guide (DigitalOcean, Hetzner, Linode)

Create `docs/DEPLOYMENT_VPS.md`:

```markdown
# VPS Deployment

Deploy to DigitalOcean, Hetzner, Linode, or any VPS provider.

## Step 1: Provision VPS

- OS: Ubuntu 22.04 LTS
- Size: 8GB RAM / 4 vCPUs minimum
- Storage: 50GB SSD
- Location: Choose closest to your users

## Step 2: Initial server setup

\`\`\`bash
# SSH into server
ssh root@YOUR_VPS_IP

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Create app user
adduser techorbit
usermod -aG docker techorbit
su - techorbit
\`\`\`

## Step 3: Setup DNS (optional but recommended)

Point your domain to VPS IP:
- A record: `@` → `YOUR_VPS_IP`
- A record: `api` → `YOUR_VPS_IP`

## Step 4: Get SSL certificate (Let's Encrypt)

\`\`\`bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com

# Certificates saved to:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
\`\`\`

Update `nginx.conf`:
\`\`\`nginx
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
\`\`\`

## Step 5: Deploy (same as local, but with real domain)

Follow `DEPLOYMENT_LOCAL.md` steps, but update `.env.production`:
\`\`\`bash
NEXT_PUBLIC_WEB_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
\`\`\`

## Step 6: Setup automated backups

\`\`\`bash
# Create backup script
nano /home/techorbit/backup.sh
\`\`\`

\`\`\`bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose -f /home/techorbit/techorbit/docker-compose.prod.yml exec -T postgres \
  pg_dump -U techorbit techorbit > /home/techorbit/backups/backup_$DATE.sql
# Keep only last 7 days
find /home/techorbit/backups -name "backup_*.sql" -mtime +7 -delete
\`\`\`

\`\`\`bash
# Make executable
chmod +x /home/techorbit/backup.sh

# Add to crontab (daily at 2am)
crontab -e
0 2 * * * /home/techorbit/backup.sh
\`\`\`
```

#### Task 19 — Production readiness checklist

Create `docs/PRODUCTION_CHECKLIST.md`:

```markdown
# Production Readiness Checklist

Before going live, verify ALL items:

## Security
- [ ] All secrets use strong random values (>32 characters)
- [ ] SSL/TLS enabled (HTTPS only, HTTP redirects)
- [ ] Rate limiting enabled on auth endpoints
- [ ] Input sanitization on all user inputs
- [ ] No console.log with sensitive data
- [ ] CORS configured (not `*` wildcard)
- [ ] Security headers set (X-Frame-Options, CSP, etc.)
- [ ] Database backups automated (daily minimum)

## Performance
- [ ] Bundle size optimized (<1MB initial load)
- [ ] Database indexes added for slow queries
- [ ] Images optimized (WebP, lazy loading)
- [ ] CDN configured (optional, can add later)

## Monitoring
- [ ] Health checks working on all services
- [ ] Logs centralized (stdout/stderr or file-based)
- [ ] Error tracking setup (Sentry or similar, optional)
- [ ] Uptime monitoring (UptimeRobot, optional)

## Testing
- [ ] 289 integration tests passing
- [ ] 9 Playwright E2E tests passing
- [ ] Manual smoke test completed
- [ ] Load test completed (100 concurrent users, optional)

## Documentation
- [ ] README updated with deployment instructions
- [ ] API documentation current (OpenAPI specs)
- [ ] Admin guide written (how to approve roles, resolve disputes)
- [ ] User guide written (how to post jobs, submit candidates)

## Legal/Compliance (if applicable)
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] GDPR compliance (if serving EU users)
- [ ] Data retention policy defined
```

---

## Definition of Done (Sprint 10)

**E2E Tests:**
- [ ] 9 Playwright tests covering critical flows
- [ ] All tests passing locally
- [ ] Tests run in <5 minutes
- [ ] CI/CD pipeline configured (GitHub Actions)

**Security:**
- [ ] Rate limiting on auth endpoints (5 login attempts / 5 min)
- [ ] Input sanitization (xss, validator)
- [ ] SSL/TLS working (self-signed for dev, Let's Encrypt for prod)
- [ ] Security headers set (X-Frame-Options, CSP, HSTS)

**Performance:**
- [ ] Bundle size <1MB (check with analyzer)
- [ ] Database indexes added for slow queries
- [ ] Page load <3 seconds (Lighthouse score >80)

**Docker:**
- [ ] Multi-stage Dockerfiles for all services
- [ ] Production docker-compose.yml
- [ ] Health checks on all containers
- [ ] `.env.production.example` committed

**Documentation:**
- [ ] DEPLOYMENT_LOCAL.md (single server)
- [ ] DEPLOYMENT_VPS.md (DigitalOcean/Hetzner)
- [ ] PRODUCTION_CHECKLIST.md
- [ ] All docs tested (follow steps, verify they work)

**Quality gates:**
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (289 integration tests)
- [ ] `npx playwright test` passes (9 E2E tests)
- [ ] `pnpm build` passes (web + all services)

---

## After Sprint 10

You'll have:
- ✅ Production-ready platform (can deploy to local server or VPS)
- ✅ E2E test suite (prevents regressions)
- ✅ Security hardened (rate limiting, sanitization, SSL)
- ✅ Performance optimized (indexed queries, optimized bundles)
- ✅ Deployment documented (can hand off to DevOps or deploy yourself)

**Then Sprint 10.5 (optional):** Cloud deployment (AWS ECS, CloudWatch, RDS, etc.)

**Or:** Ship now to local/VPS, add cloud later when you scale.

---

## Before you start

Produce a **written plan** covering:

1. Task ordering (I recommend: 1-7 (E2E tests), 8-10 (security), 11-13 (performance), 14-16 (Docker), 17-19 (docs))
2. E2E test coverage: Are 9 flows enough, or should you add more? (9 is minimum, 15-20 is comprehensive)
3. Deployment target: Local server, VPS, or both? (I recommend both guides)
4. SSL certificates: Self-signed for now, or get Let's Encrypt immediately? (Self-signed for dev, Let's Encrypt when deploying to VPS)
5. Commit estimate (expect 70–100 for this sprint — lots of config + docs)

**Do not code until you say "proceed to Sprint 10."**

This is the final sprint before production. After Sprint 10, you can deploy and run real traffic.
