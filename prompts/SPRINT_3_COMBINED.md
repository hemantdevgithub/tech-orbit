# Sprint 2 Port Fix → Sprint 3 (Requirements)

You completed Sprint 2 (profiles) on branch `sprint/1-identity`. Before starting Sprint 3, fix one critical issue that will cause port collisions when all services run together.

Start from `main` (with Sprint 2 merged) on a new branch `sprint/3-requirements`.

---

## CHECKPOINT C — Port Collision Fix (5 min)

**Problem:** Sprint 2 summary flags that service ports were renumbered to avoid conflicts, but some services may still have hardcoded ports that don't match the engineering spec. When Sprint 3 brings up requirement-svc, port collisions will cause silent failures or startup errors.

### C1. Audit all service ports

Run this from repo root:

```bash
# Find all port definitions
grep -r "PORT.*=.*[0-9]" services/*/src/config.ts services/*/.env.example services/*/src/server.ts 2>/dev/null | grep -v node_modules
```

**Expected port mapping** (from ENGINEERING_SPEC Section 1.4):
- web app: `3000`
- api-gateway: `3001` (you have this as `3001` currently — correct)
- identity-svc: `3002` ✓
- file-svc: `3003` ✓
- profile-svc: `3004` ✓
- **requirement-svc: `3005`** (Sprint 3)
- matching-svc: `3006` (Sprint 4)
- interview-svc: `3007` (Sprint 5)
- placement-svc: `3008` (Sprint 6)
- payments-svc: `3009` (Sprint 7)
- messaging-svc: `3010` (Sprint 8)
- notification-svc: `3011` (Sprint 8)
- rating-svc: `3012` (Sprint 8)
- audit-svc: `3013` (Sprint 9)
- admin-svc: `3014` (Sprint 9)

### C2. Fix mismatches

For each service in `services/*/`:

1. **Check `src/config.ts`** — should read `process.env.PORT` with a fallback to the service's assigned port:
   ```ts
   PORT: z.coerce.number().default(3002),  // identity
   PORT: z.coerce.number().default(3004),  // profile
   // etc.
   ```

2. **Check `.env.example`** — should document the correct port:
   ```
   PORT=3002  # identity
   PORT=3004  # profile
   ```

3. **Check `src/server.ts` or `src/index.ts`** — should use `config.PORT`, never hardcoded.

4. **Fix any hardcoded values** to match the spec above.

5. **Update root `.env.example`** to document all service ports for developers who run the full stack.

### C3. Verify no collisions

```bash
# After fixes, check for duplicates
grep "default([0-9]" services/*/src/config.ts | awk -F'default\\(' '{print $2}' | awk -F'\\)' '{print $1}' | sort | uniq -d
```

**Expected:** No output (no duplicates).

**If there are duplicates:** Fix them before proceeding.

### C4. Commit

One atomic commit:
```
fix(services): align all service ports to engineering spec

- identity: 3002
- file: 3003
- profile: 3004
- requirement: 3005 (reserved for Sprint 3)
- [list other changes if any]

Prevents port collisions when running full stack in dev.
```

**Only after Checkpoint C is committed:** proceed to Sprint 3 below.

---

## SPRINT 3 — Requirements Service

**Prerequisites:** Checkpoint C complete; Sprint 2 merged to `main`.

Branch: `sprint/3-requirements` (branched from `main` with port fixes)

### Context you MUST re-read

1. `CLAUDE.md` — conventions
2. `ENGINEERING_SPEC.md`:
   - Section 5.4 (requirement schema)
   - Section 6.2 (events: `requirement.published.v1`, `requirement.closed.v1`)
   - Section 7.3 (requirement-svc API)
   - Section 8.1 (Flow: Post Requirement → Shortlist)
3. `PRD.md`:
   - Section 4.2 (Requirement lifecycle)
   - Section 6.2 (CRM attribution rules)
4. `DESIGN_REFERENCE.md` — for the requirement posting UI

### Sprint 3 scope

Build the **requirement service** — the foundation of the marketplace. Customers post job requirements; CRMs get attributed; requirements flow through a lifecycle (Draft → Open → Interviewing → Placed → Closed). Other roles can browse published requirements.

