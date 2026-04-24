# Sprint 7 — Timesheets, Invoicing & Payroll

You completed Sprint 6.5 (polish + E2E verification) — all flows green, commission math verified. You're now at the **final "hard" sprint**.

Branch: `sprint/7-payments` (branched from `sprint/6-placements` after Sprint 6.5)

---

## Why Sprint 7 is the last major complexity spike

Sprints 0-6 built the marketplace infrastructure + business model. Sprint 7 builds the **money flows** — actual dollar collection and disbursement.

After Sprint 7:
- Candidates submit timesheets (track hours worked)
- Platform generates invoices (bill customers for hours × bill rate)
- Platform calculates payouts (pay candidates + vendors based on CommissionRules)
- The marketplace processes **real GMV** (Gross Merchandise Value)

**This is where Techorbit becomes an EOR platform**, not just a staffing marketplace.

---

## Context you MUST re-read

1. `CLAUDE.md` — conventions, especially financial rules (Decimal precision, idempotency, audit logs)
2. `ENGINEERING_SPEC.md`:
   - Section 5.8 (payments schema — Timesheet, Invoice, CommissionPayout)
   - Section 6.2 (events — `timesheet.submitted.v1`, `invoice.generated.v1`, `payout.processed.v1`)
   - Section 7.7 (payments-svc API)
   - Section 8.4 (Flow: Timesheet → Invoice → Payout)
3. `PRD.md`:
   - Section 4.6 (Timesheet submission + approval)
   - Section 4.7 (Invoicing)
   - Section 4.8 (Payroll + commission disbursement)

**Read Section 8.4 of ENGINEERING_SPEC carefully.** It has the worked example of timesheet → invoice → payout flow.

---

## Sprint 7 scope

Build the **payments service** and **money flow orchestration**. After Sprint 6, customers can hire candidates. After Sprint 7, candidates log hours, customers get billed, vendors get paid.

**Backend (payments-svc):**
- Timesheet CRUD (submit, approve, reject, edit)
- Invoice generation (automatic weekly billing based on approved timesheets)
- Commission payout calculation (based on CommissionRules × hours worked)
- Integration hooks for Gusto/Check.co (payroll) and Stripe (invoicing) — **mocked for v1**

**Frontend (apps/web):**
- Timesheet submission form (candidate weekly hour logging)
- Timesheet approval queue (customer reviews + approves)
- Invoice list + detail (customer view)
- Commission payout dashboard (vendor view)
- Earnings summary (all roles)

**Third-party integrations (mocked for v1):**
- Stripe for invoice generation + payment collection
- Gusto or Check.co for W-2 payroll processing
- ACH transfers for commission payouts (via Stripe Connect or similar)

Do NOT build dispute resolution yet — that's Sprint 9. This sprint ends at "invoices generated, payouts calculated."

---

## CRITICAL: Money flow architecture

Before you write code, internalize this flow. **Every dollar must be traceable.**

### The weekly cycle

**Monday 12:01 AM (week start):**
- System marks new billing period for all ACTIVE placements

**Throughout the week:**
- Candidates submit timesheets (daily or batch at end of week)
- Customers review + approve timesheets

**Sunday 11:59 PM (week end):**
- System auto-generates invoices for all approved timesheets
- Invoice line items: `hours × billRateUsd` per placement
- Commission payouts calculated: `hours × (billRateUsd × commissionPercent)` per beneficiary

**Monday (next week):**
- Invoices sent to customers (Stripe or email)
- Customers pay invoices (Stripe payment or manual ACH)
- Once invoice paid → commission payouts marked as PENDING
- Payroll processed (W-2 candidates via Gusto, mocked for v1)
- Commission payouts processed (vendors via Stripe Connect, mocked for v1)

### The state machines

**Timesheet states:**
```
DRAFT → SUBMITTED → APPROVED → INVOICED
                 ↓
               REJECTED → (candidate edits) → SUBMITTED
```

**Invoice states:**
```
DRAFT → SENT → PAID → SETTLED
             ↓
           OVERDUE (if not paid within 30 days)
```

