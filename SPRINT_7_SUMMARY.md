# Sprint 7 Summary — Timesheets, Invoicing & Payroll

**Branch:** `sprint/7-payments` (from `sprint/6-placements`)
**Status:** Complete — lint 0, typecheck 0, all tests green

---

## Why this sprint matters

Sprint 6 built the business model (who gets paid what). Sprint 7 makes the money actually move. After this sprint:
- Candidates submit weekly hours; customers approve.
- Every Monday, a cron turns approved hours into one invoice per customer.
- Once an invoice is marked paid, commissions fan out to CRMs, SRMs, MSMEs, candidates, and Platform via mock Stripe/Gusto.
- Interviewer fees flow on their own invoice triggered by `placement.created.v1`, keeping the weekly invoice math clean for customer self-service.

---

## What was delivered

### Backend — `services/payments` (new)

Fully scaffolded from an empty shell, following the same Fastify + Prisma + outbox + multi-schema pattern as the Sprint 6 placement service.

**Schema:** `Timesheet`, `Invoice`, `InvoiceLineItem`, `CommissionPayout`, `ProcessedEvent`, `OutgoingEvent` in the `payments` Postgres schema. `Invoice` has a composite unique on `(customerCompanyId, invoiceType, billingPeriodStart, placementId)` — gives idempotency for both invoice types from a single constraint. `Timesheet` has `@@unique(placementId, weekStartDate)`. Money is `Decimal(10,2)`; hours is `Decimal(5,2)`.

**Payout calculator** (`src/services/payout-calculator.ts`) — pure function, 25 TDD unit tests. Reads commission rules (already calculated in Sprint 6) and allocates an invoice's billed revenue:

- `PERCENT_OF_BILL` → percentage × hours × billRate
- `FLAT` (interviewer) → fee per completed interview, on INTERVIEWER_FEES invoices only
- `RESIDUAL` → `billedRevenue − Σ PERCENT_OF_BILL` (Platform absorbs unfilled CRM/SRM in W-2; MSME takes the residual in C2C)

The calculator is invariant-preserving by construction: every dollar of billed revenue maps to exactly one beneficiary.

**Invoice generator** (`src/services/invoice-generator.service.ts`):
- `generateWeeklyInvoices(periodStart, periodEnd)` — walks ACTIVE placements, groups APPROVED timesheets by customer, writes `Invoice + line items + payouts + outbox event` in one transaction per customer, flips timesheets to INVOICED, auto-transitions the invoice DRAFT → SENT, emits `invoice.generated.v1`. Idempotent on replay.
- `generateInterviewerFeesInvoice(placementId)` — called by the `placement.created.v1` consumer. One invoice per placement, idempotent.

**Timesheet service** (`src/services/timesheet.service.ts`) — submit / approve / reject / update. Candidates submit for past Mondays only; customers scope to placements they own; updates allowed only while DRAFT or REJECTED (reopens REJECTED → SUBMITTED).

**Payout processor** (`src/services/payout-processor.service.ts`) — on invoice mark-paid, walks PENDING payouts and routes: `CANDIDATE_W2` → mock Gusto (`gustoPayrollId`), `PLATFORM` → internal no-op, everything else → mock Stripe Connect (`stripeTransferId`). PENDING → PROCESSING → COMPLETED with external-id snapshot. Failures land as FAILED with `failureReason`.

**Cron** (`src/jobs/weekly-invoice-cron.ts`) — `1 0 * * 1 UTC`, gated by `ENABLE_CRON_JOBS=true`. Admin can also trigger via `/api/v1/internal/invoices/generate-weekly`.

**Placement-created consumer** (`src/consumers/placement-created.consumer.ts`) — subscribes to `placement.created.v1` with `ProcessedEvent` idempotency, generates the per-placement INTERVIEWER_FEES invoice.

**API:** 12 endpoints (6 timesheets, 3 invoices, 2 payouts, 1 internal) + health.

**Cross-service additions:**
- `placement-svc`: new internal routes — `GET /api/v1/internal/placements?status=ACTIVE`, `GET /api/v1/internal/placements/:id`, `GET /api/v1/internal/placements/:id/commissions` (unfiltered rules). SERVICE-gated.

### Frontend — `apps/web`