**Backend (requirement-svc):** CRUD for requirements, CRM attribution logic, status lifecycle management, event emission.

**Frontend (apps/web):** Post requirement form (multi-step), browse requirements (table + filters), requirement detail page, CRM attribution approval flow.

Do NOT build candidate submission or matching yet — that's Sprint 4. This sprint ends at "customers can post requirements and see them listed; CRMs can claim attribution."

---

### Task breakdown

#### Task 1 — Prisma schema for requirement-svc

Implement `services/requirement-svc/prisma/schema.prisma` per ENGINEERING_SPEC Section 5.4:

```prisma
model Requirement {
  id                    String   @id @default(uuid())
  customerCompanyId     String
  createdByUserId       String
  attributedCrmId       String?  // CRM attribution
  title                 String
  description           String   @db.Text
  techStack             String[]
  seniority             Seniority
  locationType          LocationType
  locationCity          String?
  locationState         String?
  billRateMinUsd        Decimal
  billRateMaxUsd        Decimal
  durationWeeks         Int
  startDate             DateTime
  openings              Int      @default(1)
  workAuthPrefs         WorkAuthStatus[]
  requiredInterviews    Int      @default(2)
  blindPosting          Boolean  @default(false)
  status                RequirementStatus @default(DRAFT)
  publishedAt           DateTime?
  closedAt              DateTime?
  closedReason          String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([status, publishedAt])
  @@index([customerCompanyId])
  @@schema("requirement")
}

enum RequirementStatus {
  DRAFT
  OPEN
  INTERVIEWING
  OFFER_EXTENDED
  PLACED
  CLOSED
  CANCELLED
}

enum LocationType {
  ONSITE
  HYBRID
  REMOTE
}
```

Also add enums `Seniority` and `WorkAuthStatus` if not already in the shared types (they should be from Sprint 2).

Generate migration. Apply locally. Verify with `prisma studio`.

#### Task 2 — Shared types

In `packages/types/`:
- `RequirementRequestSchema` (for POST/PATCH)
- `RequirementResponseSchema` (for GET)
- `RequirementFilterSchema` (for browse query params)
- `PublishRequirementSchema` (empty body or reason field)
- `CloseRequirementSchema` (reason field)
- `AttributeCrmSchema` (crmUserId field)
- Event schemas: `requirement.published.v1`, `requirement.closed.v1`

Derive TS types via `z.infer`.

#### Task 3 — Repository layer (requirement-svc)

In `services/requirement-svc/src/repositories/requirement.repository.ts`:

- `create(data, authContext)` — authz: only customers
- `findById(id, authContext)` — visibility: owner or attributed CRM or public if published
- `update(id, updates, authContext)` — authz: owner only, cannot update if status > DRAFT
- `publish(id, authContext)` — transition DRAFT → OPEN, set publishedAt
- `close(id, reason, authContext)` — transition to CLOSED, set closedAt + closedReason
- `list(filters, pagination, authContext)` — supports filtering by: status, customerCompanyId, techStack (array overlap), seniority, locationType, workAuth, dateRange
- `attributeCrm(requirementId, crmUserId, authContext)` — sets attributedCrmId; authz rules in PRD 6.2

**Visibility rules:**
- Draft: owner only
- Published (OPEN+): visible to all authenticated users
- Blind posting: if `blindPosting=true`, hide customerCompanyId/createdByUserId from non-owners

#### Task 4 — Service layer

In `services/requirement-svc/src/services/requirement.service.ts`:

- `createRequirement(data, authContext)` — validates customer has a complete profile (call profile-svc)
- `publishRequirement(id, authContext)` — validates: min 1 opening, valid date range, bill rate range coherent, emits `requirement.published.v1`
- `closeRequirement(id, reason, authContext)` — emits `requirement.closed.v1`
- `attributeCrm(requirementId, crmUserId, authContext)` — CRM attribution logic from PRD 6.2:
  - If customer already has `attributedCrmId` set on their CustomerCompanyProfile → use that (auto-approve)
  - If not, create a pending attribution request (store in a new `CrmAttributionRequest` table) → customer must approve
  - Once approved, update `requirement.attributedCrmId` AND `CustomerCompanyProfile.attributedCrmId` for future reqs

