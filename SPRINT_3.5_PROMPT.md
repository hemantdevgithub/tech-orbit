# Sprint 3.5 — Cleanup & Schema Hardening

You completed Sprint 3 (requirements) on branch `sprint/3-requirements`. Before Sprint 4, fix two issues that will compound if left unaddressed.

Continue on the same branch `sprint/3-requirements` (or create `sprint/3.5-cleanup` if you want a separate PR — your call).

**This sprint is scoped tightly: 2 tasks, 3-5 commits, merge, move on.**

---

## Context

1. `SPRINT_3_SUMMARY.md` — specifically "Known Issues / Deferred" item 7 (customerCompanyId semantics)
2. `ENGINEERING_SPEC.md` Section 7 — API documentation requirements (OpenAPI specs)

---

## Task 1 — Fix `customerCompanyId` foreign key semantics

**Problem:** `Requirement.customerCompanyId` currently stores `User.id` (the customer's userId). This breaks when multi-user companies are added — which company does the requirement belong to? The fix is to make it a proper FK to `CustomerCompanyProfile.id`.

### Why fix this now

Sprint 4 (submissions) will have `Submission.requirementId` FKs. Sprint 5 (interviews) will have `Interview.requirementId`. Sprint 6 (placements) will have `Placement.requirementId`. If we migrate `customerCompanyId` later, we have to update all those downstream tables' queries too.

Fixing now (before submissions exist) is a 1-hour task. Fixing in Sprint 7 is a 1-day migration.

### What to do

#### 1a. Update the Prisma schema

In `services/requirement/prisma/schema.prisma`:

**Before:**
```prisma
model Requirement {
  customerCompanyId     String
  // ...
}
```

**After:**
```prisma
model Requirement {
  customerCompanyId     String
  customerCompany       CustomerCompanyProfile? @relation(fields: [customerCompanyId], references: [id])
  // ...
  
  @@index([customerCompanyId])  // already exists, keep it
}

// Add this model stub (just enough for the FK):
model CustomerCompanyProfile {
  id            String @id
  requirements  Requirement[]
  
  @@map("CustomerCompanyProfile")
  @@schema("profile")  // This references the profile schema
}
```

**Note:** This is a **cross-schema FK** (requirement.Requirement → profile.CustomerCompanyProfile). Postgres supports this; Prisma will generate the correct SQL. The `CustomerCompanyProfile` model here is just a stub for the relation — the real model lives in `services/profile/prisma/schema.prisma`.

#### 1b. Generate and review the migration

```bash
cd services/requirement
pnpm prisma migrate dev --name fix_customer_company_fk --create-only
```

**Review the generated SQL carefully:**
- Should add a FK constraint from `requirement.customer_company_id` → `profile."CustomerCompanyProfile".id`
- Should NOT drop any data (this is additive)
- Should NOT have CASCADE DELETE (we want explicit lifecycle management)

If the migration looks wrong, edit it manually before applying.

#### 1c. Update the service layer

In `services/requirement/src/services/requirement.service.ts`, the `createRequirement` function currently does:

```ts
// Current (WRONG):
const customerCompanyId = authContext.userId;  // This is User.id
```

**Change to:**

```ts
// Fetch the customer's company profile
const customerCompany = await profileApiClient.getCustomerCompany(authContext.userId);

if (!customerCompany) {
  throw new ValidationError("You must complete your company profile before posting requirements");
}

const customerCompanyId = customerCompany.id;  // This is CustomerCompanyProfile.id
```

This means:
1. The profile-svc API client needs a `getCustomerCompany(userId)` method (add it to `lib/profile-api.ts`)
2. If the customer hasn't completed their profile yet, they get a clear error

#### 1d. Update existing data (migration script)

If you have any test data in your local DB where `customerCompanyId` is currently a `User.id`, you need to backfill it to the correct `CustomerCompanyProfile.id`.

**Option A (dev only, no real data):** Just wipe and re-create:
```bash
# In services/requirement:
pnpm prisma migrate reset --force
pnpm prisma migrate deploy
```

**Option B (if you want to preserve test data):** Write a one-time script:
```sql
-- This would run as part of the migration or as a separate script
UPDATE requirement."Requirement" r
SET customer_company_id = (
  SELECT id FROM profile."CustomerCompanyProfile" ccp
  WHERE ccp.primary_user_id = r.customer_company_id
)
WHERE EXISTS (
  SELECT 1 FROM profile."CustomerCompanyProfile" ccp
  WHERE ccp.primary_user_id = r.customer_company_id
);
```

For Sprint 3.5, **Option A is fine** — just reset the dev DB. Production migration (when you have real data) would use Option B.

#### 1e. Update tests

In `services/requirement/tests/integration/requirement.test.ts`, the `stubProfileCustomer` helper currently returns a mock with `primaryUserId`. Update it to return `{ id: "company-123", primaryUserId: "user-123", ... }` and make sure tests use `company.id` when creating requirements.

#### 1f. Verify

After migration:
```bash
# Check the FK exists
docker-compose exec postgres psql -U postgres -d techorbit -c "\d requirement.\"Requirement\""
# Should show a foreign key constraint pointing to profile."CustomerCompanyProfile"(id)

# Run tests
pnpm --filter @techorbit/requirement test
```

All tests should pass. If any fail, it means they were relying on the old `customerCompanyId = userId` assumption.

---

## Task 2 — OpenAPI spec generation

**Problem:** Services have no auto-generated OpenAPI specs. API consumers (frontend, future external integrations) have no machine-readable contract.

**Solution:** Wire up `@anatine/zod-openapi` (or `zod-to-openapi` — use whichever is better maintained) to auto-generate `openapi.yaml` from the Zod schemas already defined in routes.

### Why fix this now

Sprint 4 (matching-svc) will add more endpoints. Sprint 5 (interview-svc) adds even more. If we establish the pattern now, future sprints inherit it automatically. Plus, OpenAPI specs are required for any kind of external API consumers or Postman collection generation.

### What to do

#### 2a. Choose the library

Check which is more actively maintained:
- `@asteasolutions/zod-to-openapi` (formerly `zod-to-openapi`)
- `@anatine/zod-openapi`

Use whichever has recent commits and good TS support. For this guide, I'll assume `@asteasolutions/zod-to-openapi`.

#### 2b. Install in a shared package

Add to `packages/types/`:
```bash
cd packages/types
pnpm add @asteasolutions/zod-to-openapi
```

Create `packages/types/src/openapi-registry.ts`:
```ts
import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

export const registry = new OpenAPIRegistry();

// Register all shared schemas here as components
// Example:
// registry.register('CreateRequirementRequest', CreateRequirementSchema);
// registry.register('RequirementResponse', RequirementResponseSchema);
```

#### 2c. Add a generation script per service

In `services/requirement/`:

Create `scripts/generate-openapi.ts`:
```ts
import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { registry } from '@techorbit/types/openapi-registry';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import all route definitions that register their endpoints
import '../src/routes/requirement.routes.js';  // Adjust path as needed
import '../src/routes/crm-attribution.routes.js';

const generator = new OpenApiGeneratorV3(registry.definitions);

const docs = generator.generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'Techorbit Requirements API',
    version: '1.0.0',
    description: 'API for posting and managing job requirements',
  },
  servers: [
    { url: 'http://localhost:3005', description: 'Local development' },
    { url: 'https://api.techorbit.dev', description: 'Production' },
  ],
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.join(__dirname, '..', 'openapi.yaml');

fs.writeFileSync(outputPath, JSON.stringify(docs, null, 2));
console.log(`✓ OpenAPI spec written to ${outputPath}`);
```

Add to `package.json`:
```json
{
  "scripts": {
    "openapi:generate": "tsx scripts/generate-openapi.ts"
  }
}
```

#### 2d. Annotate routes with OpenAPI metadata

In `services/requirement/src/routes/requirement.routes.ts`, for each route, add OpenAPI registration:

**Example:**
```ts
import { registry } from '@techorbit/types/openapi-registry';
import { CreateRequirementSchema, RequirementResponseSchema } from '@techorbit/types';

// When defining the route:
app.post('/api/v1/requirements', {
  schema: {
    body: CreateRequirementSchema,
    response: {
      201: RequirementResponseSchema,
    },
  },
}, async (request, reply) => {
  // ... handler
});

// Register with OpenAPI:
registry.registerPath({
  method: 'post',
  path: '/api/v1/requirements',
  summary: 'Create a new requirement',
  tags: ['Requirements'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateRequirementSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Requirement created',
      content: {
        'application/json': {
          schema: RequirementResponseSchema,
        },
      },
    },
    400: {
      description: 'Validation error',
    },
    401: {
      description: 'Unauthorized',
    },
  },
});
```

Do this for **every route** in requirement-svc.

#### 2e. Generate and commit the spec

```bash
cd services/requirement
pnpm openapi:generate
git add openapi.yaml
```

The `openapi.yaml` should be committed to version control so API consumers can reference it directly from the repo.

#### 2f. Add to CI

Update `.github/workflows/ci.yml` to regenerate OpenAPI specs and fail if they're out of sync:

```yaml
- name: Generate OpenAPI specs
  run: |
    pnpm --filter @techorbit/requirement openapi:generate
    pnpm --filter @techorbit/identity openapi:generate
    pnpm --filter @techorbit/profile openapi:generate
    # Add other services as they get wired
    
- name: Check for uncommitted changes
  run: |
    if [[ -n $(git status --porcelain) ]]; then
      echo "OpenAPI specs are out of sync. Run pnpm openapi:generate and commit."
      git diff
      exit 1
    fi
```

#### 2g. Repeat for identity-svc and profile-svc

Apply the same pattern to the other two services that have routes:
- `services/identity/scripts/generate-openapi.ts`
- `services/profile/scripts/generate-openapi.ts`

Each gets its own `openapi.yaml` committed at the service root.

---

## Definition of Done (Sprint 3.5)

**Task 1 (customerCompanyId FK):**
- [ ] Prisma schema has FK from `Requirement.customerCompanyId` → `profile.CustomerCompanyProfile.id`
- [ ] Migration applied successfully (cross-schema FK created)
- [ ] `createRequirement` service method fetches `CustomerCompanyProfile.id` instead of using `userId`
- [ ] Integration tests updated and passing
- [ ] Manual verification: can create a requirement as a customer with a complete profile

**Task 2 (OpenAPI):**
- [ ] `@asteasolutions/zod-to-openapi` (or equivalent) added to `packages/types`
- [ ] `services/requirement/openapi.yaml` generated and committed
- [ ] `services/identity/openapi.yaml` generated and committed
- [ ] `services/profile/openapi.yaml` generated and committed
- [ ] All routes annotated with OpenAPI metadata
- [ ] CI job added to verify specs are in sync

**Quality gates:**
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (all existing tests still green)

---

## Commit plan

Suggested sequence (4-5 commits):

1. `fix(requirement): change customerCompanyId to FK to CustomerCompanyProfile.id`
   - Prisma schema update
   - Migration generated and applied
   - Service layer update (fetch company profile first)
   - Test updates

2. `feat(types): add OpenAPI registry and zod-to-openapi tooling`
   - Install library in packages/types
   - Create openapi-registry.ts
   - Export shared utility

3. `feat(requirement): generate OpenAPI spec from Zod schemas`
   - Add generate-openapi.ts script
   - Annotate all routes
   - Generate and commit openapi.yaml

4. `feat(identity,profile): generate OpenAPI specs`
   - Same pattern for identity-svc and profile-svc

5. `chore(ci): add OpenAPI spec sync verification to CI`
   - Update GitHub Actions workflow

---

## Before you start

Produce a **written plan** covering:

1. Which OpenAPI library you're using (check both for recent activity)
2. Any concerns about the cross-schema FK (requirement → profile) — Prisma supports this but confirm your Postgres version does too (it should, this is standard SQL)
3. Estimated time (this should be 2-3 hours max)

**Do not code until I say "proceed to Sprint 3.5."**

Once complete, we proceed directly to Sprint 4 (Matching + Submissions).
