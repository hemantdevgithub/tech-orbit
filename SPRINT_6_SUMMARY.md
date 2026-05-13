# Sprint 6 Summary — Placements & Commission Engine

**Branch:** `sprint/6-placements` (from `sprint/5-interviews` after Sprint 5.5)
**Status:** Complete — lint 0, typecheck 0, 245 tests green

---

## Why this sprint matters

Every sprint before this built **infrastructure**. Sprint 6 built the **business model**. After Sprint 6:
- Customers can hire candidates (create a placement)
- The Value Chain is materialized (who contributed to this hire?)
- Commissions are calculated (CRM 8%, SRM 5%, Platform residual, Candidate/MSME share)
- The "commission transparency" promise is enforceable — each role sees exactly what they're entitled to

---

## What was delivered

### Backend — `services/placement`

Fully scaffolded from an empty shell.

**Schema:** `Placement`, `ValueChain`, `CommissionRule`, `OutgoingEvent` in the `placement` Postgres schema. `Placement.submissionId` is `@unique`. `CommissionRule.percentOfBillRate` is `Decimal(5,4)` (supports 0.0000–9.9999), `flatFeeUsd` is `Decimal(10,2)`. `CommissionRule.interviewId` snapshots the source interview so historical rules don't shift if the Interview row changes later.

**Commission calculator** (`src/services/commission-calculator.ts`) — pure function, no DB access, tested TDD. Weights centralized in `COMMISSION_WEIGHTS` for future per-customer configurability. Resolution rules:

| Slot | Rule |
|---|---|
| CRM | 8% of bill if attributed; rule absent otherwise |
| SRM | 5% of bill if attributed; rule absent otherwise |
| Candidate (W-2) | `payRate / billRate`, or default 75% |
| MSME (C2C) | **RESIDUAL** — absorbs what's left after CRM/SRM/Platform |
| Platform (W-2) | **RESIDUAL** — absorbs unfilled CRM/SRM slots |
| Platform (C2C) | 12% fixed (MSME takes residual) |
| Interviewer | `Interview.interviewerFeeUsd` flat fee, one per completed interview |

Pre-flight validation throws on: `IC_1099` (out of scope), C2C without `attributedMsmeId`, W-2 with `payRateUsd >= billRateUsd`, shares summing to >= 100%.

**Value Chain visibility filter** (`src/lib/value-chain-filter.ts`) — the most critical piece. `resolveViewerRole(ctx, placement, valueChain)` classifies the caller into one of `ADMIN / CUSTOMER_OWNER / CRM / SRM / MSME / CANDIDATE / INTERVIEWER / OUTSIDER`. `filterValueChain()` redacts slots per role. `filterCommissionRules()` drops every rule the viewer isn't entitled to see. Every redacted slot is noted in `redactedSlots: CommissionSlot[]` so UIs can render "Confidential" labels.

**Service layer** (`src/services/placement.service.ts`) — `createPlacement` validates the submission is in OFFER status, resolves attribution from three cross-service calls (matching + requirement + interview), calculates rules via the pure function, and writes `Placement + ValueChain + CommissionRule[] + outbox event` in a single transaction. `endPlacement` enforces creator-only authz and emits `placement.ended.v1`.

**API routes:** 6 endpoints matching Section 7.6 of the spec.

**Cross-service additions:**
- `matching-svc`: existing `/api/v1/internal/submissions/:id` (reused)
- `requirement-svc`: existing `/api/v1/internal/requirements/:id` (reused)
- `interview-svc`: **new** `/api/v1/internal/interviews?submissionId=&status=` — SERVICE-gated, lets placement-svc gather completed interview IDs + fees

### Frontend — `apps/web`

- **`/submissions/[id]/hire`** — customer-only form. Engagement type (W-2 / C2C) with contextual descriptions. Bill rate, pay rate (W-2 only), start/end dates. Sticky sidebar shows live commission preview so the customer sees the split before confirming. Gates on `submission.status === "OFFER"`.
- **`/placements`** — list view with status pills.
- **`/placements/[id]`** — hero header (dark forest gradient), contract details, **Value Chain graph**, commission breakdown table. End-placement actions card for the owner.
- **Value Chain graph** (`value-chain-graph.tsx`) — horizontal flowchart: Customer → CRM → SRM → Candidate/MSME, with Platform + interviewers in a side row. Shows "Confidential" for redacted slots and hourly dollars alongside percentages for viewers entitled to see them.
- **Submission detail** — "Hire candidate" CTA card (success-tinted) appears when submission.status is OFFER.
- **Navigation** — Placements added to dashboard and requirements layouts.

### `PlacementApiClient` in `packages/api-client`

6 methods matching the REST endpoints. `create()` returns `{ placement, valueChain, rules }` so the hire page can immediately show the commission breakdown.