**CrmAttributionRequest table** (add to schema):
```prisma
model CrmAttributionRequest {
  id                String   @id @default(uuid())
  requirementId     String
  customerCompanyId String
  crmUserId         String
  status            CrmAttributionStatus @default(PENDING)
  approvedAt        DateTime?
  approvedBy        String?
  rejectedAt        DateTime?
  createdAt         DateTime @default(now())
  @@schema("requirement")
}

enum CrmAttributionStatus { PENDING, APPROVED, REJECTED }
```

#### Task 5 — API routes

Implement ENGINEERING_SPEC Section 7.3 endpoints:

- `POST /api/v1/requirements` — create draft
- `GET /api/v1/requirements/:id` — get single requirement (visibility-filtered)
- `PATCH /api/v1/requirements/:id` — update (draft only)
- `POST /api/v1/requirements/:id/publish` — publish (DRAFT → OPEN)
- `POST /api/v1/requirements/:id/close` — close with reason
- `GET /api/v1/requirements` — list with filters: `?status=OPEN&techStack=React,Node&seniority=SENIOR&locationType=REMOTE&cursor=<>&limit=20`
- `POST /api/v1/requirements/:id/attribute-crm` — CRM attribution (body: `{ crmUserId }`)
- `GET /api/v1/crm-attribution-requests` — list pending requests (customer-only)
- `POST /api/v1/crm-attribution-requests/:id/approve` — approve attribution (customer-only)
- `POST /api/v1/crm-attribution-requests/:id/reject` — reject attribution (customer-only)

Every route validates input with Zod, enforces authn + authz, emits events on state changes.

#### Task 6 — Event emission

requirement-svc emits:
- `requirement.published.v1` on publish (includes: requirementId, customerCompanyId, attributedCrmId, techStack, seniority, locationType)
- `requirement.closed.v1` on close (includes: requirementId, reason)

Use the outbox pattern (add `OutgoingEvent` table like identity/profile).

#### Task 7 — Frontend: Post requirement form

Build `/requirements/new` (customer-only):

**Form structure (3 steps):**

**Step 1 — Job basics:**
- Title (text input)
- Description (textarea, rich text optional)
- Tech stack (multi-select tags: React, Node.js, Python, Java, AWS, etc. from controlled vocabulary)
- Seniority (dropdown: Junior, Mid, Senior, Staff, Principal)

**Step 2 — Location & rates:**
- Location type (radio: Onsite / Hybrid / Remote)
- If Onsite/Hybrid: City, State (text inputs)
- Bill rate range (min/max sliders, $50–$250/hr, step $5)
- Duration (weeks input)
- Start date (date picker)
- Number of openings (number input, default 1)

**Step 3 — Requirements:**
- Work authorization preferences (multi-select checkboxes: US Citizen, Green Card, H-1B, etc.)
- Number of required interviews (dropdown: 1, 2, 3, 4)
- Blind posting toggle (checkbox with tooltip: "Hide your company name from candidates")

**Actions:**
- Save as draft → POST to `/requirements`, stay on page with "Draft saved" toast
- Publish → POST to `/requirements` then POST to `/requirements/:id/publish`, redirect to `/requirements/:id`

Form uses `@techorbit/ui` components, react-hook-form + Zod, shows progress (3 steps), validates per-step.

#### Task 8 — Frontend: Browse requirements

Build `/requirements` (authenticated users):

**Table view:**
- Columns: Title, Tech Stack (pills), Seniority, Location, Rate Range, Openings, Status, Published Date
- Filters (above table): Status dropdown, Tech stack multi-select, Seniority multi-select, Location type, Search (free text on title/description)
- Pagination (cursor-based, 20 per page)
- Click row → navigate to `/requirements/:id`

**Empty state:** "No requirements match your filters. Clear filters or check back later."

#### Task 9 — Frontend: Requirement detail page

Build `/requirements/[id]` (authenticated users):

**Layout:**
- Top: Title, status badge, published date
- Section 1: Description (formatted text)
- Section 2: Key details (InfoStrip pattern from design system):
  - Tech stack pills
  - Seniority badge
  - Location (icon + city/state or "Remote")
  - Rate range
  - Duration
  - Work auth preferences
