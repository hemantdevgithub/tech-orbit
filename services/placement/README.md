# @techorbit/placement

Placement service. Customers hire candidates; the service materializes the Value Chain (who contributed) and computes commissions (who gets paid what).

## Why this service matters

This is where the business model becomes concrete. Every sprint before this built marketplace **infrastructure**; this service turns a submission into an actual hire with a contract and a commission split.

## Endpoints

All routes require a bearer token (RS256).

| Method | Path | Authz |
|---|---|---|
| `POST` | `/api/v1/placements` | CUSTOMER (must own the requirement) |
| `GET` | `/api/v1/placements` | any auth'd user (participant-scoped list) |
| `GET` | `/api/v1/placements/:id` | participant only |
| `GET` | `/api/v1/placements/:id/value-chain` | participant; **visibility filtered** per role |
| `GET` | `/api/v1/placements/:id/commissions` | participant; **visibility filtered** per role |
| `POST` | `/api/v1/placements/:id/end` | customer (creator) only |

## Commission calculation

**Weights (v1 defaults, centralized in `COMMISSION_WEIGHTS`):**

| Slot | Weight | Notes |
|---|---|---|
| CRM | 8% | Only if attributed on the requirement |
| SRM | 5% | Only if attributed on the submission |
| Candidate (W-2) | pay rate / bill rate | Default 75% if `payRateUsd` not provided |
| MSME (C2C) | residual | Bill rate − CRM − SRM − Platform |
| Platform (W-2) | **residual** | Absorbs unfilled CRM/SRM slots |
| Platform (C2C) | 12% | Fixed — MSME takes the residual instead |
| Interviewer | `Interview.interviewerFeeUsd` | Flat fee per completed interview |

**Why Platform is residual in W-2:** If a placement has no CRM attribution, the 8% CRM share needs to go somewhere. Having Platform absorb it (rather than discounting bill rate or boosting pay rate) keeps the 100%-sum invariant trivial and matches how real staffing agencies work.

See `SPRINT_6_PROMPT.md` Scenario 3 for the worked example, and `tests/unit/commission-calculator.test.ts` for the math.

## Value Chain visibility

Who can see what:

| Viewer | Sees |
|---|---|
| **Customer / Admin** | Everything |
| **CRM** | Customer + candidate + own CRM slot. SRM/MSME/interviewers **hidden**. |
| **SRM** | Customer + candidate + own SRM slot. CRM/MSME hidden. |
| **MSME** | Customer + candidate + SRM (sourcing lineage) + own residual. CRM + interviewers hidden. |
| **Candidate** | Customer + own pay rate (W-2) or MSME (C2C). Everything else hidden. |
| **Interviewer** | Customer + candidate + own fee. All attribution hidden. |

The API returns the filtered Value Chain with `null` for redacted fields, plus a `redactedSlots` array so the UI can render "Confidential" labels instead of silently hiding information.

Implementation: `src/lib/value-chain-filter.ts`. 22 unit tests lock this down — `tests/unit/value-chain-filter.test.ts`.

## Events

| Event | Trigger |
|---|---|
| `placement.created.v1` | POST /placements (emitted in the same transaction as the placement insert) |
| `placement.ended.v1` | POST /placements/:id/end |

Both emitted via the transactional outbox (`outgoing_event` table + 5s polling relay).

## Cross-service calls

On placement creation, this service calls:
- `matching-svc` `/api/v1/internal/submissions/:id` — validate status is OFFER, read attributed SRM/MSME
- `requirement-svc` `/api/v1/internal/requirements/:id` — read attributed CRM, customer company
- `interview-svc` `/api/v1/internal/interviews?submissionId=&status=COMPLETED` — gather interviewer fees

All three calls use a `SERVICE`-role JWT self-signed via `src/lib/service-token.ts`.

## Environment

| Var | Required | Default |
|---|---|---|
| `DATABASE_URL` | yes | — |
| `JWT_PUBLIC_KEY` | yes | — |
| `JWT_PRIVATE_KEY` | yes | — (for SERVICE-token self-signing) |
| `PORT` | no | `3008` |
| `RABBITMQ_URL` | no | — (outbox accumulates if unset) |
| `PROFILE_SVC_URL` | no | `http://localhost:3004` |
| `REQUIREMENT_SVC_URL` | no | `http://localhost:3005` |
| `MATCHING_SVC_URL` | no | `http://localhost:3006` |
| `INTERVIEW_SVC_URL` | no | `http://localhost:3007` |

## Tests

```bash
pnpm --filter @techorbit/placement test
```

62/62 tests total:
- 29 commission-calculator unit tests (includes all 3 Sprint 6 scenarios with exact dollar breakdowns)
- 22 value-chain-filter unit tests (every role × every redacted field)
- 10 placement integration tests (testcontainer postgres, stubbed cross-service fetches)
- 1 smoke test