**CommissionPayout states:**
```
PENDING → PROCESSING → COMPLETED → SETTLED
                    ↓
                  FAILED → (retry) → PROCESSING
```

### Financial correctness rules

1. **Timesheets must be approved before invoicing.** No auto-approval (prevents fraud).
2. **Invoice total = sum of (approved hours × bill rate) across all timesheets in billing period.**
3. **Commission payouts = sum of (approved hours × bill rate × commission%) per beneficiary.**
4. **All money calculations use Decimal, never number.** Rounding errors = legal liability.
5. **Every financial mutation creates an audit log entry.** Who approved what, when, why.
6. **Idempotency on invoice generation.** Running the weekly job twice = same invoices, not duplicates.

---

## Task breakdown

### Task 1 — Prisma schema for payments-svc

Implement `services/payments-svc/prisma/schema.prisma`:

```prisma
generator client {
  provider        = "prisma-client-js"
  output          = "../src/generated/client"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["payments"]
}

model Timesheet {
  id                String   @id @default(uuid())
  placementId       String
  candidateId       String
  weekStartDate     DateTime // Monday 00:00:00
  weekEndDate       DateTime // Sunday 23:59:59
  hoursWorked       Decimal  @db.Decimal(5,2)  // e.g., 40.00, 37.50
  description       String?  @db.Text
  status            TimesheetStatus @default(DRAFT)
  submittedAt       DateTime?
  approvedAt        DateTime?
  approvedBy        String?
  rejectedAt        DateTime?
  rejectedBy        String?
  rejectionReason   String?
  invoiceId         String?  // FK to Invoice once invoiced
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([placementId, weekStartDate])  // one timesheet per placement per week
  @@index([candidateId, status])
  @@index([placementId, status])
  @@schema("payments")
}

enum TimesheetStatus {
  DRAFT
  SUBMITTED
  APPROVED
  REJECTED
  INVOICED
  @@schema("payments")
}

model Invoice {
  id                   String   @id @default(uuid())
  customerCompanyId    String
  billingPeriodStart   DateTime
  billingPeriodEnd     DateTime
  subtotalUsd          Decimal  @db.Decimal(10,2)
  taxUsd               Decimal  @db.Decimal(10,2) @default(0)
  totalUsd             Decimal  @db.Decimal(10,2)
  status               InvoiceStatus @default(DRAFT)
  sentAt               DateTime?
  dueDate              DateTime?
  paidAt               DateTime?
  stripeInvoiceId      String?  // Stripe invoice ID (if using Stripe)
  stripePaymentIntentId String?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  lineItems            InvoiceLineItem[]
  commissionPayouts    CommissionPayout[]

  @@unique([customerCompanyId, billingPeriodStart])  // one invoice per customer per week
  @@index([status, dueDate])
  @@schema("payments")
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  OVERDUE
  SETTLED
  @@schema("payments")
}

model InvoiceLineItem {
  id              String   @id @default(uuid())
  invoiceId       String
  invoice         Invoice  @relation(fields: [invoiceId], references: [id])
  placementId     String
  timesheetId     String
  description     String   // e.g., "Alex Chen - Senior Full-Stack Engineer - Week of 2026-05-04"
  hoursWorked     Decimal  @db.Decimal(5,2)
  rateUsd         Decimal  @db.Decimal(10,2)  // bill rate
  amountUsd       Decimal  @db.Decimal(10,2)  // hours × rate
  createdAt       DateTime @default(now())

  @@index([invoiceId])
  @@schema("payments")
}

model CommissionPayout {
  id                String   @id @default(uuid())
  invoiceId         String
  invoice           Invoice  @relation(fields: [invoiceId], references: [id])
  placementId       String
  commissionRuleId  String   // FK to placement.CommissionRule
  beneficiaryUserId String?
  beneficiaryMsmeId String?
  slot              String   // CRM, SRM, INTERVIEWER, PLATFORM, etc.
  amountUsd         Decimal  @db.Decimal(10,2)
  status            PayoutStatus @default(PENDING)
  processedAt       DateTime?
  stripeTransferId  String?  // Stripe Connect transfer ID (if using Stripe)
  failureReason     String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([beneficiaryUserId, status])
  @@index([invoiceId, status])
  @@schema("payments")
}

enum PayoutStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  SETTLED
  @@schema("payments")
}

model OutgoingEvent {
  id        String   @id @default(uuid())
  eventType String
  payload   Json
  status    OutgoingEventStatus @default(PENDING)
  attempts  Int      @default(0)
  lastError String?
  createdAt DateTime @default(now())
  @@schema("payments")
}

enum OutgoingEventStatus {
  PENDING
  PUBLISHED
  FAILED
  @@schema("payments")
}
```

