# Sprint 6 — Placements, Value Chain & Commission Engine

You completed Sprint 5.5 verification — all flows green. You're now at the **most critical sprint** of the entire build.

Branch: `sprint/6-placements` (branched from `sprint/5-interviews` after Sprint 5.5)

---

## Why Sprint 6 is the most important sprint

Every sprint before this built the marketplace **infrastructure**. Sprint 6 builds the **business model**. After Sprint 6:
- Customers can hire candidates (create placements)
- The Value Chain is materialized (who contributed to this hire?)
- Commissions are calculated (who gets paid what?)
- The "transparent commission transparency" promise becomes real

**This is where Techorbit becomes Techorbit.**

---

## Context you MUST re-read

1. `CLAUDE.md` — conventions, especially financial rules (Decimal not number, idempotency, audit logs)
2. `ENGINEERING_SPEC.md`:
   - Section 5.7 (placement schema — Placement, ValueChain, CommissionRule)
   - Section 6.2 (events — `placement.created.v1`)
   - Section 7.6 (placement-svc API)
   - Section 8.3 (Flow: Placement Creation + Value Chain + Commissions)
3. `PRD.md`:
   - Section 4.5 (Placement lifecycle)
   - Section 6.4 (Value Chain rules)
   - Section 6.5 (Commission calculation)

**Read Section 8.3 of ENGINEERING_SPEC twice.** It has the worked example of commission calculation.

---

## Sprint 6 scope

Build the **placement service** and **commission engine**. After Sprint 5, customers can interview candidates. After Sprint 6, customers can **hire** them, and the platform knows exactly who gets paid what.

**Backend (placement-svc):**
- Placement CRUD (create, read, update status, end early)
- Value Chain construction (materialize the attribution graph)
- Commission calculation engine (rule-based, configurable weights)
- Contract generation hooks (DocuSign API or mocked)

**Frontend (apps/web):**
- "Hire candidate" flow (from submission detail or interview)
- Placement detail page (contract info, Value Chain visibility, commission breakdown)
- Active placements dashboard (customer/candidate/vendor views)
- Value Chain visualization (who gets what commission)

Do NOT build timesheets or invoicing yet — that's Sprint 7. This sprint ends at "placement is created, commissions are projected."

---

## CRITICAL: Value Chain & Commission Rules

Before you write code, internalize these rules. **Every commission bug compounds** — wrong attribution = wrong payouts = broken trust.

### The Value Chain roles

When a placement is created, **6 roles participate**:

1. **Customer** — the company hiring (pays the bill rate)
2. **CRM** — brought the customer to the platform (commission on every placement this customer makes)
3. **SRM** — sourced the candidate (commission on this specific placement)
4. **MSME** — vendor firm providing the candidate (C2C only; gets residual after platform/SRM cut)
5. **Candidate** — the person being placed (W-2: receives pay rate; C2C/1099: invoices MSME separately, not via platform)
6. **Interviewer(s)** — conducted interviews (flat fee per interview, already paid in Sprint 7 but attributed here)

Not every role participates in every placement. Examples:
- Candidate self-submits (no SRM) → SRM slot is null
- Direct hire W-2 (no MSME) → MSME slot is null
- Customer self-conducts interview (no platform interviewer) → Interviewer slot is null

### Attribution resolution logic

**When creating a placement, resolve these fields from upstream data:**

```
CRM attribution:
  - Source: Requirement.attributedCrmId (set at requirement creation time)
  - Fallback: CustomerCompanyProfile.attributedCrmId (if customer has a standing CRM relationship)
  - Fallback: null (no CRM commission)

SRM attribution:
  - Source: Submission.attributedSrmId (set at submission time)
  - Fallback: null (candidate self-submitted)

MSME attribution:
  - Source: Submission.attributedMsmeId (set at submission time)
  - Condition: only if engagementType = C2C
  - Fallback: null (W-2 or 1099 direct)

Candidate:
  - Source: Submission.candidateId (always present)

Interviewer(s):
  - Source: All Interview records for this Submission where status = COMPLETED
  - Extract: Interview.interviewerUserId (dedupe if same interviewer did multiple rounds)
  - Fallback: [] (customer self-conducted)
```