- Section 3 (customer/CRM view only): Edit/Close buttons (if owner)
- Section 4 (candidates/SRMs view): "Submit candidate" button (disabled with tooltip: "Available in Sprint 4")

**Blind posting behavior:** If `blindPosting=true` and viewer is not owner/attributed CRM, hide company name (show "Confidential" instead).

#### Task 10 — Frontend: CRM attribution flow

**For CRMs:**
- On `/requirements/:id`, if not yet attributed and CRM wants to claim: "Claim attribution" button → POST `/requirements/:id/attribute-crm` with `{ crmUserId: me.id }`
- If pending: show "Attribution pending customer approval" banner

**For Customers:**
- New route: `/settings/crm-attribution` (or a section in customer dashboard)
- Table: Pending attribution requests (CRM name, requirement title, requested date)
- Actions per row: Approve / Reject buttons
- Approve → POST `/crm-attribution-requests/:id/approve`, show success toast, requirement updates
- Reject → POST `/crm-attribution-requests/:id/reject`, show toast

**Auto-attribution:** If customer already has an `attributedCrmId` set on their CustomerCompanyProfile, new requirements auto-link to that CRM (no approval needed). Show this in the UI: "Your requirements are automatically attributed to [CRM name]. Change this in Settings."

#### Task 11 — Integration tests

**requirement-svc tests** (Vitest + Testcontainers):
- Create requirement as customer → verify in DB
- Publish requirement → verify status=OPEN, publishedAt set, event emitted to outbox
- Close requirement → verify closedAt, closedReason
- List requirements with filters → verify only matching results returned
- Visibility: non-owner cannot read draft
- Visibility: blind posting hides customerCompanyId from non-owner
- CRM attribution: first request creates pending, approval sets attributedCrmId
- CRM attribution: auto-approve if customer already has CRM
- Authz: non-customer cannot create requirement

**E2E (Playwright):**
- Customer completes profile → posts requirement (3 steps) → publishes → sees it in browse list
- CRM browses requirements → claims attribution → customer approves → requirement shows CRM as attributed

#### Task 12 — Documentation

- `services/requirement-svc/README.md` — endpoints, env vars, local run, event emission
- Regenerate OpenAPI spec
- Update root `README.md` with requirement posting flow

---

### Definition of Done (Sprint 3)

**Functional:**
- [ ] A customer can create, edit, and publish a requirement via the UI
- [ ] A customer can close a requirement with a reason
- [ ] Published requirements appear in the browse list for all authenticated users
- [ ] Filters (status, tech stack, seniority, location) work correctly
- [ ] Requirement detail page renders with all fields visible
- [ ] Blind posting hides company info from non-owners
- [ ] CRM can claim attribution; customer can approve/reject
- [ ] Auto-attribution works if customer already has a CRM linked
- [ ] `requirement.published.v1` event emitted and visible in RabbitMQ

**Security:**
- [ ] Draft requirements not visible to non-owners
- [ ] Only customers can create/publish requirements
- [ ] Only owners can edit/close requirements
- [ ] Blind posting enforced at API layer (not just UI)

**Quality gates:**
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (requirement-svc integration tests green)
- [ ] Playwright E2E passes (requirement posting + browse flows)

**Visual:**
- [ ] Post requirement form matches DESIGN_REFERENCE aesthetic
- [ ] Browse table is clean, responsive, and filterable
- [ ] Detail page uses InfoStrip and Badge components correctly

---

### Before you start

Produce a **written plan** covering:

1. **Checkpoint C results** — paste the output of the port audit; confirm no duplicates
2. Task ordering and dependencies (I recommend: C → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12)
3. Any ambiguities:
   - CRM attribution approval UX (inline on detail page vs settings page?)
   - Controlled vocabulary for tech stack (hardcoded list vs dynamic from DB?)
   - Rich text editor for description (simple textarea vs Tiptap/Slate?)
4. Commit estimate (expect 50–80 for this sprint)

**Do not start coding until:**
- Checkpoint C is complete and committed
- You share the plan with me
- I say "proceed to Sprint 3"

This ensures services don't collide on ports mid-sprint.
