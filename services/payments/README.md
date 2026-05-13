# @techorbit/payments

Payments service. Timesheets → weekly invoices → commission payouts; plus interviewer-fees invoicing triggered by `placement.created.v1`.

## Why this service matters

This is where money moves. Every weekly Monday cron turns a week of approved timesheets into invoices; every invoice that gets paid triggers commission payouts to CRMs/SRMs/MSMEs/candidates/Platform. All financial mutations are immutable audit events via the transactional outbox, and every payout keeps the commission-rules invariant from Sprint 6 exact-to-the-cent.

## Endpoints

All routes require a bearer token (RS256). Internal endpoints require a `SERVICE`-role token.

| Method | Path | Authz |
|---|---|---|
| `POST` | `/api/v1/timesheets` | CANDIDATE on ACTIVE placement |
| `GET` | `/api/v1/timesheets` | any auth'd user (scoped: candidate=own, customer=own placements) |
| `GET` | `/api/v1/timesheets/:id` | participant only |
| `PATCH` | `/api/v1/timesheets/:id` | CANDIDATE — DRAFT or REJECTED only |
| `POST` | `/api/v1/timesheets/:id/approve` | CUSTOMER (on the placement) |
| `POST` | `/api/v1/timesheets/:id/reject` | CUSTOMER (on the placement) |
| `GET` | `/api/v1/invoices` | CUSTOMER (own company) or ADMIN |
| `GET` | `/api/v1/invoices/:id` | CUSTOMER (own) or ADMIN |
| `POST` | `/api/v1/invoices/:id/mark-paid` | ADMIN (Stripe webhook replacement for v1) |
| `GET` | `/api/v1/payouts` | beneficiary (user or MSME) or ADMIN |
| `GET` | `/api/v1/payouts/:id` | beneficiary or ADMIN |
| `POST` | `/api/v1/internal/invoices/generate-weekly` | SERVICE |

## Invoice types

Two kinds of invoice, both using the same `Invoice` + `InvoiceLineItem` tables:

| Type | Trigger | Line items | Idempotency key |
|---|---|---|---|
| `WEEKLY_HOURS` | Monday cron (00:01 UTC) | Approved timesheets for the billing week, one per candidate-week | `(customerCompanyId, WEEKLY_HOURS, billingPeriodStart)` |
| `INTERVIEWER_FEES` | `placement.created.v1` consumer | One per completed interview with `interviewerFeeUsd` | `(customerCompanyId, INTERVIEWER_FEES, placementId)` |

Keeping interviewer fees on a separate invoice keeps the weekly-invoice math clean for customer self-service: the customer sees `hours × billRate` and nothing hidden.

## Payout calculation

Built on top of the Sprint 6 commission rules (source of truth on `placement-svc`). For each weekly invoice we call `placement-svc /api/v1/internal/placements/:id/commissions` (unfiltered) and allocate:

- `PERCENT_OF_BILL` rules → percentage × hours × billRate
- `FLAT` rules (interviewer) → amount per completed interview (only on INTERVIEWER_FEES invoices)
- `RESIDUAL` rule → `billedRevenue − Σ PERCENT_OF_BILL` (Platform in W-2 absorbs unfilled CRM/SRM slots; MSME in C2C absorbs the customer discount)

25 unit tests in `tests/unit/payout-calculator.test.ts` cover every Sprint 6 scenario plus edge cases (no-CRM absorption, C2C residual, rounding, zero hours).

## Payout processing

`processInvoicePayouts(invoiceId)` walks the payouts and routes each one:

| Beneficiary | Channel | Transition |
|---|---|---|
| `CANDIDATE_W2` | Mock Gusto (`gustoPayrollId` set) | PENDING → PROCESSING → COMPLETED |
| `PLATFORM` | Internal — no external call | PENDING → COMPLETED |
| Everything else | Mock Stripe Connect (`stripeTransferId` set) | PENDING → PROCESSING → COMPLETED |

v1 uses mocks. Real integrations are a drop-in replacement behind the same interface.

## Events

| Event | Trigger |
|---|---|
| `timesheet.submitted.v1` | POST /timesheets |
| `timesheet.approved.v1` | POST /timesheets/:id/approve |
| `invoice.generated.v1` | Weekly cron + placement-created consumer |
| `payout.processed.v1` | Each payout transition to COMPLETED or FAILED |

All emitted via transactional outbox (`outgoing_event` + 5s relay). Consumed from `placement.created.v1` with `ProcessedEvent` idempotency guard.

## Cron

```
1 0 * * 1 UTC  →  generateWeeklyInvoices(prevMonday, prevSunday)
```

Gated by `ENABLE_CRON_JOBS=true` so integration tests and local dev don't auto-fire. Admin can trigger the same flow via `POST /api/v1/internal/invoices/generate-weekly`.

## Cross-service calls

On invoice generation this service calls:
- `placement-svc` `/api/v1/internal/placements?status=ACTIVE` — list placements for the billing window
- `placement-svc` `/api/v1/internal/placements/:id/commissions` — unfiltered rules for payout allocation
- `profile-svc` `/api/v1/internal/customer-companies/:id` — resolve customer for invoice visibility scoping

On `placement.created.v1` consumer:
- `interview-svc` `/api/v1/internal/interviews?submissionId=&status=COMPLETED` — gather interviewer fees

All use `SERVICE`-role JWTs self-signed via the shared private key.

## Environment

| Var | Required | Default |
|---|---|---|
| `DATABASE_URL` | yes | — |
| `JWT_PUBLIC_KEY` | yes | — |
| `JWT_PRIVATE_KEY` | yes | — (for SERVICE-token self-signing) |
| `PORT` | no | `3009` |
| `RABBITMQ_URL` | no | — (outbox accumulates if unset) |
| `ENABLE_CRON_JOBS` | no | `false` |
| `PROFILE_SVC_URL` | no | `http://localhost:3004` |
| `PLACEMENT_SVC_URL` | no | `http://localhost:3008` |
| `INTERVIEW_SVC_URL` | no | `http://localhost:3007` |

## Tests

```bash
pnpm --filter @techorbit/payments test
```

- 25 payout-calculator unit tests (Sprint 6 scenarios + C2C + no-CRM absorption + rounding)
- 9 integration tests (testcontainer postgres, stubbed cross-service fetches): timesheet submit/approve/reject, weekly invoice with exact dollar amounts ($384 CRM, $240 SRM, $3600 Candidate, $576 Platform = $4,800), idempotency, no-CRM absorption, interviewer-fees invoice

## OpenAPI

```bash
pnpm --filter @techorbit/payments openapi:generate
```

Writes `services/payments/openapi.yaml`. CI verifies the committed spec is in sync with the Zod schemas.