### Commission calculation rules (v1 defaults)

**Engagement type: W-2 (candidate is platform employee)**

| Role       | Calculation                  | Amount (example: $120/hr bill rate, 40 hrs/week) |
|------------|------------------------------|---------------------------------------------------|
| CRM        | 8% of billable revenue       | $120 * 40 * 52 weeks * 0.08 = $19,968/year        |
| SRM        | 5% of billable revenue       | $120 * 40 * 52 weeks * 0.05 = $12,480/year        |
| Interviewer| Flat fee per interview       | $150 * 2 interviews = $300 (one-time)             |
| Candidate  | Pay rate (W-2 salary)        | $90/hr * 40 * 52 = $187,200/year (gross)          |
| Platform   | 12% of billable revenue      | $120 * 40 * 52 * 0.12 = $29,952/year              |
| MSME       | null (not involved in W-2)   | $0                                                |

**Total check:** CRM (8%) + SRM (5%) + Platform (12%) = 25% of bill rate. Candidate gets pay rate ($90/hr in this example). Remaining $30/hr * 2080 hours = $62,400/year covers payroll taxes, benefits, overhead.

**Engagement type: C2C (candidate works for MSME)**

| Role       | Calculation                  | Amount (example: $120/hr bill rate, 40 hrs/week) |
|------------|------------------------------|---------------------------------------------------|
| CRM        | 8% of billable revenue       | $19,968/year                                      |
| SRM        | 5% of billable revenue       | $12,480/year                                      |
| Interviewer| Flat fee per interview       | $300 (one-time)                                   |
| Platform   | 12% of billable revenue      | $29,952/year                                      |
| MSME       | Residual after above cuts    | Bill rate - (CRM + SRM + Platform) = 75% of bill rate = $187,200/year |
| Candidate  | null (invoices MSME directly)| Negotiated with MSME, not via platform            |

**Total check:** CRM (8%) + SRM (5%) + Platform (12%) = 25%. MSME gets the remaining 75% ($90/hr in this example) and pays the candidate from that.

**Engagement type: 1099 (independent contractor, direct to customer)**

| Role       | Calculation                  | Notes                                             |
|------------|------------------------------|---------------------------------------------------|
| CRM        | 8% of billable revenue       | Same as W-2                                       |
| SRM        | 5% of billable revenue       | Same as W-2                                       |
| Interviewer| Flat fee per interview       | Same as W-2                                       |
| Platform   | 12% of billable revenue      | Same as W-2                                       |
| Candidate  | Residual after above cuts    | Similar to MSME case; candidate invoices customer directly for 75% |
| MSME       | null                         | Not involved                                      |

**For Sprint 6, implement W-2 and C2C only.** 1099 is a v1.1 feature (rare in practice for IT staffing).

### Commission rule storage (DB schema)

When a placement is created, generate `CommissionRule` rows for each participant:

```prisma
model CommissionRule {
  id                String   @id @default(uuid())
  placementId       String
  slot              CommissionSlot
  beneficiaryUserId String?  // userId of CRM/SRM/Interviewer/Candidate
  beneficiaryMsmeId String?  // msmeId if slot = MSME
  calculation       CommissionCalc
  percentOfBillRate Decimal? // 0.08 for CRM, 0.05 for SRM, etc.
  flatFeeUsd        Decimal? // for INTERVIEWER
  notes             String?
  createdAt         DateTime @default(now())

  @@index([placementId])
  @@schema("placement")
}

enum CommissionSlot {
  CRM
  SRM
  MSME
  CANDIDATE_W2
  INTERVIEWER
  PLATFORM
  @@schema("placement")
}

enum CommissionCalc {
  PERCENT_OF_BILL  // CRM, SRM, Platform
  FLAT_FEE         // Interviewer
  RESIDUAL         // MSME, Candidate in C2C case
  @@schema("placement")
}
```

**Example:** For a W-2 placement with CRM + SRM + 2 interviewers:

```
CommissionRule rows:
1. slot=CRM,        beneficiaryUserId=<crmId>,  calculation=PERCENT_OF_BILL, percentOfBillRate=0.08
2. slot=SRM,        beneficiaryUserId=<srmId>,  calculation=PERCENT_OF_BILL, percentOfBillRate=0.05
3. slot=INTERVIEWER, beneficiaryUserId=<int1>,  calculation=FLAT_FEE,         flatFeeUsd=150.00
4. slot=INTERVIEWER, beneficiaryUserId=<int2>,  calculation=FLAT_FEE,         flatFeeUsd=150.00
5. slot=CANDIDATE_W2, beneficiaryUserId=<candId>, calculation=PERCENT_OF_BILL, percentOfBillRate=0.75 (pay rate as % of bill rate)
6. slot=PLATFORM,   beneficiaryUserId=null,     calculation=PERCENT_OF_BILL, percentOfBillRate=0.12
```

These rules are **immutable** once created. They define the contract for this placement.

---

## Task breakdown

### Task 1 — Prisma schema for placement-svc

Implement `services/placement-svc/prisma/schema.prisma`:

```prisma
generator client {
  provider        = "prisma-client-js"
  output          = "../src/generated/client"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["placement"]
}

model Placement {
  id                   String   @id @default(uuid())
  requirementId        String
  submissionId         String   @unique
  candidateId          String
  customerCompanyId    String
  engagementType       EngagementType
  billRateUsd          Decimal  @db.Decimal(10,2)
  payRateUsd           Decimal? @db.Decimal(10,2)  // for W-2 only
  startDate            DateTime
  endDate              DateTime
  actualEndDate        DateTime?
  status               PlacementStatus @default(ACTIVE)
  contractDocumentId   String?  // signed MSA/Work Order (DocuSign or file-svc)
  workOrderId          String?
  rtrDocumentId        String?  // Right to Represent
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  valueChain           ValueChain?
  commissionRules      CommissionRule[]

  @@index([customerCompanyId, status])
  @@index([candidateId, status])
  @@schema("placement")
}

enum EngagementType {
  W2
  C2C
  IC_1099
  @@schema("placement")
}

enum PlacementStatus {
  ACTIVE
  ENDED_COMPLETED
  ENDED_EARLY
  SUSPENDED
  @@schema("placement")
}

model ValueChain {
  id                String   @id @default(uuid())
  placementId       String   @unique
  placement         Placement @relation(fields: [placementId], references: [id])
  customerCompanyId String
  attributedCrmId   String?
  attributedSrmId   String?
  attributedMsmeId  String?
  candidateId       String
  interviewerIds    String[] // array of userIds
  createdAt         DateTime @default(now())

  @@schema("placement")
}

model CommissionRule {
  id                String   @id @default(uuid())
  placementId       String
  placement         Placement @relation(fields: [placementId], references: [id])
  slot              CommissionSlot
  beneficiaryUserId String?
  beneficiaryMsmeId String?
  calculation       CommissionCalc
  percentOfBillRate Decimal? @db.Decimal(5,4)  // e.g., 0.0800 for 8%
  flatFeeUsd        Decimal? @db.Decimal(10,2)
  notes             String?
  createdAt         DateTime @default(now())

  @@index([placementId])
  @@index([beneficiaryUserId])
  @@index([beneficiaryMsmeId])
  @@schema("placement")
}

enum CommissionSlot {
  CRM
  SRM
  MSME
  CANDIDATE_W2
  INTERVIEWER
  PLATFORM
  @@schema("placement")
}

enum CommissionCalc {
  PERCENT_OF_BILL
  FLAT_FEE
  RESIDUAL
  @@schema("placement")
}

model OutgoingEvent {
  id        String   @id @default(uuid())
  eventType String
  payload   Json
  status    OutgoingEventStatus @default(PENDING)
  attempts  Int      @default(0)
  lastError String?
  createdAt DateTime @default(now())
  @@schema("placement")
}

enum OutgoingEventStatus {
  PENDING
  PUBLISHED
  FAILED
  @@schema("placement")
}
```

Generate migration. Apply locally.