Generate migration. Apply locally.

### Task 2 — Shared types

In `packages/types/`:
- `SubmitTimesheetRequestSchema` (placementId, weekStartDate, hoursWorked, description?)
- `ApproveTimesheetSchema` (empty body or notes field)
- `RejectTimesheetSchema` (reason field)
- `TimesheetResponseSchema`
- `InvoiceResponseSchema`
- `InvoiceLineItemResponseSchema`
- `CommissionPayoutResponseSchema`
- Event schemas: `timesheet.submitted.v1`, `timesheet.approved.v1`, `invoice.generated.v1`, `payout.processed.v1`

Add enums to `enums.ts`: `TimesheetStatus`, `InvoiceStatus`, `PayoutStatus`

### Task 3 — Commission payout calculator (pure function)

In `services/payments-svc/src/services/commission-payout-calculator.ts`:

**Core function:**
```ts
type PayoutInput = {
  placementId: string;
  invoiceId: string;
  commissionRules: CommissionRule[];  // from placement-svc
  approvedTimesheets: Timesheet[];
};

type PayoutOutput = {
  placementId: string;
  commissionRuleId: string;
  beneficiaryUserId?: string;
  beneficiaryMsmeId?: string;
  slot: CommissionSlot;
  amountUsd: Decimal;
};

function calculateCommissionPayouts(input: PayoutInput): PayoutOutput[] {
  const payouts: PayoutOutput[] = [];
  
  // Sum total approved hours for this placement in this billing period
  const totalHours = input.approvedTimesheets.reduce((sum, ts) => 
    sum.plus(ts.hoursWorked), new Decimal(0)
  );
  
  // For each commission rule, calculate payout
  for (const rule of input.commissionRules) {
    let amountUsd: Decimal;
    
    if (rule.calculation === 'PERCENT_OF_BILL') {
      // Get bill rate from placement (fetch via placement-svc or passed in)
      const billRateUsd = input.placement.billRateUsd;
      amountUsd = totalHours.times(billRateUsd).times(rule.percentOfBillRate);
      
    } else if (rule.calculation === 'FLAT_FEE') {
      // Interviewer fees are one-time, already paid (or deferred to end of placement)
      // For v1: skip interviewer payouts in weekly cycle, handle separately
      continue;
      
    } else if (rule.calculation === 'RESIDUAL') {
      // MSME or Platform residual
      const billRateUsd = input.placement.billRateUsd;
      // Residual = total revenue - sum of all PERCENT_OF_BILL payouts
      const percentPayouts = input.commissionRules
        .filter(r => r.calculation === 'PERCENT_OF_BILL')
        .reduce((sum, r) => sum.plus(r.percentOfBillRate || 0), new Decimal(0));
      
      const residualPercent = new Decimal(1).minus(percentPayouts);
      amountUsd = totalHours.times(billRateUsd).times(residualPercent);
    }
    
    payouts.push({
      placementId: input.placementId,
      commissionRuleId: rule.id,
      beneficiaryUserId: rule.beneficiaryUserId,
      beneficiaryMsmeId: rule.beneficiaryMsmeId,
      slot: rule.slot,
      amountUsd,
    });
  }
  
  return payouts;
}
```

**This function is PURE** — no DB calls, no side effects. Test it with unit tests (at least 10 test cases covering different commission structures).

### Task 4 — Repository layer