- **`/placements/[id]/timesheets/new`** — candidate timesheet form. Week dropdown (last 8 Mondays), hours input (0–168, step 0.25), live estimated gross pay preview.
- **`/timesheets`** — list with status pills; customer-only Approve / Reject buttons on SUBMITTED rows.
- **`/invoices`** — list with unpaid-balance summary card and status pills.
- **`/invoices/[id]`** — hero header (dark forest gradient with invoice type and total), line items table, Subtotal / Tax / Total summary, sidebar "Pay invoice" card (Stripe link + admin "Mark paid" button), Timeline card.
- **`/payouts`** — three summary cards (Pending / This month / Lifetime), status filter pills, payouts table with Stripe/Gusto reference ids.
- **Dashboard earnings cards** — `components/dashboard/earnings-cards.tsx` drops role-specific stat cards onto each role's dashboard: Candidate → "Earnings this month" + "Timesheets to submit"; Customer → "Unpaid invoices" + "Timesheets to approve"; Vendor (MSME) → "Pending commissions" + "Earnings this month". All deep-link to `/timesheets`, `/invoices`, `/payouts`.

### `PaymentsApiClient` in `packages/api-client`

Thin client for all 11 public endpoints. Wired into `apps/web/src/lib/api-client.ts` as `getPaymentsClient()` singleton on port 3009 via `NEXT_PUBLIC_PAYMENTS_URL`.

### OpenAPI + CI

- `services/payments/scripts/generate-openapi.ts` — zod-to-openapi generator for the 12 routes + health.
- `services/payments/openapi.yaml` — committed to repo.
- CI `.github/workflows/ci.yml` — added `pnpm --filter @techorbit/payments openapi:generate` to the sync check.

---

## Architectural decisions confirmed this sprint

1. **INTERVIEWER_FEES is a separate invoice.** Not folded into the weekly invoice. Why: customer self-service sees `hours × billRate` without hidden fees; interviewer fees are one-time per placement, not recurring.
2. **Interviewer-fees invoice is async.** Triggered by `placement.created.v1` consumer, not inline with placement creation. Why: keeps placement creation from crossing a payments-svc transaction boundary; idempotent on replay via `ProcessedEvent`.
3. **Platform is RESIDUAL in W-2.** Carried from Sprint 6. Absorbs unfilled CRM/SRM slots. Keeps 100%-sum invariant trivial.
4. **Payout processing uses mocks in v1.** Real Stripe/Gusto integrations drop in behind the same `payoutProcessor.process()` interface with no contract change.
5. **Payouts scoped to beneficiary.** `GET /api/v1/payouts` lists only what the caller earned (matches the Sprint 6 Value Chain visibility model).
6. **Placement-created consumer + internal placement endpoints decouple payments from placement mutations.** Payments never touches placement tables — it always goes through placement-svc's API.

---

## Test coverage

- **25** payout-calculator unit tests — every Sprint 6 scenario (W-2 with CRM+SRM, C2C, no-CRM absorption, rounding, zero hours).
- **9** payments integration tests — testcontainer postgres, stubbed cross-service fetches. Exact-dollar assertions: on a $120/hr × 40hr = $4,800 weekly invoice with 8% CRM, 5% SRM, 75% candidate W-2, Platform residual → $384 CRM + $240 SRM + $3,600 candidate + $576 Platform = $4,800. No-CRM case: $960 Platform (absorbs the 8%). Interviewer-fees case: separate invoice, `$150 × N` line items.
- Idempotency: rerunning the weekly generator for the same week creates zero additional invoices.
- All 245+ pre-existing tests still green.

---

## Known issues / follow-ups

- Real Stripe / Gusto adapters. v1 uses mocks; the interface is stable.
- Real Stripe webhook (POST /webhooks/stripe/invoice-paid). v1 uses `POST /api/v1/invoices/:id/mark-paid` (admin-only) as a stand-in.
- `audit-svc` integration. For now every financial mutation is logged structured + emitted via outbox; a dedicated audit store is still deferred.
- Invoice PDF rendering. The detail page shows a Stripe link but no PDF download. (Stripe will give us the PDF when the real webhook lands.)
- Timesheet late-submission policy (e.g. cutoff at Tuesday 23:59). Out of scope for v1.

---

## Dependencies for future sprints

- **Audit service (Sprint 8+)**: `invoice.generated.v1`, `payout.processed.v1`, and `timesheet.approved.v1` are all emitted — audit-svc can consume them without code changes here.
- **Reporting / analytics**: invoices and payouts are the source of truth for GMV and take-rate dashboards.
- **Candidate dispute flow**: the `REJECTED` status on timesheets is already modeled; a full resolution workflow (counter-reason, admin arbitration) can build on this.
- **Refund / partial-payment**: the invoice state machine (`DRAFT → SENT → PAID → SETTLED` or `OVERDUE`) already leaves room; partial payments would add a new status without breaking the model.

---

## Commits

16 atomic commits on `sprint/7-payments`, ending with:
- `feat(types,payments,web,profile): add OpenAPI spec, payments-svc README, CI sync step`
- `docs: write SPRINT_7_SUMMARY.md`