### Task 2 — Shared types

In `packages/types/`:
- `CreatePlacementRequestSchema` (submissionId, engagementType, billRateUsd, payRateUsd?, startDate, endDate)
- `PlacementResponseSchema`
- `ValueChainResponseSchema` (with visibility filtering — see Task 5)
- `CommissionRuleResponseSchema`
- `EndPlacementSchema` (reason, actualEndDate)
- Event: `placement.created.v1` schema

Add enums to `enums.ts`: `EngagementType`, `PlacementStatus`, `CommissionSlot`, `CommissionCalc`

### Task 3 — Commission calculation service (pure function)

In `services/placement-svc/src/services/commission-calculator.ts`:

**Core function:**
```ts
type CommissionInput = {
  placementId: string;
  engagementType: EngagementType;
  billRateUsd: Decimal;
  payRateUsd?: Decimal;
  attributedCrmId?: string;
  attributedSrmId?: string;
  attributedMsmeId?: string;
  candidateId: string;
  interviewerIds: string[];
  interviewerFees: Map<string, Decimal>; // userId -> fee
};

type CommissionRule = {
  slot: CommissionSlot;
  beneficiaryUserId?: string;
  beneficiaryMsmeId?: string;
  calculation: CommissionCalc;
  percentOfBillRate?: Decimal;
  flatFeeUsd?: Decimal;
  notes?: string;
};

function calculateCommissionRules(input: CommissionInput): CommissionRule[] {
  const rules: CommissionRule[] = [];

  // CRM commission (if attributed)
  if (input.attributedCrmId) {
    rules.push({
      slot: 'CRM',
      beneficiaryUserId: input.attributedCrmId,
      calculation: 'PERCENT_OF_BILL',
      percentOfBillRate: new Decimal(0.08), // 8%
      notes: 'CRM attribution commission'
    });
  }

  // SRM commission (if attributed)
  if (input.attributedSrmId) {
    rules.push({
      slot: 'SRM',
      beneficiaryUserId: input.attributedSrmId,
      calculation: 'PERCENT_OF_BILL',
      percentOfBillRate: new Decimal(0.05), // 5%
      notes: 'SRM sourcing commission'
    });
  }

  // Interviewer fees (flat fees, already known from Interview.interviewerFeeUsd)
  for (const [userId, fee] of input.interviewerFees.entries()) {
    rules.push({
      slot: 'INTERVIEWER',
      beneficiaryUserId: userId,
      calculation: 'FLAT_FEE',
      flatFeeUsd: fee,
      notes: 'Interview conducted'
    });
  }

  // Engagement-specific rules
  if (input.engagementType === 'W2') {
    // Candidate gets pay rate (as % of bill rate or absolute)
    const payRatePercent = input.payRateUsd 
      ? input.payRateUsd.div(input.billRateUsd) 
      : new Decimal(0.75); // default if not specified

    rules.push({
      slot: 'CANDIDATE_W2',
      beneficiaryUserId: input.candidateId,
      calculation: 'PERCENT_OF_BILL',
      percentOfBillRate: payRatePercent,
      notes: 'W-2 pay rate'
    });

    // Platform commission
    rules.push({
      slot: 'PLATFORM',
      beneficiaryUserId: null,
      calculation: 'PERCENT_OF_BILL',
      percentOfBillRate: new Decimal(0.12), // 12%
      notes: 'Platform fee'
    });

  } else if (input.engagementType === 'C2C') {
    // MSME gets residual
    rules.push({
      slot: 'MSME',
      beneficiaryMsmeId: input.attributedMsmeId,
      calculation: 'RESIDUAL',
      notes: 'C2C vendor residual (75% of bill rate after CRM/SRM/Platform cuts)'
    });

    // Platform commission
    rules.push({
      slot: 'PLATFORM',
      beneficiaryUserId: null,
      calculation: 'PERCENT_OF_BILL',
      percentOfBillRate: new Decimal(0.12),
      notes: 'Platform fee'
    });
  }

  return rules;
}
```

**This function is PURE** — no DB calls, no side effects. Test it extensively with unit tests.