In `services/payments-svc/src/repositories/`:

**timesheet.repository.ts:**
- `create(data, authContext)` — authz: candidate who owns the placement
- `findById(id, authContext)` — visibility: candidate, customer
- `list(filters, authContext)` — supports: placementId, candidateId, status, weekStartDate range
- `submit(id, authContext)` — transition DRAFT → SUBMITTED, set submittedAt
- `approve(id, approverId, authContext)` — authz: customer only, transition SUBMITTED → APPROVED
- `reject(id, reason, approverId, authContext)` — authz: customer only, transition SUBMITTED → REJECTED

**invoice.repository.ts:**
- `create(data, authContext)` — called by weekly job, not directly by users
- `findById(id, authContext)` — visibility: customer (owns invoice), platform admin
- `list(filters, authContext)` — supports: customerCompanyId, status, billingPeriodStart range
- `markPaid(id, paidAt, stripePaymentIntentId, authContext)` — webhook from Stripe or manual

**commission-payout.repository.ts:**
- `create(data, authContext)` — called by invoice generation job
- `findByBeneficiary(userId, authContext)` — list payouts for a vendor
- `markCompleted(id, stripeTransferId, authContext)` — called after Stripe transfer succeeds
- `markFailed(id, reason, authContext)` — called if Stripe transfer fails

### Task 5 — Service layer

In `services/payments-svc/src/services/`:

**timesheet.service.ts:**
- `submitTimesheet(data, authContext)` — validates: placement is ACTIVE, week not already invoiced, hours < 168 (max hours in a week)
- `approveTimesheet(id, authContext)` — emits `timesheet.approved.v1`
- `rejectTimesheet(id, reason, authContext)` — emits `timesheet.rejected.v1`

**invoice-generator.service.ts:**
- `generateWeeklyInvoices(billingPeriodStart, billingPeriodEnd)` — **cron job, runs Monday 12:01 AM**
  1. Find all ACTIVE placements
  2. For each placement, find APPROVED timesheets in billing period
  3. Group by customerCompanyId
  4. For each customer, create Invoice + InvoiceLineItems
  5. Calculate CommissionPayouts (call `calculateCommissionPayouts` from Task 3)
  6. Insert Invoice + LineItems + Payouts in ONE transaction
  7. Emit `invoice.generated.v1`
  8. Mark timesheets as INVOICED

**payout-processor.service.ts:**
- `processPayouts(invoiceId)` — called after invoice is PAID
  1. Fetch all PENDING payouts for this invoice
  2. For each payout:
     - If beneficiaryUserId is CANDIDATE_W2 → send to Gusto/Check.co (mocked: mark COMPLETED)
     - If beneficiaryUserId is vendor (CRM/SRM/Interviewer) → Stripe Connect transfer (mocked: mark COMPLETED)
     - If beneficiaryMsmeId → Stripe Connect transfer to MSME (mocked: mark COMPLETED)
  3. Emit `payout.processed.v1` for each

### Task 6 — API routes

Implement ENGINEERING_SPEC Section 7.7 endpoints:

**Timesheets:**
- `POST /api/v1/timesheets` — submit timesheet
- `GET /api/v1/timesheets/:id` — get timesheet
- `GET /api/v1/timesheets` — list timesheets (query: `?placementId=&status=&weekStartDate=`)
- `POST /api/v1/timesheets/:id/submit` — mark as submitted
- `POST /api/v1/timesheets/:id/approve` — approve (customer-only)
- `POST /api/v1/timesheets/:id/reject` — reject with reason (customer-only)

**Invoices:**
- `GET /api/v1/invoices/:id` — get invoice (customer or admin only)
- `GET /api/v1/invoices` — list invoices (query: `?customerCompanyId=&status=`)
- `POST /api/v1/invoices/:id/mark-paid` — manual payment recording (admin-only, or webhook from Stripe)

**Payouts:**
- `GET /api/v1/payouts` — list payouts for current user (query: `?status=&placementId=`)
- `GET /api/v1/payouts/:id` — get payout detail