### OpenAPI + CI

`services/placement/openapi.yaml` generated from Zod schemas. CI sync check now covers placement-svc.

---

## Tests

**245 total tests** across the repo. Placement alone:

| Suite | Count |
|---|---|
| `tests/unit/commission-calculator.test.ts` | 29 |
| `tests/unit/value-chain-filter.test.ts` | 22 |
| `tests/integration/placement.test.ts` | 10 |
| `tests/smoke.test.ts` | 1 |
| **Total placement** | **62** |

Cross-repo test totals: 62 placement + 46 identity + 38 matching + 15 requirement + 12 interview + 10 profile + others.

Key integration tests:
- W-2 with CRM + SRM + 2 interviewers → 6 commission rules, slots match
- C2C → MSME residual + 12% fixed platform
- No CRM attribution → 4 rules (CRM row absent entirely)
- Non-OFFER submission → 400
- Non-customer creates placement → 403
- Duplicate on same submission → 409
- Customer sees full Value Chain; SRM sees only their slot (CRM redacted)
- Candidate cannot see CRM/SRM/Platform commissions (only `CANDIDATE_W2` row)
- End placement → status transition + `placement.ended.v1` event enqueued
- `placement.created.v1` outbox event on every creation

---

## Commission math — worked examples

**Scenario 1 — W-2, $120/hr bill, $90/hr pay, CRM + SRM + 2 interviewers ($150 each):**

| Slot | Hourly | Annual (2080hr) |
|---|---|---|
| CRM (8%) | $9.60 | $19,968 |
| SRM (5%) | $6.00 | $12,480 |
| Candidate (75%) | $90.00 | $187,200 |
| Platform (residual 12%) | $14.40 | $29,952 |
| Interviewers | $150 × 2 flat | $300 one-time |
| **Total hourly** | **$120.00** | |

**Scenario 2 — C2C, $120/hr, CRM + SRM + MSME:**

| Slot | Hourly |
|---|---|
| CRM (8%) | $9.60 |
| SRM (5%) | $6.00 |
| Platform (12% fixed) | $14.40 |
| MSME (residual 75%) | $90.00 |
| **Total** | **$120.00** |

**Scenario 3 — W-2, $100/hr, $75/hr pay, NO CRM, SRM + 1 interviewer:**

| Slot | Hourly |
|---|---|
| SRM (5%) | $5.00 |
| Candidate (75%) | $75.00 |
| Platform (residual 20%) | $20.00 |
| Interviewer | $150 one-time |
| **Total hourly** | **$100.00** |

Platform absorbed the unfilled CRM slot. Sum invariant holds.

---

## Decisions made

| Decision | Choice | Rationale |
|---|---|---|
| Platform calculation (W-2) | `RESIDUAL` | Absorbs unfilled attribution slots, keeps 100% sum trivially true |
| Platform calculation (C2C) | `PERCENT_OF_BILL` 12% | MSME takes residual instead |
| Submission status gate | `OFFER` only (not OFFER + INTERVIEWING) | Forces explicit readiness before hiring |
| Audit logging | Inline structured log + outbox event | Full audit-svc integration deferred to Sprint 8 |
| 1099 engagement | Throws — out of scope for v1 | Per spec |
| Commission rules | Immutable after creation | No mutation endpoints exist |
| Interview flat fees | One per `Interview` row (not per interviewer) | Each round is a separate charge, visible in audit |

---

## Sprint 6 commits

1. `feat(placement): scaffold Prisma schema and migration`
2. `feat(types): add placement, value chain, and commission schemas`
3. `feat(placement): commission calculator (TDD) + 29 unit tests`
4. `feat(placement,interview): backend — value chain filter, service, routes`
5. `test(placement): integration suite — 10 tests covering the full flow`
6. `feat(web,api-client): placement UI — hire flow, detail, Value Chain graph`
7. `docs,chore(placement): README, OpenAPI, CI sync; SPRINT_6_SUMMARY`

7 commits. Under the 80–120 estimate — the commission calculator and value-chain filter being pure functions kept the test-to-code ratio high but the net line count manageable.

---

## Dependencies for Sprint 7 (Timesheets & Invoicing)

Sprint 7 can build on:
- `placement.created.v1` events in the outbox → Sprint 7 timesheet-svc subscribes, opens weekly timesheet stubs for active placements.
- `placement.ended.v1` → triggers final invoicing.
- `CommissionRule` rows are the source of truth for payout math. When a timesheet is approved for X hours, Sprint 7 multiplies `X × rule.percentOfBillRate × billRate` for PERCENT_OF_BILL rules, adds `rule.flatFeeUsd` once per placement for FLAT_FEE rules, and computes residuals at invoice generation.
- Value Chain filter is reusable for invoicing visibility (who sees which line item).