### Task 4 — Repository layer

In `services/placement-svc/src/repositories/`:

**placement.repository.ts:**
- `create(data, authContext)` — creates Placement + ValueChain + CommissionRule rows in ONE transaction
- `findById(id, authContext)` — visibility: customer, candidate, attributed vendors
- `list(filters, authContext)` — supports: customerCompanyId, candidateId, attributedCrmId, status
- `updateStatus(id, newStatus, authContext)` — authz: customer only
- `endEarly(id, actualEndDate, reason, authContext)` — authz: customer only

**value-chain.repository.ts:**
- `findByPlacement(placementId, authContext)` — returns visibility-filtered ValueChain (see Task 5)

**commission-rule.repository.ts:**
- `findByPlacement(placementId, authContext)` — returns rules, filtered by viewer's role

### Task 5 — Value Chain visibility rules (CRITICAL)

The Value Chain contains sensitive information. **Who can see what?**

**Full visibility (see everything):**
- Customer (owns the placement)
- Platform Admin

**Partial visibility:**
- **CRM:** Can see: customer, candidate, own commission. **Cannot see:** SRM, MSME, other commissions.
- **SRM:** Can see: customer, candidate, own commission. **Cannot see:** CRM, MSME, other commissions.
- **MSME:** Can see: customer, candidate, SRM (who sourced), own residual. **Cannot see:** CRM, interviewer fees, platform cut.
- **Candidate:** Can see: customer, own pay rate. **Cannot see:** CRM, SRM, MSME, platform cut, vendor commissions.
- **Interviewer:** Can see: customer, candidate, own fee. **Cannot see:** any other commissions.

Implement this in `services/placement-svc/src/lib/value-chain-filter.ts`:

```ts
function filterValueChain(
  valueChain: ValueChain, 
  commissionRules: CommissionRule[], 
  viewerRole: UserRoleType, 
  viewerId: string
): VisibleValueChain {
  // Return filtered version based on viewer's role
  // ...
}
```

**Test this extensively.** Value Chain visibility is a product differentiator — it must be correct.

### Task 6 — Service layer

In `services/placement-svc/src/services/placement.service.ts`:

**createPlacement:**
1. Validate: submission is in OFFER or INTERVIEWING status (call matching-svc)
2. Validate: customer has authority (owns the requirement)
3. Fetch attribution data:
   - Requirement.attributedCrmId (call requirement-svc)
   - Submission.attributedSrmId, attributedMsmeId (from matching-svc)
   - Interview records (call interview-svc for completed interviews, extract interviewerUserIds + fees)
4. Construct ValueChain object
5. Calculate CommissionRules (call `calculateCommissionRules` from Task 3)
6. **In ONE transaction:**
   - Insert Placement
   - Insert ValueChain
   - Insert CommissionRule rows (bulk insert)
   - Write outbox event `placement.created.v1`
7. Return placement ID

**endPlacement:**
- Update status to ENDED_COMPLETED or ENDED_EARLY
- Set actualEndDate
- Emit `placement.ended.v1` (for Sprint 7 timesheet cutoff)

### Task 7 — API routes

Implement ENGINEERING_SPEC Section 7.6 endpoints:

- `POST /api/v1/placements` — create placement
- `GET /api/v1/placements/:id` — get placement (visibility-filtered)
- `GET /api/v1/placements/:id/value-chain` — get Value Chain (visibility-filtered per Task 5)
- `GET /api/v1/placements/:id/commissions` — get commission rules (visibility-filtered)
- `GET /api/v1/placements` — list placements (query: `?customerCompanyId=&candidateId=&status=`)
- `POST /api/v1/placements/:id/end` — end placement early

Every route validates with Zod, enforces authn + authz, emits events on mutations.

### Task 8 — Frontend: Hire candidate flow

Build `/submissions/[id]/hire` page (customer-only):

**Form fields:**
- Engagement type (radio: W-2, C2C)
- Bill rate ($/hr input)
- Pay rate ($/hr input, visible only if W-2 selected)
- Start date (date picker)
- End date (date picker, default = start + requirement duration)
- Contract upload (optional, for pre-signed MSA if available)