**Internal (cron job endpoints):**
- `POST /api/v1/internal/generate-weekly-invoices` — trigger invoice generation (cron or admin)

Every route validates with Zod, enforces authn + authz, emits events on mutations.

### Task 7 — Cron job setup

In `services/payments-svc/src/jobs/weekly-invoice-generator.ts`:

**Cron schedule:** Every Monday at 12:01 AM

```ts
import cron from 'node-cron';

// Run every Monday at 00:01 (UTC or server timezone)
cron.schedule('1 0 * * 1', async () => {
  const now = new Date();
  const billingPeriodEnd = startOfDay(now); // Sunday 23:59:59
  const billingPeriodStart = subDays(billingPeriodEnd, 7); // Previous Monday 00:00:00
  
  console.log(`Generating invoices for ${billingPeriodStart} to ${billingPeriodEnd}`);
  
  try {
    await invoiceGeneratorService.generateWeeklyInvoices(billingPeriodStart, billingPeriodEnd);
    console.log('✓ Weekly invoices generated');
  } catch (error) {
    console.error('✗ Invoice generation failed:', error);
    // Alert admin via Slack/email
  }
});
```

Wire this into `server.ts` startup. Only enable if `ENABLE_CRON_JOBS=true` in env (so dev environments don't auto-generate invoices).

### Task 8 — Third-party integration mocks

For v1, **mock all third-party integrations**. Real integrations come in v1.1 or v2.

**Stripe (invoicing):**

In `services/payments-svc/src/lib/stripe-mock.ts`:

```ts
export class StripeMock {
  async createInvoice(invoice: Invoice): Promise<{ id: string; url: string }> {
    // Mock: return fake Stripe invoice ID
    return {
      id: `inv_mock_${invoice.id}`,
      url: `https://invoice.stripe.com/mock/${invoice.id}`,
    };
  }
  
  async createPaymentIntent(invoice: Invoice): Promise<{ id: string }> {
    return { id: `pi_mock_${invoice.id}` };
  }
}
```

**Gusto (W-2 payroll):**

In `services/payments-svc/src/lib/gusto-mock.ts`:

```ts
export class GustoMock {
  async processPayroll(candidateId: string, amountUsd: Decimal): Promise<{ payrollId: string }> {
    // Mock: log the payroll event
    console.log(`[MOCK] Gusto payroll: ${candidateId} → $${amountUsd}`);
    return { payrollId: `payroll_mock_${candidateId}_${Date.now()}` };
  }
}
```

**Stripe Connect (vendor payouts):**

In `services/payments-svc/src/lib/stripe-connect-mock.ts`:

```ts
export class StripeConnectMock {
  async createTransfer(beneficiaryId: string, amountUsd: Decimal): Promise<{ transferId: string }> {
    console.log(`[MOCK] Stripe transfer: ${beneficiaryId} → $${amountUsd}`);
    return { transferId: `tr_mock_${beneficiaryId}_${Date.now()}` };
  }
}
```

Use these mocks in `payout-processor.service.ts`. In production, swap for real Stripe/Gusto clients.

### Task 9 — Frontend: Timesheet submission form

Build `/placements/[id]/timesheets/new` page (candidate-only):

**Form fields:**
- Week selector (dropdown: "Week of May 4-10, 2026", "Week of May 11-17, 2026", etc.)
- Hours worked (number input, 0-168, step 0.25 for quarter-hours)
- Description (textarea, optional: "Worked on feature X, bug fixes, meetings")

**Submit:**
- POST to `/api/v1/timesheets`
- On success: redirect to `/placements/[id]` with "Timesheet submitted" toast

**Validation:**
- Hours > 0 and <= 168
- Week must be in the past (can't submit timesheet for future weeks)
- Only one timesheet per placement per week (backend enforces @@unique constraint)

### Task 10 — Frontend: Timesheet approval queue

Build `/timesheets/pending` page (customer-only):

**Table view:**
- Columns: Candidate, Placement, Week, Hours, Submitted date, Actions
- Filters: Placement (dropdown), Status (SUBMITTED only)
- Actions per row: Approve button, Reject button

**Approve action:**
- POST to `/api/v1/timesheets/:id/approve`
- On success: row disappears from table (status → APPROVED)

**Reject action:**
- Modal opens: "Reason for rejection" textarea
- POST to `/api/v1/timesheets/:id/reject` with reason
- On success: row disappears (status → REJECTED), candidate notified

**Empty state:** "No pending timesheets to review."

### Task 11 — Frontend: Invoice list + detail

**Invoice list page** (`/invoices`, customer-only):

**Table view:**
- Columns: Invoice #, Billing period, Total, Status, Due date, Actions
- Filters: Status (dropdown), Billing period (date range)
- Click row → navigate to `/invoices/[id]`

**Invoice detail page** (`/invoices/[id]`, customer-only):

**Layout:**
- Header: Invoice #, Status badge, Total amount, Due date
- Section 1: Line items table (Placement, Candidate, Hours, Rate, Amount)
- Section 2: Subtotal, Tax (if applicable), Total
- Section 3: Payment info (Stripe invoice URL if SENT, "Paid on [date]" if PAID)
- Actions: "Pay invoice" button (if SENT) → redirects to Stripe invoice URL (mocked)

### Task 12 — Frontend: Commission payout dashboard

Build `/payouts` page (vendor roles: CRM/SRM/MSME/Interviewer):

**Table view:**
- Columns: Placement, Customer, Billing period, Amount, Status, Paid date
- Filters: Status (dropdown), Placement (dropdown)
- Total row: Sum of all COMPLETED payouts

**Summary cards (top of page):**
- Pending earnings: sum of PENDING payouts
- Completed earnings (this month): sum of COMPLETED payouts in current month
- Total lifetime earnings: sum of all COMPLETED payouts

**Empty state:** "No payouts yet. You'll see commission payouts here once customers pay their invoices."

### Task 13 — Frontend: Earnings summary (all roles)

Update dashboards for each role:

**Candidate dashboard:**
- "Earnings this month" card → sum of APPROVED timesheets × pay rate
- "Pending timesheets" card → count of SUBMITTED timesheets awaiting approval

**Customer dashboard:**
- "Unpaid invoices" card → sum of SENT + OVERDUE invoices
- "Pending timesheets" card → count of SUBMITTED timesheets awaiting approval

**Vendor dashboards (CRM/SRM/MSME/Interviewer):**
- "Pending commissions" card → sum of PENDING payouts
- "Earnings this month" card → sum of COMPLETED payouts in current month

### Task 14 — Integration tests

**payments-svc tests** (Vitest + Testcontainers):
- Submit timesheet as candidate → verify in DB
- Approve timesheet as customer → verify status=APPROVED, emit event
- Reject timesheet → verify status=REJECTED, rejectionReason set
- Generate weekly invoice → verify Invoice + InvoiceLineItems + CommissionPayouts created
- Invoice generation idempotency → running twice for same billing period = same invoice
- Commission payout calculation → verify amounts match CommissionRule percentages × hours
- Mark invoice paid → verify CommissionPayouts transition to PROCESSING
- Authz: candidate cannot approve own timesheet
- Authz: non-customer cannot approve timesheet

**Unit tests for commission-payout-calculator (Task 3):**
- W-2 placement, 40 hours, CRM+SRM → verify 4 payouts (CRM, SRM, Candidate, Platform)
- C2C placement, 40 hours, CRM+SRM+MSME → verify 4 payouts (CRM, SRM, MSME, Platform)
- No CRM attribution → Platform absorbs CRM's commission
- Verify all amounts are Decimal type, not number
- Verify payout amounts sum to total invoice amount

### Task 15 — Documentation

- `services/payments-svc/README.md` — endpoints, cron jobs, third-party integrations (mocked)
- Regenerate OpenAPI spec for payments-svc
- Update root `README.md` with money flow description
- Document the timesheet → invoice → payout lifecycle with diagrams

---

## Definition of Done (Sprint 7)

**Functional:**
- [ ] Candidate can submit weekly timesheets via the UI
- [ ] Customer can approve/reject timesheets
- [ ] Weekly cron job generates invoices (Monday 12:01 AM)
- [ ] Invoice line items match approved timesheets
- [ ] Commission payouts calculated correctly based on CommissionRules
- [ ] Customer can view invoices + line item breakdown
- [ ] Vendors can view pending + completed commission payouts
- [ ] Invoice payment (mocked) triggers payout processing
- [ ] `timesheet.approved.v1`, `invoice.generated.v1`, `payout.processed.v1` events emitted

**Financial correctness:**
- [ ] All money calculations use Decimal (not number)
- [ ] Invoice total = sum of (hours × bill rate) across all timesheets
- [ ] Commission payouts = sum of (hours × bill rate × commission%) per beneficiary
- [ ] No rounding errors in payout calculations
- [ ] Audit log entry for every financial mutation (approval, invoice generation, payout)

**Security:**
- [ ] Only customer can approve timesheets
- [ ] Only candidate can submit timesheets for their own placements
- [ ] Invoice visibility enforced (customer sees own invoices only)
- [ ] Payout visibility enforced (vendors see only their own payouts)

**Quality gates:**
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (payments-svc integration + unit tests green)
- [ ] OpenAPI spec generated and committed for payments-svc

**Visual:**
- [ ] Timesheet submission form clean and simple
- [ ] Invoice detail page has clear line item breakdown
- [ ] Payout dashboard shows pending vs completed earnings clearly

---

## Before you start

Produce a **written plan** covering:

1. Task ordering (I recommend: 1 → 2 → 3 (unit tests first!) → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15)
2. Any ambiguities in the payment flow:
   - Should timesheets auto-submit at week end, or require explicit submit action? (I recommend explicit)
   - Should invoices auto-send to customers, or require manual review? (Auto-send for v1)
   - Should interviewer flat fees be paid immediately after interview, or deferred to invoice cycle? (Defer to end of placement or first invoice for simplicity)
3. Cron job testing: how to test the weekly invoice generator without waiting for Monday? (Manual trigger endpoint: `POST /api/v1/internal/generate-weekly-invoices`)
4. Decimal precision: `Decimal(5,2)` for hours (max 999.99 hrs), `Decimal(10,2)` for amounts (max $99,999,999.99) — confirm this matches your needs
5. Commit estimate (expect 90–130 for this sprint — this is a lot of surface area)

**CRITICAL: Before coding, write down the invoice calculation for this scenario and verify the math:**

**Scenario:** 1 placement (W-2, $120/hr bill rate, $90/hr pay rate, CRM + SRM attributed, 1 interviewer $150 fee)

**Week 1 timesheet:** 40 hours approved

**Expected invoice:**
- Line item 1: "Alex Chen - Senior Full-Stack Engineer - Week of May 4-10, 2026", 40 hrs × $120/hr = $4,800
- Subtotal: $4,800
- Tax: $0 (for simplicity in v1, add tax logic in v2)
- Total: $4,800

**Expected commission payouts:**
- CRM: 40 hrs × $120/hr × 8% = $384
- SRM: 40 hrs × $120/hr × 5% = $240
- Candidate W-2: 40 hrs × $90/hr = $3,600 (paid via Gusto)
- Platform (residual): 40 hrs × $120/hr × (100% - 8% - 5% - 75%) = 40 × $120 × 12% = $576
- Interviewer: $150 (one-time, paid on first invoice or end of placement)

**Total payouts:** $384 + $240 + $3,600 + $576 + $150 = $4,950

**Wait, that's $4,950 payout from $4,800 invoice.** The interviewer $150 is a one-time fee, not recurring weekly. Clarify when it's paid:

**Option A:** Interviewer fee paid on first invoice after hire (Week 1), then never again.
**Option B:** Interviewer fee deferred to end of placement, paid separately.

**Resolve this before coding.**

**Do not code until:**
- You've written out the invoice + payout calculation
- I've confirmed the math
- You say "proceed to Sprint 7"

This sprint's payment logic defines how every dollar flows. Get it right.