**Validations:**
- Pay rate < bill rate (if W-2)
- Start date >= today
- End date > start date

**Submit:**
- POST to `/api/v1/placements`
- On success: redirect to `/placements/[id]` with "Placement created" toast

**Trigger:**
- "Hire candidate" button on submission detail page (visible only if submission status = OFFER)
- OR: "Hire" button on shortlist kanban when dragging to PLACED column

### Task 9 — Frontend: Placement detail page

Build `/placements/[id]` page (authenticated, visibility-filtered):

**Layout:**
- Header: Candidate name, engagement type badge, status, start-end dates
- Section 1: Contract details (bill rate, pay rate if W-2, start/end dates)
- Section 2: Value Chain visualization (see Task 10 below)
- Section 3: Actions (customer-only):
  - "End placement" button (if status = ACTIVE)
  - "View timesheets" button (Sprint 7)
- Section 4: Documents (MSA, Work Order, RTR — if uploaded)

### Task 10 — Frontend: Value Chain visualization

**Component:** `<ValueChainGraph>` (in placement detail page)

**Visual design:**
- Horizontal flowchart: Customer → CRM → SRM → Candidate (or MSME if C2C)
- Each node shows:
  - Role icon
  - Name (or "Confidential" if viewer can't see it)
  - Commission amount (or hidden if viewer can't see it)
- Interviewers shown as side nodes (not in main flow)

**Example (customer view, W-2 placement):**
```
┌──────────┐     ┌─────┐     ┌─────┐     ┌──────────┐
│ Customer │ ──> │ CRM │ ──> │ SRM │ ──> │Candidate │
│ TechCorp │     │ 8%  │     │ 5%  │     │   75%    │
└──────────┘     └─────┘     └─────┘     └──────────┘
                                │
                                ├─> Interviewer 1 ($150)
                                └─> Interviewer 2 ($150)
```

**Example (SRM view, same placement):**
```
┌──────────┐     ┌────────────┐     ┌─────┐     ┌──────────┐
│ Customer │ ──> │Confidential│ ──> │ YOU │ ──> │Candidate │
│ TechCorp │     │            │     │ 5%  │     │   Name   │
└──────────┘     └────────────┘     └─────┘     └──────────┘
```

Use a library like `react-flow` or build a simple SVG flowchart. Keep it clean and readable.

### Task 11 — Frontend: Active placements dashboard

Update dashboard for each role:

**Customer dashboard:**
- "Active placements" card → table (candidate name, role, start date, bill rate, status)
- Click row → navigate to `/placements/[id]`

**Candidate dashboard:**
- "Current placement" card → shows details (customer, role, start date, pay rate)
- "View details" button → navigate to `/placements/[id]`

**CRM/SRM dashboard:**
- "Placements with commissions" table → shows placements where they're attributed
- Columns: Customer, Candidate, Start date, Your commission (projected monthly)

**MSME dashboard:**
- "Active C2C placements" table → shows placements for their bench candidates
- Columns: Candidate, Customer, Start date, Residual rate

### Task 12 — Integration tests

**placement-svc tests** (Vitest + Testcontainers):
- Create W-2 placement → verify Placement + ValueChain + 6 CommissionRules created (CRM, SRM, 2 interviewers, candidate, platform)
- Create C2C placement → verify MSME gets residual rule
- Create placement with no CRM attribution → verify only 5 rules (no CRM)
- Create placement with no SRM attribution → verify only 5 rules (no SRM)
- Value Chain visibility: customer sees all, SRM sees partial, candidate sees pay rate only
- Commission calculation: verify percentages sum correctly (W-2: 8+5+12+75 = 100%; C2C: 8+5+12+75 = 100%)
- End placement early → verify actualEndDate set, status = ENDED_EARLY
- Authz: non-customer cannot create placement

**Unit tests for commission calculator (Task 3):**
- W-2 with CRM+SRM+2 interviewers → 6 rules
- C2C with CRM+SRM+MSME → 4 rules (CRM, SRM, MSME, Platform)
- No CRM attribution → CRM rule absent
- Verify percentages are Decimal type, not number
- Verify residual calculation correct

### Task 13 — Documentation

- `services/placement-svc/README.md` — endpoints, Value Chain logic, commission calculation
- Regenerate OpenAPI spec for placement-svc
- Update root `README.md` with placement creation flow description
- Document the commission calculation formula with worked examples

---

## Definition of Done (Sprint 6)

**Functional:**
- [ ] Customer can hire a candidate (create placement) via the UI
- [ ] Placement creates ValueChain + CommissionRules in one transaction
- [ ] Value Chain visibility filtering works correctly (customer sees all, vendors see partial)
- [ ] Commission rules match the specified percentages (CRM 8%, SRM 5%, Platform 12%, etc.)
- [ ] W-2 and C2C engagement types both work
- [ ] Customer can view placement detail page with Value Chain visualization
- [ ] Customer can end a placement early
- [ ] CRM/SRM dashboards show placements they're attributed to
- [ ] Candidate dashboard shows current placement with pay rate
- [ ] `placement.created.v1` event emitted

**Financial correctness:**
- [ ] Commission percentages are stored as Decimal (not number)
- [ ] Commission rules are immutable (cannot be edited after creation)
- [ ] Percentages sum to 100% for each engagement type
- [ ] No rounding errors in commission calculation
- [ ] Audit log entry created for every placement creation

**Security:**
- [ ] Value Chain visibility enforced at repository layer (not just UI)
- [ ] Only customer can create placement
- [ ] Only customer can end placement
- [ ] Candidate cannot see vendor commissions

**Quality gates:**
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (placement-svc integration + unit tests green)
- [ ] OpenAPI spec generated and committed for placement-svc

**Visual:**
- [ ] Value Chain graph is clear and readable
- [ ] Commission amounts formatted as currency ($X,XXX.XX)
- [ ] Placement detail page matches DESIGN_REFERENCE aesthetic

---

## Before you start

Produce a **written plan** covering:

1. Task ordering (I recommend: 1 → 2 → 3 (unit tests first!) → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13)
2. Any ambiguities in the commission logic:
   - Should interviewers who did multiple rounds get multiple flat fees, or one fee total?
   - What happens if billRateUsd < sum of all flat fees (interviewers)? (Error? Or allow?)
   - Should platform commission be configurable per customer? (No for v1, hardcode 12%)
3. Value Chain visibility: any edge cases I missed?
4. Decimal precision: store as `Decimal(10,2)` for currency, `Decimal(5,4)` for percentages — confirm this matches your needs
5. Commit estimate (expect 80–120 for this sprint — this is complex)

**CRITICAL: Before coding, write down the commission calculation for these 3 scenarios and verify the math:**

**Scenario 1:** W-2, $120/hr bill rate, $90/hr pay rate, with CRM + SRM + 2 interviewers ($150 each)
- Expected: CRM 8% ($9.60/hr), SRM 5% ($6/hr), Platform 12% ($14.40/hr), Candidate 75% ($90/hr), Interviewers $300 total (one-time)

**Scenario 2:** C2C, $120/hr bill rate, with CRM + SRM + MSME
- Expected: CRM 8% ($9.60/hr), SRM 5% ($6/hr), Platform 12% ($14.40/hr), MSME residual 75% ($90/hr)

**Scenario 3:** W-2, $100/hr bill rate, $75/hr pay rate, NO CRM, with SRM + 1 interviewer ($150)
- Expected: SRM 5% ($5/hr), Platform 12% ($12/hr), Candidate 75% ($75/hr), Interviewer $150 (one-time)
- Note: No CRM means CRM's 8% ($8/hr) stays with the platform, so platform gets 12% + 8% = 20% ($20/hr)? OR does the math change?

**Resolve that third scenario before coding.** Does "no CRM" mean platform gets their cut, or platform gets CRM's cut too? This is a product decision.

**Do not code until:**
- You've written out the 3 scenarios above
- I've confirmed the math
- You say "proceed to Sprint 6"

This sprint's commission logic will define your business model. Get it right.
